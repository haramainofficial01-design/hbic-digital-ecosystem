import "server-only";

import { createHash, randomBytes } from "node:crypto";
import Stripe from "stripe";
import { ACADEMY_LAST_BILLING_MONTH, ACADEMY_TERM_END_DATE, ACADEMY_TUITION_POLICY_VERSION, academyCardEnrollmentConfirmed, academyCheckoutLineItemPlan, academyCheckoutTiming, academyRegistrationOpen, academyTuitionPeriod, academyTuitionTotalCents, calgaryBillingPeriod, isCalgaryFirstOfMonth, nextCalgaryFirstBillingAnchor, timeToDate } from "@hbic/shared";
import { activatePendingAcademyCardRegistration, academyDb, AcademyError, getAcademyFamily, getAcademyPricing } from "./academyStore";
import { cardReceiptEmail, queueAcademyEmail } from "./academyEmail";
import { academyCorrectedMonthPaidCents, existingAcademyUnderchargeInvoiceStatus } from "./academyCheckoutState";

// 00:00 Calgary on February 1, before Stripe's February renewal. The final
// February 1 class remains included in January tuition after billing stops.
const academyTermBillingStop = Math.floor(timeToDate(ACADEMY_TERM_END_DATE, "12:00 AM")!.getTime() / 1000);

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

let verifiedPrice: { id: string; monthlyCents: number; mode: "test" | "live"; checkedAt: number; valid: boolean } | null = null;

export async function academyCardConfig() {
  const pricing = await getAcademyPricing();
  if (!cardBillingConfigured() || !/^price_[A-Za-z0-9]+$/.test(pricing.stripePriceId)) {
    return { cardAvailable: false, ...pricing };
  }
  const mode = academyBillingMode();
  const cached = verifiedPrice;
  if (cached?.id === pricing.stripePriceId && cached.monthlyCents === pricing.monthlyCents && cached.mode === mode &&
      Date.now() - cached.checkedAt < (cached.valid ? 300_000 : 30_000)) {
    return { cardAvailable: cached.valid, ...pricing };
  }
  let valid = false;
  try {
    const price = await academyStripe().prices.retrieve(pricing.stripePriceId);
    valid = price.active === true && price.livemode === (mode === "live") && price.currency === "cad" &&
      price.unit_amount === pricing.monthlyCents && price.recurring?.interval === "month";
  } catch { /* Keep card registration closed when Stripe credentials or pricing cannot be verified. */ }
  verifiedPrice = { id: pricing.stripePriceId, monthlyCents: pricing.monthlyCents, mode, checkedAt: Date.now(), valid };
  return { cardAvailable: valid, ...pricing };
}

export async function startAcademyCheckout(uid: string) {
  if (process.env.ACADEMY_REGISTRATION_READY !== "true" || !academyRegistrationOpen()) {
    throw new AcademyError("Academy card enrollment is not open yet.", 403);
  }
  const family = await getAcademyFamily(uid);
  if (!family || family.paymentChoice !== "card") throw new AcademyError("Register with card billing first.", 409);
  if (family.enrollmentState === "withdrawn") throw new AcademyError("This Academy enrollment has been withdrawn.", 409);
  if (family.amountCents === null) throw new AcademyError("Tuition must be confirmed before card setup.", 409);
  const config = await academyCardConfig();
  if (!config.cardAvailable) throw new AcademyError("Card setup is not ready.", 503);
  const stripe = academyStripe();
  const price = await stripe.prices.retrieve(config.stripePriceId);
  const quantity = config.tuitionMode === "per_child" ? family.children.filter((child) => !child.cancelEffectiveAt || Date.parse(child.cancelEffectiveAt) > Date.now()).length : 1;
  if (price.livemode !== (academyBillingMode() === "live") || price.currency !== "cad" || price.recurring?.interval !== "month" ||
      price.unit_amount !== config.monthlyCents || price.active !== true || quantity < 1) {
    throw new AcademyError("The approved tuition and Stripe monthly price do not match.", 409);
  }
  const db = academyDb();
  const familyRef = db.collection("academyFamilies").doc(uid);
  const lockRef = db.collection("academyBillingLocks").doc(uid);
  const pending = (await familyRef.get()).data();
  if (pending?.withdrawalPendingAt || pending?.enrollmentState === "withdrawn") throw new AcademyError("This Academy enrollment is being withdrawn.", 409);
  const lock = await lockRef.get();
  if (lock.exists && Number(lock.data()?.expiresAt ?? 0) > Date.now()) throw new AcademyError("A billing change is in progress. Try again shortly.", 409);
  const existingId = (await familyRef.get()).data()?.stripeCheckoutSessionId;
  if (typeof existingId === "string") {
    try {
      const existing = await stripe.checkout.sessions.retrieve(existingId);
      if (existing.status === "open" && existing.url) {
        if (existing.metadata?.academyBillingPolicyVersion === ACADEMY_TUITION_POLICY_VERSION) return existing.url;
        // Do not reuse an open Checkout created under the old prorated policy.
        await stripe.checkout.sessions.expire(existing.id);
      }
    } catch { /* A stale session can be replaced after Stripe rejects it. */ }
  }
  if ((await familyRef.get()).data()?.stripeSubscriptionId) throw new AcademyError("This family already has a subscription. Use billing management instead.", 409);
  const selectedMonthPaid = (await familyRef.collection("months").doc(family.billingPeriod).get()).data()?.status === "paid";
  const checkoutNow = new Date();
  let timing: ReturnType<typeof academyCheckoutTiming>;
  try { timing = academyCheckoutTiming(family.enrollmentStartPeriod, selectedMonthPaid, checkoutNow); }
  catch (error) { throw new AcademyError(error instanceof Error ? error.message : "Tuition timing is unavailable.", 409); }
  const currentPeriod = calgaryBillingPeriod(checkoutNow);
  const chargeCurrentMonthNow = !selectedMonthPaid &&
    (family.enrollmentStartPeriod ?? academyTuitionPeriod(checkoutNow)) <= currentPeriod &&
    !isCalgaryFirstOfMonth(checkoutNow);
  const lineItemPlan = academyCheckoutLineItemPlan(config.monthlyCents, quantity, chargeCurrentMonthNow);
  const productId = objectId(price.product);
  if (!productId) throw new AcademyError("The approved Stripe tuition product is unavailable.", 503);
  // Keep recurring tuition anchored to the next 1st while charging one full
  // current-month tuition amount on the initial invoice.
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lineItemPlan.map((line) => line.kind === "recurring"
    ? { price: price.id, quantity: line.quantity }
    : { price_data: { currency: "cad", unit_amount: line.unitAmountCents, product: productId }, quantity: line.quantity });
  const initialBillingPeriod = family.enrollmentStartPeriod ?? family.billingPeriod;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_collection: "always",
    integration_identifier: `hbic-academy-${Array.from(randomBytes(8), (byte) => String.fromCharCode(97 + byte % 26)).join("")}`,
    line_items: lineItems,
    customer_email: family.email,
    client_reference_id: uid,
    metadata: { academyFamilyUid: uid, academyRegistrationId: String(pending?.registrationId ?? ""), academyBillingPolicyVersion: ACADEMY_TUITION_POLICY_VERSION },
    subscription_data: {
      metadata: { academyFamilyUid: uid, academyRegistrationId: String(pending?.registrationId ?? ""), academyBillingPolicyVersion: ACADEMY_TUITION_POLICY_VERSION, academyInitialBillingPeriod: initialBillingPeriod },
      ...timing
    },
    success_url: `${academyPreviewOrigin()}/quran-academy?checkout=success`,
    cancel_url: `${academyPreviewOrigin()}/quran-academy?checkout=cancelled`
  });
  if (!session.url || session.livemode !== (academyBillingMode() === "live")) throw new AcademyError("Stripe returned an unexpected Checkout session.", 502);
  try {
    await db.runTransaction(async (tx) => {
      const [latest, currentLock] = await Promise.all([tx.get(familyRef), tx.get(lockRef)]);
      if (!latest.exists || latest.data()?.withdrawalPendingAt || latest.data()?.enrollmentState === "withdrawn" ||
          latest.data()?.paymentChoice !== "card" || String(latest.data()?.registrationId ?? "") !== String(pending?.registrationId ?? "")) {
        throw new AcademyError("This Academy enrollment changed during card setup.", 409);
      }
      if (currentLock.exists && Number(currentLock.data()?.expiresAt ?? 0) > Date.now()) throw new AcademyError("A billing change is in progress. Try again shortly.", 409);
      tx.update(familyRef, { stripeCheckoutSessionId: session.id, stripeTuitionMode: config.tuitionMode, updatedAt: new Date().toISOString() });
    });
  } catch (error) {
    await stripe.checkout.sessions.expire(session.id);
    throw error;
  }
  return session.url;
}

/**
 * Initial card signup Checkout. The registration stays in the private pending
 * collection; no Academy family/pass/enrollment exists until Stripe reports a
 * non-zero paid tuition invoice.
 */
export async function startAcademyPendingCheckout(uid: string) {
  if (process.env.ACADEMY_REGISTRATION_READY !== "true" || !academyRegistrationOpen()) {
    throw new AcademyError("Academy card enrollment is not open yet.", 403);
  }
  const db = academyDb();
  const pendingRef = db.collection("academyPendingRegistrations").doc(uid);
  const snapshot = await pendingRef.get();
  if (!snapshot.exists) throw new AcademyError("Complete the Academy registration form before card Checkout.", 409);
  const pending = snapshot.data()!;
  if (pending.paymentChoice !== "card") throw new AcademyError("This pending registration is not set up for card payment.", 409);

  const config = await academyCardConfig();
  if (!config.cardAvailable) throw new AcademyError("Card setup is not ready.", 503);
  const stripe = academyStripe();
  const price = await stripe.prices.retrieve(config.stripePriceId);
  const children = Array.isArray(pending.children) ? pending.children : [];
  const quantity = config.tuitionMode === "per_child" ? children.length : 1;
  if (price.livemode !== (academyBillingMode() === "live") || price.currency !== "cad" || price.recurring?.interval !== "month" ||
      price.unit_amount !== config.monthlyCents || price.active !== true || quantity < 1) {
    throw new AcademyError("The approved tuition and Stripe monthly price do not match.", 409);
  }

  if (typeof pending.stripeCheckoutSessionId === "string") {
    try {
      const existing = await stripe.checkout.sessions.retrieve(pending.stripeCheckoutSessionId);
      if (existing.status === "open" && existing.url &&
          existing.metadata?.academyRegistrationId === String(pending.registrationId) &&
          existing.metadata?.academyBillingPolicyVersion === ACADEMY_TUITION_POLICY_VERSION) return existing.url;
      if (existing.status === "complete") throw new AcademyError("Your card payment is being confirmed. Refresh shortly.", 409);
    } catch (error) {
      if (error instanceof AcademyError) throw error;
      // Stale/expired Checkout is replaced below.
    }
  }

  const checkoutNow = new Date();
  let timing: ReturnType<typeof academyCheckoutTiming>;
  try { timing = academyCheckoutTiming(String(pending.enrollmentStartPeriod), false, checkoutNow); }
  catch (error) { throw new AcademyError(error instanceof Error ? error.message : "Tuition timing is unavailable.", 409); }
  const currentPeriod = calgaryBillingPeriod(checkoutNow);
  const chargeCurrentMonthNow = String(pending.enrollmentStartPeriod) <= currentPeriod && !isCalgaryFirstOfMonth(checkoutNow);
  const lineItemPlan = academyCheckoutLineItemPlan(config.monthlyCents, quantity, chargeCurrentMonthNow);
  const productId = objectId(price.product);
  if (!productId) throw new AcademyError("The approved Stripe tuition product is unavailable.", 503);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lineItemPlan.map((line) => line.kind === "recurring"
    ? { price: price.id, quantity: line.quantity }
    : { price_data: { currency: "cad", unit_amount: line.unitAmountCents, product: productId }, quantity: line.quantity });

  const registrationId = String(pending.registrationId ?? "");
  if (!/^[a-f0-9]{24}$/.test(registrationId)) throw new AcademyError("Pending registration reference is invalid.", 409);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_collection: "always",
    integration_identifier: `hbic-academy-${Array.from(randomBytes(8), (byte) => String.fromCharCode(97 + byte % 26)).join("")}`,
    line_items: lineItems,
    customer_email: String(pending.email),
    client_reference_id: uid,
    metadata: { academyFamilyUid: uid, academyRegistrationId: registrationId, academyBillingPolicyVersion: ACADEMY_TUITION_POLICY_VERSION },
    subscription_data: {
      metadata: {
        academyFamilyUid: uid,
        academyRegistrationId: registrationId,
        academyBillingPolicyVersion: ACADEMY_TUITION_POLICY_VERSION,
        academyInitialBillingPeriod: String(pending.enrollmentStartPeriod)
      },
      ...timing
    },
    success_url: `${academyPreviewOrigin()}/quran-academy?checkout=success`,
    cancel_url: `${academyPreviewOrigin()}/quran-academy?checkout=cancelled`
  });
  if (!session.url || session.livemode !== (academyBillingMode() === "live")) throw new AcademyError("Stripe returned an unexpected Checkout session.", 502);

  await db.runTransaction(async (tx) => {
    const latest = await tx.get(pendingRef);
    if (!latest.exists || String(latest.data()?.registrationId ?? "") !== registrationId) {
      throw new AcademyError("Pending registration changed during card setup.", 409);
    }
    tx.update(pendingRef, { stripeCheckoutSessionId: session.id, status: "checkout_open", updatedAt: new Date().toISOString() });
  }).catch(async (error) => {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    throw error;
  });
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

/** A parent can switch methods without changing a paid month's receipt or enrollment. */
export async function changeAcademyPaymentMethod(uid: string, target: "card" | "cash", recurringAuthorized: boolean, staff?: { uid: string; reason: string }) {
  const db = academyDb();
  const familyRef = db.collection("academyFamilies").doc(uid);
  const lockRef = db.collection("academyBillingLocks").doc(uid);
  const selectedFamily = await getAcademyFamily(uid);
  const monthRef = familyRef.collection("months").doc(selectedFamily?.billingPeriod ?? academyTuitionPeriod(new Date()));
  const lockId = randomBytes(12).toString("hex");
  if (target === "card" && !recurringAuthorized) throw new AcademyError("Authorize recurring monthly card tuition before switching.");
  if (target === "card" && !(await academyCardConfig()).cardAvailable) throw new AcademyError("Card billing is temporarily unavailable.", 503);
  const { family, month } = await db.runTransaction(async (tx) => {
    const [snapshot, lock, month] = await Promise.all([tx.get(familyRef), tx.get(lockRef), tx.get(monthRef)]);
    if (!snapshot.exists) throw new AcademyError("Academy registration was not found.", 404);
    if (snapshot.data()?.enrollmentState === "withdrawn" || snapshot.data()?.withdrawalPendingAt) throw new AcademyError("Withdrawn enrollment cannot change billing. Register again first.", 409);
    if (lock.exists && Number(lock.data()?.expiresAt ?? 0) > Date.now()) throw new AcademyError("Another billing change is in progress. Try again shortly.", 409);
    tx.set(lockRef, { id: lockId, expiresAt: Date.now() + 120_000 });
    return { family: snapshot.data()!, month: month.data() };
  });
  try {
    const now = new Date().toISOString();
    const stripe = family.paymentChoice === "card" || target === "card" ? academyStripe() : null;
    let subscriptionId = family.paymentChoice === "card" && typeof family.stripeSubscriptionId === "string" ? family.stripeSubscriptionId : "";
    if (family.paymentChoice === "card" && !subscriptionId && typeof family.stripeCheckoutSessionId === "string") {
      const session = await stripe!.checkout.sessions.retrieve(family.stripeCheckoutSessionId);
      if (session.client_reference_id !== uid || session.livemode !== (academyBillingMode() === "live")) throw new AcademyError("Card setup needs staff review before switching.", 409);
      if (target === "cash" && session.status === "open") await stripe!.checkout.sessions.expire(session.id);
      if (session.status === "complete") subscriptionId = objectId(session.subscription);
    }
    let scheduledCashPeriod: string | null = null;
    if (subscriptionId && family.paymentChoice === "card") {
      const subscription = await stripe!.subscriptions.retrieve(subscriptionId);
      if (subscription.metadata.academyFamilyUid !== uid || subscription.livemode !== (academyBillingMode() === "live")) throw new AcademyError("Subscription does not match this family.", 409);
      if (subscription.status === "canceled") subscriptionId = "";
      else {
        if (target === "cash") {
          const updated = await stripe!.subscriptions.update(subscriptionId, { cancel_at_period_end: true,
            metadata: { academyPendingPaymentChoice: "cash" } });
          const periodEnd = updated.items.data[0]?.current_period_end;
          if (!periodEnd) throw new AcademyError("Subscription renewal date is unavailable. Contact HBIC.", 409);
          scheduledCashPeriod = calgaryBillingPeriod(new Date(periodEnd * 1000));
        } else if (family.pendingPaymentChoice === "cash") {
          await stripe!.subscriptions.update(subscriptionId, { cancel_at_period_end: false,
            metadata: { academyPendingPaymentChoice: "" } });
        }
      }
    }
    await db.runTransaction(async (tx) => {
      const [snapshot, lock, savedMonth] = await Promise.all([tx.get(familyRef), tx.get(lockRef), tx.get(monthRef)]);
      if (lock.data()?.id !== lockId) throw new AcademyError("Billing change expired. Contact HBIC before retrying.", 409);
      if (!snapshot.exists || snapshot.data()?.enrollmentState === "withdrawn") throw new AcademyError("Enrollment changed during billing update.", 409);
      const current = snapshot.data()!;
      if (target === "cash" && scheduledCashPeriod) {
        tx.update(familyRef, { pendingPaymentChoice: "cash", paymentChangeEffectivePeriod: scheduledCashPeriod, staffCardSetupRequestedAt: null, updatedAt: now });
      } else if (target === "cash") {
        tx.update(familyRef, { paymentChoice: "cash", pendingPaymentChoice: null, paymentChangeEffectivePeriod: null, staffCardSetupRequestedAt: null,
          stripeCheckoutSessionId: null, stripeSubscriptionId: null,
          ...(current.enrollmentState === "awaiting_checkout" ? { enrollmentState: "conditional" } : {}), updatedAt: now });
        if (savedMonth.exists && savedMonth.data()?.status !== "paid") tx.update(monthRef, { method: "cash", status: savedMonth.data()?.amountCents === 0 ? "not_due" : "cash_due", updatedAt: now });
      } else {
        tx.update(familyRef, { paymentChoice: "card", pendingPaymentChoice: null, paymentChangeEffectivePeriod: null, staffCardSetupRequestedAt: null,
          stripeSubscriptionId: subscriptionId || null,
          ...(!subscriptionId && current.enrollmentState === "conditional" ? { enrollmentState: "awaiting_checkout" } : {}),
          recurringAuthorizedAt: current.recurringAuthorizedAt ?? now, updatedAt: now });
        if (savedMonth.exists && savedMonth.data()?.status !== "paid") tx.update(monthRef, { method: "card",
          status: savedMonth.data()?.amountCents === 0 ? "not_due" : calgaryBillingPeriod(new Date()) < monthRef.id ? "scheduled" : "card_attention", updatedAt: now });
      }
      tx.create(db.collection("academyAudit").doc(), { action: "payment_method_change", familyId: uid,
        from: family.paymentChoice, to: target, effectivePeriod: scheduledCashPeriod ??
          (month?.status === "paid" ? new Date(Date.UTC(Number(monthRef.id.slice(0, 4)), Number(monthRef.id.slice(5, 7)), 1, 12)).toISOString().slice(0, 7) : monthRef.id),
        actorUid: staff?.uid ?? uid, ...(staff ? { reason: staff.reason, requestedBy: "staff" } : {}), at: now });
      tx.delete(lockRef);
    });
    if (target === "card" && !subscriptionId) return { family: await getAcademyFamily(uid), checkoutUrl: await startAcademyCheckout(uid) };
    return { family: await getAcademyFamily(uid), checkoutUrl: null };
  } catch (error) {
    await db.runTransaction(async (tx) => { if ((await tx.get(lockRef)).data()?.id === lockId) tx.delete(lockRef); });
    throw error;
  }
}

/** Staff may arrange card setup, but only the parent can authorize Stripe Checkout. */
export async function requestAcademyCardSetup(uid: string, actor: { uid: string; reason: string }) {
  const db = academyDb();
  const familyRef = db.collection("academyFamilies").doc(uid);
  await db.runTransaction(async (tx) => {
    const [family, lock] = await Promise.all([tx.get(familyRef), tx.get(db.collection("academyBillingLocks").doc(uid))]);
    if (!family.exists) throw new AcademyError("Academy registration was not found.", 404);
    const current = family.data()!;
    const children = Array.isArray(current.children) ? current.children as { cancelEffectiveAt?: string | null }[] : [];
    if (current.enrollmentState === "withdrawn" || current.withdrawalPendingAt || !children.some((child) => !child.cancelEffectiveAt || Date.parse(child.cancelEffectiveAt) > Date.now())) throw new AcademyError("Withdrawn enrollment cannot change billing.", 409);
    if (lock.exists && Number(lock.data()?.expiresAt ?? 0) > Date.now()) throw new AcademyError("A billing change is in progress. Try again shortly.", 409);
    if (current.paymentChoice === "card" && current.pendingPaymentChoice !== "cash") return;
    // Do not reverse a scheduled card-to-cash cancellation or create a charge.
    // The existing parent flow performs the actual change after explicit consent.
    if (current.staffCardSetupRequestedAt) return;
    const now = new Date().toISOString();
    tx.update(familyRef, { staffCardSetupRequestedAt: now, updatedAt: now });
    tx.create(db.collection("academyAudit").doc(), { action: "card_setup_requested", familyId: uid,
      actorUid: actor.uid, reason: actor.reason, at: now });
  });
  return getAcademyFamily(uid);
}

type AcademyUndercharge = {
  familyId: string;
  guardianName: string;
  reference: string;
  period: string;
  paidCents: number;
  expectedCents: number;
  differenceCents: number;
  adjustmentStatus: string | null;
};

export async function previewAcademyUndercharges(period = academyTuitionPeriod(new Date())): Promise<AcademyUndercharge[]> {
  if (!/^\d{4}-\d{2}$/.test(period)) throw new AcademyError("Choose a valid tuition month.");
  const db = academyDb();
  const pricing = await getAcademyPricing();
  const families = await db.collection("academyFamilies").limit(200).get();
  const billingStart = Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)) - 1, 1, 12);
  // If the same active parent/children were accidentally registered twice,
  // exclude both records from automatic corrections; a human must resolve it.
  const signatures = new Map<string, string[]>();
  for (const doc of families.docs) {
    const data = doc.data();
    if (data.enrollmentState !== "active" || data.paymentChoice !== "card" || data.withdrawalPendingAt) continue;
    const email = String(data.email ?? "").trim().toLowerCase();
    const children = Array.isArray(data.children) ? data.children as { name?: unknown }[] : [];
    const names = children.map((child) => String(child.name ?? "").trim().toLowerCase().replace(/\s+/g, " ")).sort();
    if (!email || !names.length) continue;
    const signature = `${email}|${names.join("|")}`;
    signatures.set(signature, [...(signatures.get(signature) ?? []), doc.id]);
  }
  const duplicateIds = new Set([...signatures.values()].filter((ids) => ids.length > 1).flat());
  const candidates = await Promise.all(families.docs.map(async (doc) => {
    const data = doc.data();
    if (data.paymentChoice !== "card" || data.enrollmentState !== "active" || data.withdrawalPendingAt || duplicateIds.has(doc.id)) return null;
    if (typeof data.enrollmentStartPeriod === "string" && data.enrollmentStartPeriod > period) return null;
    const month = await doc.ref.collection("months").doc(period).get();
    const monthData = month.data();
    if (!month.exists || monthData?.method !== "card" || monthData?.status !== "paid") return null;
    const paidCents = Number(monthData.amountCents);
    if (!Number.isSafeInteger(paidCents) || paidCents <= 0) return null;
    const children = Array.isArray(data.children) ? data.children as { cancelEffectiveAt?: string | null }[] : [];
    const childCount = children.filter((child) => !child.cancelEffectiveAt || Date.parse(child.cancelEffectiveAt) > billingStart).length;
    // The former bug charged approximately $42 per child. Do not extrapolate
    // this correction to unrelated discounts or other anomalous amounts.
    if (pricing.tuitionMode !== "per_child" || paidCents < childCount * 4_200 || paidCents > childCount * 4_299) return null;
    const expectedCents = period > ACADEMY_LAST_BILLING_MONTH || childCount === 0 ? 0 :
      pricing.tuitionMode === "per_child" ? academyTuitionTotalCents(pricing.monthlyCents, childCount) : pricing.monthlyCents;
    if (!Number.isSafeInteger(expectedCents) || expectedCents <= paidCents) return null;
    const adjustment = await db.collection("academyBillingAdjustments").doc(`${doc.id}_${period}`).get();
    let adjustmentStatus = adjustment.exists ? String(adjustment.data()?.status ?? "in_progress") : null;
    if (!adjustment.exists) {
      const customerId = String(data.stripeCustomerId ?? "");
      const subscriptionId = String(data.stripeSubscriptionId ?? "");
      const registrationId = String(data.registrationId ?? "");
      const originalInvoiceId = String(monthData.invoiceId ?? "");
      if (!/^cus_/.test(customerId) || !/^sub_/.test(subscriptionId) || !registrationId || !originalInvoiceId) {
        adjustmentStatus = "needs_review";
      } else {
        // Firestore is not the only source of correction state: older staff
        // workflows may already have created the Stripe invoice. Fail closed
        // if Stripe cannot be checked so preview can never invite a duplicate.
        const invoices = await academyStripe().invoices.list({ customer: customerId, limit: 100 });
        adjustmentStatus = existingAcademyUnderchargeInvoiceStatus(invoices.data, {
          familyId: doc.id, registrationId, customerId, subscriptionId, period, originalInvoiceId,
          previousPaidCents: paidCents, expectedCents, differenceCents: expectedCents - paidCents
        })?.status ?? null;
      }
    }
    return {
      familyId: doc.id,
      guardianName: String(data.guardianName ?? ""),
      reference: String(data.reference ?? ""),
      period,
      paidCents,
      expectedCents,
      differenceCents: expectedCents - paidCents,
      adjustmentStatus
    } satisfies AcademyUndercharge;
  }));
  return candidates.filter((item): item is NonNullable<typeof item> => item !== null);
}

/**
 * Collects only the exact unpaid difference caused by the former proration bug.
 * One deterministic adjustment document and Stripe idempotency keys prevent
 * duplicate correction charges. Month ledgers are changed only by signed
 * Stripe invoice webhooks after payment succeeds/fails.
 */
export async function collectAcademyUndercharges(actor: { uid: string; email: string }, period = academyTuitionPeriod(new Date())) {
  if (academyBillingMode() !== "live") throw new AcademyError("Live billing is required for tuition correction charges.", 409);
  const db = academyDb();
  const stripe = academyStripe();
  const candidates = await previewAcademyUndercharges(period);
  const results: { familyId: string; reference: string; differenceCents: number; status: string; invoiceId?: string }[] = [];

  for (const candidate of candidates) {
    if (candidate.adjustmentStatus !== null) {
      results.push({ familyId: candidate.familyId, reference: candidate.reference,
        differenceCents: candidate.differenceCents, status: `existing_${candidate.adjustmentStatus}` });
      continue;
    }
    const familyRef = db.collection("academyFamilies").doc(candidate.familyId);
    const monthRef = familyRef.collection("months").doc(period);
    const adjustmentRef = db.collection("academyBillingAdjustments").doc(`${candidate.familyId}_${period}`);
    const lock = await db.runTransaction(async (tx) => {
      const [family, month, adjustment] = await Promise.all([tx.get(familyRef), tx.get(monthRef), tx.get(adjustmentRef)]);
      if (adjustment.exists) return null;
      if (!family.exists || family.data()?.paymentChoice !== "card" || family.data()?.enrollmentState !== "active" || family.data()?.withdrawalPendingAt) return null;
      if (!month.exists || month.data()?.method !== "card" || month.data()?.status !== "paid" || Number(month.data()?.amountCents) !== candidate.paidCents) return null;
      const now = new Date().toISOString();
      tx.create(adjustmentRef, {
        type: "undercharge", status: "creating", familyId: candidate.familyId, registrationId: String(family.data()?.registrationId ?? ""),
        period, paidCents: candidate.paidCents, expectedCents: candidate.expectedCents, differenceCents: candidate.differenceCents,
        actorUid: actor.uid, actorEmail: actor.email, createdAt: now, updatedAt: now
      });
      tx.create(db.collection("academyAudit").doc(), {
        action: "card_undercharge_correction_started", familyId: candidate.familyId, period,
        paidCents: candidate.paidCents, expectedCents: candidate.expectedCents, differenceCents: candidate.differenceCents,
        actorUid: actor.uid, actorEmail: actor.email, at: now
      });
      return {
        customerId: String(family.data()?.stripeCustomerId ?? ""),
        subscriptionId: String(family.data()?.stripeSubscriptionId ?? ""),
        registrationId: String(family.data()?.registrationId ?? ""),
        originalInvoiceId: String(month.data()?.invoiceId ?? "")
      };
    });
    if (!lock) {
      results.push({ familyId: candidate.familyId, reference: candidate.reference, differenceCents: candidate.differenceCents, status: "skipped" });
      continue;
    }

    try {
      if (!/^cus_/.test(lock.customerId) || !/^sub_/.test(lock.subscriptionId)) throw new AcademyError("Saved Stripe billing details are unavailable for this family.", 409);
      // Recheck Stripe after acquiring the Firestore lock. This closes the gap
      // where an older correction invoice exists without its Firestore marker.
      const priorInvoices = await stripe.invoices.list({ customer: lock.customerId, limit: 100 });
      const existingCorrection = existingAcademyUnderchargeInvoiceStatus(priorInvoices.data, {
        familyId: candidate.familyId, registrationId: lock.registrationId, customerId: lock.customerId,
        subscriptionId: lock.subscriptionId, period, originalInvoiceId: lock.originalInvoiceId,
        previousPaidCents: candidate.paidCents, expectedCents: candidate.expectedCents,
        differenceCents: candidate.differenceCents
      });
      if (existingCorrection) {
        await adjustmentRef.set({ status: existingCorrection.status, invoiceId: existingCorrection.invoiceId,
          updatedAt: new Date().toISOString() }, { merge: true });
        results.push({ familyId: candidate.familyId, reference: candidate.reference,
          differenceCents: candidate.differenceCents, status: `existing_${existingCorrection.status}`,
          ...(existingCorrection.invoiceId ? { invoiceId: existingCorrection.invoiceId } : {}) });
        continue;
      }
      const subscription = await stripe.subscriptions.retrieve(lock.subscriptionId);
      if (subscription.livemode !== true || subscription.metadata.academyFamilyUid !== candidate.familyId ||
          subscription.metadata.academyRegistrationId !== lock.registrationId || objectId(subscription.customer) !== lock.customerId ||
          subscription.status === "canceled") {
        throw new AcademyError("Stripe subscription no longer matches this Academy registration.", 409);
      }

      const idBase = `academy-undercharge-${candidate.familyId}-${period}-${candidate.paidCents}-${candidate.expectedCents}`;
      const correctionMetadata = {
        academyAdjustment: "undercharge", academyFamilyUid: candidate.familyId, academyRegistrationId: lock.registrationId,
        academyAdjustmentPeriod: period, academyPreviousPaidCents: String(candidate.paidCents),
        academyExpectedCents: String(candidate.expectedCents), academySubscriptionId: lock.subscriptionId
      };
      const defaultPaymentMethod = objectId(subscription.default_payment_method);
      // Use an isolated one-off invoice instead of pending subscription items so
      // the correction can never leak into the family's next regular renewal.
      const draft = await stripe.invoices.create({
        customer: lock.customerId,
        collection_method: "charge_automatically",
        auto_advance: false,
        ...(defaultPaymentMethod ? { default_payment_method: defaultPaymentMethod } : {}),
        description: `HBIC Quran Academy ${period} tuition correction`,
        metadata: correctionMetadata
      }, { idempotencyKey: `${idBase}-invoice` });

      const item = await stripe.invoiceItems.create({
        customer: lock.customerId,
        invoice: draft.id,
        amount: candidate.differenceCents,
        currency: "cad",
        description: `HBIC Quran Academy ${period} tuition correction`,
        metadata: correctionMetadata
      }, { idempotencyKey: `${idBase}-item` });

      const finalized = await stripe.invoices.finalizeInvoice(draft.id, { auto_advance: false }, { idempotencyKey: `${idBase}-finalize` });
      if (finalized.amount_due !== candidate.differenceCents) {
        await db.runTransaction(async (tx) => {
          tx.update(adjustmentRef, { status: "needs_review", invoiceItemId: item.id, invoiceId: finalized.id,
            error: `Expected correction ${candidate.differenceCents}; Stripe invoice amount is ${finalized.amount_due}.`, updatedAt: new Date().toISOString() });
        });
        results.push({ familyId: candidate.familyId, reference: candidate.reference, differenceCents: candidate.differenceCents, status: "needs_review", invoiceId: finalized.id });
        continue;
      }

      const paid = await stripe.invoices.pay(finalized.id, {}, { idempotencyKey: `${idBase}-pay` });
      await adjustmentRef.set({
        status: paid.status === "paid" ? "payment_submitted" : String(paid.status ?? "open"),
        invoiceItemId: item.id, invoiceId: paid.id, updatedAt: new Date().toISOString()
      }, { merge: true });
      results.push({ familyId: candidate.familyId, reference: candidate.reference, differenceCents: candidate.differenceCents,
        status: paid.status === "paid" ? "payment_submitted" : String(paid.status ?? "open"), invoiceId: paid.id });
    } catch (error) {
      await adjustmentRef.set({ status: "failed", error: error instanceof Error ? error.message : "Correction charge failed.", updatedAt: new Date().toISOString() }, { merge: true });
      results.push({ familyId: candidate.familyId, reference: candidate.reference, differenceCents: candidate.differenceCents, status: "failed" });
    }
  }

  return results;
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
    const pricing = await getAcademyPricing();
    let effectiveAt = new Date(nextCalgaryFirstBillingAnchor(new Date()) * 1000).toISOString();
    let pendingCardSetup = false;
    if (family.paymentChoice === "card") {
      if (!cardBillingConfigured()) throw new AcademyError("Card billing must be available before changing a subscription.", 503);
      const stripe = academyStripe();
      let subscriptionId = typeof family.stripeSubscriptionId === "string" ? family.stripeSubscriptionId : "";
      if (!subscriptionId && typeof family.stripeCheckoutSessionId === "string") {
        const session = await stripe.checkout.sessions.retrieve(family.stripeCheckoutSessionId);
        if (session.client_reference_id !== uid || session.livemode !== (academyBillingMode() === "live")) throw new AcademyError("Card setup needs staff review before cancellation.", 409);
        if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
        else if (session.status === "complete") subscriptionId = objectId(session.subscription);
      }
      if (!subscriptionId) {
        pendingCardSetup = true;
        effectiveAt = new Date().toISOString();
      } else {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
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
    }
    await db.runTransaction(async (tx) => {
      const monthRef = familyRef.collection("months").doc(academyTuitionPeriod(new Date()));
      const [snapshot, lock, month] = await Promise.all([tx.get(familyRef), tx.get(lockRef), tx.get(monthRef)]);
      if (lock.data()?.id !== lockId) throw new AcademyError("Billing change expired. Contact HBIC before trying again.", 409);
      const children = snapshot.data()?.children as { id: string; cancelEffectiveAt?: string | null }[];
      if (!children.some((child) => child.id === childId && !child.cancelEffectiveAt)) throw new AcademyError("Child cancellation was already recorded.", 409);
      const lastChildNow = pendingCardSetup && activeRenewals === 1;
      const passToken = String(snapshot.data()?.passToken ?? "");
      if (lastChildNow && passToken) tx.set(db.collection("academyPasses").doc(createHash("sha256").update(passToken).digest("hex")), { uid, state: "revoked", updatedAt: new Date().toISOString() }, { merge: true });
      tx.update(familyRef, { children: children.map((child) => child.id === childId ? { ...child, cancelEffectiveAt: effectiveAt } : child),
        ...(pendingCardSetup ? { stripeCheckoutSessionId: null } : {}),
        ...(lastChildNow ? { enrollmentState: "withdrawn", passState: "revoked", passToken: "" } : {}),
        // Keep class access through the already-paid period. Renewal quantity
        // changes immediately, but the child's attendance ends at effectiveAt.
        updatedAt: new Date().toISOString() });
      if (pendingCardSetup && month.exists && month.data()?.status !== "paid") {
        const remaining = activeRenewals - 1;
        tx.update(monthRef, { amountCents: remaining === 0 ? 0 : pricing.monthlyCents * (pricing.tuitionMode === "per_child" ? remaining : 1),
          status: remaining === 0 ? "not_due" : "scheduled", updatedAt: new Date().toISOString() });
      }
      tx.create(db.collection("academyAudit").doc(), { action: "child_cancellation", familyId: uid, childId, effectiveAt, method: family.paymentChoice, at: new Date().toISOString() });
      tx.delete(lockRef);
    });
    return { effectiveAt, family: await getAcademyFamily(uid) };
  } catch (error) {
    await db.runTransaction(async (tx) => { if ((await tx.get(lockRef)).data()?.id === lockId) tx.delete(lockRef); });
    throw error;
  }
}

/** Staff withdrawal is not a payment or refund. Stop future billing first, then retain the registration as history. */
export async function withdrawConditionalAcademyFamily(uid: string, reason: string, actor: { uid: string; email: string }) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new AcademyError("Invalid family reference.");
  const cleanReason = reason.trim();
  if (cleanReason.length < 8 || cleanReason.length > 300) throw new AcademyError("Enter a short reason (8–300 characters).");
  const db = academyDb();
  const familyRef = db.collection("academyFamilies").doc(uid);
  const lockRef = db.collection("academyBillingLocks").doc(uid);
  const lockId = randomBytes(12).toString("hex");
  const family = await db.runTransaction(async (tx) => {
    const [snapshot, lock] = await Promise.all([tx.get(familyRef), tx.get(lockRef)]);
    if (!snapshot.exists) throw new AcademyError("Academy registration was not found.", 404);
    if (!["awaiting_checkout", "conditional", "submitted", "approved"].includes(String(snapshot.data()?.enrollmentState))) {
      throw new AcademyError("Only a pending or Conditional enrollment can be withdrawn here.", 409);
    }
    if (lock.exists && Number(lock.data()?.expiresAt ?? 0) > Date.now()) throw new AcademyError("Another billing change is in progress. Try again shortly.", 409);
    tx.set(lockRef, { id: lockId, expiresAt: Date.now() + 120_000 });
    tx.update(familyRef, { withdrawalPendingAt: new Date().toISOString() });
    return snapshot.data()!;
  });
  try {
    if (family.paymentChoice === "card") {
      if (!cardBillingConfigured()) throw new AcademyError("Card billing access is required to safely stop future charges.", 503);
      const stripe = academyStripe();
      const subscriptions = new Set<string>();
      if (typeof family.stripeSubscriptionId === "string") subscriptions.add(family.stripeSubscriptionId);
      if (typeof family.stripeCheckoutSessionId === "string") {
        const session = await stripe.checkout.sessions.retrieve(family.stripeCheckoutSessionId);
        if (session.client_reference_id !== uid || session.livemode !== (academyBillingMode() === "live")) {
          throw new AcademyError("Checkout does not match this family. Billing needs staff review.", 409);
        }
        if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
        else if (session.status === "complete") {
          const id = objectId(session.subscription);
          if (!id) throw new AcademyError("Completed card setup needs staff review before withdrawal.", 409);
          subscriptions.add(id);
        }
      }
      for (const id of subscriptions) {
        const subscription = await stripe.subscriptions.retrieve(id);
        if (subscription.metadata.academyFamilyUid !== uid || subscription.livemode !== (academyBillingMode() === "live")) {
          throw new AcademyError("Subscription does not match this family. Billing needs staff review.", 409);
        }
        if (subscription.status !== "canceled") await stripe.subscriptions.cancel(id, { invoice_now: false, prorate: false });
      }
    }
    const now = new Date().toISOString();
    const monthRef = familyRef.collection("months").doc(typeof family.enrollmentStartPeriod === "string" && family.enrollmentStartPeriod > academyTuitionPeriod(new Date()) ? family.enrollmentStartPeriod : academyTuitionPeriod(new Date()));
    await db.runTransaction(async (tx) => {
      const [snapshot, lock, month] = await Promise.all([tx.get(familyRef), tx.get(lockRef), tx.get(monthRef)]);
      if (lock.data()?.id !== lockId) throw new AcademyError("Billing change expired. Contact HBIC before trying again.", 409);
      if (!["awaiting_checkout", "conditional", "submitted", "approved", "withdrawn"].includes(String(snapshot.data()?.enrollmentState))) {
        throw new AcademyError("Enrollment changed during withdrawal. Refresh before continuing.", 409);
      }
      const saved = snapshot.data()!;
      const children = Array.isArray(saved.children) ? saved.children as { cancelEffectiveAt?: string | null }[] : [];
      const passToken = String(saved.passToken ?? "");
      if (passToken) tx.set(db.collection("academyPasses").doc(createHash("sha256").update(passToken).digest("hex")), { uid, state: "revoked", updatedAt: now }, { merge: true });
      tx.update(familyRef, { enrollmentState: "withdrawn", children: children.map((child) => ({ ...child, cancelEffectiveAt: now })),
        passState: "revoked", passToken: "", withdrawalPendingAt: null, withdrawnAt: now, withdrawnBy: actor.uid, withdrawalReason: cleanReason, updatedAt: now });
      if (month.exists && month.data()?.status !== "paid") tx.update(monthRef, { status: "not_due", amountCents: 0, updatedAt: now });
      tx.create(db.collection("academyAudit").doc(), { action: "conditional_enrollment_withdrawn", familyId: uid,
        reason: cleanReason, actorUid: actor.uid, actorEmail: actor.email, at: now });
      tx.delete(lockRef);
    });
    return getAcademyFamily(uid);
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
  let uid = "", subscriptionId = "", customerId = "", period = "", amountCents = 0, eventRegistrationId = "";
  let invoiceId = "", invoiceUrl: string | null = null;
  let underchargeAdjustment = false, underchargePreviousCents = 0, underchargeExpectedCents = 0;
  const data = event.data.object as unknown as Record<string, unknown>;
  if (event.type === "checkout.session.completed") {
    uid = String((data.metadata as Record<string, unknown> | null)?.academyFamilyUid ?? data.client_reference_id ?? "");
    subscriptionId = objectId(data.subscription);
    customerId = objectId(data.customer);
    if (!subscriptionId || !customerId) throw new AcademyError("Checkout subscription is incomplete; Stripe should retry.", 503);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    eventRegistrationId = String(subscription.metadata.academyRegistrationId ?? "");
    if (subscription.livemode !== (academyBillingMode() === "live") ||
        subscription.metadata.academyFamilyUid !== uid || objectId(subscription.customer) !== customerId) {
      throw new AcademyError("Checkout subscription does not match this Academy family.", 409);
    }
    const registered = await db.collection("academyFamilies").doc(uid).get();
    const pendingRef = db.collection("academyPendingRegistrations").doc(uid);
    const pending = await pendingRef.get();
    const familyMatches = registered.exists && registered.data()?.enrollmentState !== "withdrawn" && !registered.data()?.withdrawalPendingAt &&
      registered.data()?.paymentChoice === "card" && String(registered.data()?.registrationId ?? "") === eventRegistrationId;
    const pendingMatches = pending.exists && pending.data()?.paymentChoice === "card" &&
      String(pending.data()?.registrationId ?? "") === eventRegistrationId;
    if (!familyMatches && !pendingMatches) {
      if (subscription.status !== "canceled") await stripe.subscriptions.cancel(subscriptionId, { invoice_now: false, prorate: false });
    } else {
      if (subscription.cancel_at !== academyTermBillingStop) {
        await stripe.subscriptions.update(subscriptionId, { cancel_at: academyTermBillingStop },
          { idempotencyKey: `academy-term-stop-${subscriptionId}` });
      }
      if (pendingMatches && !familyMatches) {
        await db.runTransaction(async (tx) => {
          if ((await tx.get(markerRef)).exists) return;
          const latest = await tx.get(pendingRef);
          if (!latest.exists || String(latest.data()?.registrationId ?? "") !== eventRegistrationId) {
            tx.create(markerRef, { type: event.type, ignored: true, reason: "pending_changed", processedAt: new Date().toISOString() });
            return;
          }
          tx.update(pendingRef, {
            stripeCheckoutSessionId: String(data.id ?? ""), stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId,
            status: "checkout_complete_awaiting_payment", updatedAt: new Date().toISOString()
          });
          tx.create(markerRef, { type: event.type, pendingOnly: true, processedAt: new Date().toISOString() });
        });
        return;
      }
    }
    // Checkout establishes billing mapping; only a non-zero paid invoice can create a new card enrollment.
  } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    invoiceId = String(data.id ?? "");
    customerId = objectId(data.customer);
    const invoiceMetadata = (data.metadata as Record<string, unknown> | null) ?? {};
    underchargeAdjustment = invoiceMetadata.academyAdjustment === "undercharge";
    const parent = data.parent as Record<string, unknown> | undefined;
    subscriptionId = underchargeAdjustment ? String(invoiceMetadata.academySubscriptionId ?? "") :
      objectId((parent?.subscription_details as Record<string, unknown> | undefined)?.subscription ?? data.subscription);
    if (!subscriptionId) throw new AcademyError("Invoice subscription reference is unavailable; Stripe should retry.", 503);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    eventRegistrationId = String(subscription.metadata.academyRegistrationId ?? "");
    if (subscription.livemode !== (academyBillingMode() === "live") || objectId(subscription.customer) !== customerId) {
      throw new AcademyError("Invoice and subscription do not match the Academy account.", 409);
    }
    uid = String(subscription.metadata.academyFamilyUid ?? "");
    underchargePreviousCents = Number(invoiceMetadata.academyPreviousPaidCents ?? 0);
    underchargeExpectedCents = Number(invoiceMetadata.academyExpectedCents ?? 0);
    const adjustmentPeriod = String(invoiceMetadata.academyAdjustmentPeriod ?? "");
    const lines = (data.lines as { data?: { period?: { start?: number } }[] } | undefined)?.data ?? [];
    const periodStart = Number(lines[0]?.period?.start ?? data.created);
    if (!Number.isSafeInteger(periodStart) || periodStart <= 0) throw new AcademyError("Invoice billing period is unavailable.", 503);
    const initialPeriod = String(subscription.metadata.academyInitialBillingPeriod ?? "");
    period = underchargeAdjustment && /^\d{4}-\d{2}$/.test(adjustmentPeriod) ? adjustmentPeriod :
      String(data.billing_reason ?? "") === "subscription_create" && /^\d{4}-\d{2}$/.test(initialPeriod)
        ? initialPeriod
        : calgaryBillingPeriod(new Date(periodStart * 1000));
    amountCents = Number(event.type === "invoice.paid" ? data.amount_paid : data.amount_remaining);
    invoiceUrl = typeof data.hosted_invoice_url === "string" ? data.hosted_invoice_url : null;
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    uid = String((data.metadata as Record<string, unknown> | null)?.academyFamilyUid ?? "");
    eventRegistrationId = String((data.metadata as Record<string, unknown> | null)?.academyRegistrationId ?? "");
    subscriptionId = String(data.id ?? "");
    customerId = objectId(data.customer);
  } else return;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new AcademyError("Stripe event has no valid Academy family association.", 409);
  const familyRef = db.collection("academyFamilies").doc(uid);
  if ((event.type === "invoice.paid" || event.type === "invoice.payment_failed") && !(await familyRef.get()).exists) {
    const pendingRef = db.collection("academyPendingRegistrations").doc(uid);
    const pending = await pendingRef.get();
    const pendingMatches = pending.exists && pending.data()?.paymentChoice === "card" &&
      String(pending.data()?.registrationId ?? "") === eventRegistrationId;
    if (pendingMatches && event.type === "invoice.paid" && amountCents > 0) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (subscription.cancel_at !== academyTermBillingStop) {
        await stripe.subscriptions.update(subscriptionId, { cancel_at: academyTermBillingStop },
          { idempotencyKey: `academy-term-stop-${subscriptionId}` });
      }
      await activatePendingAcademyCardRegistration(uid, eventRegistrationId, {
        checkoutSessionId: typeof pending.data()?.stripeCheckoutSessionId === "string" ? pending.data()!.stripeCheckoutSessionId : null,
        customerId, subscriptionId, termBillingStopAt: academyTermBillingStop
      });
    } else if (pendingMatches) {
      await pendingRef.set({ status: event.type === "invoice.payment_failed" ? "payment_failed" : "awaiting_payment",
        updatedAt: new Date().toISOString() }, { merge: true });
      if (!(await markerRef.get()).exists) await markerRef.create({ type: event.type, pendingOnly: true, processedAt: new Date().toISOString() });
      return;
    }
  }
  const monthRef = period ? familyRef.collection("months").doc(period) : null;
  await db.runTransaction(async (tx) => {
    if ((await tx.get(markerRef)).exists) return;
    const family = await tx.get(familyRef);
    if (!family.exists || family.data()?.paymentChoice !== "card" || String(family.data()?.registrationId ?? "") !== eventRegistrationId) {
      // A withdrawn enrollment can be replaced on the same Firebase account.
      // Delayed webhooks for its old subscription must never change the new one.
      tx.create(markerRef, { type: event.type, ignored: true, processedAt: new Date().toISOString() });
      return;
    }
    if (family.data()?.stripeSubscriptionId && family.data()?.stripeSubscriptionId !== subscriptionId) {
      tx.create(markerRef, { type: event.type, ignored: true, reason: "superseded_subscription", processedAt: new Date().toISOString() });
      return;
    }
    const month = monthRef ? await tx.get(monthRef) : null;
    const stripePendingCash = event.type === "customer.subscription.deleted" &&
      (data.metadata as Record<string, unknown> | null)?.academyPendingPaymentChoice === "cash";
    const cashSwitchPeriod = event.type === "customer.subscription.deleted" && (family.data()?.pendingPaymentChoice === "cash" || stripePendingCash)
      ? String(family.data()?.paymentChangeEffectivePeriod ?? "") : "";
    const cashSwitchMonthRef = /^\d{4}-\d{2}$/.test(cashSwitchPeriod) ? familyRef.collection("months").doc(cashSwitchPeriod) : null;
    const cashSwitchMonth = cashSwitchMonthRef ? await tx.get(cashSwitchMonthRef) : null;
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
        stripeStatus, ...(event.type === "checkout.session.completed" ? { termBillingStopAt: academyTermBillingStop } : {}),
        lastStripeEventCreated: event.created, lastStripeEventRank: rank, updatedAt: now });
      if (event.type === "customer.subscription.deleted") {
        const termBreak = Number(familyData.termBillingStopAt) === academyTermBillingStop &&
          Number(data.cancel_at) === academyTermBillingStop && event.created >= academyTermBillingStop - 600;
        if (familyData.pendingPaymentChoice === "cash" || stripePendingCash) {
          // Card renewal has stopped. Payment choice changes independently of
          // enrollment; no cash payment is invented by this webhook.
          tx.update(familyRef, { paymentChoice: "cash", pendingPaymentChoice: null,
            paymentChangeEffectivePeriod: null, stripeSubscriptionId: null, stripeCheckoutSessionId: null });
          if (cashSwitchMonthRef && cashSwitchMonth?.exists && cashSwitchMonth.data()?.status !== "paid") {
            tx.update(cashSwitchMonthRef, { method: "cash", status: Number(cashSwitchMonth.data()?.amountCents ?? 0) > 0 ? "cash_due" : "not_due", updatedAt: now });
          }
        } else if (termBreak) {
          // The term break is not a withdrawal. Keep the family and pass for
          // the final February 1 class; no new term auto-resumes billing.
          tx.update(familyRef, { enrollmentState: "paused", termBreakStartedAt: now });
        } else {
        // A subscription can also be ended directly in Stripe. Never leave
        // active child enrollment displayed after billing has ended.
        const endedAt = new Date(event.created * 1000).toISOString();
        const children = Array.isArray(familyData.children) ? familyData.children as { cancelEffectiveAt?: string | null }[] : [];
        tx.update(familyRef, { enrollmentState: "withdrawn", children: children.map((child) => ({
          ...child, cancelEffectiveAt: child.cancelEffectiveAt && child.cancelEffectiveAt < endedAt ? child.cancelEffectiveAt : endedAt
        })) });
        }
      }
      // Invoice events update only payment standing. Staff check-in controls
      // conditional → active enrollment independently.
    } else if (!familyData.stripeSubscriptionId && subscriptionId) {
      // A paid invoice may be delivered before Checkout completion. Never let
      // that older completion event demote the already-paid subscription.
      tx.update(familyRef, { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, updatedAt: now });
    }
    // Checkout/subscription notifications can arrive out of order. A valid
    // confirmation must still promote the pending registration, never payment.
    if (academyCardEnrollmentConfirmed(familyData.enrollmentState, event.type, amountCents)) {
      tx.update(familyRef, { enrollmentState: "conditional", stripeConfirmedAt: now });
    }
    const monthData = month?.data();
    if (underchargeAdjustment && monthRef) {
      const originalPaid = Number.isSafeInteger(underchargePreviousCents) && underchargePreviousCents >= 0
        ? underchargePreviousCents : Math.max(0, Number(monthData?.amountCents ?? 0));
      const basePaid = Math.max(Number(monthData?.amountCents ?? 0), originalPaid);
      const expected = Number.isSafeInteger(underchargeExpectedCents) && underchargeExpectedCents > 0 ? underchargeExpectedCents : basePaid + Math.max(0, amountCents);
      const adjustmentRef = db.collection("academyBillingAdjustments").doc(`${uid}_${period}`);
      if (event.type === "invoice.paid") {
        const corrected = academyCorrectedMonthPaidCents({ currentPaidCents: Math.max(0, Number(monthData?.amountCents ?? 0)),
          previousPaidCents: Math.max(0, Number.isSafeInteger(underchargePreviousCents) ? underchargePreviousCents : 0),
          expectedCents: expected, correctionPaidCents: Math.max(0, amountCents) });
        tx.set(monthRef, {
          period, method: "card", status: corrected >= expected ? "paid" : "card_attention", amountCents: corrected,
          underchargeOriginalPaidCents: originalPaid,
          underchargeCorrectionCents: Math.max(0, amountCents), underchargeCorrectionInvoiceId: invoiceId,
          underchargeCorrectedAt: now, updatedAt: now
        }, { merge: true });
        tx.set(adjustmentRef, { status: corrected >= expected ? "paid" : "partial", invoiceId, paidCents: corrected, updatedAt: now }, { merge: true });
        if (amountCents > 0 && invoiceId) {
          queueAcademyEmail(tx, db, cardReceiptEmail({ invoiceId, email: String(familyData.email),
            name: String(familyData.guardianName), period, amountCents, paidAt: new Date(event.created * 1000).toISOString(), invoiceUrl,
            testMode: academyBillingMode() !== "live" }));
        }
      } else {
        tx.set(monthRef, { status: "card_attention", underchargeCorrectionInvoiceId: invoiceId, updatedAt: now }, { merge: true });
        tx.set(adjustmentRef, { status: "payment_failed", invoiceId, updatedAt: now }, { merge: true });
      }
      tx.create(markerRef, { type: event.type, objectId: String(data.id ?? ""), adjustment: "undercharge", processedAt: now });
      return;
    }
    const monthCreated = Number(monthData?.lastStripeEventCreated ?? 0);
    const monthRank = Number(monthData?.lastStripeEventRank ?? -1);
    if (monthRef && !(event.type === "invoice.paid" && amountCents === 0) && (event.created > monthCreated || event.created === monthCreated && rank >= monthRank)) {
      tx.set(monthRef, { period, method: "card", status: event.type === "invoice.paid" ? "paid" : "card_attention", amountCents,
        invoiceId, invoiceUrl, lastStripeEventCreated: event.created, lastStripeEventRank: rank,
        ...(event.type === "invoice.paid" ? { paidAt: now } : {}), updatedAt: now }, { merge: true });
      if (event.type === "invoice.paid" && amountCents > 0 && invoiceId &&
          !(monthData?.status === "paid" && monthData?.invoiceId === invoiceId)) {
        queueAcademyEmail(tx, db, cardReceiptEmail({ invoiceId, email: String(familyData.email),
          name: String(familyData.guardianName), period, amountCents, paidAt: new Date(event.created * 1000).toISOString(), invoiceUrl,
          testMode: academyBillingMode() !== "live" }));
      }
    }
    tx.create(markerRef, { type: event.type, objectId: String(data.id ?? ""), processedAt: now });
  });
}
