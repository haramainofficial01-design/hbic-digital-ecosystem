import { academyAdmin, AcademyError, receiveAcademyCash } from "../../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";
import { dispatchAcademyEmails } from "../../../../../lib/academyEmail";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }

export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    const body = await request.json() as { familyId?: unknown; period?: unknown };
    const familyId = String(body.familyId ?? "");
    const period = String(body.period ?? "");
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(familyId)) throw new AcademyError("Invalid family reference.");
    const receipt = await receiveAcademyCash(familyId, period, actor);
    await dispatchAcademyEmails(1).catch(() => undefined);
    return jsonResponse({ ok: true, receipt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to record cash." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
