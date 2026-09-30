import { academyAdmin, AcademyError, lookupAcademyReference, scanAcademyPass } from "../../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }

export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    const body = await request.json() as { token?: unknown; reference?: unknown };
    const family = typeof body.reference === "string"
      ? await lookupAcademyReference(body.reference.trim().toUpperCase(), actor.uid)
      : await scanAcademyPass(String(body.token ?? ""), actor.uid);
    return jsonResponse({ ok: true, family }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to scan pass." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
