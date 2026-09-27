import { academyAdmin, AcademyError, listAcademyFamilies } from "../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }

export async function GET(request: Request) {
  try {
    await academyAdmin(request);
    const families = await listAcademyFamilies();
    return jsonResponse({ ok: true, families }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Academy unavailable." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
