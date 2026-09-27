import { academyAdmin, AcademyError, scanAcademyPass } from "../../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }

export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    const body = await request.json() as { token?: unknown };
    const token = String(body.token ?? "");
    const family = await scanAcademyPass(token, actor.uid);
    return jsonResponse({ ok: true, family }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to scan pass." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
