import { academyAdmin, AcademyError } from "../../../../../lib/academyStore";
import { withdrawConditionalAcademyFamily } from "../../../../../lib/academyStripe";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }

export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    if (!["superAdmin", "director"].includes(actor.role)) throw new AcademyError("Only a director or super administrator can withdraw a registration.", 403);
    const body = await request.json() as { familyId?: unknown; reason?: unknown };
    const family = await withdrawConditionalAcademyFamily(String(body.familyId ?? ""), String(body.reason ?? ""), actor);
    return jsonResponse({ ok: true, family }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to withdraw enrollment." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
