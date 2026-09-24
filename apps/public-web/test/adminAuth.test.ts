import assert from "node:assert/strict";
import test from "node:test";
import { requireAdminSecret } from "../lib/api";

function requestWithBasic(email: string, password: string) {
  const value = Buffer.from(`${email}:${password}`).toString("base64");
  return new Request("https://hbic.ca/api/admin/content/draft", { headers: { authorization: `Basic ${value}` } });
}

test("shared HBIC email and password authorize protected APIs during migration", async () => {
  const previous = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
  process.env.ADMIN_EMAIL = "admin@hbic.ca";
  process.env.ADMIN_PASSWORD = "correct-password";
  try {
    assert.equal((await requireAdminSecret(requestWithBasic("ADMIN@HBIC.CA", "correct-password"))).ok, true);
    assert.equal((await requireAdminSecret(requestWithBasic("admin@hbic.ca", "wrong-password"))).ok, false);
    assert.equal((await requireAdminSecret(new Request("https://hbic.ca", { headers: { "x-admin-secret": "old-key" } }))).ok, false);
  } finally {
    if (previous.email === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = previous.email;
    if (previous.password === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = previous.password;
  }
});

test("invalid sign-in uses one non-enumerating error", async () => {
  const previousEmail = process.env.ADMIN_EMAIL;
  const previousPassword = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_EMAIL = "admin@hbic.ca";
  process.env.ADMIN_PASSWORD = "correct-password";
  try {
    const result = await requireAdminSecret(requestWithBasic("unknown@example.com", "wrong-password"));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.response.status, 401);
      assert.deepEqual(await result.response.json(), {
        ok: false,
        error: "Unable to sign in. Check your credentials and try again."
      });
    }
  } finally {
    if (previousEmail === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = previousEmail;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = previousPassword;
  }
});
