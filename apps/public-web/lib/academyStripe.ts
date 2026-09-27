import "server-only";

import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { calgaryBillingPeriod, isCalgaryFirstOfMonth, nextCalgaryFirstBillingAnchor } from "@hbic/shared";
import { academyDb, AcademyError, getAcademyFamily, getAcademyPricing } from "./academyStore";

function academyBillingMode(): "test" | "live" {
  return process.env.ACADEMY_STRIPE_BILLING_MODE === "live" ? "live" : "test";
}

export function academyStripe() {
  const key = process.env.ACADEMY_STRIPE_RESTRICTED_KEY ?? "";
  const prefix = academyBillingMode() === "live" ? /^(rk|sk)_live_/ : /^(rk|sk)_test_/;
  if (!prefix.test(key)) throw new AcademyError("Academy Stripe server key does not match its billing mode.", 503);
  return new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
}

export function cardBillingConfigured() {
  const prefix = academyBillingMode() === "live" ? /^(rk|sk)_live_/ : /^(rk|sk)_test_/;
  return process.env.ACADEMY_PREVIEW_ENABLED === "true" &&
    process.env.ACADEMY_STRIPE_BILLING_READY === "true" &&
    prefix.test(process.env.ACADEMY_STRIPE_RESTRICTED_KEY ?? "") &&
    /^whsec_/.test(process.env.ACADEMY_STRIPE_WEBHOOK_SECRET ?? "");
}

export async function academyCardConfig() {
  const pricing = await getAcademyPricing();
  return { cardAvailable: cardBillingConfigured() && /^price_[A-Za-z0-9]+$/.test(pricing.stripePriceId), ...pricing };
}

export async function startAcademyCheckout(uid: string) {
  const family = await getAcademyFamily(uid);
  if (!family || family.paymentChoice !== "card") throw new AcademyError("Register with card billing first.", 409);
  if (family.amountCents === null) throw new AcademyError("Tuition must be confirmed before card setup.", 409);
  const config = await academyCardConfig();
  if (!config.cardAvailable) throw new AcademyError("Card setup is not ready.", 503);
  const stripe = academyStripe();
  const price = await stripe.prices.retrieve(config.stripePriceId);
  const quantity = config.tuitionMode === "per_child" ? family.children.length : 1;
  if (price.livemode !== (academyBillingMode() === "live") || price.currency !== "cad" || price.recurring?.interval !== "month" ||
      price.unit_amount !== config.monthlyCents || price.active !== true || quantity < 1) {
    throw new AcademyError("The approved tuition and Stripe monthly price do not match.", 409);
  }
  const db = academyDb();
  const familyRef = db.collection("academyFamilies").doc(uid);
  const existingId = (await familyRef.get()).data()?.stripeCheckoutSessionId;
  if (typeof existingId === "string") {
    try {
      const existing = await stripe.checkout.sessions.retrieve(existingId);
      if (existing.status === "open" && existing.url) return existing.url;
    } catch { /* A stale session can be replaced after Stripe rejects it. */ }
  }
  if ((await familyRef.get()).data()?.stripeSubscriptionId) throw new AcademyError("This family already has a subscription. Use billing management instead.", 409);
  const firstOfMonth = isCalgaryFirstOfMonth(new Date());
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    integration_identifier: `hbic-academy-${Array.from(randomBytes(8), (byte) => String.fromCharCode(97 + byte % 26)).join("")}`,
    line_items: [{ price: price.id, quantity }],
    customer_email: family.email,
    client_reference_id: uid,
    metadata: { academyFamilyUid: uid },
    subscription_data: {
      metadata: { academyFamilyUid: uid },
      ...(firstOfMonth ? {} : { billing_cycle_anchor: nextCalgaryFirstBillingAnchor(new Date()), proration_behavior: "create_prorations" as const })
    },
    success_url: `${academyPreviewOrigin()}/quran-academy?checkout=success`,
    cancel_url: `${academyPreviewOrigin()}/quran-academy?checkout=cancelled`
  });
  if (!session.url || session.livemode !== (academyBillingMode() === "live")) throw new AcademyError("Stripe returned an unexpected Checkout session.", 502);
  await familyRef.update({ stripeCheckoutSessionId: session.id, stripeTuitionMode: config.tuitionMode, updatedAt: new Date().toISOString() });
  return session.url;
}

export async function startAcademyBillingPortal(uid: string) {
  const data = (await academyDb().collection("academyFamilies").doc(uid).get()).data();
  const customerId = data?.stripeCustomerId;
  if (!cardBillingConfigured() || typeof customerId !== "string") throw new AcademyError("Card billing is not active for this family.", 409);
  // A generic Portal session can change or cancel the entire subscription
  // without identifying which child was affected. Keep cancellation in HBIC's
  // per-child flow and expose only card replacement here.
  const session = await academyStripe().billingPortal.sessions.create({ customer: customerId,
    return_url: `${academyPreviewOrigin()}/quran-academy`, flow_data: { type: "payment_method_update" } });
  return session.url;
}

/** Parent-authorized cancellation prevents the canceled child's next renewal. */
export async function cancelAcademyChild(uid: string, childId: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(childId)) throw new AcademyError("Choose a valid child.");
  const db = academyDb();
  const familyRef = db.collection("academyFamilies").doc(uid);
  const lockRef = db.collection("academyBillingLocks").doc(uid);
  const lockId = randomBytes(12).toString("hex");
  const family = await db.runTransaction(async (tx) => {
    const [snapshot, lock] = await Promise.all([tx.get(familyRef), tx.get(lockRef)]);
    if (!snapshot.exists) throw new AcademyError("Academy registration was not found.", 404);
    const children = snapshot.data()?.children as { id: string; cancelEffectiveAt?: string | null }[];
    if (!children.some((child) => child.id === childId && !child.cancelEffectiveAt)) throw new AcademyError("This child is already canceled or was not found.", 409);
    if (lock.exists && Number(lock.data()?.expiresAt ?? 0) > Date.now()) throw new AcademyError("Another billing change is in progress. Try again shortly.", 409);
    tx.set(lockRef, { id: lockId, expiresAt: Date.now() + 120_000 });
    return snapshot.data()!;
  });
  try {
    const activeRenewals = (family.children as { cancelEffectiveAt?: string | null }[]).filter((child) => !child.cancelEffectiveAt).length;
    let effectiveAt = new Date(nextCalgaryFirstBillingAnchor(new Date()) * 1000).toISOString();
    if (family.paymentChoice === "card") {
      if (!cardBillingConfigured()) throw new AcademyError("Card billing must be available before changing a subscription.", 503);
      if (typeof family.stripeSubscriptionId !== "string") throw new AcademyError("Card setup is not complete. Contact HBIC to cancel the pending registration.", 409);
      const stripe = academyStripe();
      const subscription = await stripe.subscriptions.retrieve(family.stripeSubscriptionId);
      const item = subscription.items.data[0];
      const perChild = family.stripeTuitionMode !== "per_family";
      if (subscription.livemode !== (academyBillingMode() === "live") || subscription.metadata.academyFamilyUid !== uid || !item || subscription.items.data.length !== 1 ||
          item.quantity !== (perChild ? activeRenewals : 1) || !["active", "trialing", "past_due"].includes(subscription.status)) {
        throw new AcademyError("Subscription details need review before a child can be canceled.", 409);
      }
      effectiveAt = new Date(item.current_period_end * 1000).toISOString();
      if (activeRenewals === 1) {
        await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true }, { idempotencyKey: `academy-cancel-${uid}-${childId}` });
      } else if (perChild) {
        await stripe.subscriptions.update(subscription.id, { items: [{ id: item.id, quantity: activeRenewals - 1 }], proration_behavior: "none" },
          { idempotencyKey: `academy-cancel-${uid}-${childId}` });
      }
    }
    await db.runTransaction(async (tx) => {
      const [snapshot, lock] = await Promise.all([tx.get(familyRef), tx.get(lockRef)]);
      if (lock.data()?.id !== lockId) throw new AcademyError("Billing change expired. Contact HBIC before trying again.", 409);
      const children = snapshot.data()?.children as { id: string; cancelEffectiveAt?: string | null }[];
      if (!children.some((child) => child.id === childId && !child.cancelEffectiveAt)) throw new AcademyError("Child cancellation was already recorded.", 409);
      tx.update(familyRef, { children: children.map((child) => child.id === childId ? { ...child, cancelEffectiveAt: effectiveAt } : child),
        // Keep class access through the already-paid period. Renewal quantity
        // changes immediately, but the child's attendance ends at effectiveAt.
        updatedAt: new Date().toISOString() });
      tx.create(db.collection("academyAudit").doc(), { action: "child_cancellation", familyId: uid, childId, effectiveAt, method: family.paymentChoice, at: new Date().toISOString() });
      tx.delete(lockRef);
    });
    return { effectiveAt, family: await getAcademyFamily(uid) };
  } catch (error) {
    await db.runTransaction(async (tx) => { if ((await tx.get(lockRef)).data()?.id === lockId) tx.delete(lockRef); });
    throw error;
  }
}

function academyPreviewOrigin() {
  const url = new URL(process.env.ACADEMY_PREVIEW_ORIGIN ?? "http://localhost:3100");
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new AcademyError("Set a valid HTTPS Academy preview origin.", 503);
  }
  return url.origin;
}

function objectId(value: unknown) {
  return typeof value === "string" ? value : value && typeof value === "object" && "id" in value ? String(value.id) : "";
}

export async function applyAcademyStripeEvent(event: Stripe.Event) {
  if (event.livemode !== (academyBillingMode() === "live")) throw new AcademyError("Stripe event billing mode does not match the Academy configuration.", 403);
  const db = academyDb();
  const stripe = academyStripe();
  const markerRef = db.collection("academyStripeEvents").doc(event.id);
  if ((await markerRef.get()).exists) return;
  let uid = "", subscriptionId = "", customerId = "", period = "", amountCents = 0;
  let invoiceId = "", invoiceUrl: string | null = null;
  const data = event.data.object as unknown as Record<string, unknown>;
  if (event.type === "checkout.session.completed") {
    uid = String((data.metadata as Record<string, unknown> | null)?.academyFamilyUid ?? data.client_reference_id ?? "");
    subscriptionId = objectId(data.subscription);
    customerId = objectId(data.customer);
    // Checkout establishes the family mapping. A signed invoice event settles payment.
  } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    invoiceId = String(data.id ?? "");
    customerId = objectId(data.customer);
    const parent = data.parent as Record<string, unknown> | undefined;
    subscriptionId = objectId((parent?.subscription_details as Record<string, unknown> | undefined)?.subscription ?? data.subscription);
    if (!subscriptionId) throw new AcademyError("Invoice subscription reference is unavailable; Stripe should retry.", 503);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.livemode !== (academyBillingMode() === "live") || objectId(subscription.customer) !== customerId) {
      throw new AcademyError("Invoice and subscription do not match the Academy account.", 409);
    }
    uid = String(subscription.metadata.academyFamilyUid ?? "");
    const lines = (data.lines as { data?: { period?: { start?: number } }[] } | undefined)?.data ?? [];
    const periodStart = Number(lines[0]?.period?.start ?? data.created);
    if (!Number.isSafeInteger(periodStart) || periodStart <= 0) throw new AcademyError("Invoice billing period is unavailable.", 503);
    period = calgaryBillingPeriod(new Date(periodStart * 1000));
    amountCents = Number(event.type === "invoice.paid" ? data.amount_paid : data.amount_remaining);
    invoiceUrl = typeof data.hosted_invoice_url === "string" ? data.hosted_invoice_url : null;
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    uid = String((data.metadata as Record<string, unknown> | null)?.academyFamilyUid ?? "");
    subscriptionId = String(data.id ?? "");
    customerId = objectId(data.customer);
  } else return;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new AcademyError("Stripe event has no valid Academy family association.", 409);
  const familyRef = db.collection("academyFamilies").doc(uid);
  const monthRef = period ? familyRef.collection("months").doc(period) : null;
  await db.runTransaction(async (tx) => {
    if ((await tx.get(markerRef)).exists) return;
    const family = await tx.get(familyRef);
    if (!family.exists || family.data()?.paymentChoice !== "card") throw new AcademyError("Stripe event does not match a card family.", 409);
    if (family.data()?.stripeSubscriptionId && family.data()?.stripeSubscriptionId !== subscriptionId) throw new AcademyError("Stripe subscription does not match this family.", 409);
    const month = monthRef ? await tx.get(monthRef) : null;
    if (monthRef && month?.exists && month.data()?.method === "cash") throw new AcademyError("Card event cannot change a cash month.", 409);
    const now = new Date().toISOString();
    const rank = event.type === "customer.subscription.deleted" ? 4 : event.type === "invoice.paid" ? 3 :
      event.type === "invoice.payment_failed" ? 2 : event.type === "customer.subscription.updated" ? 1 : 0;
    const familyData = family.data()!;
    const lastCreated = Number(familyData.lastStripeEventCreated ?? 0);
    const lastRank = Number(familyData.lastStripeEventRank ?? -1);
    const newer = event.created > lastCreated || event.created === lastCreated && rank >= lastRank;
    if (newer) {
      const stripeStatus = event.type === "checkout.session.completed" ? "incomplete" :
        event.type === "invoice.paid" ? "active" : event.type === "invoice.payment_failed" ? "past_due" : String(data.status ?? "unknown");
      tx.update(familyRef, { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId,
        stripeStatus, lastStripeEventCreated: event.created, lastStripeEventRank: rank, updatedAt: now });
      if (event.type === "customer.subscription.deleted") {
        // A subscription can also be ended directly in Stripe. Never leave
        // active child enrollment displayed after billing has ended.
        const endedAt = new Date(event.created * 1000).toISOString();
        const children = Array.isArray(familyData.children) ? familyData.children as { cancelEffectiveAt?: string | null }[] : [];
        tx.update(familyRef, { enrollmentState: "withdrawn", children: children.map((child) => ({
          ...child, cancelEffectiveAt: child.cancelEffectiveAt && child.cancelEffectiveAt < endedAt ? child.cancelEffectiveAt : endedAt
        })) });
      }
      if (event.type === "invoice.paid" && familyData.enrollmentState === "submitted") {
        tx.update(familyRef, { enrollmentState: "approved" });
      }
    } else if (!familyData.stripeSubscriptionId && subscriptionId) {
      // A paid invoice may be delivered before Checkout completion. Never let
      // that older completion event demote the already-paid subscription.
      tx.update(familyRef, { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, updatedAt: now });
    }
    const monthData = month?.data();
    const monthCreated = Number(monthData?.lastStripeEventCreated ?? 0);
    const monthRank = Number(monthData?.lastStripeEventRank ?? -1);
    if (monthRef && (event.created > monthCreated || event.created === monthCreated && rank >= monthRank)) {
      tx.set(monthRef, { period, method: "card", status: event.type === "invoice.paid" ? "paid" : "card_attention", amountCents,
        invoiceId, invoiceUrl, lastStripeEventCreated: event.created, lastStripeEventRank: rank,
        ...(event.type === "invoice.paid" ? { paidAt: now } : {}), updatedAt: now }, { merge: true });
    }
    tx.create(markerRef, { type: event.type, objectId: String(data.id ?? ""), processedAt: now });
  });
}
