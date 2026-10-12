import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

// Exercise the real billing functions against memory only, never live Stripe
// or Firestore. Staff cannot provide a parent's recurring-card authorization.
const require = createRequire(import.meta.url);
const records = new Map<string, Record<string, unknown>>();
let sequence = 0;
const snapshot = (path: string) => ({ exists: records.has(path), data: () => structuredClone(records.get(path)) });
function ref(path: string): unknown {
  return { path, id: path.split("/").at(-1), get: async () => snapshot(path), collection: (name: string) => collection(`${path}/${name}`),
    set: async (value: Record<string, unknown>) => records.set(path, value),
    update: async (value: Record<string, unknown>) => records.set(path, { ...records.get(path), ...value }),
    delete: async () => records.delete(path) };
}
function collection(path: string): unknown { return { doc: (id?: string) => ref(`${path}/${id ?? `fixture-${++sequence}`}`) }; }
const db = { collection, runTransaction: async (callback: (tx: unknown) => Promise<unknown>) => {
  const writes: [string, string, Record<string, unknown>][] = [];
  const result = await callback({ get: async (reference: { path: string }) => snapshot(reference.path),
    set: (reference: { path: string }, value: Record<string, unknown>) => writes.push(["set", reference.path, value]),
    update: (reference: { path: string }, value: Record<string, unknown>) => writes.push(["update", reference.path, value]),
    create: (reference: { path: string }, value: Record<string, unknown>) => writes.push(["create", reference.path, value]),
    delete: (reference: { path: string }) => writes.push(["delete", reference.path, {}]) });
  for (const [kind, path, value] of writes) {
    if (kind === "delete") { records.delete(path); continue; }
    if (kind === "create" && records.has(path)) throw new Error("Duplicate fixture create");
    records.set(path, kind === "update" ? { ...records.get(path), ...value } : value);
  }
  return result;
} };
require("firebase-admin/app").initializeApp({ projectId: "hbic-isolated-billing-test" });
require("firebase-admin/firestore").getFirestore = () => db;
process.env.FIREBASE_PROJECT_ID = "hbic-isolated-billing-test";
process.env.GOOGLE_APPLICATION_CREDENTIALS = "isolated-test-not-a-credential";
process.env.ACADEMY_PREVIEW_ENABLED = "true";

test("staff cash arrangement preserves paid tuition; card setup requires parent action and is audited once", async () => {
  const { changeAcademyPaymentMethod, requestAcademyCardSetup } = await import("../lib/academyStripe");
  const period = new Date().toLocaleDateString("en-CA", { timeZone: "America/Edmonton" }).slice(0, 7);
  const path = "academyFamilies/fixture";
  const ledger = `${path}/months/${period}`;
  records.set(path, { reference: "QA-AAAAAAAAAA", guardianName: "Local test", email: "test@example.invalid", children: [{ id: "child", name: "Test", level: "qaida" }], paymentChoice: "cash", enrollmentState: "active", passToken: "isolated", createdAt: new Date().toISOString() });
  records.set(ledger, { period, method: "cash", status: "paid", amountCents: 5000, receiptId: "isolated-receipt" });
  records.set("academySettings/config", { tuitionMode: "per_child", monthlyCents: 5000 });
  const paid = structuredClone(records.get(ledger));
  const staff = { uid: "approved-staff", reason: "Parent requested payment arrangement" };
  await changeAcademyPaymentMethod("fixture", "cash", false, staff);
  assert.deepEqual(records.get(ledger), paid);
  const change = [...records.values()].find((row) => row.action === "payment_method_change");
  assert.equal(change?.actorUid, staff.uid); assert.equal(change?.reason, staff.reason);
  await requestAcademyCardSetup("fixture", staff);
  await requestAcademyCardSetup("fixture", staff);
  assert.equal(records.get(path)?.paymentChoice, "cash");
  assert.equal(records.get(path)?.enrollmentState, "active");
  assert.deepEqual(records.get(ledger), paid);
  assert.equal([...records.values()].filter((row) => row.action === "card_setup_requested").length, 1);
  await assert.rejects(changeAcademyPaymentMethod("fixture", "card", false, staff), /Authorize recurring/);
  records.set("academyBillingLocks/fixture", { expiresAt: Date.now() + 60000 });
  await assert.rejects(requestAcademyCardSetup("fixture", staff), /billing change is in progress/);
  records.delete("academyBillingLocks/fixture");
  records.set(path, { ...records.get(path), enrollmentState: "withdrawn" });
  await assert.rejects(requestAcademyCardSetup("fixture", staff), /Withdrawn/);
});

test("exemptions save for legacy active families without a registration ID and preserve paid history", async () => {
  const { setAcademyTuitionExemption } = await import("../lib/academyStripe");
  const period = new Date().toLocaleDateString("en-CA", { timeZone: "America/Edmonton" }).slice(0, 7);
  const path = "academyFamilies/legacy-exemption";
  const ledger = `${path}/months/${period}`;
  records.set(path, { reference: "QA-LEGACY", guardianName: "Local test", email: "test@example.invalid",
    children: [{ id: "child-a", name: "Test A", level: "qaida" }, { id: "child-b", name: "Test B", level: "quran" }],
    paymentChoice: "cash", enrollmentState: "active", passToken: "legacy-pass", createdAt: new Date().toISOString(), checkInAt: "preserved" });
  records.set(ledger, { period, method: "cash", status: "paid", amountCents: 10000, receiptId: "existing-receipt" });
  records.set("academySettings/config", { tuitionMode: "per_child", monthlyCents: 5000 });
  const paid = structuredClone(records.get(ledger));
  const actor = { uid: "approved-staff", email: "staff@example.invalid" };
  for (const childId of ["child-a", "child-b"]) {
    const family = await setAcademyTuitionExemption("legacy-exemption", childId, true, actor);
    assert.equal(family?.children.find(child => child.id === childId)?.tuitionExempt, true);
  }
  assert.deepEqual(records.get(ledger), paid);
  assert.equal(records.get(path)?.enrollmentState, "active");
  assert.equal(records.get(path)?.passToken, "legacy-pass");
  assert.equal(records.get(path)?.checkInAt, "preserved");
  const audits = [...records.values()].filter(row => row.action === "tuition_exempted" && row.familyId === "legacy-exemption");
  assert.equal(audits.length, 2);
  assert.equal(audits.every(row => row.registrationId === null), true);
  assert.equal(records.has("academyBillingLocks/legacy-exemption"), false);
  await setAcademyTuitionExemption("legacy-exemption", "child-a", true, actor);
  assert.equal([...records.values()].filter(row => row.action === "tuition_exempted" && row.familyId === "legacy-exemption").length, 2, "repeat request does not duplicate the audit");
});

test("unpaid cash exemption waives tuition without fabricating a payment and can be reversed", async () => {
  const { setAcademyTuitionExemption } = await import("../lib/academyStripe");
  const period = new Date().toLocaleDateString("en-CA", { timeZone: "America/Edmonton" }).slice(0, 7);
  const path = "academyFamilies/unpaid-exemption", ledger = `${path}/months/${period}`;
  records.set(path, { reference: "QA-FIXTURE", guardianName: "Fixture", email: "fixture@example.invalid", children: [{ id: "child", name: "Fixture", level: "qaida" }], paymentChoice: "cash", enrollmentState: "conditional", passToken: "fixture", createdAt: new Date().toISOString() });
  records.set(ledger, { period, method: "cash", status: "cash_due", amountCents: 5000 });
  const actor = { uid: "fixture-staff", email: "staff@example.invalid" };
  const family = await setAcademyTuitionExemption("unpaid-exemption", "child", true, actor);
  assert.equal(family?.noTuitionDue, true);
  assert.equal(records.get(ledger)?.status, "not_due"); assert.equal(records.get(ledger)?.amountCents, 0);
  assert.equal(records.get(ledger)?.paidAt, undefined); assert.equal(records.get(ledger)?.receiptId, undefined);
  assert.equal(records.get(path)?.enrollmentState, "conditional");
  await setAcademyTuitionExemption("unpaid-exemption", "child", false, actor);
  assert.equal(records.get(ledger)?.amountCents, 5000); assert.equal(records.get(ledger)?.status, "cash_due");
  records.set(path, { ...records.get(path), enrollmentState: "withdrawn" });
  await assert.rejects(setAcademyTuitionExemption("unpaid-exemption", "child", true, actor), /Withdrawn/);
});

test("staff roster groups preserve exemptions, enrollment and payment records", async () => {
  const { setAcademyAttendanceGroup } = await import("../lib/academyContent");
  const path = "academyFamilies/roster-group";
  records.set(path, { enrollmentState: "active", children: [{ id: "child", name: "Local student", tuitionExempt: true }], passToken: "unchanged" });
  await setAcademyAttendanceGroup("roster-group", "child", "girls", "staff");
  const family = records.get(path);
  assert.deepEqual(family?.children, [{ id: "child", name: "Local student", tuitionExempt: true, attendanceGroup: "girls" }]);
  assert.equal(family?.enrollmentState, "active");
  assert.equal(family?.passToken, "unchanged");
  await setAcademyAttendanceGroup("roster-group", "child", "girls", "staff");
  assert.equal([...records.values()].filter(row => row.action === "attendance_group_changed" && row.familyId === "roster-group").length, 1);
  await assert.rejects(setAcademyAttendanceGroup("roster-group", "child", "guessed", "staff"), /attendance group/);
});

test("card exemptions adjust future quantity without proration, pause all-exempt billing, and reject mismatched Stripe mapping", async () => {
  const { setAcademyTuitionExemption } = await import("../lib/academyStripe");
  const period = new Date().toLocaleDateString("en-CA", { timeZone: "America/Edmonton" }).slice(0,7);
  const path = "academyFamilies/card-exemption", ledger = `${path}/months/${period}`;
  records.set(path, { reference: "QA-FIXTURE", guardianName: "Fixture", email: "fixture@example.invalid", registrationId: "fixture-registration",
    children: [{ id: "a", name: "A" }, { id: "b", name: "B" }], paymentChoice: "card", enrollmentState: "active", stripeSubscriptionId: "sub_fixture", stripeCustomerId: "cus_fixture", passToken: "fixture", createdAt: new Date().toISOString() });
  records.set(ledger, { period, method: "card", status: "paid", amountCents: 10000, invoiceId: "in_existing" });
  const paid = structuredClone(records.get(ledger));
  const updates: Record<string, any>[] = [];
  const subscription = { id: "sub_fixture", status: "active", livemode: false, metadata: { academyFamilyUid: "card-exemption", academyRegistrationId: "fixture-registration" }, items: { data: [{ id: "si_fixture", quantity: 2 }] } };
  const fake = { subscriptions: { retrieve: async () => subscription, update: async (_id: string, update: Record<string, any>) => { updates.push(update); return subscription; } } };
  const dependencies = { stripe: () => fake as unknown as import("stripe").default };
  const actor = { uid: "fixture-staff", email: "staff@example.invalid" };
  await setAcademyTuitionExemption("card-exemption", "a", true, actor, "Fixture staff approval", dependencies);
  assert.equal(updates[0].items[0].quantity, 1); assert.equal(updates[0].proration_behavior, "none");
  await setAcademyTuitionExemption("card-exemption", "b", true, actor, "Fixture staff approval", dependencies);
  assert.deepEqual(updates[1], { pause_collection: { behavior: "void" }, proration_behavior: "none" });
  await setAcademyTuitionExemption("card-exemption", "b", true, actor, "Fixture staff approval", dependencies);
  assert.equal(updates.length, 2, "repeated exemption creates no second Stripe operation");
  assert.deepEqual(records.get(ledger), paid); assert.equal(records.get(path)?.enrollmentState, "active");
  subscription.metadata.academyFamilyUid = "wrong-family";
  await assert.rejects(setAcademyTuitionExemption("card-exemption", "a", false, actor, "Fixture staff approval", dependencies), /does not match/);
  assert.equal(updates.length, 2); assert.deepEqual(records.get(ledger), paid);
  assert.equal(records.has("academyBillingLocks/card-exemption"), false);
});
