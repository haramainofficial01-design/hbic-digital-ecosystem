import assert from "node:assert/strict";
import test from "node:test";
import { runAcademyCashReminders } from "../lib/academyNotifications";

type Dependencies = NonNullable<Parameters<typeof runAcademyCashReminders>[1]>;
type RecordData = Record<string, unknown>;

// Isolated fixtures: no production family, device, ledger or payment is written.
function fixture() {
  const records = new Map<string, RecordData>();
  const pushes: { tokens: string[]; period: unknown }[] = [];
  const emails = new Set<string>();
  const family = { id: "cash-parent", reference: "QA-AAAAAAAAAA", email: "parent@example.invalid", guardianName: "Local test",
    paymentChoice: "cash", enrollmentState: "active", cashReminderEligible: true,
    children: [{ id: "child-a" }, { id: "child-b" }] } as unknown as NonNullable<Awaited<ReturnType<Dependencies["family"]>>>;
  const snapshot = (path: string) => ({ id: path.split("/").at(-1)!, ref: ref(path), exists: records.has(path), data: () => records.get(path) });
  function ref(path: string): unknown {
    return { path, get: async () => snapshot(path), collection: (name: string) => query(`${path}/${name}`),
      create: async (value: RecordData) => { if (records.has(path)) throw Object.assign(new Error("exists"), { code: 6 }); records.set(path, value); },
      update: async (value: RecordData) => records.set(path, { ...records.get(path), ...value }), delete: async () => records.delete(path) };
  }
  function query(path: string, filter?: { key: string; value: unknown }): unknown {
    const result = { doc: (id: string) => ref(`${path}/${id}`), orderBy: () => result, limit: () => result,
      where: (key: string, _op: string, value: unknown) => query(path, { key, value }),
      get: async () => {
        const docs = [...records].filter(([key, value]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes("/") && (!filter || value[filter.key] === filter.value)).map(([key]) => snapshot(key));
        return { docs, size: docs.length };
      } };
    return result;
  }
  records.set("academyFamilies/cash-parent", { paymentChoice: "cash", firstCashPaidAt: "2026-10-01T18:00:00Z" });
  records.set("academyFamilies/card-parent", { paymentChoice: "card", firstCashPaidAt: "2026-10-01T18:00:00Z" });
  records.set("academyFamilies/cash-parent/months/2026-11", { status: "cash_due", amountCents: 10000 });
  const enableDevice = () => records.set("academyFamilies/cash-parent/devices/test-device", { enabled: true, reminderDelivery: "server", token: "ExpoPushToken[isolated-fixture]", platform: "ios" });
  const dependencies: Dependencies = {
    db: () => ({ collection: query }) as ReturnType<Dependencies["db"]>,
    family: async (id) => id === family.id ? family : null,
    pricing: async () => ({ tuitionMode: "per_child", monthlyCents: 5000, stripePriceId: "" }),
    enqueueEmail: async (message) => { const fresh = !emails.has(message.key); emails.add(message.key); return fresh; },
    sendPush: async (input, tokens) => {
      pushes.push({ tokens: tokens!.map((token) => token.token), period: input.data?.period });
      return { logId: "isolated-log", status: "sent", successCount: tokens!.length, failureCount: 0, tokenCount: tokens!.length, receiptCount: tokens!.length };
    },
    dispatchEmails: async () => ({ configured: false, sent: 0, failed: 0 })
  };
  return { records, family, pushes, emails, enableDevice, dependencies };
}

test("targets only the eligible cash parent and deduplicates the same month/stage", async () => {
  const f = fixture(); f.enableDevice();
  const before = structuredClone(f.records.get("academyFamilies/cash-parent/months/2026-11"));
  const now = new Date("2026-11-01T19:00:00Z");
  const first = await runAcademyCashReminders(now, f.dependencies);
  const second = await runAcademyCashReminders(now, f.dependencies);
  assert.equal(first.acceptedPushTokens, 1);
  assert.equal(second.acceptedPushTokens, 0);
  assert.deepEqual(f.pushes, [{ tokens: ["ExpoPushToken[isolated-fixture]"], period: "2026-11" }]);
  assert.equal(f.emails.size, 1);
  assert.deepEqual(first.email, { configured: false, sent: 0, failed: 0 });
  assert.deepEqual(f.records.get("academyFamilies/cash-parent/months/2026-11"), before);
});

test("ordinary days and the billing pause do not scan families or create reminders", async () => {
  for (const date of ["2026-11-15T19:00:00Z", "2027-02-01T19:00:00Z"]) {
    const f = fixture();
    f.dependencies.db = () => { throw new Error("No family scan should run on this date"); };
    const result = await runAcademyCashReminders(new Date(date), f.dependencies);
    assert.equal(result.checked, 0);
    assert.equal(result.acceptedPushTokens, 0);
    assert.equal(f.emails.size, 0);
  }
});

test("a parent enabling a device later that day can receive the reminder once", async () => {
  const f = fixture(); const now = new Date("2026-11-01T19:00:00Z");
  assert.equal((await runAcademyCashReminders(now, f.dependencies)).acceptedPushTokens, 0);
  f.enableDevice();
  assert.equal((await runAcademyCashReminders(now, f.dependencies)).acceptedPushTokens, 1);
  assert.equal((await runAcademyCashReminders(now, f.dependencies)).acceptedPushTokens, 0);
  assert.equal(f.emails.size, 1);
});

test("paid tuition, withdrawn families and the Ramadan billing pause suppress reminders", async () => {
  const f = fixture(); f.enableDevice();
  f.records.set("academyFamilies/cash-parent/months/2026-11", { status: "paid", amountCents: 10000 });
  await runAcademyCashReminders(new Date("2026-11-01T19:00:00Z"), f.dependencies);
  f.records.set("academyFamilies/cash-parent/months/2026-11", { status: "cash_due", amountCents: 10000 });
  f.family.enrollmentState = "withdrawn";
  await runAcademyCashReminders(new Date("2026-11-01T19:00:00Z"), f.dependencies);
  f.family.enrollmentState = "active";
  await runAcademyCashReminders(new Date("2027-02-01T19:00:00Z"), f.dependencies);
  assert.equal(f.pushes.length, 0); assert.equal(f.emails.size, 0);
});

test("a paid current month does not suppress the next unpaid month's advance reminder", async () => {
  const f = fixture(); f.enableDevice();
  f.records.set("academyFamilies/cash-parent/months/2026-10", { status: "paid", amountCents: 10000 });
  const result = await runAcademyCashReminders(new Date("2026-10-29T19:00:00Z"), f.dependencies);
  assert.equal(result.acceptedPushTokens, 1); assert.equal(f.pushes[0].period, "2026-11");
});
