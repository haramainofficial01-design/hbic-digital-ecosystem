import { getAcademyStarMonths } from "@hbic/shared";
import { getDatabase, getPublishedContent } from "../../../../../../lib/contentStore";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ month: string; side: string }> }) {
  const { month, side } = await context.params;
  const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !["brothers", "sisters"].includes(side)) return missing();
  try {
    const now = new Date(), { content } = await getPublishedContent();
    const row = getAcademyStarMonths(content.academyStars, now).find(row => row.month === month);
    if (!row?.winners.some(w => w.side === side && w.photoUrl)) return missing();
    const db = getDatabase(); if (!db) return missing();
    const photo = (await db.collection("academyStarPhotos").doc(`${month}-${side}`).get()).data();
    if (!photo || (side === "sisters" && photo.faceObscured !== true) || photo.mimeType !== "image/webp" || typeof photo.bytesBase64 !== "string" || photo.bytesBase64.length > 900_000) return missing();
    const bytes = Buffer.from(photo.bytesBase64, "base64");
    const ttl = row.photosUntil ? Math.max(0, Math.min(60, Math.floor((Date.parse(row.photosUntil) - now.getTime()) / 1000))) : 60;
    return new Response(bytes, { headers: { "Content-Type": "image/webp", "Content-Length": String(bytes.length), "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}, must-revalidate`, "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
