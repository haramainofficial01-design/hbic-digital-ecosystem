import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { build } from "esbuild";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../..");
async function store() {
  const result = await build({ bundle: true, write: false, platform: "node", format: "esm", packages: "external", stdin: { resolveDir: root, contents: `export * from './apps/public-web/lib/notificationStore'` }, plugins: [{ name: "strict-isolated-firestore", setup(b) {
    b.onResolve({ filter: /^\.\/contentStore$/ }, () => ({ path: "db", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const getDatabase=()=>globalThis.__notificationTestDb", loader: "js" }));
  } }] });
  return import(`data:text/javascript;base64,${Buffer.from(`${result.outputFiles[0].text}\n// ${Math.random()}`).toString("base64")}`);
}
function database() {
  const docs = new Map<string, any>(); let next = 0; const events: string[] = [];
  let failWrites = false;
  const strict = (value: any) => { if (value === undefined) throw Error("Firestore undefined"); if (value && typeof value === "object") for (const item of Object.values(value)) strict(item); };
  const ref = (collection: string, id: string) => ({ id, async get() { const value = docs.get(`${collection}/${id}`); return { exists: Boolean(value), data: () => value }; },
    async set(value: any, options: any = {}) { strict(value); if (failWrites) throw Error("Storage unavailable"); events.push(`write:${collection}`); docs.set(`${collection}/${id}`, options.merge ? { ...docs.get(`${collection}/${id}`), ...value } : value); },
    async create(value: any) { if (docs.has(`${collection}/${id}`)) throw Error("already exists"); await this.set(value); }, async delete() { docs.delete(`${collection}/${id}`); }
  });
  const collection = (name: string) => ({ doc: (id?: string) => ref(name, id ?? `log-${++next}`), where: (field: string, op: string, value: any) => ({ get: async () => ({ docs: [...docs].filter(([id, data]) => id.startsWith(`${name}/`) && data[field] === value).map(([, data]) => ({ data: () => data })) }) }) });
  // Sequential transaction fixture; source uses real Firestore transaction locking.
  const db = { collection, runTransaction: async (fn: any) => fn({ get: (ref: any) => ref.get(), create: (ref: any, data: any) => { strict(data); if (failWrites) throw Error("Storage unavailable"); events.push("intent"); docs.set(`pushNotificationLogs/${ref.id}`, data); } }) };
  return { db, docs, events, fail: (value: boolean) => { failWrites = value; } };
}
test("ordinary/nested notification logs are valid before Expo, audiences are safe, and retry never redispatches", async () => {
  const module = await store(), fake = database(); (globalThis as any).__notificationTestDb = fake.db;
  const original = globalThis.fetch; let sends = 0; let receipts: any = {};
  const tokens = ["ios", "android"].map(platform => ({ token: `ExponentPushToken[fixture-${platform}]`, platform, preferences: { announcements: true }, enabled: true, createdAt: "", updatedAt: "", appVersion: "1.7.6" }));
  tokens.forEach(token => fake.docs.set(`pushTokens/${Buffer.from(token.token).toString("base64url")}`, token));
  globalThis.fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body));
    if (String(input).endsWith("getReceipts")) return Response.json({ data: receipts });
    assert.ok(fake.events.includes("intent"), "durable log exists before send"); sends++; fake.events.push("expo");
    return Response.json({ data: body.map((_: any, index: number) => ({ status: "ok", id: `ticket-${sends}-${index}` })) });
  };
  try {
    const input = { title: "Community", body: "Fixture", audience: "Everyone", type: "announcement", data: undefined, requestId: "fixture-request-0001", actorKey: "fixture-admin" };
    const first = await module.sendPushNotification(input);
    assert.equal(first.acceptedCount, 2); assert.equal(first.pendingCount, 2); assert.equal(sends, 1);
    assert.equal((await module.sendPushNotification(input)).replayed, true); assert.equal(sends, 1);
    await assert.rejects(module.sendPushNotification({ ...input, body: "Different" }), /different content/);
    receipts = { "ticket-1-0": { status: "ok" }, "ticket-1-1": { status: "error", details: { error: "DeviceNotRegistered" } } };
    const checked = await module.checkPushNotificationReceipts(first.logId);
    assert.equal(checked.deliveredCount, 1); assert.equal(checked.failedCount, 1); assert.equal(checked.pendingCount, 0);
    receipts = {}; assert.equal((await module.checkPushNotificationReceipts(first.logId)).deliveredCount, 1, "final receipts retained after Expo expiry");
    for (const audience of ["Youth", "Sisters", "Volunteers", "Admins", "invalid"]) await assert.rejects(module.sendPushNotification({ ...input, audience }), /audience/);
    const androidId = Buffer.from(tokens[1].token).toString("base64url"); fake.docs.get(`pushTokens/${androidId}`).enabled = true;
    const android = await module.sendPushNotification({ ...input, audience: "Android", requestId: "fixture-request-0002", data: { nested: { missing: undefined, array: [undefined, "ok"] } } });
    assert.equal(android.tokenCount, 1);
    fake.fail(true); const before = sends;
    await assert.rejects(module.sendPushNotification({ ...input, requestId: "fixture-request-0003" }), /Storage unavailable/);
    assert.equal(sends, before, "no send on failed preflight storage"); fake.fail(false);
    globalThis.fetch = async () => { sends++; throw Error("Network timeout after possible acceptance"); };
    const uncertain = await module.sendPushNotification({ ...input, requestId: "fixture-request-0004" });
    assert.equal(uncertain.status, "dispatch_unknown"); assert.equal(uncertain.failureCount, 0);
    const after = sends; await module.sendPushNotification({ ...input, requestId: "fixture-request-0004" }); assert.equal(sends, after);
  } finally { globalThis.fetch = original; delete (globalThis as any).__notificationTestDb; }
});

test("private tests require registered device proof and valid unexpired pairing; never select latest or broadcast", async () => {
  const module = await store(), fake = database(); (globalThis as any).__notificationTestDb = fake.db;
  const token = "ExponentPushToken[authorized-fixture]", installationId = "installation-fixture", id = Buffer.from(token).toString("base64url");
  fake.docs.set(`pushTokens/${id}`, { token, platform: "ios", enabled: true, installationIdHash: createHash("sha256").update(installationId).digest("base64url"), preferences: {}, createdAt: "", updatedAt: "" });
  const original = globalThis.fetch; let sent = 0;
  globalThis.fetch = async (_, init) => { const messages = JSON.parse(String(init?.body)); assert.equal(messages.length, 1); assert.equal(messages[0].to, token); sent++; return Response.json({ data: [{ status: "ok", id: "private-ticket" }] }); };
  try {
    await assert.rejects(module.createPrivatePushTestCode({ token, installationId: "wrong" }), /verified/);
    const pair = await module.createPrivatePushTestCode({ token, installationId });
    assert.match(pair.code, /^[A-F0-9]{12}$/);
    const result = await module.sendPrivatePushTestCode({ code: pair.code, requestId: "private-request-0001", actorKey: "fixture-admin" });
    assert.equal(result.tokenCount, 1); assert.equal(sent, 1);
    await module.sendPrivatePushTestCode({ code: pair.code, requestId: "private-request-0001", actorKey: "fixture-admin" }); assert.equal(sent, 1);
    const target = fake.docs.get(`pushTestTargets/${createHash("sha256").update(pair.code).digest("hex")}`); target.expiresAt = "2020-01-01T00:00:00Z";
    await assert.rejects(module.sendPrivatePushTestCode({ code: pair.code }), /expired/);
    await assert.rejects(module.sendPrivatePushTest({ token, platform: "android" }), /correct platform/);
    assert.equal(sent, 1);
  } finally { globalThis.fetch = original; delete (globalThis as any).__notificationTestDb; }
});

test("receipt pending/error counts include rejected tickets and failed receipts, not only successes", async () => {
  const module = await store(), fake = database(); (globalThis as any).__notificationTestDb = fake.db;
  const tokens = [0, 1, 2].map(index => ({ token: `ExponentPushToken[receipt-${index}]`, platform: "android", preferences: {}, enabled: true, createdAt: "", updatedAt: "" }));
  const original = globalThis.fetch;
  globalThis.fetch = async input => String(input).endsWith("getReceipts") ? Response.json({ data: { "known-ticket": { status: "ok" } } }) : Response.json({ data: [{ status: "ok", id: "known-ticket" }, { status: "ok", id: "pending-ticket" }, { status: "error", details: { error: "MessageTooBig" } }] });
  try {
    const result = await module.sendPushNotification({ title: "Test", body: "Fixture", audience: "All" }, tokens);
    assert.equal(result.successCount, 2); assert.equal(result.failureCount, 1);
    const receipts = await module.checkPushNotificationReceipts(result.logId);
    assert.equal(receipts.acceptedCount, 2); assert.equal(receipts.deliveredCount, 1); assert.equal(receipts.failedCount, 1); assert.equal(receipts.pendingCount, 1);
    await assert.rejects(module.checkPushNotificationReceipts(result.logId, { privateTestOnly: true }), /private test/);
  } finally { globalThis.fetch = original; delete (globalThis as any).__notificationTestDb; }
});
