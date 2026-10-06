import { academyAdmin, AcademyError, moveAcademyCashStartToCurrentMonth } from "../../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }

export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    const body = await request.json() as { familyId?: unknown; reason?: unknown };
    const familyId = String(body.familyId ?? "");
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(familyId)) throw new AcademyError("Invalid family reference.");
    const family = await moveAcademyCashStartToCurrentMonth(familyId, actor, String(body.reason ?? ""));
    return jsonResponse({ ok: true, family }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to correct enrollment start." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
