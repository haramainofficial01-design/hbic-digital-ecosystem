import "server-only";

import { getFirestore } from "firebase-admin/firestore";
import { defaultContent } from "@hbic/shared";
import { getFirebaseApp } from "./firebaseAdmin";

/** Poll publication metadata without loading the timetable, overrides or resolver. */
export async function getPublishedContentVersion() {
  const app = getFirebaseApp();
  const data = app ? (await getFirestore(app).collection("cmsContent").doc("published").get()).data() : undefined;
  return {
    version: Number(data?.content?.version ?? data?.version ?? defaultContent.version),
    updatedAt: String(data?.content?.updatedAt ?? data?.updatedAt ?? defaultContent.updatedAt),
    publishedAt: String(data?.content?.publishedAt ?? data?.publishedAt ?? defaultContent.publishedAt)
  };
}
