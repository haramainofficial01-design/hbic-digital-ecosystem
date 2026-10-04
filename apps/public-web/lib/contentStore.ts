import "server-only";
import { unstable_cache } from "next/cache";

import { getFirestore, type DocumentData } from "firebase-admin/firestore";
import { defaultContent, normalizeContent, validateContent, dateStringInTimeZone, masjidTimeZone, type HbicContent } from "@hbic/shared";
import { applyPrayerSync } from "./prayerSync";
import { boundPrayerOverrides } from "./prayerOverrides";
import { assertPublicationPreconditions, type PublicationPreconditions } from "./publicationGuards";
import { getFirebaseApp } from "./firebaseAdmin";
import { createReadCache } from "./readCache";
import { invalidatePublicReads, registerPublicReadInvalidator, publicReadTtlMs, publicPageCacheTag } from "./publicReadPolicy";

export { getFirebaseApp } from "./firebaseAdmin";

type ContentMode = "firestore" | "static-fallback";

export interface ContentStoreStatus {
  mode: ContentMode;
  configured: boolean;
  missing: string[];
}

const CMS_COLLECTION = "cmsContent";
const DRAFT_DOC = "draft";
const PUBLISHED_DOC = "published";
const VERSION_COLLECTION = "cmsContentVersions";

export function getContentStoreStatus(): ContentStoreStatus {
  const hasProjectId = Boolean(
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  );
  const hasCredentialFile = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const hasCredentialJson = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  const hasServiceAccount = Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  const configured = hasProjectId && (hasCredentialFile || hasCredentialJson || hasServiceAccount);
  const missing: string[] = [];

  if (!hasProjectId) missing.push("FIREBASE_PROJECT_ID");
  if (!hasCredentialFile && !hasCredentialJson && !hasServiceAccount) {
    missing.push("FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS_JSON");
  }

  return {
    mode: configured ? "firestore" : "static-fallback",
    configured,
    missing
  };
}

export function getDatabase() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

function extractContent(data: DocumentData | undefined): HbicContent {
  return normalizeContent(data?.content ?? data);
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([entryKey, entryValue]) => [entryKey, stripUndefined(entryValue)])
    ) as T;
  }

  return value;
}

const publishedReads = createReadCache(readPublishedContent, publicReadTtlMs);
registerPublicReadInvalidator(publishedReads.clear);
const pageReads = unstable_cache(async (_serviceDate: string) => readPublishedContent(), [publicPageCacheTag], { revalidate: 60, tags: [publicPageCacheTag] });

/** Public page rendering uses Next's data cache so the existing ISR pages do
 * not become per-visitor SSR merely because the upstream fetch is no-store.
 * Dynamic APIs still use the separate short-lived canonical read below. */
export function getPublishedPageContent() {
  return pageReads(dateStringInTimeZone(new Date(), masjidTimeZone));
}

export async function getPublishedContent(options: { fresh?: boolean } = {}): Promise<{ content: HbicContent; status: ContentStoreStatus }> {
  if (options.fresh) return readPublishedContent();
  // Never reuse yesterday's resolved schedule across the Calgary rollover.
  return publishedReads.get(dateStringInTimeZone(new Date(), masjidTimeZone));
}

async function readPublishedContent(): Promise<{ content: HbicContent; status: ContentStoreStatus }> {
  const status = getContentStoreStatus();
  const db = getDatabase();

  if (!db) {
    const synced = await applyPrayerSync(defaultContent, null);
    return { content: synced.content, status };
  }

  const snapshot = await db.collection(CMS_COLLECTION).doc(PUBLISHED_DOC).get();
  if (!snapshot.exists) {
    const synced = await applyPrayerSync(defaultContent, db);
    return { content: synced.content, status };
  }

  const content = normalizeContent({ ...extractContent(snapshot.data()), status: "published" });
  const synced = await applyPrayerSync(content, db);
  return { content: synced.content, status };
}

export async function getPublishedContentVersion() {
  const db = getDatabase();
  if (!db) {
    return {
      version: defaultContent.version,
      updatedAt: defaultContent.updatedAt,
      publishedAt: defaultContent.publishedAt
    };
  }
  const snapshot = await db.collection(CMS_COLLECTION).doc(PUBLISHED_DOC).get();
  const data = snapshot.data();
  return {
    version: Number(data?.content?.version ?? data?.version ?? defaultContent.version),
    updatedAt: String(data?.content?.updatedAt ?? data?.updatedAt ?? defaultContent.updatedAt),
    publishedAt: String(data?.content?.publishedAt ?? data?.publishedAt ?? defaultContent.publishedAt)
  };
}

export async function getDraftContent(): Promise<{ content: HbicContent; status: ContentStoreStatus; draftUpdatedAt: string | null }> {
  const status = getContentStoreStatus();
  const db = getDatabase();

  if (!db) {
    const synced = await applyPrayerSync(defaultContent, null);
    return { content: normalizeContent({ ...synced.content, status: "draft" }), status, draftUpdatedAt: null };
  }

  const draftSnapshot = await db.collection(CMS_COLLECTION).doc(DRAFT_DOC).get();
  if (draftSnapshot.exists) {
    const storedDraftUpdatedAt = draftSnapshot.data()?.updatedAt ?? draftSnapshot.data()?.content?.updatedAt;
    return {
      content: (await applyPrayerSync(normalizeContent({ ...extractContent(draftSnapshot.data()), status: "draft" }), db, { preview: true })).content,
      status,
      draftUpdatedAt: storedDraftUpdatedAt ? String(storedDraftUpdatedAt) : null
    };
  }

  const published = await getPublishedContent();
  return {
    content: normalizeContent({ ...published.content, status: "draft" }),
    status,
    draftUpdatedAt: null
  };
}

export async function saveDraftContent(content: HbicContent, expected: PublicationPreconditions = {}) {
  const status = getContentStoreStatus();
  const db = getDatabase();
  if (!db) throw new Error(`Firestore publishing is not configured. Missing: ${status.missing.join(", ")}`);

  const now = new Date().toISOString();
  const draft = normalizeContent({ ...content, status: "draft", updatedAt: now });
  const errors = validateContent(draft);
  if (errors.length) throw new Error(errors.join(" "));

  const draftRef = db.collection(CMS_COLLECTION).doc(DRAFT_DOC);
  const savedDraft = await db.runTransaction(async (transaction) => {
    const current = await transaction.get(draftRef);
    const currentDraftUpdatedAt = current.data()?.updatedAt ?? current.data()?.content?.updatedAt;
    assertPublicationPreconditions({
      draftUpdatedAt: current.exists && currentDraftUpdatedAt ? String(currentDraftUpdatedAt) : null
    }, { expectedDraftUpdatedAt: expected.expectedDraftUpdatedAt });
    const previous = current.exists ? extractContent(current.data()) : normalizeContent({ iqamahTime: { ...draft.iqamahTime, overrides: {} } });
    const bounded = boundPrayerOverrides(draft, previous, new Date(now));
    transaction.set(draftRef, { content: stripUndefined(bounded), status: "draft", updatedAt: now });
    return bounded;
  });

  return { content: savedDraft, status, draftUpdatedAt: now };
}

export async function publishDraftContent(expected: PublicationPreconditions = {}) {
  const status = getContentStoreStatus();
  const db = getDatabase();
  if (!db) throw new Error(`Firestore publishing is not configured. Missing: ${status.missing.join(", ")}`);

  const result = await db.runTransaction(async (transaction) => {
    const draftRef = db.collection(CMS_COLLECTION).doc(DRAFT_DOC);
    const publishedRef = db.collection(CMS_COLLECTION).doc(PUBLISHED_DOC);
    const publicationRef = db.collection("publicationState").doc("current");
    const [draftSnapshot, publishedSnapshot, publicationSnapshot] = await transaction.getAll(draftRef, publishedRef, publicationRef);
    if (!draftSnapshot.exists) throw new Error("No saved draft exists yet. Save a draft before publishing.");

    const currentVersion = Number(publishedSnapshot.data()?.content?.version ?? publishedSnapshot.data()?.version ?? 0);
    const storedDraftUpdatedAt = draftSnapshot.data()?.updatedAt ?? draftSnapshot.data()?.content?.updatedAt;
    assertPublicationPreconditions({
      draftUpdatedAt: storedDraftUpdatedAt ? String(storedDraftUpdatedAt) : null,
      publishedVersion: currentVersion
    }, expected);
    const now = new Date().toISOString();
    const content = boundPrayerOverrides(normalizeContent({
      ...extractContent(draftSnapshot.data()),
      status: "published",
      version: currentVersion + 1,
      updatedAt: now,
      publishedAt: now
    }));
    const errors = validateContent(content);
    if (errors.length) throw new Error(errors.join(" "));

    const publication = {
      revision: Number(publicationSnapshot.data()?.revision ?? 0) + 1,
      updatedAt: now,
      kind: "content" as const,
      contentVersion: content.version
    };
    transaction.set(publishedRef, {
      content: stripUndefined(content),
      status: "published",
      version: content.version,
      updatedAt: now,
      publishedAt: now
    });
    transaction.set(draftRef, {
      content: stripUndefined({ ...content, status: "draft" }),
      status: "draft",
      updatedAt: now
    });
    transaction.set(db.collection(VERSION_COLLECTION).doc(String(content.version).padStart(6, "0")), {
      content: stripUndefined(content),
      version: content.version,
      publishedAt: now
    });
    transaction.set(publicationRef, publication);
    return { content, status, publication };
  });
  invalidatePublicReads();
  // Broadcast the resolved published values, never stale draft/base timings.
  const resolved = await applyPrayerSync(result.content, db);
  return { ...result, content: resolved.content };
}
