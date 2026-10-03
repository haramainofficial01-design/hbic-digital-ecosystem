import { academyStripe, applyAcademyStripeEvent, cardBillingConfigured } from "../../../../lib/academyStripe";
import { after } from "next/server";
import { dispatchAcademyEmails } from "../../../../lib/academyEmail";
import { handleAcademyWebhook } from "../../../../lib/academyWebhook";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const response = await handleAcademyWebhook(request, {
    configured: cardBillingConfigured,
    verify: (raw, signature) => academyStripe().webhooks.constructEvent(raw, signature, process.env.ACADEMY_STRIPE_WEBHOOK_SECRET!),
    apply: applyAcademyStripeEvent,
    log: (record) => console.info("academy_stripe_webhook", JSON.stringify(record))
  });
  if (response.ok) after(() => dispatchAcademyEmails(1).then(() => undefined).catch(() => undefined));
  return response;
}
