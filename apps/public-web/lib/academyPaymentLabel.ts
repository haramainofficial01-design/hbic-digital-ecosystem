import "server-only";
import type Stripe from "stripe";
import { academyStripe } from "./academyStripe";
import { academyPaymentPurpose } from "./paymentPurpose";
import { calgaryBillingPeriod } from "@hbic/shared";

/** Best-effort reporting after authoritative ledger processing. No financial mutations. */
export async function labelAcademyInvoicePayment(event: Stripe.Event) {
  if (event.type !== "invoice.paid") return;
  const stripe = academyStripe();
  const object = event.data.object as Stripe.Invoice;
  const invoice = await stripe.invoices.retrieve(object.id);
  if (invoice.livemode !== event.livemode || invoice.currency !== "cad" || invoice.status !== "paid") return;
  const correction = invoice.metadata?.academyAdjustment === "undercharge";
  const subscriptionId = correction ? invoice.metadata?.academySubscriptionId : invoice.parent?.subscription_details?.subscription;
  const id = typeof subscriptionId === "string" ? subscriptionId : subscriptionId?.id;
  if (!id) return;
  const subscription = await stripe.subscriptions.retrieve(id);
  const family = subscription.metadata.academyFamilyUid, registration = subscription.metadata.academyRegistrationId;
  if (!family || !registration || subscription.livemode !== invoice.livemode) return;
  const start = invoice.lines.data[0]?.period.start ?? invoice.created;
  const period = correction ? invoice.metadata?.academyAdjustmentPeriod :
    invoice.billing_reason === "subscription_create" ? subscription.metadata.academyInitialBillingPeriod : calgaryBillingPeriod(new Date(start * 1000));
  const description = academyPaymentPurpose(period ?? "", correction);
  for await (const payment of stripe.invoicePayments.list({ invoice: invoice.id, status: "paid", limit: 100 })) {
    const reference = payment.payment.payment_intent;
    const intentId = typeof reference === "string" ? reference : reference?.id;
    if (!intentId) continue;
    const intent = await stripe.paymentIntents.retrieve(intentId);
    if (intent.livemode !== invoice.livemode || intent.currency !== "cad" || intent.metadata.hbicPaymentKind === "donation") continue;
    await stripe.paymentIntents.update(intentId, { description, metadata: {
      hbicPaymentKind: "academy_tuition", academyFamilyUid: family, academyRegistrationId: registration,
      academyBillingPeriod: period!, ...(correction ? { academyAdjustment: "undercharge" } : {})
    } }, { idempotencyKey: `hbic-purpose-${invoice.id}-${intentId}` });
  }
}
