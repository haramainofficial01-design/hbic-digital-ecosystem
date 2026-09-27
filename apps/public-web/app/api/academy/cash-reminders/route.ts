import { timingSafeEqual } from "node:crypto";
import { runAcademyCashReminders } from "../../../../lib/academyNotifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.ACADEMY_PREVIEW_ENABLED !== "true" || process.env.ACADEMY_SERVER_CASH_REMINDERS !== "true" || !secret || secret.length < 16) {
    return Response.json({ ok: false }, { status: 404 });
  }
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    return Response.json({ ok: true, ...(await runAcademyCashReminders()) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "Academy cash reminders could not be completed." }, { status: 503 });
  }
}
