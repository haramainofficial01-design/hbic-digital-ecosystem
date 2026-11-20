import "server-only";

import { getFirestore } from "firebase-admin/firestore";
import { defaultContent } from "@hbic/shared";
import { getFirebaseApp } from "./firebaseAdmin";

/** Poll publication metadata without loading the timetable, overrides or resolver. */
export async function getPublishedContentVersion() {
  const app = getFirebaseApp();
  // Ask Firestore only for metadata; avoid decoding the entire CMS document
  // on the frequently polled version route. Support nested and legacy schemas.
  const db = app ? getFirestore(app) : null;
  const snapshots = db ? await db.getAll(db.collection("cmsContent").doc("published"), {
    fieldMask: ["content.version", "content.updatedAt", "content.publishedAt", "version", "updatedAt", "publishedAt"]
  }) : [];
  const data = snapshots[0]?.data();
  return {
    version: Number(data?.content?.version ?? data?.version ?? defaultContent.version),
    updatedAt: String(data?.content?.updatedAt ?? data?.updatedAt ?? defaultContent.updatedAt),
    publishedAt: String(data?.content?.publishedAt ?? data?.publishedAt ?? defaultContent.publishedAt)
  };
}
