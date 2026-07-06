import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type DocumentData } from "firebase-admin/firestore";
import { defaultContent, normalizeContent, validateContent, type HbicContent } from "@hbic/shared";

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

function normalizePrivateKey(value?: string) {
  return value?.replace(/\\n/g, "\n");
}

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

function getFirebaseApp(): App | null {
  const status = getContentStoreStatus();
  if (!status.configured) return null;
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const credentialJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (credentialJson) {
    const parsed = JSON.parse(credentialJson) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    return initializeApp({
      credential: cert({
        projectId: parsed.project_id || projectId,
        clientEmail: parsed.client_email,
        privateKey: normalizePrivateKey(parsed.private_key)
      })
    });
  }

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
      })
    });
  }

  return initializeApp({ projectId });
}

function getDatabase() {
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

export async function getPublishedContent(): Promise<{ content: HbicContent; status: ContentStoreStatus }> {
  const status = getContentStoreStatus();
  const db = getDatabase();

  if (!db) {
    return { content: defaultContent, status };
  }

  const snapshot = await db.collection(CMS_COLLECTION).doc(PUBLISHED_DOC).get();
  if (!snapshot.exists) {
    return { content: defaultContent, status };
  }

  return {
    content: normalizeContent({ ...extractContent(snapshot.data()), status: "published" }),
    status
  };
}

export async function getDraftContent(): Promise<{ content: HbicContent; status: ContentStoreStatus }> {
  const status = getContentStoreStatus();
  const db = getDatabase();

  if (!db) {
    return { content: defaultContent, status };
  }

  const draftSnapshot = await db.collection(CMS_COLLECTION).doc(DRAFT_DOC).get();
  if (draftSnapshot.exists) {
    return {
      content: normalizeContent({ ...extractContent(draftSnapshot.data()), status: "draft" }),
      status
    };
  }

  const published = await getPublishedContent();
  return {
    content: normalizeContent({ ...published.content, status: "draft" }),
    status
  };
}

export async function saveDraftContent(content: HbicContent) {
  const status = getContentStoreStatus();
  const db = getDatabase();
  if (!db) throw new Error(`Firestore publishing is not configured. Missing: ${status.missing.join(", ")}`);

  const now = new Date().toISOString();
  const draft = normalizeContent({ ...content, status: "draft", updatedAt: now });
  const errors = validateContent(draft);
  if (errors.length) throw new Error(errors.join(" "));

  await db.collection(CMS_COLLECTION).doc(DRAFT_DOC).set({
    content: stripUndefined(draft),
    status: "draft",
    updatedAt: now
  });

  return { content: draft, status };
}

export async function publishDraftContent() {
  const status = getContentStoreStatus();
  const db = getDatabase();
  if (!db) throw new Error(`Firestore publishing is not configured. Missing: ${status.missing.join(", ")}`);

  const draftSnapshot = await db.collection(CMS_COLLECTION).doc(DRAFT_DOC).get();
  if (!draftSnapshot.exists) throw new Error("No saved draft exists yet. Save a draft before publishing.");

  const publishedSnapshot = await db.collection(CMS_COLLECTION).doc(PUBLISHED_DOC).get();
  const currentVersion = Number(publishedSnapshot.data()?.content?.version ?? publishedSnapshot.data()?.version ?? 0);
  const now = new Date().toISOString();
  const content = normalizeContent({
    ...extractContent(draftSnapshot.data()),
    status: "published",
    version: currentVersion + 1,
    updatedAt: now,
    publishedAt: now
  });
  const errors = validateContent(content);
  if (errors.length) throw new Error(errors.join(" "));

  const batch = db.batch();
  batch.set(db.collection(CMS_COLLECTION).doc(PUBLISHED_DOC), {
    content: stripUndefined(content),
    status: "published",
    version: content.version,
    updatedAt: now,
    publishedAt: now
  });
  batch.set(db.collection(CMS_COLLECTION).doc(DRAFT_DOC), {
    content: stripUndefined({ ...content, status: "draft" }),
    status: "draft",
    updatedAt: now
  });
  batch.set(db.collection(VERSION_COLLECTION).doc(String(content.version).padStart(6, "0")), {
    content: stripUndefined(content),
    version: content.version,
    publishedAt: now
  });
  await batch.commit();

  return { content, status };
}
