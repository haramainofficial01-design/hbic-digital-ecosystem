import assert from "node:assert/strict";
import test from "node:test";
import { requestAcademyPasswordReset } from "../lib/academyParentActions";
import { cashConversionWasApplied, expireUnpaidAcademyCheckout, pendingAcademyRegistrationMatches } from "../lib/academyCheckoutState";

test("forgot-password action sends the entered parent address and gives neutral success feedback", async () => {
  let sentTo = "";
  const message = await requestAcademyPasswordReset("  Parent@Example.com ", async (email) => { sentTo = email; });
  assert.equal(sentTo, "parent@example.com");
  assert.match(message, /reset link has been sent/);
});

test("cash conversion expires an unpaid Checkout and accepts an already-expired retry", async () => {
  let status: "open" | "expired" = "open";
  let expireCalls = 0;
  await expireUnpaidAcademyCheckout("cs_test", async (id) => ({ id, status }), async () => { expireCalls += 1; status = "expired"; });
  assert.equal(expireCalls, 1);
  await expireUnpaidAcademyCheckout("cs_test", async (id) => ({ id, status }), async () => { throw new Error("already expired"); });
  assert.equal(status, "expired");
});

test("cash conversion refuses completed payment or a Checkout still processing", async () => {
  await assert.rejects(expireUnpaidAcademyCheckout("cs_test", async (id) => ({ id, status: "complete" }), async () => undefined), /already completed/);
  await assert.rejects(expireUnpaidAcademyCheckout("cs_test", async (id) => ({ id, status: "open" }), async () => undefined), /still processing/);
});

test("pending IDs reject stale forms and repeated cash conversion identifies the existing family", () => {
  assert.equal(pendingAcademyRegistrationMatches("registration-current", "registration-current"), true);
  assert.equal(pendingAcademyRegistrationMatches("registration-stale", "registration-current"), false);
  const convertedFamily = { cashConversionFromRegistrationId: "registration-current" };
  assert.equal(cashConversionWasApplied(convertedFamily, "registration-current"), true);
  assert.equal(cashConversionWasApplied(convertedFamily, "another-registration"), false);
});

test("Checkout completion during expiry makes cash preflight fail", async () => {
  let status = "open";
  await assert.rejects(expireUnpaidAcademyCheckout("cs_test", async (id) => ({ id, status }), async () => {
    status = "complete"; // Checkout completed while the cash request was expiring it.
    throw new Error("Stripe reports Checkout is complete");
  }), /still processing/);
});

test("forgot-password action handles missing, invalid, and delivery-error cases", async () => {
  assert.match(await requestAcademyPasswordReset(" ", async () => assert.fail("must not send")), /Enter your parent email/);
  assert.match(await requestAcademyPasswordReset("bad", async () => { throw { code: "auth/invalid-email" }; }), /valid parent email/);
  assert.match(await requestAcademyPasswordReset("parent@example.com", async () => { throw new Error("private detail"); }), /couldn’t send/);
});
