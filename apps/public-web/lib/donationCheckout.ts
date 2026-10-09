import "server-only";
import { createHmac } from "node:crypto";
import type Stripe from "stripe";
import { donationFund } from "@hbic/shared";
import { academyStripe } from "./academyStripe";
import { getDatabase } from "./contentStore";
import { donationCheckoutParameters } from "./donationCheckoutPlan";

export async function startDonationCheckout(request: Request, input: Record<string, unknown>) {
  const parameters = donationCheckoutParameters(input.fund, input.amount);
  if (typeof input.requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(input.requestId)) throw new Error("Please refresh and try again.");
  const db = getDatabase();
  if (!db) throw new Error("Donations are temporarily unavailable. Please try again shortly.");
  const key = process.env.ACADEMY_STRIPE_RESTRICTED_KEY;
  if (!key) throw new Error("Secure donations are temporarily unavailable.");
  const letters = createHmac("sha256", key).update(input.requestId).digest("hex").slice(0, 8).split("").map(value => String.fromCharCode(97 + parseInt(value, 16))).join("");
  parameters.integration_identifier = `hbic_donations_${letters}`;
  const address = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const fingerprint = createHmac("sha256", key).update(address).digest("hex");
  const bucket = Math.floor(Date.now() / 3_600_000);
  const rate = db.collection("donationCheckoutRateLimits").doc(`${fingerprint}-${bucket}`);
  await db.runTransaction(async tx => {
    const count = Number((await tx.get(rate)).data()?.count ?? 0);
    if (count >= 20) throw new Error("Please wait before opening another donation Checkout.");
    tx.set(rate, { count: count + 1, expiresAt: new Date(Date.now() + 7_200_000).toISOString() });
  });
  const session = await academyStripe().checkout.sessions.create(parameters,
    { idempotencyKey: `hbic-donation-${input.requestId}` });
  if (!session.url?.startsWith("https://checkout.stripe.com/")) throw new Error("Secure Checkout could not open. Please try again.");
  return session.url;
}

/** Stripe alone confirms payment; these records never touch Academy enrollment or tuition. */
export async function applyDonationEvent(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type) ||
    session.metadata?.hbicPaymentKind !== "donation" || session.payment_status !== "paid") return;
  const stripe = academyStripe();
  const completed = await stripe.checkout.sessions.retrieve(session.id);
  const fund = donationFund(completed.metadata?.donationCategory);
  const paymentIntentId = typeof completed.payment_intent === "string" ? completed.payment_intent : completed.payment_intent?.id;
  if (!fund || completed.payment_status !== "paid" || completed.currency !== "cad" ||
      !completed.amount_total || !paymentIntentId || completed.metadata?.hbicPaymentKind !== "donation" || completed.livemode !== event.livemode) throw new Error("Donation payment does not match.");
  const db = getDatabase();
  if (!db) throw new Error("Donation record storage is temporarily unavailable.");
  const record = db.collection("donationPayments").doc(completed.id);
  await db.runTransaction(async tx => {
    if ((await tx.get(record)).exists) return;
    tx.create(record, { category: fund.id, categoryName: fund.title, amountCents: completed.amount_total,
      currency: "cad", paymentIntentId,
      stripeEventId: event.id, live: completed.livemode, status: "paid", paidAt: new Date(event.created * 1000).toISOString() });
  });
}
