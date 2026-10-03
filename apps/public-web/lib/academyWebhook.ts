import type Stripe from "stripe";

type Dependencies = {
  configured: () => boolean;
  verify: (raw: string, signature: string) => Stripe.Event;
  apply: (event: Stripe.Event) => Promise<unknown>;
  log: (record: { stage: string; eventId?: string; eventType?: string; code?: string }) => void;
};

/** Keep authentication failures distinct from retryable processing failures. */
export async function handleAcademyWebhook(request: Request, dependencies: Dependencies) {
  if (!dependencies.configured()) {
    dependencies.log({ stage: "configuration_unavailable" });
    return Response.json({ ok: false }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ ok: false }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = dependencies.verify(await request.text(), signature);
  } catch {
    // Never log signatures, secrets, payloads, or parent data.
    dependencies.log({ stage: "signature_rejected" });
    return Response.json({ ok: false }, { status: 400 });
  }
  try {
    await dependencies.apply(event);
    dependencies.log({ stage: "processed", eventId: event.id, eventType: event.type });
    return Response.json({ received: true });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "processing_error";
    dependencies.log({ stage: "processing_failed", eventId: event.id, eventType: event.type,
      code: /^[a-zA-Z0-9/_-]{1,80}$/.test(code) ? code : "processing_error" });
    return Response.json({ ok: false }, { status: 500 });
  }
}
