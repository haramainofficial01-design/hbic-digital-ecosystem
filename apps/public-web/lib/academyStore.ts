import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { ACADEMY_DEFAULT_MONTHLY_CENTS_PER_CHILD, ACADEMY_LAST_BILLING_MONTH, academyRegistrationOpen, academyTuitionPeriod, calgaryBillingPeriod, parseAcademyRegistration, type AcademyPublicFamily, type AcademyRegistrationInput } from "@hbic/shared";
import { getFirebaseApp } from "./firebaseAdmin";
import { requireAdminSecret } from "./api";

const families = "academyFamilies";
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
  // Child records require an individually identifiable, MFA-protected account.
  if (!result.ok || result.actor.kind !== "firebase-account") {
    throw new AcademyError("Personal administrator sign-in with MFA is required for Academy records.", 401);
  }
  if (!["superAdmin", "director", "caretaker"].includes(result.actor.role)) {
    throw new AcademyError("This administrator cannot access Academy records.", 403);
  }
  academyDb();
  return result.actor;
}

function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function reference() { return `QA-${randomBytes(5).toString("hex").toUpperCase()}`; }
function publicFamily(id: string, data: Record<string, unknown>, month: Record<string, unknown> | undefined): AcademyPublicFamily {
  const children = data.children as AcademyPublicFamily["children"];
  const hasCurrentChild = children.some((child) => !child.cancelEffectiveAt || Date.parse(child.cancelEffectiveAt) > Date.now());
  return {
    id,
    reference: String(data.reference),
    guardianName: String(data.guardianName),
    phone: String(data.phone),
    email: String(data.email),
    whatsappConsent: data.whatsappConsent === true,
    children,
    paymentChoice: data.paymentChoice as AcademyPublicFamily["paymentChoice"],
    policyVersion: typeof data.policyVersion === "string" ? data.policyVersion : undefined,
    policyAcceptedAt: typeof data.policyAcceptedAt === "string" ? data.policyAcceptedAt : undefined,
    recurringAuthorizedAt: typeof data.recurringAuthorizedAt === "string" ? data.recurringAuthorizedAt : null,
    enrollmentState: hasCurrentChild ? data.enrollmentState as AcademyPublicFamily["enrollmentState"] : "withdrawn",
    billingPeriod: String(month?.period ?? academyTuitionPeriod(new Date())),
    amountCents: typeof month?.amountCents === "number" ? month.amountCents : null,
    paymentState: (month?.status ?? "awaiting_tuition") as AcademyPublicFamily["paymentState"],
    cardSetupComplete: data.paymentChoice === "card" && typeof data.stripeSubscriptionId === "string" && typeof data.stripeCustomerId === "string",
    passToken: String(data.passToken),
    cashReminderEligible: data.firstCashPaidAt !== undefined && data.paymentChoice === "cash",
    createdAt: String(data.createdAt)
  };
}

async function currentMonth(db: Firestore, uid: string, family: Record<string, unknown>) {
  const period = academyTuitionPeriod(new Date());
  const ref = db.collection(families).doc(uid).collection("months").doc(period);
  const existing = await ref.get();
  const pricing = await getAcademyPricing();
  const billingStart = Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)) - 1, 1, 12);
  const childCount = Array.isArray(family.children) ? family.children.filter((child: { cancelEffectiveAt?: string | null }) =>
    !child.cancelEffectiveAt || Date.parse(child.cancelEffectiveAt) > billingStart).length : 0;
  const mode = pricing.tuitionMode;
  const unit = pricing.monthlyCents;
  const amountCents = childCount === 0 || period > ACADEMY_LAST_BILLING_MONTH ? 0 : Number.isSafeInteger(unit) && unit > 0 && (mode === "per_child" || mode === "per_family")
    ? unit * (mode === "per_child" ? childCount : 1) : null;
  if (existing.exists) {
    if (existing.data()?.status === "scheduled" && calgaryBillingPeriod(new Date()) >= "2026-10") {
      await ref.update({ status: "card_attention", updatedAt: new Date().toISOString() });
      return (await ref.get()).data();
    }
    if (existing.data()?.status === "awaiting_tuition" && amountCents !== null) {
      await ref.update({ amountCents, status: amountCents === 0 ? "not_due" : family.paymentChoice === "cash" ? "cash_due" : period === "2026-10" && calgaryBillingPeriod(new Date()) < "2026-10" ? "scheduled" : "card_attention", pricedAt: new Date().toISOString() });
      return (await ref.get()).data();
    }
    return existing.data();
  }
  const month = {
    period, amountCents,
    status: amountCents === null ? "awaiting_tuition" : amountCents === 0 ? "not_due" : family.paymentChoice === "cash" ? "cash_due" : period === "2026-10" && calgaryBillingPeriod(new Date()) < "2026-10" ? "scheduled" : "card_attention",
    method: family.paymentChoice,
    createdAt: new Date().toISOString()
  };
  try { await ref.create(month); } catch (error) {
    if ((error as { code?: number }).code !== 6) throw error;
  }
  return (await ref.get()).data() ?? month;
}

export async function registerAcademyFamily(uid: string, verifiedEmail: string, raw: unknown) {
  if (process.env.ACADEMY_REGISTRATION_READY !== "true") throw new AcademyError("Quran Academy registration is not open yet.", 403);
  if (!academyRegistrationOpen()) throw new AcademyError("Quran Academy registration is not open yet.", 403);
  const db = academyDb();
  const input: AcademyRegistrationInput = parseAcademyRegistration(raw);
  if (input.paymentChoice === "card") {
    // Import lazily because Stripe billing also uses Academy storage. A card
    // family must not be created unless the exact live price has been checked.
    const { academyCardConfig } = await import("./academyStripe");
    if (!(await academyCardConfig()).cardAvailable) throw new AcademyError("Card billing is not yet enabled. Choose cash at HBIC for now.", 409);
  }
  if (input.email !== verifiedEmail) throw new AcademyError("Use the email address verified on this account.", 403);
  const familyRef = db.collection(families).doc(uid);
  if ((await familyRef.get()).exists) throw new AcademyError("This account is already registered. Open your Academy pass instead.", 409);
  const passToken = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  const family = {
    ...input,
    policyAcceptedAt: now,
    recurringAuthorizedAt: input.paymentChoice === "card" ? now : null,
    children: input.children.map((child) => ({ ...child, id: randomBytes(8).toString("hex"), classId: null, cancelEffectiveAt: null })),
    reference: reference(),
    enrollmentState: "submitted",
    passToken,
    passState: "active",
    createdAt: now,
    updatedAt: now
  };
  await db.runTransaction(async (tx) => {
    if ((await tx.get(familyRef)).exists) throw new AcademyError("This account is already registered.", 409);
    tx.create(familyRef, family);
    tx.create(db.collection(passes).doc(tokenHash(passToken)), { uid, state: "active", createdAt: now });
  });
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
  const bucket = Math.floor(Date.now() / 60_000);
  const rateRef = db.collection("academyScanRates").doc(`${actorUid}_${bucket}`);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(rateRef);
    const count = Number(snapshot.data()?.count ?? 0);
    if (count >= 60) throw new AcademyError("Too many scans. Try again in a minute.", 429);
    tx.set(rateRef, { count: count + 1, expiresAt: new Date(Date.now() + 120_000).toISOString() });
  });
  const pass = await db.collection(passes).doc(tokenHash(token)).get();
  if (!pass.exists) throw new AcademyError("This Academy pass was not found.", 404);
  if (pass.data()?.state !== "active") throw new AcademyError("This Academy pass is inactive or replaced.", 410);
  const family = await getAcademyFamily(String(pass.data()?.uid));
  if (!family || family.passToken !== token) throw new AcademyError("This Academy pass is no longer current.", 410);
  if (family.enrollmentState === "withdrawn") throw new AcademyError("This Academy registration is no longer active.", 410);
  await db.collection("academyAudit").add({ action: "pass_scanned", familyId: family.id, actorUid, at: new Date().toISOString() });
  return family;
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
    tx.update(familyRef, { firstCashPaidAt: family.data()?.firstCashPaidAt ?? now,
      enrollmentState: family.data()?.enrollmentState === "submitted" ? "approved" : family.data()?.enrollmentState,
      updatedAt: now });
    tx.create(receiptRef, receipt);
    tx.create(auditRef, { action: "cash_received", familyId: uid, period, amountCents, actorUid: actor.uid, at: now });
    return receipt;
  });
}

export async function listAcademyFamilies() {
  const db = academyDb();
  const docs = await db.collection(families).orderBy("createdAt", "desc").limit(100).get();
  return Promise.all(docs.docs.map(async (doc) => publicFamily(doc.id, doc.data(), await currentMonth(db, doc.id, doc.data()))));
}

export async function getAcademyReceipts(uid: string) {
  const snapshot = await academyDb().collection("academyReceipts").where("familyId", "==", uid).limit(36).get();
  return snapshot.docs.map((doc) => {
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
