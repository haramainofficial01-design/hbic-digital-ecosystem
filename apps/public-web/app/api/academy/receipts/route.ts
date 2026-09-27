import { academyParent, getAcademyReceipts, AcademyError } from "../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
export async function GET(request: Request) {
  try {
    const parent = await academyParent(request);
    return jsonResponse({ ok: true, receipts: await getAcademyReceipts(parent.uid) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Receipts unavailable." },
      { status: error instanceof AcademyError ? error.status : 500 }); }
}
