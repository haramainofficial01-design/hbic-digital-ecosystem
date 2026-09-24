import "server-only";

import { createHmac } from "node:crypto";
import {
  validateAskMasjidSubmission,
  type AskMasjidSettings,
  type AskMasjidSubmission,
  type AskMasjidSubmissionStatus
} from "@hbic/shared";
import { getDatabase } from "./contentStore";

const SUBMISSIONS = "askMasjidSubmissions";
const RATE_LIMITS = "askMasjidRateLimits";
const MAX_SUBMISSIONS_PER_HOUR = 4;

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
    process.env.COMMUNITY_SUBMISSION_SALT ||
    process.env.ADMIN_SECRET ||
    process.env.FIREBASE_PROJECT_ID;
  if (!secret) throw new Error("Private question storage is not configured.");
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

export async function createAskMasjidSubmission(
  request: Request,
  raw: unknown,
  settings: AskMasjidSettings
) {
  const parsed = validateAskMasjidSubmission(raw, settings.categories);
  if (!parsed.value) return { ok: false as const, status: 400, errors: parsed.errors };

  const db = getDatabase();
  if (!db) throw new Error("Private questions are temporarily unavailable.");

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
    value.email.toLowerCase(),
    value.category.toLowerCase(),
    value.question.toLowerCase()
  ].join("|"));
  const existing = await db.collection(SUBMISSIONS)
    .where("duplicateFingerprint", "==", duplicateFingerprint)
    .limit(3)
    .get();
  const hasOpenDuplicate = existing.docs.some((document) => {
    const status = document.data().status as AskMasjidSubmissionStatus | undefined;
    return status !== "closed" && status !== "duplicate";
  });
  if (hasOpenDuplicate) {
    return {
      ok: true as const,
      duplicate: true,
      message: "We already received this question. The team will review it privately."
    };
  }

  const reference = db.collection(SUBMISSIONS).doc();
  const submittedAt = now.toISOString();
  const submission: AskMasjidSubmission = {
    id: reference.id,
    name: value.name,
    email: value.email,
    category: value.category,
    question: value.question,
    consent: value.consent,
    status: "new",
    duplicateFingerprint,
    submittedAt,
    updatedAt: submittedAt,
    routedTo: settings.routingEmail
  };
  await reference.set(stripUndefined(submission));

  return {
    ok: true as const,
    duplicate: false,
    message: "Your question was received for private review."
  };
}

export async function getAskMasjidAdminData() {
  const db = getDatabase();
  if (!db) throw new Error("Private question storage is not configured.");
  const snapshot = await db.collection(SUBMISSIONS)
    .orderBy("submittedAt", "desc")
    .limit(100)
    .get();
  return snapshot.docs.map((document) => document.data() as AskMasjidSubmission);
}

export async function updateAskMasjidSubmission(input: {
  id: string;
  status: AskMasjidSubmissionStatus;
  routedTo?: string;
  adminNote?: string;
}) {
  const db = getDatabase();
  if (!db) throw new Error("Private question storage is not configured.");
  const allowed: AskMasjidSubmissionStatus[] = ["new", "reviewing", "routed", "answered", "closed", "duplicate"];
  if (!allowed.includes(input.status)) throw new Error("Invalid question status.");

  const reference = db.collection(SUBMISSIONS).doc(input.id);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new Error("Question not found.");
  await reference.set(stripUndefined({
    status: input.status,
    routedTo: input.routedTo?.trim().slice(0, 200),
    adminNote: input.adminNote?.trim().slice(0, 2_000),
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

export async function deleteAskMasjidSubmission(id: string) {
  const db = getDatabase();
  if (!db) throw new Error("Private question storage is not configured.");
  const normalizedId = id.trim();
  if (!normalizedId || normalizedId.length > 200) throw new Error("Invalid question ID.");
  const reference = db.collection(SUBMISSIONS).doc(normalizedId);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new Error("Question not found.");
  await reference.delete();
}
