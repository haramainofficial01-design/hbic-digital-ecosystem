import { academyParent, AcademyError } from "../../../../../lib/academyStore";
import { changeAcademyPaymentMethod } from "../../../../../lib/academyStripe";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
export async function POST(request: Request) {
  try {
    const parent = await academyParent(request);
    const body = await request.json() as { method?: unknown; recurringAuthorized?: unknown };
    if (body.method !== "card" && body.method !== "cash") throw new AcademyError("Choose Card or Cash.");
    const result = await changeAcademyPaymentMethod(parent.uid, body.method, body.recurringAuthorized === true);
    return jsonResponse({ ok: true, ...result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Payment method could not be changed." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
