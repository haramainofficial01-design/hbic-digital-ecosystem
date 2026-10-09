import { academyStripe, applyAcademyStripeEvent, cardBillingConfigured } from "../../../../lib/academyStripe";
import { after } from "next/server";
import { dispatchAcademyEmails } from "../../../../lib/academyEmail";
import { handleAcademyWebhook } from "../../../../lib/academyWebhook";
import { applyDonationEvent } from "../../../../lib/donationCheckout";
import { labelAcademyInvoicePayment } from "../../../../lib/academyPaymentLabel";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const response = await handleAcademyWebhook(request, {
    configured: cardBillingConfigured,
    verify: (raw, signature) => academyStripe().webhooks.constructEvent(raw, signature, process.env.ACADEMY_STRIPE_WEBHOOK_SECRET!),
    apply: async event => {
      const object = event.data.object as unknown as { metadata?: Record<string, string> };
      if (object.metadata?.hbicPaymentKind === "donation") return applyDonationEvent(event);
      await applyAcademyStripeEvent(event);
      if (event.type === "invoice.paid") after(() => labelAcademyInvoicePayment(event).catch(() => {
        console.warn("academy_payment_label_unavailable", JSON.stringify({ eventId: event.id }));
      }));
    },
    log: (record) => console.info("academy_stripe_webhook", JSON.stringify(record))
  });
  if (response.ok) after(() => dispatchAcademyEmails(1).then(() => undefined).catch(() => undefined));
  return response;
}
