import "server-only";

import { createHmac } from "node:crypto";
import {
  toPublicHalalRestaurant,
  validateRestaurantInterestInput,
  type HalalRestaurant,
  type RestaurantInterestStatus,
  type RestaurantInterestSubmission
} from "@hbic/shared";
import { getDatabase } from "./contentStore";

const SUBMISSIONS = "restaurantInterestSubmissions";
const RATE_LIMITS = "restaurantInterestRateLimits";
const RESTAURANTS = "halalRestaurants";
const MAX_SUBMISSIONS_PER_HOUR = 5;

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripUndefined) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)])
    ) as T;
  }
  return value;
}

function fingerprint(value: string) {
  const secret =
    process.env.RESTAURANT_SUBMISSION_SALT ||
    process.env.ADMIN_SECRET ||
    process.env.FIREBASE_PROJECT_ID;
  if (!secret) throw new Error("Restaurant submission hashing is not configured.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("cf-connecting-ip") ||
    forwarded ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return fingerprint(`${address}|${userAgent.slice(0, 160)}`);
}

export async function createRestaurantInterestSubmission(request: Request, raw: unknown) {
  const parsed = validateRestaurantInterestInput(raw);
  if (!parsed.value) {
    return { ok: false as const, status: 400, errors: parsed.errors };
  }

  const db = getDatabase();
  if (!db) throw new Error("Restaurant interest submissions are temporarily unavailable.");

  const now = new Date();
  const hourBucket = now.toISOString().slice(0, 13);
  const requester = requestFingerprint(request);
  const rateRef = db.collection(RATE_LIMITS).doc(`${requester}-${hourBucket}`);
  await db.runTransaction(async (transaction) => {
    const rate = await transaction.get(rateRef);
    const count = Number(rate.data()?.count ?? 0);
    if (count >= MAX_SUBMISSIONS_PER_HOUR) throw new Error("Too many submissions. Please try again later.");
    transaction.set(rateRef, {
      count: count + 1,
      expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1_000).toISOString()
    });
  });

  const value = parsed.value;
  const duplicateFingerprint = fingerprint([
    value.kind,
    value.businessName?.toLowerCase() ?? "",
    value.email.toLowerCase(),
    value.phone?.replace(/\D/g, "") ?? ""
  ].join("|"));
  const existing = await db.collection(SUBMISSIONS)
    .where("duplicateFingerprint", "==", duplicateFingerprint)
    .limit(3)
    .get();
  const hasOpenDuplicate = existing.docs.some((doc) => {
    const status = doc.data().status as RestaurantInterestStatus | undefined;
    return status !== "closed" && status !== "duplicate";
  });
  if (hasOpenDuplicate) {
    return {
      ok: true as const,
      duplicate: true,
      message: "We already have a recent submission for these details. The team will review it."
    };
  }

  const ref = db.collection(SUBMISSIONS).doc();
  const submittedAt = now.toISOString();
  const submission: RestaurantInterestSubmission = {
    id: ref.id,
    kind: value.kind,
    businessName: value.businessName,
    contactPerson: value.contactPerson,
    email: value.email,
    phone: value.phone,
    address: value.address,
    cuisine: value.cuisine,
    website: value.website,
    message: value.message,
    currentHalalClaim: value.currentHalalClaim,
    consent: value.consent,
    acknowledgement: value.acknowledgement,
    status: "new",
    duplicateFingerprint,
    submittedAt,
    updatedAt: submittedAt
  };
  await ref.set(stripUndefined(submission));

  return {
    ok: true as const,
    duplicate: false,
    message: value.kind === "directory-notify"
      ? "You are on the directory update list."
      : "Your interest form was received for private review. Submission is not verification or publication."
  };
}

export async function getHalalAdminData() {
  const db = getDatabase();
  if (!db) throw new Error("Halal directory storage is not configured.");

  const [submissionSnapshot, restaurantSnapshot] = await Promise.all([
    db.collection(SUBMISSIONS).orderBy("submittedAt", "desc").limit(100).get(),
    db.collection(RESTAURANTS).orderBy("updatedAt", "desc").limit(100).get()
  ]);

  return {
    submissions: submissionSnapshot.docs.map((doc) => doc.data() as RestaurantInterestSubmission),
    restaurants: restaurantSnapshot.docs.map((doc) => doc.data() as HalalRestaurant)
  };
}

export async function updateRestaurantInterestSubmission(input: {
  id: string;
  status: RestaurantInterestStatus;
  adminNote?: string;
}) {
  const db = getDatabase();
  if (!db) throw new Error("Halal directory storage is not configured.");
  const allowed: RestaurantInterestStatus[] = ["new", "reviewing", "contacted", "duplicate", "closed"];
  if (!allowed.includes(input.status)) throw new Error("Invalid submission status.");

  const ref = db.collection(SUBMISSIONS).doc(input.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("Submission not found.");
  await ref.set(stripUndefined({
    status: input.status,
    adminNote: input.adminNote?.trim().slice(0, 2_000),
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

export async function deleteRestaurantInterestSubmission(id: string) {
  const db = getDatabase();
  if (!db) throw new Error("Halal directory storage is not configured.");
  const normalizedId = id.trim();
  if (!normalizedId || normalizedId.length > 200) throw new Error("Invalid submission ID.");
  const reference = db.collection(SUBMISSIONS).doc(normalizedId);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new Error("Submission not found.");
  await reference.delete();
}

export async function saveHalalRestaurant(restaurant: HalalRestaurant) {
  const db = getDatabase();
  if (!db) throw new Error("Halal directory storage is not configured.");
  if (!restaurant.id?.trim() || !restaurant.businessName?.trim() || !restaurant.slug?.trim()) {
    throw new Error("Restaurant ID, slug, and business name are required.");
  }
  if (restaurant.publication.status === "published" && !toPublicHalalRestaurant(restaurant)) {
    throw new Error("A published restaurant must have a current, non-suspended halal status.");
  }
  const reference = db.collection(RESTAURANTS).doc(restaurant.id);
  const previous = (await reference.get()).data() as HalalRestaurant | undefined;
  await reference.set(stripUndefined({
    ...restaurant,
    updatedAt: new Date().toISOString()
  }));
  return {
    publicChanged: previous?.publication.status === "published" || restaurant.publication.status === "published"
  };
}

export async function getPublicHalalRestaurants(enabled: boolean) {
  if (!enabled) return [];
  const db = getDatabase();
  if (!db) return [];
  const snapshot = await db.collection(RESTAURANTS)
    .where("publication.status", "==", "published")
    .limit(100)
    .get();
  return snapshot.docs
    .map((doc) => toPublicHalalRestaurant(doc.data() as HalalRestaurant))
    .filter((restaurant): restaurant is NonNullable<typeof restaurant> => Boolean(restaurant));
}
