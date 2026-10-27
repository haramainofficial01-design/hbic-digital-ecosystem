import assert from "node:assert/strict";
import test from "node:test";
import { datePartsInTimeZone, getHijriDate, registerHijriDateFormatter, resolvedMasjidTimeZone } from "../src/prayer";

test("reused date formatters preserve native results across dates, timezones and eviction", () => {
  const zones = ["America/Edmonton", "UTC", "America/Toronto", "America/Vancouver", "America/New_York", "America/Chicago", "America/Los_Angeles", "America/Halifax", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Istanbul", "Asia/Riyadh", "Asia/Karachi", "Asia/Kabul", "Asia/Dubai", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney", "Pacific/Auckland"];
  const dates = ["2026-10-27T05:59:59Z", "2026-10-27T06:00:00Z", "2026-11-01T07:59:59Z", "2026-11-01T08:00:00Z", "2026-11-02T06:00:00Z", "2027-01-01T00:00:00Z", "2027-07-01T12:34:56Z"];
  for (const zone of [...zones, ...zones].reverse()) for (const iso of dates) {
    const date = new Date(iso), parts = new Intl.DateTimeFormat("en-CA", { timeZone: resolvedMasjidTimeZone(date, zone), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const expected = Object.fromEntries(["year", "month", "day", "hour", "minute", "second"].map(key => [key, Number(parts.find(p => p.type === key)?.value)]));
    assert.deepEqual(datePartsInTimeZone(date, zone), expected, `${zone} ${iso}`);
  }
});

test("Hijri formatter reuse preserves adjustments and the registered mobile formatter", () => {
  const date = new Date("2026-10-27T05:59:59Z");
  for (const adjustment of [-2, -1, 0, 1, 2]) for (const zone of ["America/Edmonton", "Asia/Riyadh", "UTC"]) {
    const adjusted = new Date(date.getTime() + adjustment * 86_400_000);
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { timeZone: resolvedMasjidTimeZone(adjusted, zone), day: "numeric", month: "long", year: "numeric" }).formatToParts(adjusted);
    const value = getHijriDate(date, adjustment, zone)!;
    assert.equal(value.day, Number(parts.find(p => p.type === "day")?.value));
    assert.equal(value.month, parts.find(p => p.type === "month")?.value);
    assert.equal(value.year, Number(parts.find(p => p.type === "year")?.value));
  }
  let calls = 0;
  registerHijriDateFormatter(() => { calls++; return [{ type: "day", value: "14" }, { type: "month", value: "Verified month" }, { type: "year", value: "1448" }]; });
  try { assert.equal(getHijriDate(date)?.label, "14 Verified month 1448 AH"); assert.equal(getHijriDate(date)?.isWhiteDay, true); assert.equal(calls, 2); }
  finally { registerHijriDateFormatter(null); }
  assert.notEqual(getHijriDate(date)?.month, "Verified month");
  assert.equal(getHijriDate(date, 3), null);
});
