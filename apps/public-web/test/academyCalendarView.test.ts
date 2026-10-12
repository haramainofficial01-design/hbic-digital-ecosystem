import assert from "node:assert/strict";
import test from "node:test";
import { academyCalendarBadge, academyCalendarDateLabel, academyCalendarMonthLabel, academyParentCalendar } from "../lib/academyCalendarView";
import { academyRecurringClasses } from "../../../packages/shared/src/academy";

const item = (date: string, type = "class", title = "Quran Academy class") => ({ id: `${date}-${type}`, date, type, title });

test("parent schedule sorts actual API dates and excludes past/invalid dates without mutating input", () => {
  const input = [item("2026-10-15", "special_class"), item("2026-10-01", "no_class"), item("2026-10-12"), item("2026-02-30"), item("invalid")];
  const original = JSON.stringify(input);
  const view = academyParentCalendar(input, "2026-10-12");
  assert.deepEqual(view.upcoming.map(row => row.date), ["2026-10-12", "2026-10-15"]);
  assert.equal(view.nextClass?.date, "2026-10-12");
  assert.equal(JSON.stringify(input), original);
  assert.match(academyCalendarDateLabel("2026-10-12"), /Monday, October 12, 2026/);
  assert.equal(academyCalendarMonthLabel("2027-01"), "January 2027");
});

test("special Thursday and changed-time classes can be next, but explicit closures cannot", () => {
  const items = [item("2026-10-15", "special_class"), item("2026-10-19", "no_class"), item("2026-10-22", "time_changed"), item("2026-10-26", "holiday")];
  assert.equal(academyParentCalendar(items, "2026-10-15").nextClass?.date, "2026-10-15");
  assert.equal(academyParentCalendar(items, "2026-10-19").nextClass?.date, "2026-10-22");
  assert.equal(academyCalendarBadge(items[1]), "No class");
  assert.equal(academyCalendarBadge(items[2]), "Time changed");
  assert.equal(academyCalendarBadge(items[3]), "No class");
});

test("next class respects parent future start without hiding shared closure notices", () => {
  const items = [item("2026-10-29"), item("2026-11-02", "no_class"), item("2026-11-05")];
  const view = academyParentCalendar(items, "2026-10-29", "2026-11");
  assert.equal(view.nextClass?.date, "2026-11-05");
  assert.equal(view.upcoming.length, 3);
  assert.equal(academyParentCalendar([], "2026-10-12").nextClass, undefined);
});

test("calendar presentation keeps existing Thanksgiving, special Thursday, final class and break behavior", () => {
  const recurring = academyRecurringClasses("2026-10-05").map(row => ({ ...row, id: `recurring-${row.date}` }));
  const view = academyParentCalendar([...recurring, item("2027-02-02", "no_class", "Ramadan/Eid break")], "2026-10-12");
  assert.equal(view.nextClass?.date, "2026-10-12");
  assert.equal(academyCalendarBadge(view.upcoming.find(row => row.date === "2026-10-15")!), "Special Thursday");
  assert.ok(view.upcoming.some(row => row.date === "2027-02-01" && row.type === "class"));
  assert.ok(!view.upcoming.some(row => row.date > "2027-02-01" && row.type === "class"));
  assert.equal(academyCalendarBadge(view.upcoming.at(-1)!), "No class");
});
