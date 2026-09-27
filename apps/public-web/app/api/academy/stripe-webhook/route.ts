import { academyStripe, applyAcademyStripeEvent, cardBillingConfigured } from "../../../../lib/academyStripe";
import { AcademyError } from "../../../../lib/academyStore";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!cardBillingConfigured()) return Response.json({ ok: false }, { status: 404 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ ok: false }, { status: 400 });
  try {
    // Signature verification requires the unmodified raw body, not request.json().
    const raw = await request.text();
    const event = academyStripe().webhooks.constructEvent(raw, signature, process.env.ACADEMY_STRIPE_WEBHOOK_SECRET!);
    await applyAcademyStripeEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof AcademyError ? error.message : "Webhook could not be processed." },
      { status: error instanceof AcademyError ? error.status : 400 });
  }
}
