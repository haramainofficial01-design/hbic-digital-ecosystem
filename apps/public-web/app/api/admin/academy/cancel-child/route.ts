import { academyAdmin, AcademyError } from "../../../../../lib/academyStore";
import { cancelAcademyChild } from "../../../../../lib/academyStripe";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";
export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    if (!["superAdmin", "director"].includes(actor.role)) throw new AcademyError("Only a director or super administrator can cancel enrollment.", 403);
    const body = await request.json() as { familyId?: unknown; childId?: unknown; reason?: unknown; endNow?: unknown };
    const familyId = String(body.familyId ?? "");
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(familyId)) throw new AcademyError("Choose a valid family.");
    const result = await cancelAcademyChild(familyId, String(body.childId ?? ""), { uid: actor.uid, reason: String(body.reason ?? ""), endNow: body.endNow === true });
    return jsonResponse({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Cancellation unavailable." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
