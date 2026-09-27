import assert from "node:assert/strict";
import test from "node:test";
import { createWidgetPrayerSnapshot, defaultContent, normalizeContent, toPublicContent } from "@hbic/shared";
import {
  isOverrideActive,
  resolveEffectivePrayerSchedule,
  retainPrayerScheduleDuringOutage,
  type PrayerFeed
} from "../lib/prayerSync";
import { deriveDisplayFocus } from "../lib/tvDisplay";

const now = new Date("2026-09-08T18:00:00.000Z");
const sourceUpdatedAt = "2026-09-08T17:59:00.000Z";
const baseFeed: PrayerFeed = {
  salah_fajr: "5:31 AM",
  salah_sunrise: "7:01 AM",
  salah_zuhr: "1:34 PM",
  salah_asr: "5:09 PM",
  salah_maghrib: "8:06 PM",
  salah_isha: "9:36 PM",
  iqamah_fajr: "5:50 AM",
  iqamah_zuhr: "2:00 PM",
  iqamah_asr: "6:00 PM",
  iqamah_maghrib: "+10 MINS",
  iqamah_isha: "+5 MINS",
  nw_i_fajr: "6:00 AM",
  nw_i_zuhr: "2:00 PM",
  nw_i_asr: "5:45 PM",
  nw_i_maghrib: "+10 MINS",
  nw_i_isha: "+5 MINS",
  jummah: "1:45/2:30PM"
};

function contentWithAsrOverride(value = "6:15 PM") {
  return normalizeContent({
    ...structuredClone(defaultContent),
    iqamahTime: {
      ...structuredClone(defaultContent.iqamahTime),
      overrides: { asr: { enabled: true, value, updatedAt: sourceUpdatedAt } }
    }
  });
}

test("A: Iqamah.ca values become the effective schedule when no override exists", () => {
  const resolved = resolveEffectivePrayerSchedule(defaultContent, baseFeed, "live", "2026-09-08", sourceUpdatedAt, now);
  assert.deepEqual(resolved.schedule.effective.adhan, resolved.schedule.automatic.adhan);
  assert.deepEqual(resolved.schedule.effective.iqamah, resolved.schedule.automatic.iqamah);
  assert.equal(resolved.content.iqamahTime.maghribIqamah, "8:16 PM");
  assert.deepEqual(resolved.schedule.upcomingWeek?.iqamah, {
    fajr: "6:00 AM",
    dhuhr: "2:00 PM",
    asr: "5:45 PM",
    maghrib: "+10 MINS",
    isha: "+5 MINS"
  });
});

test("A2: next-week values never replace the current automatic iqamah", () => {
  const resolved = resolveEffectivePrayerSchedule(defaultContent, baseFeed, "live", "2026-09-08", sourceUpdatedAt, now);
  assert.equal(resolved.schedule.automatic.iqamah.fajr, "5:50 AM");
  assert.equal(resolved.schedule.upcomingWeek?.iqamah.fajr, "6:00 AM");
  assert.equal(resolved.content.iqamahTime.fajrIqamah, "5:50 AM");
});

test("A3: a missing current value does not promote next week's value into today", () => {
  const feed = { ...baseFeed, iqamah_fajr: undefined, nw_i_fajr: "6:00 AM" };
  const resolved = resolveEffectivePrayerSchedule(defaultContent, feed, "live", "2026-09-08", sourceUpdatedAt, now);
  assert.equal(resolved.schedule.automatic.iqamah.fajr, "");
  assert.notEqual(resolved.content.iqamahTime.fajrIqamah, "6:00 AM");
  assert.equal(resolved.schedule.upcomingWeek?.iqamah.fajr, "6:00 AM");
});

test("B/E: one override wins while upstream values and other prayers keep updating", () => {
  const changedFeed = { ...baseFeed, iqamah_asr: "6:05 PM", iqamah_fajr: "5:55 AM" };
  const resolved = resolveEffectivePrayerSchedule(contentWithAsrOverride(), changedFeed, "live", "2026-09-08", sourceUpdatedAt, now);
  assert.equal(resolved.schedule.automatic.iqamah.asr, "6:05 PM");
  assert.equal(resolved.schedule.effective.iqamah.asr, "6:15 PM");
  assert.equal(resolved.schedule.effective.iqamah.fajr, "5:55 AM");
  assert.deepEqual(resolved.activeOverrides, ["asr"]);
});

test("C: removing an override immediately returns to the current upstream value", () => {
  const overridden = contentWithAsrOverride();
  overridden.iqamahTime.overrides = {};
  const resolved = resolveEffectivePrayerSchedule(overridden, { ...baseFeed, iqamah_asr: "6:05 PM" }, "live", "2026-09-08", sourceUpdatedAt, now);
  assert.equal(resolved.schedule.effective.iqamah.asr, "6:05 PM");
  assert.equal(resolved.activeOverrides.length, 0);
});

test("C2: scheduled and expired overrides are not treated as currently public", () => {
  assert.equal(isOverrideActive({ enabled: true, value: "6:15 PM", startsAt: "2026-09-09T18:00:00.000Z" }, now), false);
  assert.equal(isOverrideActive({ enabled: true, value: "6:15 PM", endsAt: "2026-09-08T17:00:00.000Z" }, now), false);
  assert.equal(isOverrideActive({ enabled: true, value: "6:15 PM", startsAt: "2026-09-08T17:00:00.000Z", endsAt: "2026-09-08T19:00:00.000Z" }, now), true);
});

test("D: an upstream change updates the canonical effective schedule", () => {
  const original = resolveEffectivePrayerSchedule(defaultContent, baseFeed, "live", "2026-09-08", sourceUpdatedAt, now);
  const changed = resolveEffectivePrayerSchedule(defaultContent, { ...baseFeed, iqamah_asr: "6:05 PM" }, "live", "2026-09-08", sourceUpdatedAt, now);
  assert.notEqual(original.schedule.effective.iqamah.asr, changed.schedule.effective.iqamah.asr);
});

test("F: an outage retains the last valid public schedule and every override", () => {
  const previous = resolveEffectivePrayerSchedule(contentWithAsrOverride(), baseFeed, "live", "2026-09-08", sourceUpdatedAt, now).content;
  const retained = retainPrayerScheduleDuringOutage(previous, new Date("2026-09-08T18:06:00.000Z"));
  assert.equal(retained.prayerTime.asr, "5:09 PM");
  assert.equal(retained.iqamahTime.asrIqamah, "6:15 PM");
  assert.equal(retained.iqamahTime.overrides?.asr?.value, "6:15 PM");
});

test("G: public content and TV/mobile/Watch/widget snapshot share identical values", () => {
  const resolved = resolveEffectivePrayerSchedule(contentWithAsrOverride(), baseFeed, "live", "2026-09-08", sourceUpdatedAt, now);
  const publicContent = toPublicContent(resolved.content, now);
  const snapshot = createWidgetPrayerSnapshot(resolved.content, now);
  const asr = snapshot.prayers.find((entry) => entry.key === "asr");
  assert.equal(publicContent.prayerTime.asr, resolved.schedule.effective.adhan.asr);
  assert.equal(publicContent.iqamahTime.asrIqamah, resolved.schedule.effective.iqamah.asr);
  assert.equal(asr?.adhan, resolved.schedule.effective.adhan.asr);
  assert.equal(asr?.iqamah, resolved.schedule.effective.iqamah.asr);
});

test("Saturday after Isha promotes next-week Fajr and Asr across the public schedule", () => {
  const lateSaturday = new Date("2026-09-27T04:30:00.000Z");
  const feed = { ...baseFeed, salah_fajr: "5:59 AM", salah_isha: "8:55 PM", iqamah_fajr: "6:20 AM", nw_i_fajr: "6:30 AM", nw_i_asr: "5:15 PM" };
  const resolved = resolveEffectivePrayerSchedule(defaultContent, feed, "live", "2026-09-26", lateSaturday.toISOString(), lateSaturday);
  const snapshot = createWidgetPrayerSnapshot(resolved.content, lateSaturday);
  assert.equal(resolved.schedule.upcomingWeekEffective, true);
  assert.equal(resolved.schedule.automatic.iqamah.fajr, "6:30 AM");
  assert.equal(resolved.content.iqamahTime.asrIqamah, "5:15 PM");
  assert.equal(snapshot.serviceDate, "2026-09-26");
  assert.equal(snapshot.prayers.find((entry) => entry.key === "fajr")?.iqamah, "6:30 AM");
  assert.equal(snapshot.nextPrayerKey, "fajr");
  assert.equal(snapshot.nextIqamah, "6:30 AM");
  assert.equal(snapshot.nextIqamahDate, "2026-09-27T12:30:00.000Z");
  assert.equal(deriveDisplayFocus(snapshot, lateSaturday)?.iqamahDate?.toISOString(), "2026-09-27T12:30:00.000Z");
});

test("Sunday keeps Saturday's published rollover if the source has not switched yet", () => {
  const lateSaturday = new Date("2026-09-27T04:30:00.000Z");
  const sunday = new Date("2026-09-27T13:00:00.000Z");
  const feed = { ...baseFeed, salah_fajr: "5:59 AM", salah_isha: "8:55 PM", iqamah_fajr: "6:20 AM", iqamah_asr: "5:30 PM", nw_i_fajr: "6:30 AM", nw_i_asr: "5:15 PM" };
  const saturday = resolveEffectivePrayerSchedule(defaultContent, feed, "live", "2026-09-26", lateSaturday.toISOString(), lateSaturday);
  assert.equal(saturday.rollover?.weekStart, "2026-09-27");
  const staleSunday = resolveEffectivePrayerSchedule(defaultContent, feed, "live", "2026-09-27", sunday.toISOString(), sunday, saturday.rollover);
  assert.equal(staleSunday.content.iqamahTime.fajrIqamah, "6:30 AM");
  assert.equal(staleSunday.content.iqamahTime.asrIqamah, "5:15 PM");
  const updatedSunday = resolveEffectivePrayerSchedule(defaultContent,
    { ...feed, iqamah_fajr: "6:35 AM", iqamah_asr: "5:10 PM" }, "live", "2026-09-27", sunday.toISOString(), sunday, saturday.rollover);
  assert.equal(updatedSunday.content.iqamahTime.fajrIqamah, "6:35 AM");
  assert.equal(updatedSunday.content.iqamahTime.asrIqamah, "5:10 PM");
});
