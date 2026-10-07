import type Stripe from "stripe";
import { academyTuitionTotalCents, calgaryBillingPeriod, nextCalgaryFirstBillingAnchor, ACADEMY_LAST_BILLING_MONTH, ACADEMY_TUITION_POLICY_VERSION } from "@hbic/shared";

export const ACADEMY_PAYMENT_FIRST_FLOW = "payment-first-v1";
export function academyPaymentFirstPlan(monthlyCents: number, quantity: number, startPeriod: string, monthPaid = false, now = new Date()) {
  if (!/^\d{4}-\d{2}$/.test(startPeriod)) throw new Error("Invalid Academy start month.");
  const current = calgaryBillingPeriod(now);
  const monthlyTotalCents = academyTuitionTotalCents(monthlyCents, quantity);
  const futureStart = startPeriod > current;
  const anchor = futureStart ? Math.floor(Date.UTC(Number(startPeriod.slice(0, 4)), Number(startPeriod.slice(5)) - 1 + (monthPaid ? 1 : 0), 1, 12) / 1000) : nextCalgaryFirstBillingAnchor(now);
  const recurringAnchor = calgaryBillingPeriod(new Date(anchor * 1000)) <= ACADEMY_LAST_BILLING_MONTH ? anchor : null;
  return { mode: !futureStart && !monthPaid ? "payment" as const : "setup" as const,
    dueNowCents: !futureStart && !monthPaid ? monthlyTotalCents : 0, monthlyTotalCents, recurringAnchor, startPeriod };
}
export function academyMonthLabel(period: string) {
  return new Date(`${period}-15T12:00:00Z`).toLocaleDateString("en-CA", { timeZone: "America/Edmonton", month: "long", year: "numeric" });
}
export function academyChargeDate(anchor: number) {
  return new Date(anchor * 1000).toLocaleDateString("en-CA", { timeZone: "America/Edmonton", month: "long", day: "numeric", year: "numeric" });
}
export function academyPaymentFirstCheckout(input: { uid: string; registrationId: string; customerId?: string; email: string; priceId: string; quantity: number; monthlyCents: number; startPeriod: string; monthPaid?: boolean; origin: string; now?: Date }): Stripe.Checkout.SessionCreateParams {
  const plan = academyPaymentFirstPlan(input.monthlyCents, input.quantity, input.startPeriod, input.monthPaid, input.now);
  const metadata = { academyFamilyUid: input.uid, academyRegistrationId: input.registrationId,
    academyBillingPolicyVersion: ACADEMY_TUITION_POLICY_VERSION, academyCheckoutFlow: ACADEMY_PAYMENT_FIRST_FLOW, academyCheckoutKind: plan.mode === "payment" ? "initial_payment" : "saved_card_setup",
    academyInitialBillingPeriod: input.startPeriod, academyRecurringAnchor: String(plan.recurringAnchor ?? ""),
    academyStripePriceId: input.priceId, academyQuantity: String(input.quantity), academyMonthlyCents: String(input.monthlyCents),
    academyInitialAmountCents: String(plan.dueNowCents) };
  const money = (cents: number) => `CA$${(cents / 100).toFixed(2)}`;
  const description = plan.recurringAnchor ? `Next automatic payment: ${money(plan.monthlyTotalCents)} on ${academyChargeDate(plan.recurringAnchor)}. Then ${money(plan.monthlyTotalCents)} on the 1st of each month through January 1, 2027 unless you cancel. No February tuition.` : "No further automatic tuition charges this term. No February tuition.";
  return { mode: plan.mode, ...(input.customerId ? { customer: input.customerId } : { customer_creation: "always" as const, customer_email: input.email }), client_reference_id: input.uid, payment_method_types: ["card"],
    metadata, custom_text: { submit: { message: description } },
    ...(plan.mode === "payment" ? { submit_type: "pay" as const,
      line_items: [{ price_data: { currency: "cad", unit_amount: plan.dueNowCents,
        product_data: { name: `${academyMonthLabel(input.startPeriod)} Quran Academy tuition`, description: `Full monthly tuition for ${input.quantity} ${input.quantity === 1 ? "child" : "children"}. No proration.` } }, quantity: 1 }],
      payment_intent_data: { setup_future_usage: "off_session" as const, metadata },
      invoice_creation: { enabled: true, invoice_data: { metadata } } } : { setup_intent_data: { metadata, description } }),
    success_url: `${input.origin}/quran-academy?checkout=success`, cancel_url: `${input.origin}/quran-academy?checkout=cancelled` };
}
export function academyRecurringSubscription(input: { customerId: string; paymentMethodId: string; priceId: string; quantity: number; anchor: number; termStop: number; uid: string; registrationId: string; startPeriod: string }): Stripe.SubscriptionCreateParams {
  return { customer: input.customerId, default_payment_method: input.paymentMethodId, collection_method: "charge_automatically",
    items: [{ price: input.priceId, quantity: input.quantity }], billing_cycle_anchor: input.anchor, proration_behavior: "none",
    cancel_at: input.termStop, payment_settings: { payment_method_types: ["card"] },
    metadata: { academyFamilyUid: input.uid, academyRegistrationId: input.registrationId, academyInitialBillingPeriod: input.startPeriod, academyBillingPolicyVersion: ACADEMY_TUITION_POLICY_VERSION, academyCheckoutFlow: ACADEMY_PAYMENT_FIRST_FLOW } };
}
