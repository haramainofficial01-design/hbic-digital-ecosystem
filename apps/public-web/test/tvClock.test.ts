import assert from "node:assert/strict";
import test from "node:test";
import { formatDisplayClock, formatDisplayDate, formatDisplayTime, displayNow, syncDisplayClock } from "../lib/tvClock";

test("TV overrides stale winter timezone rules for permanent Alberta Time", () => {
  const instant = new Date("2026-11-02T18:34:56Z");
  assert.match(formatDisplayClock(instant), /12:34:56/);
  assert.match(formatDisplayTime(instant), /12:34/);
  assert.match(formatDisplayDate(new Date("2026-11-03T06:30:00Z")), /November 3/);
  assert.match(formatDisplayClock(new Date("2026-01-02T18:34:56Z")), /11:34:56/);
});
test("existing cached response time overrides a wrong device clock without additional requests", () => {
  const epoch = Date.parse("2026-11-02T18:34:56Z");
  syncDisplayClock(new Headers({ date: new Date(epoch).toUTCString(), age: "30" }));
  assert.ok(Math.abs(displayNow().getTime() - (epoch + 30000)) < 1000);
  syncDisplayClock(new Headers({ date: "invalid", age: "0" }));
  assert.ok(Math.abs(displayNow().getTime() - (epoch + 30000)) < 1000);
});
