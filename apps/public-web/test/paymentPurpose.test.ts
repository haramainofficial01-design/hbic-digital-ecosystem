import test from "node:test";
import assert from "node:assert/strict";
import { academyPaymentPurpose } from "../lib/paymentPurpose";
import { donationFunds } from "@hbic/shared";
import { donationCheckoutParameters } from "../lib/donationCheckoutPlan";
test("Academy labels show the exact tuition month without describing a donation", () => {
  assert.equal(academyPaymentPurpose("2026-10"), "HBIC — Quran Academy tuition · October 2026");
  assert.equal(academyPaymentPurpose("2027-01", true), "HBIC — Quran Academy tuition correction · January 2027");
  assert.throws(() => academyPaymentPurpose("2026-13"));
});
test("every donation has an immediately visible fund description, separate from tuition", () => {
  for (const fund of donationFunds) {
    const plan = donationCheckoutParameters(fund.id, "50");
    assert.equal(plan.payment_intent_data?.description, `HBIC — ${fund.title}`);
    assert.equal(plan.payment_intent_data?.metadata?.hbicPaymentKind, "donation");
    assert.equal(plan.payment_intent_data?.metadata?.donationCategory, fund.id);
    assert.equal(plan.payment_intent_data?.metadata?.academyFamilyUid, undefined);
    const submit = plan.custom_text?.submit;
    assert.ok(submit && typeof submit === "object");
    assert.equal(submit.message, `Your one-time CA$50.00 donation is for ${fund.title}. This is not Quran Academy tuition and does not enroll a child.`);
  }
});
