import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAcademyPublicHolidayItem } from "../lib/academyContent";

test("system-generated public holiday records are informational, but staff closures still suppress class", () => {
  const oldDefault = { id: "alberta-holiday-2026-10-12", date: "2026-10-12", title: "Thanksgiving Day", type: "holiday" as const, classIds: [], note: "Old automatic closure" };
  const normalized = normalizeAcademyPublicHolidayItem(oldDefault);
  assert.equal(normalized.type, "event");
  assert.match(normalized.title, /Academy class runs as normal/);

  const staffClosure = normalizeAcademyPublicHolidayItem({ ...oldDefault, id: "staff-thanksgiving-closure" });
  assert.equal(staffClosure.type, "holiday");
});
