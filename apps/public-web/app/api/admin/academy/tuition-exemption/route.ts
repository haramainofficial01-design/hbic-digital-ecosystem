import { academyAdmin, AcademyError } from "../../../../../lib/academyStore";
import { setAcademyTuitionExemption } from "../../../../../lib/academyStripe";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";
export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    const body = await request.json() as { familyId?: unknown; childId?: unknown; exempt?: unknown; reason?: unknown };
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(body.familyId ?? "")) || !/^[A-Za-z0-9_-]{1,128}$/.test(String(body.childId ?? "")) || typeof body.exempt !== "boolean") throw new AcademyError("Choose a valid child and tuition exemption.");
    const family = await setAcademyTuitionExemption(String(body.familyId), String(body.childId), body.exempt, actor,
      typeof body.reason === "string" && body.reason.trim() ? body.reason : "Staff-approved tuition exemption");
    return jsonResponse({ ok: true, family }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Could not change tuition exemption." }, { status: error instanceof AcademyError ? error.status : 500 }); }
}
