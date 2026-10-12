import { timingSafeEqual } from "node:crypto";
import { getDatabase, getPublishedContent } from "../../../../lib/contentStore";
import { runWeeklyPrayerNotifications } from "../../../../lib/weeklyPrayerNotifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return Response.json({ ok: false }, { status: 503 });
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  const a = Buffer.from(secret), b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ ok: false }, { status: 401 });
  const db = getDatabase();
  if (!db) return Response.json({ ok: false }, { status: 503 });
  try {
    const { content } = await getPublishedContent({ fresh: true });
    return Response.json({ ok: true, ...(await runWeeklyPrayerNotifications(db, content.iqamahTime)) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "Weekly prayer notification failed." }, { status: 503 });
  }
}
