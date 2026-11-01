import "server-only";

import { getFirestore } from "firebase-admin/firestore";
import { getAcademyStarMonths } from "@hbic/shared";
import { getFirebaseApp } from "./firebaseAdmin";

/** Photos need publication approval, but never the timetable resolver or its upstream fetches. */
export async function readApprovedAcademyStarPhoto(month: string, side: string, now = new Date()) {
  const app = getFirebaseApp();
  if (!app) return null;
  const db = getFirestore(app);
  const published = (await db.collection("cmsContent").doc("published").get()).data();
  const row = getAcademyStarMonths((published?.content ?? published)?.academyStars, now).find(row => row.month === month);
  if (!row?.winners.some(winner => winner.side === side && winner.photoUrl)) return null;
  const photo = (await db.collection("academyStarPhotos").doc(`${month}-${side}`).get()).data();
  if (!photo || (side === "sisters" && photo.faceObscured !== true) || photo.mimeType !== "image/webp" ||
      typeof photo.bytesBase64 !== "string" || photo.bytesBase64.length > 900_000) return null;
  return { bytes: Buffer.from(photo.bytesBase64, "base64"), photosUntil: row.photosUntil };
}
