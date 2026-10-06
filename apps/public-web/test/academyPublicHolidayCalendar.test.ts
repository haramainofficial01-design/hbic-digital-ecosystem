import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAcademyPublicHolidayItem } from "../lib/academyContent";

test("system-generated public holiday records are hidden, but staff closures still suppress class", () => {
  const oldDefault = { id: "alberta-holiday-2026-10-12", date: "2026-10-12", title: "Thanksgiving Day", type: "holiday" as const, classIds: [], note: "Old automatic closure" };
  assert.equal(normalizeAcademyPublicHolidayItem(oldDefault), null);

  const staffClosure = normalizeAcademyPublicHolidayItem({ ...oldDefault, id: "staff-thanksgiving-closure" });
  assert.ok(staffClosure);
  assert.equal(staffClosure.type, "holiday");
});
