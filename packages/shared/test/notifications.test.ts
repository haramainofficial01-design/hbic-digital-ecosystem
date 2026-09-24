import assert from "node:assert/strict";
import test from "node:test";
import {
  createPrayerNotificationPlan,
  defaultPrayerAlertPreferences,
  diffPrayerNotificationSchedule
} from "../src/prayerNotifications";
import { resolveNotificationDestination, resolveNotificationPermissionState } from "../src/notificationRuntime";
import type { WidgetPrayerSnapshot } from "../src/widgetSnapshot";

const now = new Date("2026-07-09T18:00:00.000Z");

function snapshot(overrides: Partial<WidgetPrayerSnapshot> = {}): WidgetPrayerSnapshot {
  return {
    schemaVersion: 2,
    masjidID: "masjid-bilal-calgary",
    masjidName: "Masjid Bilal",
    scheduleRevision: "revision-1",
    masjidTimeZoneIdentifier: "America/Edmonton",
    serviceDate: "2026-07-09",
    timezone: "America/Edmonton",
    scheduleDate: "2026-07-09",
    nextPrayerKey: "dhuhr",
    nextPrayerName: "Dhuhr",
    nextPrayerTime: "1:41 PM",
    nextPrayerDate: "2026-07-09T19:41:00.000Z",
    tomorrowFajrDate: "2026-07-10T10:02:00.000Z",
    prayers: [
      { key: "fajr", name: "Fajr", adhan: "4:02 AM", adhanDate: "2026-07-09T10:02:00.000Z", iqamah: "4:30 AM" },
      { key: "sunrise", name: "Sunrise", adhan: "5:35 AM", adhanDate: "2026-07-09T11:35:00.000Z" },
      { key: "dhuhr", name: "Dhuhr", adhan: "1:41 PM", adhanDate: "2026-07-09T19:41:00.000Z", iqamah: "2:00 PM" },
      { key: "asr", name: "Asr", adhan: "6:01 PM", adhanDate: "2026-07-10T00:01:00.000Z", iqamah: "6:30 PM" },
      { key: "maghrib", name: "Maghrib", adhan: "9:50 PM", adhanDate: "2026-07-10T03:50:00.000Z", iqamah: "10:00 PM" },
      { key: "isha", name: "Isha", adhan: "11:20 PM", adhanDate: "2026-07-10T05:20:00.000Z", iqamah: "11:25 PM" }
    ],
    jumuah: [],
    jumuahState: { enabled: false, serviceDate: "2026-07-10", sessions: [] },
    generatedAt: now.toISOString(),
    sourceUpdatedAt: now.toISOString(),
    expiresAt: "2026-07-10T18:00:00.000Z",
    state: "fresh",
    availability: "available",
    stale: false,
    ...overrides
  };
}

test("prayer alerts are opt-in and a disabled plan cancels owned alerts", () => {
  const plan = createPrayerNotificationPlan(snapshot(), defaultPrayerAlertPreferences, now);
  assert.equal(plan.status, "disabled");
  assert.deepEqual(plan.notifications, []);
  assert.deepEqual(diffPrayerNotificationSchedule(["prayer-fajr-2026-07-09"], plan).cancel, ["prayer-fajr-2026-07-09"]);
});

test("schedules only enabled future prayers and never Sunrise", () => {
  const plan = createPrayerNotificationPlan(snapshot(), {
    ...defaultPrayerAlertPreferences,
    enabled: true,
    prayers: { fajr: true, dhuhr: true, asr: false, maghrib: true, isha: true }
  }, now);

  assert.equal(plan.status, "ready");
  assert.deepEqual(plan.notifications.map((item) => item.identifier), [
    "prayer-dhuhr-2026-07-09",
    "prayer-maghrib-2026-07-09",
    "prayer-isha-2026-07-09",
    "prayer-fajr-2026-07-10"
  ]);
  assert.ok(plan.notifications.every((item) => item.prayer !== ("sunrise" as never)));
});

test("uses absolute Calgary instants even when the runtime timezone differs", () => {
  const plan = createPrayerNotificationPlan(snapshot(), {
    ...defaultPrayerAlertPreferences,
    enabled: true
  }, now);
  assert.equal(plan.notifications.find((item) => item.prayer === "maghrib")?.fireDate, "2026-07-10T03:50:00.000Z");
});

test("adds normal-tone pre-prayer reminders without changing Adhan sound choice", () => {
  const plan = createPrayerNotificationPlan(snapshot(), {
    ...defaultPrayerAlertPreferences,
    enabled: true,
    sound: "adhan",
    reminderMinutes: 10
  }, now);
  const dhuhr = plan.notifications.filter((item) => item.prayer === "dhuhr");
  assert.deepEqual(dhuhr.map((item) => [item.kind, item.sound, item.fireDate]), [
    ["pre-prayer", "notification", "2026-07-09T19:31:00.000Z"],
    ["adhan", "adhan", "2026-07-09T19:41:00.000Z"]
  ]);
});

test("preserves the existing OS schedule when the snapshot is stale or offline", () => {
  const plan = createPrayerNotificationPlan(snapshot({ state: "cached", stale: true, staleReason: "cached" }), {
    ...defaultPrayerAlertPreferences,
    enabled: true
  }, now);
  assert.equal(plan.status, "stale");
  assert.equal(plan.preserveExisting, true);
  assert.deepEqual(diffPrayerNotificationSchedule(["prayer-dhuhr-2026-07-09"], plan), {
    cancel: [],
    schedule: [],
    unchanged: true
  });
});

test("rejects a mismatched Calgary service date instead of inventing future times", () => {
  const plan = createPrayerNotificationPlan(snapshot({ serviceDate: "2026-07-08" }), {
    ...defaultPrayerAlertPreferences,
    enabled: true
  }, now);
  assert.equal(plan.status, "stale");
  assert.deepEqual(plan.notifications, []);
});

test("unchanged revision and preferences do not create duplicates", () => {
  const plan = createPrayerNotificationPlan(snapshot(), {
    ...defaultPrayerAlertPreferences,
    enabled: true
  }, now);
  const identifiers = plan.notifications.map((item) => item.identifier);
  assert.deepEqual(diffPrayerNotificationSchedule(identifiers, plan, plan.fingerprint), {
    cancel: [],
    schedule: [],
    unchanged: true
  });
});

test("a newer schedule revision replaces deterministic identifiers idempotently", () => {
  const preferences = { ...defaultPrayerAlertPreferences, enabled: true };
  const previous = createPrayerNotificationPlan(snapshot(), preferences, now);
  const next = createPrayerNotificationPlan(snapshot({ scheduleRevision: "revision-2" }), preferences, now);
  const diff = diffPrayerNotificationSchedule(previous.notifications.map((item) => item.identifier), next, previous.fingerprint);
  assert.equal(diff.unchanged, false);
  assert.deepEqual(diff.cancel, previous.notifications.map((item) => item.identifier).sort());
  assert.deepEqual(diff.schedule.map((item) => item.identifier), next.notifications.map((item) => item.identifier));
});

test("tomorrow Fajr is bounded to the supplied canonical timestamp", () => {
  const plan = createPrayerNotificationPlan(snapshot({ tomorrowFajrDate: undefined }), {
    ...defaultPrayerAlertPreferences,
    enabled: true
  }, now);
  assert.equal(plan.notifications.some((item) => item.identifier === "prayer-fajr-2026-07-10"), false);
});

test("Jumu'ah is an independent normal-tone local reminder", () => {
  const plan = createPrayerNotificationPlan(snapshot({
    jumuah: [{
      label: "First Jumu'ah",
      khutbah: "1:30 PM",
      khutbahDate: "2026-07-10T19:30:00.000Z",
      iqamah: "1:45 PM",
      iqamahDate: "2026-07-10T19:45:00.000Z"
    }],
    jumuahState: {
      enabled: true,
      serviceDate: "2026-07-10",
      sessions: [{
        label: "First Jumu'ah",
        khutbah: "1:30 PM",
        khutbahDate: "2026-07-10T19:30:00.000Z",
        iqamah: "1:45 PM",
        iqamahDate: "2026-07-10T19:45:00.000Z"
      }]
    }
  }), {
    ...defaultPrayerAlertPreferences,
    enabled: false,
    jumuahReminders: true
  }, now);

  assert.equal(plan.status, "ready");
  assert.deepEqual(plan.notifications.map((item) => [item.identifier, item.kind, item.sound]), [
    ["prayer-jumuah-2026-07-10", "jumuah", "notification"]
  ]);
});

test("permission state distinguishes denial, restoration, and provisional access", () => {
  assert.equal(resolveNotificationPermissionState({ granted: false, status: "undetermined" }), "not-determined");
  assert.equal(resolveNotificationPermissionState({ granted: false, status: "denied", iosAuthorizationStatus: 1 }), "denied");
  assert.equal(resolveNotificationPermissionState({ granted: true, status: "granted" }), "authorized");
  assert.equal(resolveNotificationPermissionState({ granted: false, status: "undetermined", iosAuthorizationStatus: 3 }), "provisional");
});

test("a notification received before Fajr includes every enabled salah but never Sunrise", () => {
  const beforeFajr = new Date("2026-07-09T09:00:00.000Z");
  const plan = createPrayerNotificationPlan(snapshot(), {
    ...defaultPrayerAlertPreferences,
    enabled: true
  }, beforeFajr);
  assert.deepEqual(plan.notifications.map((item) => item.prayer), ["fajr", "dhuhr", "asr", "maghrib", "isha", "fajr"]);
});

test("date rollover keeps only the canonical tomorrow Fajr after today's prayers", () => {
  const afterIsha = new Date("2026-07-10T05:30:00.000Z");
  const rolloverSnapshot = snapshot({
    serviceDate: "2026-07-09",
    scheduleDate: "2026-07-09",
    expiresAt: "2026-07-10T18:00:00.000Z"
  });
  const plan = createPrayerNotificationPlan(rolloverSnapshot, {
    ...defaultPrayerAlertPreferences,
    enabled: true
  }, afterIsha);
  assert.deepEqual(plan.notifications.map((item) => item.identifier), ["prayer-fajr-2026-07-10"]);
});

test("Calgary DST scheduling consumes canonical absolute instants without recalculating offsets", () => {
  const dstNow = new Date("2026-03-08T08:30:00.000Z");
  const dstSnapshot = snapshot({
    serviceDate: "2026-03-08",
    scheduleDate: "2026-03-08",
    generatedAt: dstNow.toISOString(),
    expiresAt: "2026-03-09T18:00:00.000Z",
    prayers: [
      { key: "fajr", name: "Fajr", adhan: "6:00 AM", adhanDate: "2026-03-08T12:00:00.000Z" },
      { key: "sunrise", name: "Sunrise", adhan: "7:55 AM", adhanDate: "2026-03-08T13:55:00.000Z" },
      { key: "dhuhr", name: "Dhuhr", adhan: "1:40 PM", adhanDate: "2026-03-08T19:40:00.000Z" },
      { key: "asr", name: "Asr", adhan: "5:15 PM", adhanDate: "2026-03-08T23:15:00.000Z" },
      { key: "maghrib", name: "Maghrib", adhan: "7:31 PM", adhanDate: "2026-03-09T01:31:00.000Z" },
      { key: "isha", name: "Isha", adhan: "9:00 PM", adhanDate: "2026-03-09T03:00:00.000Z" }
    ],
    tomorrowFajrDate: "2026-03-09T12:00:00.000Z"
  });
  const plan = createPrayerNotificationPlan(dstSnapshot, { ...defaultPrayerAlertPreferences, enabled: true }, dstNow);
  assert.equal(plan.notifications.find((item) => item.prayer === "maghrib")?.fireDate, "2026-03-09T01:31:00.000Z");
});

test("notification payloads deep-link to a focused prayer or event detail", () => {
  assert.equal(resolveNotificationDestination({ route: "/prayer", prayer: "asr" }), "/prayer?prayer=asr");
  assert.equal(resolveNotificationDestination({ route: "/events", eventId: "family night" }), "/event-detail?id=family%20night");
  assert.equal(resolveNotificationDestination({ route: "https://untrusted.example" }), "/");
});
