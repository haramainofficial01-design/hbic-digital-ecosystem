import type { Firestore } from "firebase-admin/firestore";
import { academyRecurringClasses, dateStringInTimeZone, masjidTimeZone } from "@hbic/shared";

/** Read only one child's bounded term history; never infer absence from missing marks. */
export async function readStudentAttendance(db: Firestore, familyId: string, childId: string, now = new Date()) {
  const today = dateStringInTimeZone(now, masjidTimeZone);
  const dates = academyRecurringClasses("2026-10-05", 150).filter(item => item.date <= today && item.date <= "2027-02-01").map(item => item.date);
  const refs = dates.map(date => db.collection("academyAttendance").doc(date).collection("students").doc(`${familyId}_${childId}`));
  const docs = refs.length ? await db.getAll(...refs) : [];
  const records = docs.flatMap((doc, index) => {
    const row = doc.data();
    if (!doc.exists || row?.familyId !== familyId || row?.childId !== childId || !["present", "absent", "excused"].includes(row?.status)) return [];
    return [{ date: dates[index], status: String(row!.status) }];
  }).sort((a, b) => b.date.localeCompare(a.date));
  const counts = { present: 0, absent: 0, excused: 0 };
  for (const row of records) counts[row.status as keyof typeof counts]++;
  return { records, counts };
}
