import { academyAdmin, AcademyError, academyDb, getAcademyPaymentHistory, getAcademyReceipts } from "../../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }

export async function GET(request: Request) {
  try {
    await academyAdmin(request);
    const familyId = new URL(request.url).searchParams.get("familyId") ?? "";
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(familyId)) throw new AcademyError("Choose a valid Academy family.", 400);
    const [payments, receipts, audit] = await Promise.all([
      getAcademyPaymentHistory(familyId),
      getAcademyReceipts(familyId),
      academyDb().collection("academyAudit").where("familyId", "==", familyId).limit(40).get()
    ]);
    return jsonResponse({ ok: true, payments, receipts, audit: audit.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, action: String(data.action ?? "update"), at: String(data.at ?? ""), actorUid: String(data.actorUid ?? "") };
    }).sort((a, b) => b.at.localeCompare(a.at)) });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to load family history." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
