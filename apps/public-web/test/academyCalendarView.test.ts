import assert from "node:assert/strict";
import test from "node:test";
import { academyCalendarBadge, academyCalendarDateLabel, academyCalendarKind, academyCalendarMonthCells, academyCalendarMonths, academyCalendarMonthLabel, academyParentCalendar, academyCashCollectionNotice } from "../lib/academyCalendarView";
import { translateUi } from "../../../packages/shared/src/i18n/ui";
import { academyRecurringClasses } from "../../../packages/shared/src/academy";

const item = (date: string, type = "class", title = "Quran Academy class") => ({ id: `${date}-${type}`, date, type, title });

test("November cash collection names the actual Monday class, amount and month", () => {
  const family = { paymentChoice: "cash", paymentState: "cash_due", enrollmentState: "active", billingPeriod: "2026-11", amountCents: 10000 };
  const calendar = [item("2026-11-02"), item("2026-11-05")];
  const notice = academyCashCollectionNotice(family, calendar, "2026-11-01");
  assert.equal(notice?.title, "November 2026 cash tuition");
  assert.match(notice!.text, /\$100\.00 cash tuition for November 2026/);
  assert.match(notice!.text, /Monday, November 2, 2026 · 5:30–7:00 PM/);
  assert.match(notice!.text, /Staff will record your payment and issue a receipt/);
  for (const change of [{ paymentState: "paid" }, { paymentState: "not_due" }, { paymentChoice: "card" }, { enrollmentState: "withdrawn" }, { amountCents: 0 }, { noTuitionDue: true }]) {
    assert.equal(academyCashCollectionNotice({ ...family, ...change }, calendar, "2026-11-01"), null);
  }
});

test("cash instructions respect staff closures, changed times and calendar availability", () => {
  const family = { paymentChoice: "cash", paymentState: "past_due", enrollmentState: "active", billingPeriod: "2026-11", amountCents: 5000 };
  const closed = [item("2026-11-02", "no_class"), { ...item("2026-11-05", "time_changed"), note: "Class starts at 6:00 PM." }];
  const notice = academyCashCollectionNotice(family, closed, "2026-11-01")!;
  assert.match(notice.text, /Thursday, November 5, 2026 · Class starts at 6:00 PM/);
  assert.doesNotMatch(notice.text, /November 2,|5:30|PM\.\./);
  const missing = academyCashCollectionNotice(family, [], "2026-11-01")!;
  assert.match(missing.text, /check your Academy calendar/);
  assert.doesNotMatch(missing.text, /Monday|5:30/);
  assert.doesNotMatch(academyCashCollectionNotice(family, [item("2026-12-03")], "2026-11-30")!.text, /December 3/);
});

test("month grids use real Gregorian days, Monday-first columns and leap-year dates", () => {
  const october = academyCalendarMonthCells("2026-10");
  assert.equal(october.length, 42);
  assert.equal(october[0], null);
  assert.equal(october[3], "2026-10-01");
  assert.equal(october[14], "2026-10-12");
  assert.equal(october.filter(Boolean).length, 31);
  assert.equal(academyCalendarMonthCells("2028-02").filter(Boolean).length, 29);
  assert.equal(academyCalendarMonthCells("2027-02").filter(Boolean).length, 28);
  assert.deepEqual(academyCalendarMonthCells("bad"), []);
  assert.deepEqual(academyCalendarMonths("2026-10", "2027-02"), ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]);
});

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
  assert.equal(academyCalendarBadge(view.upcoming.find(row => row.date === "2026-10-15")!), "Class");
  assert.equal(academyCalendarBadge(view.upcoming.find(row => row.date === "2026-10-29")!), "Fun Class");
  assert.ok(view.upcoming.some(row => row.date === "2027-02-01" && row.type === "class"));
  assert.ok(!view.upcoming.some(row => row.date > "2027-02-01" && row.type === "class"));
  assert.equal(academyCalendarBadge(view.upcoming.at(-1)!), "No class");
});

test("Fun Class labels recognize both new and legacy schedule records and retain closures", () => {
  for (const row of [item("2026-10-29", "class", "Fun Class"), item("2026-10-15", "class", "Fun Thursday class"), item("2026-10-22", "special_class", "Monthly activity")]) {
    assert.equal(academyCalendarKind(row), "special");
    assert.equal(academyCalendarBadge(row), "Fun Class");
  }
  assert.equal(academyCalendarBadge(item("2026-10-29", "no_class", "Fun Class cancelled")), "No class");
  for (const language of ["ur", "fa-AF", "ar"] as const) {
    for (const text of ["Fun Class", "Fun Class: last Thursday of each month."]) assert.notEqual(translateUi(language, text), text);
  }
});
