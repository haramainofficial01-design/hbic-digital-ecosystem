import { timingSafeEqual } from "node:crypto";
import { academyEmailConfigured, dispatchAcademyEmails } from "../../../../lib/academyEmail";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !academyEmailConfigured()) return Response.json({ ok: false }, { status: 404 });
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  const expected = Buffer.from(secret), actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ ok: false }, { status: 401 });
  try { return Response.json({ ok: true, ...(await dispatchAcademyEmails(50)) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ ok: false, error: "Academy email queue could not be processed." }, { status: 503 }); }
}
