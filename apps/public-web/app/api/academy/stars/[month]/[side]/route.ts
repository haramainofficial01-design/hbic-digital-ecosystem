import { readApprovedAcademyStarPhoto } from "../../../../../../lib/academyStarPhotoStore";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ month: string; side: string }> }) {
  const { month, side } = await context.params;
  const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !["brothers", "sisters"].includes(side)) return missing();
  try {
    const now = new Date(), photo = await readApprovedAcademyStarPhoto(month, side, now);
    if (!photo) return missing();
    const { bytes } = photo;
    const ttl = photo.photosUntil ? Math.max(0, Math.min(60, Math.floor((Date.parse(photo.photosUntil) - now.getTime()) / 1000))) : 60;
    return new Response(bytes, { headers: { "Content-Type": "image/webp", "Content-Length": String(bytes.length), "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}, must-revalidate`, "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
