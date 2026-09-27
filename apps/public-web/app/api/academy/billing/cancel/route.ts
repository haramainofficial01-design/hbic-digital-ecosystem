import { academyParent, AcademyError } from "../../../../../lib/academyStore";
import { cancelAcademyChild } from "../../../../../lib/academyStripe";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
export async function POST(request: Request) {
  try {
    const parent = await academyParent(request);
    const body = await request.json() as { childId?: unknown };
    const result = await cancelAcademyChild(parent.uid, String(body.childId ?? ""));
    return jsonResponse({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Cancellation unavailable." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
