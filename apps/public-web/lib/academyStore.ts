import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { ACADEMY_DEFAULT_MONTHLY_CENTS_PER_CHILD, ACADEMY_LAST_BILLING_MONTH, academyEnrollmentStartPeriod, academyRegistrationOpen, academyTuitionPeriod, calgaryBillingPeriod, dateStringInTimeZone, masjidTimeZone, parseAcademyRegistration, type AcademyPublicFamily, type AcademyRegistrationInput } from "@hbic/shared";
import { getFirebaseApp } from "./firebaseAdmin";
import { requireAdminSecret } from "./api";
import { cashReceiptEmail, enrollmentConfirmedEmail, registrationEmail, queueAcademyEmail } from "./academyEmail";
import { cashConversionWasApplied, expireUnpaidAcademyCheckout, pendingAcademyRegistrationMatches } from "./academyCheckoutState";

const families = "academyFamilies";
const pendingRegistrations = "academyPendingRegistrations";
const passes = "academyPasses";
const settings = "academySettings";

export class AcademyError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function academyDb(): Firestore {
  if (process.env.ACADEMY_PREVIEW_ENABLED !== "true") throw new AcademyError("Academy preview is not enabled.", 404);
  const app = getFirebaseApp();
  if (!app) throw new AcademyError("Academy storage is not configured.", 503);
  return getFirestore(app);
}

export async function academyParent(request: Request) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!bearer) throw new AcademyError("Sign in to your Academy account first.", 401);
  const app = getFirebaseApp();
  if (!app) throw new AcademyError("Academy sign-in is not configured.", 503);
  try {
    // Verify Firebase's signature, issuer, audience and expiry. The deployed
    // service account cannot perform the additional revocation lookup
    // (auth/insufficient-permission); requiring that lookup would reject every
    // valid parent. Short-lived ID tokens are refreshed by the client.
    const token = await getAuth(app).verifyIdToken(bearer);
    if (!token.email || !token.email_verified) throw new AcademyError("This Academy account's email is not verified yet. Open the verification link, then try again.", 401);
    return { uid: token.uid, email: token.email.trim().toLowerCase() };
  } catch (error) {
    if (error instanceof AcademyError) throw error;
    console.error("Academy Firebase ID token verification failed:",
      error && typeof error === "object" && "code" in error ? String(error.code) : "unknown");
    // Invalid, expired, revoked, or wrong-project tokens land here — never
    // reported as "unverified", so a configuration problem cannot masquerade
    // as an unverified email.
    throw new AcademyError("Academy sign-in could not be confirmed. Please sign in again.", 401);
  }
}

export async function academyAdmin(request: Request) {
  const result = await requireAdminSecret(request);
  // Child records require an individually identifiable, approved account.
  if (!result.ok || result.actor.kind !== "firebase-account") {
    throw new AcademyError("Sign in with your approved personal administrator account for Academy records.", 401);
  }
  if (!["superAdmin", "director", "caretaker"].includes(result.actor.role)) {
    throw new AcademyError("This administrator cannot access Academy records.", 403);
  }
  academyDb();
  return result.actor;
}

function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function reference() { return `QA-${randomBytes(5).toString("hex").toUpperCase()}`; }
function priorEnrollmentEnded(data: Record<string, unknown> | undefined) {
  if (!data) return false;
  if (data.enrollmentState === "withdrawn") return true;
  const children = Array.isArray(data.children) ? data.children as { cancelEffectiveAt?: string | null }[] : [];
  return children.length > 0 && children.every((child) => child.cancelEffectiveAt && Date.parse(child.cancelEffectiveAt) <= Date.now());
}
function publicFamily(id: string, data: Record<string, unknown>, month: Record<string, unknown> | undefined): AcademyPublicFamily {
  const children = data.children as AcademyPublicFamily["children"];
  const hasCurrentChild = children.some((child) => !child.cancelEffectiveAt || Date.parse(child.cancelEffectiveAt) > Date.now());
  const rawEnrollment = String(data.enrollmentState ?? "conditional");
  const enrollmentState = rawEnrollment === "conditional" && data.paymentChoice === "card" && !data.stripeSubscriptionId
    ? "awaiting_checkout" : rawEnrollment === "submitted" || rawEnrollment === "approved" ? "conditional" : rawEnrollment;
  const period = String(month?.period ?? academyTuitionPeriod(new Date()));
  const today = dateStringInTimeZone(new Date(), masjidTimeZone);
  const rawPayment = String(month?.status ?? "awaiting_tuition");
  const paymentState = rawPayment === "cash_due" && today > `${period}-01` ? "past_due" : rawPayment;
  return {
    id,
    enrollmentStartPeriod: typeof data.enrollmentStartPeriod === "string" ? data.enrollmentStartPeriod : undefined,
    reference: String(data.reference),
    guardianName: String(data.guardianName),
    phone: String(data.phone),
    email: String(data.email),
    whatsappConsent: data.whatsappConsent === true,
    emailUpdates: data.emailUpdates === true,
    children,
    paymentChoice: data.paymentChoice as AcademyPublicFamily["paymentChoice"],
    billingMethod: month?.method === "card" || month?.method === "cash" ? month.method : data.paymentChoice as AcademyPublicFamily["paymentChoice"],
    pendingPaymentChoice: data.pendingPaymentChoice === "cash" || data.pendingPaymentChoice === "card" ? data.pendingPaymentChoice : null,
    paymentChangeEffectivePeriod: typeof data.paymentChangeEffectivePeriod === "string" ? data.paymentChangeEffectivePeriod : null,
    policyVersion: typeof data.policyVersion === "string" ? data.policyVersion : undefined,
    policyAcceptedAt: typeof data.policyAcceptedAt === "string" ? data.policyAcceptedAt : undefined,
    recurringAuthorizedAt: typeof data.recurringAuthorizedAt === "string" ? data.recurringAuthorizedAt : null,
    staffCardSetupRequestedAt: typeof data.staffCardSetupRequestedAt === "string" ? data.staffCardSetupRequestedAt : null,
    enrollmentState: hasCurrentChild ? enrollmentState as AcademyPublicFamily["enrollmentState"] : "withdrawn",
    billingPeriod: period,
    amountCents: typeof month?.amountCents === "number" ? month.amountCents : null,
    paymentState: paymentState as AcademyPublicFamily["paymentState"],
    cardSetupComplete: data.paymentChoice === "card" && typeof data.stripeSubscriptionId === "string" && typeof data.stripeCustomerId === "string",
    passToken: String(data.passToken),
    cashReminderEligible: data.firstCashPaidAt !== undefined && data.paymentChoice === "cash",
    createdAt: String(data.createdAt)
  };
}

async function currentMonth(db: Firestore, uid: string, family: Record<string, unknown>, sharedPricing?: Awaited<ReturnType<typeof getAcademyPricing>>) {
  const currentPeriod = academyTuitionPeriod(new Date());
  const period = typeof family.enrollmentStartPeriod === "string" && family.enrollmentStartPeriod > currentPeriod ? family.enrollmentStartPeriod : currentPeriod;
  const ref = db.collection(families).doc(uid).collection("months").doc(period);
  const existing = await ref.get();
  const pricing = sharedPricing ?? await getAcademyPricing();
  const billingStart = Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)) - 1, 1, 12);
  const childCount = Array.isArray(family.children) ? family.children.filter((child: { cancelEffectiveAt?: string | null }) =>
    !child.cancelEffectiveAt || Date.parse(child.cancelEffectiveAt) > billingStart).length : 0;
  const mode = pricing.tuitionMode;
  const unit = pricing.monthlyCents;
  const amountCents = childCount === 0 || period > ACADEMY_LAST_BILLING_MONTH ? 0 : Number.isSafeInteger(unit) && unit > 0 && (mode === "per_child" || mode === "per_family")
    ? unit * (mode === "per_child" ? childCount : 1) : null;
  if (existing.exists) {
    if (existing.data()?.status !== "paid" && existing.data()?.method !== family.paymentChoice && amountCents !== null) {
      await ref.update({ method: family.paymentChoice, amountCents,
        status: amountCents === 0 ? "not_due" : family.paymentChoice === "cash" ? "cash_due" : calgaryBillingPeriod(new Date()) < period ? "scheduled" : "card_attention",
        updatedAt: new Date().toISOString() });
      return (await ref.get()).data();
    }
    if (existing.data()?.status === "scheduled" && calgaryBillingPeriod(new Date()) >= period) {
      await ref.update({ status: "card_attention", updatedAt: new Date().toISOString() });
      return (await ref.get()).data();
    }
    if (existing.data()?.status === "awaiting_tuition" && amountCents !== null) {
      await ref.update({ amountCents, status: amountCents === 0 ? "not_due" : family.paymentChoice === "cash" ? "cash_due" : calgaryBillingPeriod(new Date()) < period ? "scheduled" : "card_attention", pricedAt: new Date().toISOString() });
      return (await ref.get()).data();
    }
    return existing.data();
  }
  const month = {
    period, amountCents,
    status: amountCents === null ? "awaiting_tuition" : amountCents === 0 ? "not_due" : family.paymentChoice === "cash" ? "cash_due" : calgaryBillingPeriod(new Date()) < period ? "scheduled" : "card_attention",
    method: family.paymentChoice,
    createdAt: new Date().toISOString()
  };
  try { await ref.create(month); } catch (error) {
    if ((error as { code?: number }).code !== 6) throw error;
  }
  return (await ref.get()).data() ?? month;
}

export type AcademyPendingRegistrationPublic = {
  registrationId: string;
  enrollmentStartPeriod: string;
  guardianName: string;
  phone: string;
  email: string;
  whatsappConsent: boolean;
  emailUpdates: boolean;
  children: AcademyRegistrationInput["children"];
  paymentChoice: "card";
  startChoice: "current" | "next";
  policyVersion: string;
  policyAccepted: true;
  recurringAuthorized: true;
  checkoutStarted: boolean;
  createdAt: string;
};

function publicPendingRegistration(data: Record<string, unknown>): AcademyPendingRegistrationPublic {
  return {
    registrationId: String(data.registrationId ?? ""),
    enrollmentStartPeriod: String(data.enrollmentStartPeriod ?? ""),
    guardianName: String(data.guardianName ?? ""),
    phone: String(data.phone ?? ""),
    email: String(data.email ?? ""),
    whatsappConsent: data.whatsappConsent === true,
    emailUpdates: data.emailUpdates === true,
    children: Array.isArray(data.children) ? data.children as AcademyRegistrationInput["children"] : [],
    paymentChoice: "card",
    startChoice: data.startChoice === "next" ? "next" : "current",
    policyVersion: String(data.policyVersion ?? ""),
    policyAccepted: true,
    recurringAuthorized: true,
    checkoutStarted: typeof data.stripeCheckoutSessionId === "string",
    createdAt: String(data.createdAt ?? "")
  };
}

export async function getAcademyPendingRegistration(uid: string) {
  const doc = await academyDb().collection(pendingRegistrations).doc(uid).get();
  return doc.exists ? publicPendingRegistration(doc.data() ?? {}) : null;
}

/** Close an unpaid pending card Checkout before converting its private registration to cash. */
export async function expirePendingAcademyCheckoutForCash(uid: string, expectedRegistrationId?: string) {
  const pending = (await academyDb().collection(pendingRegistrations).doc(uid).get()).data();
  if (!pending) return null;
  const registrationId = String(pending.registrationId ?? "");
  if (expectedRegistrationId && !pendingAcademyRegistrationMatches(expectedRegistrationId, registrationId)) {
    throw new AcademyError("The pending registration changed. Refresh before choosing cash.", 409);
  }
  const sessionId = pending?.stripeCheckoutSessionId;
  const cashRegistration = {
    guardianName: pending.guardianName, phone: pending.phone, email: pending.email,
    whatsappConsent: pending.whatsappConsent, emailUpdates: pending.emailUpdates,
    children: pending.children, paymentChoice: "cash" as const,
    startChoice: pending.startChoice === "next" ? "next" as const : "current" as const,
    policyVersion: pending.policyVersion, policyAccepted: true, recurringAuthorized: false
  };
  if (typeof sessionId !== "string") return { registrationId, sessionId: null, cashRegistration };
  const stripe = (await import("./academyStripe")).academyStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== uid || session.metadata?.academyRegistrationId !== String(pending?.registrationId ?? "")) {
    throw new AcademyError("Card Checkout could not be verified. Contact HBIC before changing payment method.", 409);
  }
  try {
    await expireUnpaidAcademyCheckout(sessionId,
      async (id) => {
        const retrieved = await stripe.checkout.sessions.retrieve(id);
        return { id: retrieved.id, status: retrieved.status, payment_status: retrieved.payment_status };
      },
      (id) => stripe.checkout.sessions.expire(id));
  } catch (error) {
    throw new AcademyError(error instanceof Error ? error.message : "Card Checkout could not be safely closed.", 409);
  }
  return { registrationId, sessionId, cashRegistration };
}

/**
 * Card signup is only a private pending application until Stripe confirms a
 * non-zero tuition payment. No Academy family, pass, enrollment, or month
 * ledger is created here.
 */
export async function prepareAcademyPendingCardRegistration(uid: string, verifiedEmail: string, raw: unknown) {
  if (process.env.ACADEMY_REGISTRATION_READY !== "true" || !academyRegistrationOpen()) {
    throw new AcademyError("Quran Academy registration is not open yet.", 403);
  }
  const db = academyDb();
  let input: AcademyRegistrationInput;
  try { input = parseAcademyRegistration(raw); }
  catch (error) { throw new AcademyError(error instanceof Error ? error.message : "Check the registration details.", 400); }
  if (input.paymentChoice !== "card") throw new AcademyError("Choose card payment to continue to secure Checkout.");
  if (input.email !== verifiedEmail) throw new AcademyError("Use the email address verified on this account.", 403);
  const { academyCardConfig, academyStripe } = await import("./academyStripe");
  if (!(await academyCardConfig()).cardAvailable) throw new AcademyError("Card billing is not yet enabled. Choose cash at HBIC for now.", 409);

  const familyRef = db.collection(families).doc(uid);
  const previous = await familyRef.get();
  if (previous.exists && !priorEnrollmentEnded(previous.data())) throw new AcademyError("This account is already registered. Open your Academy pass instead.", 409);
  if (previous.exists && previous.data()?.paymentChoice === "card") {
    const stripe = academyStripe();
    if (typeof previous.data()?.stripeSubscriptionId === "string") {
      const subscription = await stripe.subscriptions.retrieve(previous.data()!.stripeSubscriptionId);
      if (subscription.status !== "canceled") throw new AcademyError("The previous card subscription must finish before a fresh registration.", 409);
    }
    if (typeof previous.data()?.stripeCheckoutSessionId === "string") {
      const session = await stripe.checkout.sessions.retrieve(previous.data()!.stripeCheckoutSessionId);
      if (session.status === "open") throw new AcademyError("The previous card Checkout must close before a fresh registration.", 409);
    }
  }

  const pendingRef = db.collection(pendingRegistrations).doc(uid);
  const existing = await pendingRef.get();
  if (typeof existing.data()?.stripeCheckoutSessionId === "string") {
    const stripe = academyStripe();
    try {
      const session = await stripe.checkout.sessions.retrieve(existing.data()!.stripeCheckoutSessionId);
      if (session.status === "complete") throw new AcademyError("Your card payment is being confirmed. Refresh shortly.", 409);
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
    } catch (error) {
      if (error instanceof AcademyError) throw error;
      // Missing/expired stale Checkout is safe to replace.
    }
  }

  const now = new Date().toISOString();
  let enrollmentStartPeriod: string;
  try { enrollmentStartPeriod = academyEnrollmentStartPeriod(input.startChoice, new Date(now)); }
  catch (error) { throw new AcademyError(error instanceof Error ? error.message : "Choose an available start month."); }
  const pending = {
    ...input,
    paymentChoice: "card" as const,
    enrollmentStartPeriod,
    registrationId: randomBytes(12).toString("hex"),
    policyAcceptedAt: now,
    recurringAuthorizedAt: now,
    createdAt: now,
    updatedAt: now,
    status: "awaiting_checkout"
  };
  await pendingRef.set(pending);
  await db.collection("academyAudit").add({
    action: "card_registration_checkout_started", familyId: uid, registrationId: pending.registrationId,
    period: enrollmentStartPeriod, at: now
  });
  return publicPendingRegistration(pending);
}

/**
 * A paid Stripe invoice is the only path that promotes a pending card
 * application into an Academy enrollment.
 */
export async function activatePendingAcademyCardRegistration(uid: string, registrationId: string, stripeData: {
  checkoutSessionId?: string | null;
  customerId: string;
  subscriptionId: string;
  termBillingStopAt: number;
}) {
  const db = academyDb();
  const familyRef = db.collection(families).doc(uid);
  const existingFamily = await familyRef.get();
  if (existingFamily.exists && String(existingFamily.data()?.registrationId ?? "") === registrationId) return getAcademyFamily(uid);

  const pendingRef = db.collection(pendingRegistrations).doc(uid);
  const pendingSnapshot = await pendingRef.get();
  if (!pendingSnapshot.exists || String(pendingSnapshot.data()?.registrationId ?? "") !== registrationId) {
    throw new AcademyError("Paid Checkout does not match a pending Academy registration.", 409);
  }
  const saved = pendingSnapshot.data()!;
  if (saved.paymentChoice !== "card") throw new AcademyError("Pending Academy registration is not a card signup.", 409);

  const passToken = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  const family = {
    guardianName: String(saved.guardianName),
    phone: String(saved.phone),
    email: String(saved.email),
    whatsappConsent: saved.whatsappConsent === true,
    emailUpdates: saved.emailUpdates === true,
    children: (saved.children as AcademyRegistrationInput["children"]).map((child) => ({
      ...child, id: randomBytes(8).toString("hex"), classId: null, cancelEffectiveAt: null
    })),
    paymentChoice: "card" as const,
    startChoice: saved.startChoice === "next" ? "next" as const : "current" as const,
    enrollmentStartPeriod: String(saved.enrollmentStartPeriod),
    policyVersion: String(saved.policyVersion),
    policyAccepted: true,
    recurringAuthorized: true,
    policyAcceptedAt: String(saved.policyAcceptedAt ?? saved.createdAt ?? now),
    recurringAuthorizedAt: String(saved.recurringAuthorizedAt ?? saved.createdAt ?? now),
    reference: reference(),
    registrationId,
    enrollmentState: "conditional" as const,
    passToken,
    passState: "active",
    stripeCheckoutSessionId: stripeData.checkoutSessionId ?? saved.stripeCheckoutSessionId ?? null,
    stripeCustomerId: stripeData.customerId,
    stripeSubscriptionId: stripeData.subscriptionId,
    stripeStatus: "active",
    stripeConfirmedAt: now,
    termBillingStopAt: stripeData.termBillingStopAt,
    signupStartedAt: String(saved.createdAt ?? now),
    createdAt: now,
    updatedAt: now
  };

  await db.runTransaction(async (tx) => {
    const [pending, old] = await Promise.all([tx.get(pendingRef), tx.get(familyRef)]);
    if (!pending.exists || String(pending.data()?.registrationId ?? "") !== registrationId) {
      if (old.exists && String(old.data()?.registrationId ?? "") === registrationId) return;
      throw new AcademyError("Pending Academy registration changed before payment confirmation.", 409);
    }
    if (old.exists && !priorEnrollmentEnded(old.data())) throw new AcademyError("An active Academy enrollment already exists.", 409);
    if (old.exists) {
      const months = await tx.get(familyRef.collection("months"));
      const archiveRef = db.collection("academyArchivedRegistrations").doc(String(old.data()?.reference));
      tx.create(archiveRef, { ...old.data(), accountUid: uid, archivedAt: now, archivedReason: "paid_fresh_registration" });
      for (const item of months.docs) {
        tx.set(archiveRef.collection("months").doc(item.id), item.data());
        tx.delete(item.ref);
      }
      const oldPass = String(old.data()?.passToken ?? "");
      if (oldPass) tx.set(db.collection(passes).doc(tokenHash(oldPass)), { state: "revoked", updatedAt: now }, { merge: true });
      tx.set(familyRef, family);
    } else tx.create(familyRef, family);
    tx.create(db.collection(passes).doc(tokenHash(passToken)), { uid, state: "active", createdAt: now });
    tx.delete(pendingRef);
    tx.create(db.collection("academyAudit").doc(), {
      action: "card_registration_confirmed_by_payment", familyId: uid, registrationId,
      previousReference: old.exists ? String(old.data()?.reference) : null, at: now
    });
    queueAcademyEmail(tx, db, registrationEmail({
      uid, email: family.email, name: family.guardianName, reference: family.reference,
      period: family.enrollmentStartPeriod, paymentChoice: "card"
    }));
  });
  return getAcademyFamily(uid);
}

export async function registerAcademyFamily(uid: string, verifiedEmail: string, raw: unknown, cashConversion?: { registrationId: string; checkoutSessionId: string | null }) {
  if (process.env.ACADEMY_REGISTRATION_READY !== "true") throw new AcademyError("Quran Academy registration is not open yet.", 403);
  if (!academyRegistrationOpen()) throw new AcademyError("Quran Academy registration is not open yet.", 403);
  const db = academyDb();
  let input: AcademyRegistrationInput;
  try { input = parseAcademyRegistration(raw); }
  catch (error) { throw new AcademyError(error instanceof Error ? error.message : "Check the registration details.", 400); }
  if (input.paymentChoice === "card") {
    throw new AcademyError("Card enrollment is created only after secure Stripe payment. Continue to Checkout first.", 409);
  }
  if (input.email !== verifiedEmail) throw new AcademyError("Use the email address verified on this account.", 403);
  const familyRef = db.collection(families).doc(uid);
  const pendingRef = db.collection(pendingRegistrations).doc(uid);
  const previous = await familyRef.get();
  if (cashConversion && previous.exists && cashConversionWasApplied(previous.data(), cashConversion.registrationId)) {
    return getAcademyFamily(uid);
  }
  if (cashConversion) {
    const pending = await pendingRef.get();
    if (!pending.exists || !pendingAcademyRegistrationMatches(cashConversion.registrationId, pending.data()?.registrationId) ||
        (pending.data()?.stripeCheckoutSessionId ?? null) !== cashConversion.checkoutSessionId) {
      throw new AcademyError("The pending registration changed or Checkout was already resolved. Refresh before choosing cash.", 409);
    }
  }
  if (previous.exists && !priorEnrollmentEnded(previous.data())) throw new AcademyError("This account is already registered. Open your Academy pass instead.", 409);
  if (previous.exists && previous.data()?.paymentChoice === "card") {
    const { academyStripe } = await import("./academyStripe");
    const stripe = academyStripe();
    if (typeof previous.data()?.stripeSubscriptionId === "string") {
      const subscription = await stripe.subscriptions.retrieve(previous.data()!.stripeSubscriptionId);
      if (subscription.status !== "canceled") throw new AcademyError("The previous card subscription must finish before a fresh registration.", 409);
    }
    if (typeof previous.data()?.stripeCheckoutSessionId === "string") {
      const session = await stripe.checkout.sessions.retrieve(previous.data()!.stripeCheckoutSessionId);
      if (session.status === "open") throw new AcademyError("The previous card Checkout must close before a fresh registration.", 409);
    }
  }
  const passToken = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  let enrollmentStartPeriod: string;
  try { enrollmentStartPeriod = academyEnrollmentStartPeriod(input.startChoice, new Date(now)); }
  catch (error) { throw new AcademyError(error instanceof Error ? error.message : "Choose an available start month."); }
  const family = {
    ...input,
    enrollmentStartPeriod,
    policyAcceptedAt: now,
    recurringAuthorizedAt: null,
    children: input.children.map((child) => ({ ...child, id: randomBytes(8).toString("hex"), classId: null, cancelEffectiveAt: null })),
    reference: reference(),
    registrationId: randomBytes(12).toString("hex"),
    enrollmentState: "conditional",
    passToken,
    passState: "active",
    createdAt: now,
    updatedAt: now,
    ...(cashConversion ? { cashConversionFromRegistrationId: cashConversion.registrationId } : {})
  };
  const cashConversionAlreadyApplied = await db.runTransaction(async (tx) => {
    const [old, pending] = await Promise.all([tx.get(familyRef), cashConversion ? tx.get(pendingRef) : Promise.resolve(null)]);
    if (cashConversion && old.exists && cashConversionWasApplied(old.data(), cashConversion.registrationId)) {
      return true;
    }
    if (cashConversion && (!pending?.exists || !pendingAcademyRegistrationMatches(cashConversion.registrationId, pending.data()?.registrationId) ||
        (pending.data()?.stripeCheckoutSessionId ?? null) !== cashConversion.checkoutSessionId)) {
      throw new AcademyError("The pending registration changed or Checkout was already resolved. Refresh before choosing cash.", 409);
    }
    if (old.exists && !priorEnrollmentEnded(old.data())) throw new AcademyError("This account is already registered.", 409);
    if (old.exists) {
      const months = await tx.get(familyRef.collection("months"));
      const archiveRef = db.collection("academyArchivedRegistrations").doc(String(old.data()?.reference));
      tx.create(archiveRef, { ...old.data(), accountUid: uid, archivedAt: now, archivedReason: "fresh_registration" });
      for (const item of months.docs) {
        tx.set(archiveRef.collection("months").doc(item.id), item.data());
        tx.delete(item.ref);
      }
      const oldPass = String(old.data()?.passToken ?? "");
      if (oldPass) tx.set(db.collection(passes).doc(tokenHash(oldPass)), { state: "revoked", updatedAt: now }, { merge: true });
      tx.set(familyRef, family);
    } else tx.create(familyRef, family);
    tx.create(db.collection(passes).doc(tokenHash(passToken)), { uid, state: "active", createdAt: now });
    tx.delete(pendingRef);
    tx.create(db.collection("academyAudit").doc(), { action: "fresh_registration", familyId: uid, registrationId: family.registrationId,
      previousReference: old.exists ? String(old.data()?.reference) : null, at: now });
    queueAcademyEmail(tx, db, registrationEmail({ uid, email: input.email, name: input.guardianName,
      reference: family.reference, period: enrollmentStartPeriod, paymentChoice: input.paymentChoice }));
    return false;
  });
  if (cashConversionAlreadyApplied) return getAcademyFamily(uid);
  const month = await currentMonth(db, uid, family);
  return publicFamily(uid, family, month);
}

export async function getAcademyFamily(uid: string) {
  const db = academyDb();
  const doc = await db.collection(families).doc(uid).get();
  if (!doc.exists) return null;
  const family = doc.data()!;
  const month = await currentMonth(db, uid, family);
  return publicFamily(uid, family, month);
}

export async function scanAcademyPass(token: string, actorUid: string) {
  const db = academyDb();
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new AcademyError("This Academy pass is invalid.", 400);
  await limitAcademyLookups(db, actorUid);
  const pass = await db.collection(passes).doc(tokenHash(token)).get();
  if (!pass.exists) throw new AcademyError("This Academy pass was not found.", 404);
  if (pass.data()?.state !== "active") throw new AcademyError("This Academy pass is inactive or replaced.", 410);
  const expiresAt = pass.data()?.walletExpiresAt;
  if (typeof expiresAt === "string" && Date.parse(expiresAt) <= Date.now()) throw new AcademyError("This Academy pass has expired.", 410);
  const family = await getAcademyFamily(String(pass.data()?.uid));
  if (!family || family.passToken !== token) throw new AcademyError("This Academy pass is no longer current.", 410);
  if (family.enrollmentState === "withdrawn") throw new AcademyError("This Academy registration is no longer active.", 410);
  await db.collection("academyAudit").add({ action: "pass_scanned", familyId: family.id, actorUid, at: new Date().toISOString() });
  return family;
}

async function limitAcademyLookups(db: Firestore, actorUid: string) {
  const bucket = Math.floor(Date.now() / 60_000);
  const rateRef = db.collection("academyScanRates").doc(`${actorUid}_${bucket}`);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(rateRef);
    const count = Number(snapshot.data()?.count ?? 0);
    if (count >= 60) throw new AcademyError("Too many scans. Try again in a minute.", 429);
    tx.set(rateRef, { count: count + 1, expiresAt: new Date(Date.now() + 120_000).toISOString() });
  });
}

/** Staff may type the public QA reference when a camera or QR is unavailable. */
export async function lookupAcademyReference(reference: string, actorUid: string) {
  if (!/^QA-[A-F0-9]{10}$/.test(reference)) throw new AcademyError("Enter the full QA- reference shown on the Academy pass.", 400);
  const db = academyDb();
  await limitAcademyLookups(db, actorUid);
  const matches = await db.collection(families).where("reference", "==", reference).limit(2).get();
  if (matches.empty) throw new AcademyError("No Academy registration matches that reference.", 404);
  if (matches.size !== 1) throw new AcademyError("This reference needs administrator review.", 409);
  const saved = matches.docs[0].data();
  const currentToken = String(saved.passToken ?? "");
  if (saved.passState !== "active" || !/^[A-Za-z0-9_-]{43}$/.test(currentToken)) {
    throw new AcademyError("This Academy pass is inactive or replaced.", 410);
  }
  const pass = await db.collection(passes).doc(tokenHash(currentToken)).get();
  if (!pass.exists || pass.data()?.state !== "active" || pass.data()?.uid !== matches.docs[0].id) {
    throw new AcademyError("This Academy pass is no longer current.", 410);
  }
  const expiresAt = pass.data()?.walletExpiresAt;
  if (typeof expiresAt === "string" && Date.parse(expiresAt) <= Date.now()) throw new AcademyError("This Academy pass has expired.", 410);
  const family = await getAcademyFamily(matches.docs[0].id);
  if (!family) throw new AcademyError("This Academy registration was not found.", 404);
  if (family.enrollmentState === "withdrawn") throw new AcademyError("This Academy registration is no longer active.", 410);
  await db.collection("academyAudit").add({ action: "reference_looked_up", familyId: family.id, actorUid, at: new Date().toISOString() });
  return family;
}

export async function moveAcademyCashStartToCurrentMonth(uid: string, actor: { uid: string; email: string }, reason: string) {
  const cleanReason = reason.trim();
  if (cleanReason.length < 8 || cleanReason.length > 300) throw new AcademyError("Enter a reason between 8 and 300 characters.");
  const db = academyDb();
  const familyRef = db.collection(families).doc(uid);
  const currentPeriod = academyTuitionPeriod(new Date());
  let updated: Record<string, unknown> | null = null;
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(familyRef);
    if (!snapshot.exists) throw new AcademyError("Academy registration was not found.", 404);
    const data = snapshot.data() ?? {};
    if (data.enrollmentState === "withdrawn" || data.withdrawalPendingAt) throw new AcademyError("Withdrawn enrollment cannot be moved.", 409);
    if (data.paymentChoice !== "cash") throw new AcademyError("Only a cash registration can be moved from this staff control.", 409);
    const previous = String(data.enrollmentStartPeriod ?? currentPeriod);
    if (previous <= currentPeriod) { updated = data; return; }
    if (!["conditional", "submitted", "approved"].includes(String(data.enrollmentState))) {
      throw new AcademyError("Only a pending/conditional cash registration can be moved to the current month.", 409);
    }
    const now = new Date().toISOString();
    updated = { ...data, enrollmentStartPeriod: currentPeriod, updatedAt: now };
    tx.update(familyRef, { enrollmentStartPeriod: currentPeriod, updatedAt: now });
    tx.create(db.collection("academyAudit").doc(), {
      action: "enrollment_start_corrected", familyId: uid, fromPeriod: previous, toPeriod: currentPeriod,
      reason: cleanReason, actorUid: actor.uid, actorEmail: actor.email, at: now
    });
  });
  const data = updated ?? (await familyRef.get()).data() ?? {};
  const month = await currentMonth(db, uid, data);
  return publicFamily(uid, data, month);
}

export async function receiveAcademyCash(uid: string, period: string, actor: { uid: string; email: string }) {
  const db = academyDb();
  if (!/^\d{4}-\d{2}$/.test(period) || period !== academyTuitionPeriod(new Date())) {
    throw new AcademyError("Only the active Academy tuition month can be received from this screen.");
  }
  const familyRef = db.collection(families).doc(uid);
  const monthRef = familyRef.collection("months").doc(period);
  const receiptRef = db.collection("academyReceipts").doc();
  const auditRef = db.collection("academyAudit").doc();
  const now = new Date().toISOString();
  return db.runTransaction(async (tx) => {
    const [family, month] = await Promise.all([tx.get(familyRef), tx.get(monthRef)]);
    if (!family.exists || !month.exists) throw new AcademyError("Family or month not found.", 404);
    if (family.data()?.paymentChoice !== "cash" || month.data()?.method !== "cash") throw new AcademyError("This family is not set up for cash payment.", 409);
    if (month.data()?.status === "paid") throw new AcademyError("This month is already paid. No second receipt was created.", 409);
    const amountCents = month.data()?.amountCents;
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new AcademyError("Tuition has not been configured for this family.", 409);
    const receipt = {
      number: `QA-R-${randomBytes(6).toString("hex").toUpperCase()}`,
      familyId: uid, period, amountCents, method: "cash", receivedAt: now,
      billingMode: process.env.ACADEMY_STRIPE_BILLING_MODE === "live" ? "live" : "test",
      receivedBy: actor.uid, receivedByEmail: actor.email
    };
    tx.update(monthRef, { status: "paid", paidAt: now, receiptId: receiptRef.id });
    tx.update(familyRef, { firstCashPaidAt: family.data()?.firstCashPaidAt ?? now, updatedAt: now });
    tx.create(receiptRef, receipt);
    tx.create(auditRef, { action: "cash_received", familyId: uid, period, amountCents, actorUid: actor.uid, at: now });
    queueAcademyEmail(tx, db, cashReceiptEmail({ receiptId: receipt.number, email: String(family.data()?.email),
      name: String(family.data()?.guardianName), reference: String(family.data()?.reference), period, amountCents, receivedAt: now,
      enrollmentState: String(family.data()?.enrollmentState), testMode: process.env.ACADEMY_STRIPE_BILLING_MODE !== "live" }));
    return receipt;
  });
}

/** Physical check-in is an explicit staff decision and never changes tuition. */
export async function confirmAcademyEnrollment(uid: string, actor: { uid: string; email: string }) {
  const db = academyDb();
  const ref = db.collection(families).doc(uid);
  const now = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new AcademyError("Academy registration was not found.", 404);
    const data = snapshot.data() ?? {};
    if (data.enrollmentStartPeriod && String(data.enrollmentStartPeriod) > calgaryBillingPeriod(new Date())) throw new AcademyError("This registration starts next month; check-in opens when that month begins.", 409);
    if (data.enrollmentState !== "active" && data.paymentChoice === "card" && !data.stripeSubscriptionId) throw new AcademyError("The parent must finish secure Stripe Checkout before enrollment can be confirmed.", 409);
    if (!["conditional", "submitted", "approved", "active"].includes(String(data.enrollmentState))) {
      throw new AcademyError("This enrollment cannot be checked in from its current state.", 409);
    }
    if (data.enrollmentState === "active") return;
    tx.update(ref, { enrollmentState: "active", checkedInAt: now, checkedInBy: actor.uid, updatedAt: now });
    tx.create(db.collection("academyAudit").doc(), { action: "enrollment_checked_in", familyId: uid, actorUid: actor.uid, actorEmail: actor.email, at: now });
    queueAcademyEmail(tx, db, enrollmentConfirmedEmail({ uid, email: String(data.email), name: String(data.guardianName), reference: String(data.reference) }));
  });
  return getAcademyFamily(uid);
}

export async function listAcademyFamilies() {
  const db = academyDb();
  const docs = await db.collection(families).orderBy("createdAt", "desc").limit(100).get();
  // One configuration read, not the same pricing document once per family.
  // Month ledgers remain uncached and authoritative on every refresh.
  if (!docs.size) return [];
  const pricing = await getAcademyPricing();
  return Promise.all(docs.docs.map(async (doc) => publicFamily(doc.id, doc.data(), await currentMonth(db, doc.id, doc.data(), pricing))));
}

export async function getAcademyReceipts(uid: string) {
  const db = academyDb();
  const [snapshot, family] = await Promise.all([db.collection("academyReceipts").where("familyId", "==", uid).limit(100).get(), db.collection(families).doc(uid).get()]);
  const currentRegistrationAt = String(family.data()?.createdAt ?? "");
  return snapshot.docs.filter((doc) => String(doc.data().receivedAt ?? "") >= currentRegistrationAt).map((doc) => {
    const data = doc.data();
    return { number: String(data.number), period: String(data.period), amountCents: Number(data.amountCents),
      method: "cash" as const, receivedAt: String(data.receivedAt), billingMode: data.billingMode === "live" ? "live" as const : "test" as const };
  }).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

/** Month ledger is authoritative for both cash and Stripe-backed card history. */
export async function getAcademyPaymentHistory(uid: string) {
  const db = academyDb();
  const family = await db.collection(families).doc(uid).get();
  if (!family.exists) throw new AcademyError("Academy registration was not found.", 404);
  const months = await family.ref.collection("months").orderBy("__name__", "desc").limit(24).get();
  return months.docs.map((doc) => {
    const data = doc.data();
    const invoiceUrl = typeof data.invoiceUrl === "string" ? data.invoiceUrl : "";
    let safeInvoiceUrl: string | null = null;
    try {
      const url = new URL(invoiceUrl);
      if (url.protocol === "https:" && url.hostname === "invoice.stripe.com") safeInvoiceUrl = url.href;
    } catch { /* No processor invoice for this month. */ }
    return { period: doc.id, method: data.method === "card" ? "card" as const : "cash" as const,
      status: typeof data.status === "string" ? data.status : "awaiting_tuition",
      amountCents: Number.isSafeInteger(data.amountCents) ? Number(data.amountCents) : null,
      paidAt: typeof data.paidAt === "string" ? data.paidAt : null, invoiceUrl: safeInvoiceUrl };
  });
}

export async function getAcademyPricing() {
  const data = (await academyDb().collection(settings).doc("config").get()).data();
  const approvedLivePrice = process.env.ACADEMY_STRIPE_BILLING_MODE === "live" ? process.env.ACADEMY_STRIPE_PRICE_ID ?? "" : "";
  return { tuitionMode: approvedLivePrice ? "per_child" as const : data?.tuitionMode === "per_family" ? "per_family" as const : "per_child" as const,
    monthlyCents: approvedLivePrice ? ACADEMY_DEFAULT_MONTHLY_CENTS_PER_CHILD : Number.isSafeInteger(data?.monthlyCents) ? Number(data?.monthlyCents) : ACADEMY_DEFAULT_MONTHLY_CENTS_PER_CHILD,
    // The deployment's approved live Price ID takes precedence over an older
    // admin draft so a stale Firestore setting cannot silently bill families
    // against a superseded Stripe product.
    stripePriceId: approvedLivePrice ||
      (typeof data?.stripePriceId === "string" && data.stripePriceId ? data.stripePriceId : process.env.ACADEMY_STRIPE_PRICE_ID ?? "") };
}

export async function setAcademyPricing(mode: unknown, cents: unknown, stripePriceId: unknown, actorUid: string) {
  if (mode !== "per_child" && mode !== "per_family") throw new AcademyError("Choose per-child or per-family tuition.");
  const amount = Number(cents);
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 100_000) throw new AcademyError("Enter monthly tuition between $1 and $1,000.");
  const priceId = String(stripePriceId ?? "").trim();
  if (priceId && !/^price_[A-Za-z0-9]+$/.test(priceId)) throw new AcademyError("Enter a valid Stripe recurring Price ID or leave it blank.");
  if (process.env.ACADEMY_STRIPE_BILLING_MODE === "live" && process.env.ACADEMY_STRIPE_PRICE_ID &&
      (mode !== "per_child" || amount !== ACADEMY_DEFAULT_MONTHLY_CENTS_PER_CHILD || priceId !== process.env.ACADEMY_STRIPE_PRICE_ID)) {
    throw new AcademyError("Live Academy tuition is fixed at $50 per child with the approved Stripe price. Update the release configuration before changing it.", 409);
  }
  await academyDb().collection(settings).doc("config").set({ tuitionMode: mode, monthlyCents: amount, stripePriceId: priceId,
    updatedBy: actorUid, updatedAt: new Date().toISOString() }, { merge: true });
  return getAcademyPricing();
}

export async function changeAcademyPass(uid: string, action: "replace" | "revoke", actorUid: string) {
  const db = academyDb();
  const familyRef = db.collection(families).doc(uid);
  const now = new Date().toISOString();
  const newToken = action === "replace" ? randomBytes(32).toString("base64url") : null;
  await db.runTransaction(async (tx) => {
    const family = await tx.get(familyRef);
    if (!family.exists) throw new AcademyError("Family not found.", 404);
    const oldToken = String(family.data()?.passToken ?? "");
    if (oldToken) tx.set(db.collection(passes).doc(tokenHash(oldToken)), { uid, state: "revoked", updatedAt: now }, { merge: true });
    if (newToken) tx.create(db.collection(passes).doc(tokenHash(newToken)), { uid, state: "active", createdAt: now });
    tx.update(familyRef, { passToken: newToken ?? "", passState: newToken ? "active" : "revoked", updatedAt: now });
    tx.create(db.collection("academyAudit").doc(), { action: `pass_${action}`, familyId: uid, actorUid, at: now });
  });
}
