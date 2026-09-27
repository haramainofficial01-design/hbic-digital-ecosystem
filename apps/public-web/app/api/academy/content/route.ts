import { academyParent, getAcademyFamily, AcademyError } from "../../../../lib/academyStore";
import { listAcademyContent } from "../../../../lib/academyContent";
import { jsonResponse, optionsResponse } from "../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
export async function GET(request: Request) {
  try {
    const parent = await academyParent(request);
    const family = await getAcademyFamily(parent.uid);
    if (!family) throw new AcademyError("Register before viewing Academy details.", 404);
    const classIds = family.children.filter((child) => !child.cancelEffectiveAt || Date.parse(child.cancelEffectiveAt) > Date.now())
      .map((child) => child.classId).filter((id): id is string => Boolean(id));
    return jsonResponse({ ok: true, content: await listAcademyContent(false, classIds) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Academy details unavailable." }, { status: error instanceof AcademyError ? error.status : 500 }); }
}
