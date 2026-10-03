import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const marker = require.resolve("server-only");
require.cache[marker] = { id: marker, filename: marker, loaded: true, exports: {} } as NodeModule;

test("production gate blocks demo issuance; real API creation is idempotent and mismatched objects are rejected", async () => {
  const { createGoogleAcademyPass } = await import("../lib/academyGoogleWallet");
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify({ client_email: "firebase-adminsdk-fbsvc@hbic-calgary-prod.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) });
  process.env.ACADEMY_GOOGLE_WALLET_ISSUER_ID = "3388000000023198109";
  delete process.env.ACADEMY_GOOGLE_WALLET_READY;
  const family = { passToken: "A".repeat(43), reference: "QA-AAAAAAAAAA" };
  await assert.rejects(createGoogleAcademyPass(family), /publishing is not enabled/);
  const original = globalThis.fetch;
  const stored = new Map<string, Record<string, unknown>>();
  let authorizations = 0;
  let creates = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://oauth2.googleapis.com/token") { authorizations++; return Response.json({ access_token: "isolated-test-token", expires_in: 3600 }); }
    assert.ok(url.startsWith("https://walletobjects.googleapis.com/walletobjects/v1/"));
    if (init?.method === "POST") { const body = JSON.parse(String(init.body)); creates++; stored.set(body.id, body); return Response.json(body); }
    const id = decodeURIComponent(url.split("/").at(-1)!);
    return stored.has(id) ? Response.json(stored.get(id)) : Response.json({}, { status: 404 });
  };
  try {
    process.env.ACADEMY_GOOGLE_WALLET_READY = "true";
    const first = await createGoogleAcademyPass(family);
    const second = await createGoogleAcademyPass(family);
    assert.ok(first.startsWith("https://pay.google.com/gp/v/save/"));
    assert.ok(second.startsWith("https://pay.google.com/gp/v/save/"));
    assert.equal(authorizations, 1);
    assert.equal(creates, 2); // One class, one object, no duplicate issuance writes.
    const object = [...stored.values()].find(o => o.barcode);
    assert.ok(object);
    object.state = "EXPIRED";
    await assert.rejects(createGoogleAcademyPass(family), /inactive or replaced/);
    object.state = "ACTIVE";
    object.barcode = { value: "https://hbic.ca/a/replaced" };
    await assert.rejects(createGoogleAcademyPass(family), /inactive or replaced/);
  } finally {
    globalThis.fetch = original;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    delete process.env.ACADEMY_GOOGLE_WALLET_READY;
    delete process.env.ACADEMY_GOOGLE_WALLET_ISSUER_ID;
  }
});
