import test from "node:test";
import assert from "node:assert/strict";
import { donationFunds, donationAmountCents, donationUrl } from "@hbic/shared";
import { donationCheckoutParameters } from "../lib/donationCheckoutPlan";
test("donation amounts are exact cents and reject ambiguous, negative or excessive input", () => {
  for (const [amount, cents] of [["50",5000],["100",10000],["150",15000],["50.01",5001],["1.1",110]] as const)
    assert.equal(donationAmountCents(amount), cents);
  for (const amount of ["0","-50","1e4","50.001","10,00","10000.01",50,null,"<script>"])
    assert.equal(donationAmountCents(amount), null);
});
test("every fund creates a one-time CAD donation with matching Checkout, product and PaymentIntent categories", () => {
  for (const fund of donationFunds) for (const amount of ["50","100","150","73.25"]) {
    const plan = donationCheckoutParameters(fund.id, amount), item = plan.line_items![0];
    assert.equal(plan.mode,"payment"); assert.equal(item.quantity,1);
    assert.equal(item.price_data!.unit_amount,donationAmountCents(amount));
    assert.equal(item.price_data!.currency,"cad"); assert.equal(item.price_data!.recurring,undefined);
    assert.equal(plan.metadata!.donationCategory,fund.id);
    assert.deepEqual(plan.metadata,plan.payment_intent_data!.metadata);
    assert.deepEqual(plan.metadata,(item.price_data!.product_data as {metadata:unknown}).metadata);
    assert.equal(plan.subscription_data,undefined); assert.equal(plan.customer,undefined);
    assert.ok(plan.success_url!.startsWith("https://hbic.ca/donate?checkout="));
    assert.equal(plan.metadata!.academyFamilyUid,undefined);
  }
  assert.throws(()=>donationCheckoutParameters("invented","50"));
  assert.equal(donationUrl("youth",150),"https://hbic.ca/donate?fund=youth&amount=150");
});
