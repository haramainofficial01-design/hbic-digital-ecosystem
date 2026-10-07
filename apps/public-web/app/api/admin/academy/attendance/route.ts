import { academyAdmin, academyDb, AcademyError } from "../../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

import { academyAttendanceDateOpen } from "@hbic/shared";
import { listAcademyContent } from "../../../../../lib/academyContent";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }

function classDate(value: unknown) {
  const date = String(value ?? "");
  const parsed = Date.parse(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date ||
      date < "2026-10-05" || date > "2027-02-01") throw new AcademyError("Choose a date in the current Academy term.");
  return date;
}

export async function GET(request: Request) {
  try {
    await academyAdmin(request);
    const date = classDate(new URL(request.url).searchParams.get("date"));
    const docs = await academyDb().collection("academyAttendance").doc(date).collection("students").limit(500).get();
    return jsonResponse({ ok: true, date, records: docs.docs.map((doc) => ({ id: doc.id, ...doc.data() })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to load attendance." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    const body = await request.json() as { date?: unknown; familyId?: unknown; childId?: unknown; status?: unknown };
    const date = classDate(body.date);
    const familyId = String(body.familyId ?? "");
    const childId = String(body.childId ?? "");
    const status = String(body.status ?? "");
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(familyId) || !/^[A-Za-z0-9_-]{1,128}$/.test(childId) ||
        !["present", "absent", "excused"].includes(status)) throw new AcademyError("Choose a student and attendance status.");
    const calendar = (await listAcademyContent(true)).calendar;
    if (!academyAttendanceDateOpen(date, calendar)) throw new AcademyError("Attendance can be recorded only on Monday and Thursday class dates without an HBIC closure.");
    const db = academyDb();
    const familyRef = db.collection("academyFamilies").doc(familyId);
    const attendanceRef = db.collection("academyAttendance").doc(date).collection("students").doc(`${familyId}_${childId}`);
    const now = new Date().toISOString();
    await db.runTransaction(async (tx) => {
      const [family, previous] = await Promise.all([tx.get(familyRef), tx.get(attendanceRef)]);
      if (!family.exists || family.data()?.enrollmentState !== "active") throw new AcademyError("Confirm this student's enrollment before recording attendance.", 409);
      const child = (family.data()?.children as { id: string; name: string; classId?: string | null; cancelEffectiveAt?: string | null }[] | undefined)
        ?.find((item) => item.id === childId && (!item.cancelEffectiveAt || item.cancelEffectiveAt.slice(0, 10) > date));
      if (!child) throw new AcademyError("This student is no longer enrolled on that date.", 409);
      if (!academyAttendanceDateOpen(date, calendar, child.classId)) throw new AcademyError("HBIC has closed this class on the selected date.", 409);
      if (previous.data()?.status === status) return;
      tx.set(attendanceRef, { familyId, childId, childName: child.name, classId: child.classId ?? null,
        status, date, markedAt: now, markedBy: actor.uid, markedByEmail: actor.email });
      tx.create(db.collection("academyAudit").doc(), { action: "attendance_marked", familyId, childId, date,
        oldStatus: previous.data()?.status ?? null, status, actorUid: actor.uid, at: now });
    });
    return jsonResponse({ ok: true, id: attendanceRef.id, date, status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to save attendance." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
