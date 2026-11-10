import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { readStudentAttendance } from "../lib/academyAttendanceHistory";
test("student history isolates the selected child, orders dates and never invents absence", async () => {
  const rows = new Map([
    ["2026-10-05", { familyId: "f", childId: "a", status: "present" }],
    ["2026-10-08", { familyId: "f", childId: "a", status: "absent" }],
    ["2026-10-12", { familyId: "f", childId: "b", status: "present" }],
    ["2026-10-15", { familyId: "f", childId: "a", status: "excused" }],
    ["2026-10-19", { familyId: "f", childId: "a", status: "invalid" }]
  ]);
  let reads = 0;
  const db = { collection: () => ({ doc: (date: string) => ({ collection: () => ({ doc: (id: string) => ({ date, id }) }) }) }),
    getAll: async (...refs: { date: string; id: string }[]) => { reads = refs.length; return refs.map(r => { assert.equal(r.id, "f_a"); return { exists: rows.has(r.date), data: () => rows.get(r.date) }; }); }
  } as unknown as Firestore;
  const result = await readStudentAttendance(db, "f", "a", new Date("2026-11-09T18:00:00Z"));
  assert.deepEqual(result.counts, { present: 1, absent: 1, excused: 1 });
  assert.deepEqual(result.records.map(r => r.date), ["2026-10-15", "2026-10-08", "2026-10-05"]);
  assert.ok(reads <= 45, "bounded term reads rather than every student's records");
  assert.deepEqual((await readStudentAttendance(db,"f","a",new Date("2026-10-01T18:00:00Z"))).records, []);
});
