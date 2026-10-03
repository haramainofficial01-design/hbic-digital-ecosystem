import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
import { handleAcademyWebhook } from "../lib/academyWebhook";

const stripe = new Stripe("sk_test_local_unit_test_only");
const secret = "whsec_local_unit_test_only";
const raw = JSON.stringify({ id: "evt_local_test", type: "invoice.paid", data: { object: { id: "in_local_test" } }, livemode: false });
const signature = () => stripe.webhooks.generateTestHeaderString({ payload: raw, secret });
const request = (body = raw, header = signature()) => new Request("https://hbic.ca/api/academy/stripe-webhook", {
  method: "POST", body, headers: { "stripe-signature": header }
});
const verify = (body: string, header: string) => stripe.webhooks.constructEvent(body, header, secret);

test("accepts Stripe's signed raw payload without mutation and logs only event identifiers", async () => {
  const logs: unknown[] = [];
  const response = await handleAcademyWebhook(request(), { configured: () => true, verify,
    apply: async (event) => { assert.equal(event.id, "evt_local_test"); }, log: (record) => logs.push(record) });
  assert.equal(response.status, 200);
  assert.deepEqual(logs, [{ stage: "processed", eventId: "evt_local_test", eventType: "invoice.paid" }]);
});
test("rejects a mutated body or the other endpoint's signature before processing", async () => {
  for (const incoming of [request(raw + " "), request(raw, stripe.webhooks.generateTestHeaderString({ payload: raw, secret: "whsec_other_endpoint" }))]) {
    let applied = false;
    const response = await handleAcademyWebhook(incoming, { configured: () => true, verify,
      apply: async () => { applied = true; }, log: () => undefined });
    assert.equal(response.status, 400);
    assert.equal(applied, false);
  }
});
test("configuration and database outages are retryable and reveal no internal error", async () => {
  const dependencies = { configured: () => true, verify, apply: async () => { throw new Error("private database detail"); }, log: () => undefined };
  const response = await handleAcademyWebhook(request(), dependencies);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { ok: false });
  assert.equal((await handleAcademyWebhook(request(), { ...dependencies, configured: () => false })).status, 503);
});
