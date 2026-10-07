import assert from "node:assert/strict";
import test from "node:test";
import { academyAttendanceDateOpen } from "../src/academy";

test("attendance is restricted to valid Monday/Thursday dates within the term", () => {
  assert.equal(academyAttendanceDateOpen("2026-10-05"), true);
  assert.equal(academyAttendanceDateOpen("2026-10-08"), true);
  for (const date of ["2026-10-06", "2026-10-07", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-01", "2027-02-04", "2026-02-30", "invalid"]) {
    assert.equal(academyAttendanceDateOpen(date), false, date);
  }
  assert.equal(academyAttendanceDateOpen("2027-02-01"), true);
});

test("statutory holidays stay open and explicit HBIC closures block attendance", () => {
  assert.equal(academyAttendanceDateOpen("2026-10-12", [{ date: "2026-10-12", type: "event" }]), true);
  assert.equal(academyAttendanceDateOpen("2026-10-12", [{ date: "2026-10-12", type: "holiday", classIds: [] }]), false);
  const calendar = [{ date: "2026-10-08", type: "no_class", classIds: ["closed-class"] }];
  assert.equal(academyAttendanceDateOpen("2026-10-08", calendar), true);
  assert.equal(academyAttendanceDateOpen("2026-10-08", calendar, "closed-class"), false);
  assert.equal(academyAttendanceDateOpen("2026-10-08", calendar, "other-class"), true);
  assert.equal(academyAttendanceDateOpen("2026-10-08", [{ date: "2026-10-08", type: "special_class" }]), true);
});

test("name suggestions are editable and unfamiliar names are not guessed", async () => {
  const { academyAttendanceGroup } = await import("../src/academy");
  assert.equal(academyAttendanceGroup({ name: "Abdullah Example" }), "boys");
  assert.equal(academyAttendanceGroup({ name: "Muaadh Example" }), "boys");
  assert.equal(academyAttendanceGroup({ name: "Tasmia Example" }), "girls");
  assert.equal(academyAttendanceGroup({ name: "Mysha Example" }), "girls");
  assert.equal(academyAttendanceGroup({ name: "Unknown name" }), "unassigned");
  assert.equal(academyAttendanceGroup({ name: "Abdullah Example", attendanceGroup: "girls" }), "girls");
});
