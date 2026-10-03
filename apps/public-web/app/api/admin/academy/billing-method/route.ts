import { academyAdmin, AcademyError } from "../../../../../lib/academyStore";
import { changeAcademyPaymentMethod, requestAcademyCardSetup } from "../../../../../lib/academyStripe";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    if (!["superAdmin", "director"].includes(actor.role)) throw new AcademyError("Only a director or super administrator can change family billing.", 403);
    const body = await request.json() as { familyId?: unknown; method?: unknown; reason?: unknown };
    const familyId = String(body.familyId ?? "");
    const reason = String(body.reason ?? "").trim();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(familyId) || !["card", "cash"].includes(String(body.method)) || reason.length < 8 || reason.length > 300) {
      throw new AcademyError("Choose a family, Card or Cash, and a reason between 8 and 300 characters.");
    }
    const staff = { uid: actor.uid, reason };
    const result = body.method === "cash" ? await changeAcademyPaymentMethod(familyId, "cash", false, staff)
      : { family: await requestAcademyCardSetup(familyId, staff), checkoutUrl: null };
    return jsonResponse({ ok: true, ...result, parentCardAuthorizationRequired: body.method === "card" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Payment method could not be changed." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
