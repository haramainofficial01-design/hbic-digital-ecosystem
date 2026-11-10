import { academyAdmin, academyDb, AcademyError } from "../../../../../lib/academyStore";
import { readStudentAttendance } from "../../../../../lib/academyAttendanceHistory";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";
export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
export async function GET(request: Request) {
  try {
    await academyAdmin(request);
    const params = new URL(request.url).searchParams;
    const familyId = params.get("familyId") ?? "", childId = params.get("childId") ?? "";
    if (![familyId, childId].every(id => /^[A-Za-z0-9_-]{1,128}$/.test(id))) throw new AcademyError("Choose a valid student.");
    const db = academyDb(), family = await db.collection("academyFamilies").doc(familyId).get();
    const child = (family.data()?.children as { id: string; name: string }[] | undefined)?.find(child => child.id === childId);
    if (!child) throw new AcademyError("Student not found.", 404);
    return jsonResponse({ ok: true, childName: child.name, ...(await readStudentAttendance(db, familyId, childId)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Could not load attendance." }, { status: error instanceof AcademyError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}
