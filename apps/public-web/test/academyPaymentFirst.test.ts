import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { academyBillableChildCount } from "@hbic/shared";
import { academyPaymentFirstCheckout, academyPaymentFirstPlan, academyRecurringSubscription } from "../lib/academyPaymentFirst";
const now = new Date("2026-10-06T18:00:00Z"), anchor = Date.UTC(2026, 10, 1, 12) / 1000;
const input = { uid: "fixture", registrationId: "a".repeat(24), customerId: "cus_test", email: "fake@example.invalid", priceId: "price_test", quantity: 1, monthlyCents: 5000, startPeriod: "2026-10", origin: "https://preview.example.invalid", now };
test("current-month Checkout pays full tuition once, saves a card, and never starts a trial", () => {
  for (const quantity of [1, 2, 3]) {
    const checkout = academyPaymentFirstCheckout({ ...input, quantity });
    assert.equal(checkout.mode, "payment"); assert.equal(checkout.submit_type, "pay");
    assert.deepEqual(checkout.payment_method_types, ["card"]);
    assert.equal(checkout.payment_intent_data?.setup_future_usage, "off_session");
    assert.equal(checkout.line_items?.length, 1); assert.equal(checkout.line_items?.[0].price_data?.unit_amount, quantity * 5000);
    assert.equal(checkout.line_items?.[0].price_data?.recurring, undefined);
    assert.equal(checkout.subscription_data, undefined);
    assert.match((checkout.custom_text?.submit && typeof checkout.custom_text.submit === "object" ? checkout.custom_text.submit.message : ""), /November 1, 2026/);
    assert.doesNotMatch(JSON.stringify(checkout), /trial|klarna|proration_behavior/i);
  }
  assert.equal(academyPaymentFirstPlan(5000, 1, "2026-10", false, new Date("2026-10-01T18:00:00Z")).dueNowCents, 5000);
});
test("next-month Checkout saves the card without any tuition, trial, or enrollment charge", () => {
  const checkout = academyPaymentFirstCheckout({ ...input, startPeriod: "2026-11", now: new Date("2026-10-30T18:00:00Z") });
  assert.equal(checkout.mode, "setup"); assert.equal(checkout.line_items, undefined); assert.equal(checkout.payment_intent_data, undefined);
  assert.ok(checkout.setup_intent_data); assert.equal(Number(checkout.metadata?.academyRecurringAnchor), anchor);
  assert.equal(Number(checkout.metadata?.academyInitialAmountCents), 0);
  assert.doesNotMatch(JSON.stringify(checkout), /trial/i);
});
test("recurring API starts on next 1st with full tuition, no proration, no trial, and no February charge", () => {
  const params = academyRecurringSubscription({ customerId: "cus", paymentMethodId: "pm", priceId: "price", quantity: 3,
    anchor, termStop: Date.UTC(2027, 1, 1, 7) / 1000, uid: "fixture", registrationId: input.registrationId, startPeriod: "2026-10" });
  assert.equal(params.billing_cycle_anchor, anchor); assert.equal(params.proration_behavior, "none");
  assert.equal(params.items?.[0].quantity, 3); assert.equal(params.default_payment_method, "pm"); assert.equal(params.trial_end, undefined);
  assert.equal(academyPaymentFirstPlan(5000, 1, "2027-01", false, new Date("2027-01-06T18:00:00Z")).recurringAnchor, null);
});
test("teacher-child exemptions are excluded without removing the child from enrollment", () => {
  const children = [{ tuitionExempt: true }, {}, { cancelEffectiveAt: "2026-10-01T12:00:00Z" }];
  assert.equal(academyBillableChildCount(children, now.getTime()), 1); assert.equal(children.length, 3);
});

// Exercise actual webhook/store functions against isolated, transactional memory.
const require = createRequire(import.meta.url);
const records = new Map<string, Record<string, any>>();
let sequence = 0, failSubscription = false, subscriptionCreates = 0;
const snapshot = (path: string) => ({ ref: ref(path), id: path.split("/").at(-1), exists: records.has(path), data: () => structuredClone(records.get(path)) });
function ref(path: string): any { return { path, id: path.split("/").at(-1), get: async () => snapshot(path), collection: (name: string) => collection(`${path}/${name}`),
  set: async (v: any, options?: any) => records.set(path, options?.merge ? { ...records.get(path), ...v } : v),
  update: async (v: any) => records.set(path, { ...records.get(path), ...v }), create: async (v: any) => { if (records.has(path)) throw Error("Duplicate create"); records.set(path, v); }, delete: async () => records.delete(path) }; }
function collection(path: string): any { return { doc: (id?: string) => ref(`${path}/${id ?? `fixture-${++sequence}`}`),
  get: async () => ({ docs: [...records.keys()].filter(k => k.startsWith(path + "/") && !k.slice(path.length + 1).includes("/")).map(snapshot) }) }; }
const db = { collection, runTransaction: async (callback: any) => {
  const writes: (() => void)[] = [];
  const result = await callback({ get: (r: any) => r.get(), set: (r: any, v: any, o?: any) => writes.push(() => { records.set(r.path, o?.merge ? { ...records.get(r.path), ...v } : v); }),
    update: (r: any, v: any) => writes.push(() => { records.set(r.path, { ...records.get(r.path), ...v }); }),
    create: (r: any, v: any) => writes.push(() => { if (records.has(r.path)) throw Error("Duplicate create"); records.set(r.path, v); }), delete: (r: any) => writes.push(() => { records.delete(r.path); }) });
  writes.forEach(write => write()); return result;
} };
require("firebase-admin/app").initializeApp({ projectId: "hbic-payment-first-memory-test" });
require("firebase-admin/firestore").getFirestore = () => db;
process.env.FIREBASE_PROJECT_ID = "hbic-payment-first-memory-test"; process.env.GOOGLE_APPLICATION_CREDENTIALS = "not-a-credential";
process.env.ACADEMY_PREVIEW_ENABLED = "true"; process.env.ACADEMY_STRIPE_RESTRICTED_KEY = "sk_test_memory";
let session: any, subscription: any;
const fakeStripe = {
  checkout: { sessions: { retrieve: async () => session } },
  paymentIntents: { retrieve: async () => ({ id: "pi_fixture", amount_received: 5000, status: "succeeded", currency: "cad", customer: "cus_test", payment_method: "pm_fixture", metadata: session.metadata }) },
  setupIntents: { retrieve: async () => ({ id: "seti_fixture", status: "succeeded", customer: "cus_test", payment_method: "pm_fixture", metadata: session.metadata }) },
  paymentMethods: { retrieve: async () => ({ id: "pm_fixture", type: "card", customer: "cus_test" }) },
  invoices: { retrieve: async () => ({ id: "in_initial", hosted_invoice_url: "https://invoice.stripe.com/test" }) },
  subscriptions: { list: () => ({ async *[Symbol.asyncIterator]() { if (subscription) yield subscription; } }),
    retrieve: async () => subscription,
    create: async (params: any, options: any) => { assert.match(options.idempotencyKey, /academy-recurring-test-/); if (failSubscription) throw Error("Simulated recurring setup outage"); subscriptionCreates++;
      subscription = { id: "sub_fixture", livemode: false, status: "active", customer: params.customer, metadata: params.metadata,
        billing_cycle_anchor: params.billing_cycle_anchor, cancel_at: params.cancel_at, items: { data: [{ id: "si_fixture", quantity: params.items[0].quantity, price: { id: params.items[0].price } }] } }; return subscription; },
    update: async (_id: string, params: any) => { if (params.items) subscription.items.data[0].quantity = params.items[0].quantity; subscription.pause_collection = params.pause_collection; return subscription; }
  }
};
const Module = require("node:module"), originalLoad = Module._load;
Module._load = function(name: string, ...args: any[]) { if (name === "stripe") return class { constructor() { return fakeStripe; } }; return originalLoad.call(this, name, ...args); };
function seed(mode: "payment" | "setup") {
  records.clear(); subscription = null; subscriptionCreates = 0; failSubscription = false;
  const params = academyPaymentFirstCheckout({ ...input, startPeriod: mode === "setup" ? "2026-11" : "2026-10" });
  session = { id: "cs_fixture", customer: "cus_test", mode, status: "complete", payment_status: mode === "payment" ? "paid" : "no_payment_required",
    amount_total: mode === "payment" ? 5000 : 0, livemode: false, metadata: params.metadata, payment_intent: "pi_fixture", setup_intent: "seti_fixture", invoice: "in_initial" };
  records.set("academySettings/config", { tuitionMode: "per_child", monthlyCents: 5000 });
  records.set("academyPendingRegistrations/fixture", { registrationId: input.registrationId, paymentChoice: "card", guardianName: "Fake Parent", email: "fake@example.invalid", phone: "4035550123",
    children: [{ name: "Fake Child", age: 8, level: "qaida" }], enrollmentStartPeriod: mode === "setup" ? "2026-11" : "2026-10", createdAt: now.toISOString(), stripeCheckoutSessionId: session.id });
}
const event = () => ({ id: "evt_checkout", type: "checkout.session.completed", livemode: false, created: now.getTime() / 1000, data: { object: session } }) as any;
test("payment remains paid during setup failure; retry/replay creates exactly one subscription, family, pass and receipt", async () => {
  const { applyAcademyStripeEvent, setAcademyTuitionExemption } = await import("../lib/academyStripe");
  seed("payment"); failSubscription = true;
  await assert.rejects(applyAcademyStripeEvent(event()), /outage/);
  assert.equal(records.get("academyFamilies/fixture/months/2026-10")?.amountCents, 5000);
  assert.equal(records.get("academyFamilies/fixture")?.billingSetupState, "attention");
  assert.equal(subscriptionCreates, 0); failSubscription = false;
  await applyAcademyStripeEvent(event()); await applyAcademyStripeEvent(event());
  await applyAcademyStripeEvent({ ...event(), id: "evt_initial_invoice", type: "invoice.paid", data: { object: { id: "in_initial", metadata: session.metadata } } });
  assert.equal(subscriptionCreates, 1);
  assert.equal([...records.keys()].filter(k => /^academyFamilies\/[^/]+$/.test(k)).length, 1);
  assert.equal([...records.keys()].filter(k => k.startsWith("academyPasses/")).length, 1);
  assert.equal([...records.values()].filter(v => v.kind === "card_receipt").length, 1);
  assert.equal([...records.values()].filter(v => v.kind === "enrollment_confirmed").length, 0);
  assert.equal(records.get("academyFamilies/fixture/months/2026-10")?.amountCents, 5000);
  const childId = records.get("academyFamilies/fixture")!.children[0].id;
  await setAcademyTuitionExemption("fixture", childId, true, { uid: "staff", email: "staff@example.invalid" });
  assert.equal(subscription.pause_collection.behavior, "void");
  assert.equal(records.get("academyFamilies/fixture/months/2026-10")?.amountCents, 5000); // real historical payment stays true
  assert.equal(records.get("academyFamilies/fixture")?.children[0].tuitionExempt, true);
});
test("cancelled Checkout cannot create enrollment or recurring billing", async () => {
  const { applyAcademyStripeEvent } = await import("../lib/academyStripe"); seed("payment"); session.status = "expired"; session.payment_status = "unpaid";
  await assert.rejects(applyAcademyStripeEvent(event()), /not confirmed/);
  assert.equal(subscriptionCreates, 0); assert.equal(records.has("academyFamilies/fixture"), false);
});
test("successful setup creates only scheduled recurring billing; first nonzero paid invoice creates enrollment", async () => {
  const { applyAcademyStripeEvent } = await import("../lib/academyStripe"); seed("setup");
  await applyAcademyStripeEvent(event()); await applyAcademyStripeEvent(event());
  assert.equal(subscriptionCreates, 1); assert.equal(records.has("academyFamilies/fixture"), false);
  const invoiceEvent = { id: "evt_first_invoice", type: "invoice.paid", livemode: false, created: anchor, data: { object: {
    id: "in_first_month", customer: "cus_test", parent: { subscription_details: { subscription: "sub_fixture" } },
    amount_paid: 5000, billing_reason: "subscription_cycle", lines: { data: [{ period: { start: anchor } }] } } } } as any;
  await applyAcademyStripeEvent(invoiceEvent); await applyAcademyStripeEvent(invoiceEvent);
  assert.equal(records.get("academyFamilies/fixture/months/2026-11")?.amountCents, 5000);
  assert.equal([...records.keys()].filter(k => k.startsWith("academyPasses/")).length, 1);
});
test("staff fee exemption sets unpaid tuition to zero without a receipt and permits one welcome after confirmation", async () => {
  const { setAcademyTuitionExemption } = await import("../lib/academyStripe");
  const { confirmAcademyEnrollment } = await import("../lib/academyStore");
  records.clear();
  const period = new Date().toLocaleDateString("en-CA", { timeZone: "America/Edmonton" }).slice(0, 7);
  records.set("academySettings/config", { tuitionMode: "per_child", monthlyCents: 5000 });
  records.set("academyFamilies/exempt", { reference: "QA-EXEMPT", registrationId: "e".repeat(24), guardianName: "Fake Teacher", email: "teacher@example.invalid", phone: "4035550123",
    children: [{ id: "child", name: "Teacher Child", age: 8, level: "qaida" }], enrollmentStartPeriod: period, paymentChoice: "cash", enrollmentState: "conditional", passToken: "exempt-fixture", createdAt: now.toISOString() });
  records.set(`academyFamilies/exempt/months/${period}`, { period, method: "cash", amountCents: 5000, status: "cash_due" });
  const actor = { uid: "staff", email: "staff@example.invalid" };
  await assert.rejects(confirmAcademyEnrollment("exempt", actor), /receive and record/);
  await setAcademyTuitionExemption("exempt", "child", true, actor);
  assert.equal(records.get(`academyFamilies/exempt/months/${period}`)?.amountCents, 0);
  assert.equal(records.get(`academyFamilies/exempt/months/${period}`)?.status, "not_due");
  assert.equal([...records.values()].filter(v => v.kind === "enrollment_confirmed").length, 0);
  await confirmAcademyEnrollment("exempt", actor); await confirmAcademyEnrollment("exempt", actor);
  assert.equal(records.get("academyFamilies/exempt")?.enrollmentState, "active");
  assert.equal([...records.values()].filter(v => v.kind === "enrollment_confirmed").length, 1);
  assert.equal([...records.keys()].filter(k => k.startsWith("academyReceipts/")).length, 0);
});
test("prepaid future tuition is not collected a second time", () => {
  const plan = academyPaymentFirstPlan(5000, 1, "2026-11", true, now);
  assert.equal(plan.mode, "setup"); assert.equal(plan.dueNowCents, 0);
  assert.equal(plan.recurringAnchor, Date.UTC(2026, 11, 1, 12) / 1000);
});
test("repeated cash conversion returns the same registration before parsing a partial retry body", async () => {
  const { registerAcademyFamily } = await import("../lib/academyStore");
  const uid = "exempt", registrationId = "e".repeat(24);
  process.env.ACADEMY_REGISTRATION_READY = "true";
  records.set("academyFamilies/exempt", { ...records.get("academyFamilies/exempt"), cashConversionFromRegistrationId: registrationId });
  const before = records.size;
  const repeated = await registerAcademyFamily(uid, "teacher@example.invalid", { paymentChoice: "cash" }, { registrationId, checkoutSessionId: null });
  assert.equal(repeated?.reference, "QA-EXEMPT"); assert.equal(records.size, before);
});

test("Checkout owns new customer creation in payment/setup modes; existing customers are reused without conflicting fields", () => {
  for (const startPeriod of ["2026-10", "2026-11"]) {
    const fresh = academyPaymentFirstCheckout({ ...input, customerId: undefined, startPeriod });
    assert.equal(fresh.customer, undefined); assert.equal(fresh.customer_creation, "always"); assert.equal(fresh.customer_email, input.email);
    const existing = academyPaymentFirstCheckout({ ...input, startPeriod });
    assert.equal(existing.customer, "cus_test"); assert.equal(existing.customer_creation, undefined); assert.equal(existing.customer_email, undefined);
  }
});
test("new pending Checkout opens without any Customer API calls and persists only its session before payment", async () => {
  const { startAcademyPendingCheckout } = await import("../lib/academyStripe");
  process.env.ACADEMY_REGISTRATION_READY = "true";
  process.env.ACADEMY_STRIPE_BILLING_READY = "true";
  process.env.ACADEMY_STRIPE_WEBHOOK_SECRET = "whsec_memory";
  process.env.ACADEMY_STRIPE_PRICE_ID = "price_memory";
  Object.assign(fakeStripe, {
    customers: { create: async () => { throw Error("Customer Write forbidden"); }, retrieve: async () => { throw Error("Customer Read unnecessary"); } },
    prices: { retrieve: async () => ({ id: "price_memory", active: true, livemode: false, currency: "cad", unit_amount: 5000, recurring: { interval: "month" } }) }
  });
  let created: any;
  Object.assign(fakeStripe.checkout.sessions, { create: async (params: any) => { created = params; return { id: "cs_unpaid", url: "https://checkout.stripe.com/test", livemode: false }; } });
  for (const customerId of [undefined, "cus_saved"]) {
    records.clear();
    records.set("academyPendingRegistrations/fixture", { registrationId: input.registrationId, paymentChoice: "card", email: input.email,
      enrollmentStartPeriod: "2026-10", children: [{ name: "Fake Child", age: 8 }] , ...(customerId ? { stripeCustomerId: customerId } : {}) });
    assert.equal(await startAcademyPendingCheckout("fixture"), "https://checkout.stripe.com/test");
    assert.equal(created.customer, customerId); assert.equal(created.customer_creation, customerId ? undefined : "always");
    assert.equal(records.get("academyPendingRegistrations/fixture")?.stripeCustomerId, customerId);
    assert.equal(records.get("academyPendingRegistrations/fixture")?.stripeCheckoutSessionId, "cs_unpaid");
    assert.equal(records.has("academyFamilies/fixture"), false);
  }
});
