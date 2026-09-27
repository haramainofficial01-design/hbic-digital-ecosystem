import { academyAdmin, AcademyError, changeAcademyPass } from "../../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    const body = await request.json() as { familyId?: unknown; action?: unknown };
    if (!["superAdmin", "director"].includes(actor.role)) throw new AcademyError("Director access is required to change passes.", 403);
    const familyId = String(body.familyId ?? "");
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(familyId) || (body.action !== "replace" && body.action !== "revoke")) throw new AcademyError("Invalid pass change.");
    await changeAcademyPass(familyId, body.action, actor.uid);
    return jsonResponse({ ok: true });
  } catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to change pass." }, { status: error instanceof AcademyError ? error.status : 500 }); }
}
