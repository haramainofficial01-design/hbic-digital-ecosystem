import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { demoIqamahTime, demoPrayerTime } from "../src/demoData";
import { createWidgetPrayerSnapshot, type WidgetPrayerSnapshot } from "../src/widgetSnapshot";
import { defaultContent, getPublicEvents } from "../src/content";
import { getEffectiveJumuahDoorNotice } from "../src/jumuah";
import { derivePrayerCelestialPosition, formatCountdown, getHijriDate, getNextPrayer, getNextPrayerFocus, getUpcomingWhiteDays, getWhiteDaysRemainingThisWeek, resolveHijriDate, timeToDate } from "../src/prayer";

function requireNext(value: ReturnType<typeof getNextPrayer>) {
  assert.ok(value, "Expected a valid next prayer");
  return value;
}

test("selects Isha after Maghrib instead of jumping to Fajr", () => {
  // July 9, 2026 at 10:00 PM in Calgary (MDT). Isha is at 11:20 PM.
  const next = requireNext(getNextPrayer(demoPrayerTime, new Date("2026-07-10T04:00:00.000Z")));

  assert.equal(next.name, "isha");
  assert.equal(next.time, "11:20 PM");
  assert.equal(next.date.toISOString(), "2026-07-10T05:20:00.000Z");
});

test("rolls to the following Fajr only after Isha has passed", () => {
  // July 10, 2026 at 12:00 AM in Calgary (MDT). The source date is stale.
  const next = requireNext(getNextPrayer(demoPrayerTime, new Date("2026-07-10T06:00:00.000Z")));

  assert.equal(next.name, "fajr");
  assert.equal(next.scheduleDate, "2026-07-10");
  assert.equal(next.date.toISOString(), "2026-07-10T10:02:00.000Z");
});

test("celestial position follows the Calgary prayer day without looping", () => {
  const fajr = new Date("2026-07-09T10:02:00.000Z");
  const sunrise = new Date("2026-07-09T12:07:00.000Z");
  const dhuhr = new Date("2026-07-09T19:32:00.000Z");
  const maghrib = new Date("2026-07-10T03:41:00.000Z");
  const isha = new Date("2026-07-10T05:20:00.000Z");
  const instants = { fajr, sunrise, maghrib, isha };

  const dawn = derivePrayerCelestialPosition(instants, fajr);
  const noon = derivePrayerCelestialPosition(instants, dhuhr);
  const sunset = derivePrayerCelestialPosition(instants, maghrib);
  const night = derivePrayerCelestialPosition(instants, new Date("2026-07-10T06:00:00.000Z"));

  assert.ok(dawn.visibility < noon.visibility);
  assert.ok(noon.altitude > dawn.altitude);
  assert.equal(sunset.progress, 1);
  assert.equal(night.visibility, 0);
});

test("keeps Sunrise in the schedule but never presents it as the next prayer", () => {
  // July 9, 2026 at 4:30 AM in Calgary (MDT), after Fajr and before Sunrise.
  const next = requireNext(getNextPrayer(demoPrayerTime, new Date("2026-07-09T10:30:00.000Z")));
  const snapshot = createWidgetPrayerSnapshot(
    { ...defaultContent, prayerTime: demoPrayerTime },
    new Date("2026-07-09T10:30:00.000Z")
  );

  assert.equal(next.name, "dhuhr");
  assert.equal(snapshot.nextPrayerKey, "dhuhr");
  assert.ok(snapshot.prayers.some((prayer) => prayer.key === "sunrise"));
});

test("uses the complete adhan transition order at exact boundaries", () => {
  const cases = [
    ["2026-07-09T09:59:00.000Z", "fajr"],
    ["2026-07-09T10:02:00.000Z", "dhuhr"],
    ["2026-07-09T19:41:00.000Z", "asr"],
    ["2026-07-10T00:01:00.000Z", "maghrib"],
    ["2026-07-10T03:50:00.000Z", "isha"],
    ["2026-07-10T05:20:00.000Z", "fajr"]
  ] as const;

  for (const [instant, expected] of cases) {
    assert.equal(requireNext(getNextPrayer(demoPrayerTime, new Date(instant))).name, expected, instant);
  }
});

test("keeps the same next prayer and promotes its pending iqamah", () => {
  const content = {
    ...defaultContent,
    prayerTime: demoPrayerTime
  };
  const afterMaghrib = createWidgetPrayerSnapshot(content, new Date("2026-07-10T03:55:00.000Z"));

  assert.equal(afterMaghrib.currentPrayerKey, "maghrib");
  assert.equal(afterMaghrib.nextPrayerKey, "maghrib");
  assert.equal(afterMaghrib.nextPrayerTime, "10:00 PM");
  assert.equal(afterMaghrib.nextPrayerDate, "2026-07-10T04:00:00.000Z");
  assert.equal(afterMaghrib.nextIqamahDate, "2026-07-10T04:00:00.000Z");
});

test("website and app focus remain on Dhuhr until its iqamah has passed", () => {
  const now = new Date("2026-07-09T19:50:00.000Z");
  const next = getNextPrayerFocus(demoPrayerTime, demoIqamahTime, now);

  assert.ok(next);
  assert.equal(next.name, "dhuhr");
  assert.equal(next.kind, "iqamah");
  assert.equal(next.time, "2:00 PM");
  assert.equal(next.date.toISOString(), "2026-07-09T20:00:00.000Z");
});

test("rejects missing, malformed, and non-sequential schedules", () => {
  assert.equal(getNextPrayer({ ...demoPrayerTime, isha: "" }, new Date("2026-07-10T04:00:00.000Z")), null);
  assert.equal(getNextPrayer({ ...demoPrayerTime, isha: "later" }, new Date("2026-07-10T04:00:00.000Z")), null);
  assert.equal(getNextPrayer({ ...demoPrayerTime, isha: demoPrayerTime.maghrib }, new Date("2026-07-10T04:00:00.000Z")), null);

  const unavailable = createWidgetPrayerSnapshot(
    { ...defaultContent, prayerTime: { ...demoPrayerTime, isha: "" } },
    new Date("2026-07-10T04:00:00.000Z")
  );
  assert.equal(unavailable.availability, "unavailable");
  assert.equal(unavailable.nextPrayerKey, "");
  assert.equal(unavailable.nextPrayerDate, "");
  assert.equal(unavailable.staleReason, "missing-schedule");
});

test("creates the versioned absolute snapshot contract", () => {
  const snapshot = createWidgetPrayerSnapshot(
    { ...defaultContent, prayerTime: demoPrayerTime },
    new Date("2026-07-10T04:00:00.000Z"),
    { refreshedAt: "2026-07-10T03:58:00.000Z" }
  );

  assert.equal(snapshot.schemaVersion, 2);
  assert.equal(snapshot.masjidTimeZoneIdentifier, "America/Edmonton");
  assert.equal(snapshot.serviceDate, "2026-07-09");
  assert.match(snapshot.scheduleRevision, /^1:2026-07-09:/);
  assert.equal(snapshot.nextPrayerKey, "isha");
  assert.equal(snapshot.nextPrayerDate, "2026-07-10T05:20:00.000Z");
  assert.equal(snapshot.tomorrowFajrDate, "2026-07-10T10:02:00.000Z");
  assert.equal(snapshot.availability, "available");
  assert.equal(snapshot.stale, false);
  assert.equal(snapshot.generatedAt, "2026-07-10T04:00:00.000Z");
  assert.equal(snapshot.jumuahState.firstDoorsCloseTime, "2:00 PM");
  assert.ok(snapshot.hijri?.gregorianDate);
});

test("uses Calgary timezone even when the runtime timezone differs", () => {
  const next = requireNext(getNextPrayer(demoPrayerTime, new Date("2026-07-10T04:00:00.000Z"), "America/Edmonton"));
  assert.equal(next.name, "isha");
  assert.equal(next.date.toISOString(), "2026-07-10T05:20:00.000Z");
});

test("converts wall-clock times correctly across Calgary DST changes", () => {
  assert.equal(timeToDate("2026-03-08", "1:30 AM")?.toISOString(), "2026-03-08T08:30:00.000Z");
  assert.equal(timeToDate("2026-03-08", "3:30 AM")?.toISOString(), "2026-03-08T09:30:00.000Z");
  assert.equal(timeToDate("2026-11-01", "12:00 PM")?.toISOString(), "2026-11-01T19:00:00.000Z");
});

test("formats the final minute without getting stuck at zero", () => {
  const now = new Date("2026-07-10T05:19:30.000Z");
  assert.equal(formatCountdown(new Date("2026-07-10T05:20:00.000Z"), now), "<1m");
  assert.equal(formatCountdown(new Date("2026-07-10T05:20:00.000Z"), new Date("2026-07-10T05:20:00.000Z")), "0m");
});

test("the canonical cross-consumer fixture carries the same Isha transition", () => {
  const fixturePath = fileURLToPath(new URL("./fixtures/canonical-prayer-snapshot-v2.json", import.meta.url));
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as WidgetPrayerSnapshot;

  assert.equal(fixture.schemaVersion, 2);
  assert.equal(fixture.nextPrayerKey, "isha");
  assert.equal(fixture.nextPrayerDate, "2026-07-10T05:20:00.000Z");
  assert.equal(fixture.tomorrowFajrDate, "2026-07-10T10:02:00.000Z");
  assert.equal(fixture.jumuahState.firstDoorsCloseTime, "2:00 PM");
});

test("Hijri date overrides preserve White Day boundaries 12 through 16", () => {
  const instant = new Date("2026-07-28T18:00:00.000Z");
  for (const day of [12, 13, 14, 15, 16]) {
    const resolved = resolveHijriDate(instant, {
      calendar: "islamic-umalqura",
      adjustmentDays: 0,
      updatedAt: instant.toISOString(),
      overrides: [{
        id: `override-${day}`,
        gregorianDate: "2026-07-28",
        day,
        month: "Safar",
        year: 1448,
        updatedAt: instant.toISOString()
      }]
    });
    assert.equal(resolved?.isWhiteDay, day >= 13 && day <= 15, `Hijri day ${day}`);
  }
});

test("Hijri positive and negative adjustments follow the adjacent Calgary date", () => {
  const instant = new Date("2026-07-28T18:00:00.000Z");
  const previous = getHijriDate(new Date(instant.getTime() - 86_400_000), 0);
  const next = getHijriDate(new Date(instant.getTime() + 86_400_000), 0);
  assert.equal(getHijriDate(instant, -1)?.label, previous?.label);
  assert.equal(getHijriDate(instant, 1)?.label, next?.label);
});

test("upcoming White Days returns the next 13th, 14th, and 15th with Gregorian equivalents", () => {
  const upcoming = getUpcomingWhiteDays(new Date("2026-07-20T18:00:00.000Z"), {
    calendar: "islamic-umalqura",
    adjustmentDays: 0,
    updatedAt: "2026-07-20T18:00:00.000Z",
    overrides: []
  });
  assert.equal(upcoming.length, 3);
  assert.deepEqual(upcoming.map((entry) => entry.hijriDate.day), [13, 14, 15]);
  assert.ok(upcoming.every((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.gregorianDate)));
});

test("home White Days notice appears only within the same Calgary calendar week", () => {
  const settings = { calendar: "islamic-umalqura" as const, adjustmentDays: 0, updatedAt: "2026-09-19T00:00:00.000Z", overrides: [] };
  const dates = (instant: string) => getWhiteDaysRemainingThisWeek(new Date(instant), settings)
    .map(({ gregorianDate }) => gregorianDate);
  assert.deepEqual(dates("2026-09-19T18:00:00.000Z"), []); // Saturday: next week's dates stay hidden.
  assert.deepEqual(dates("2026-09-20T18:00:00.000Z"), ["2026-09-24", "2026-09-25", "2026-09-26"]);
  assert.deepEqual(dates("2026-09-25T18:00:00.000Z"), ["2026-09-25", "2026-09-26"]);
  assert.deepEqual(dates("2026-09-27T18:00:00.000Z"), []);
});

test("Jumu'ah door notice respects feature, schedule, and effective dates", () => {
  const schedule = {
    ...defaultContent.jumuahSchedule,
    doorNotice: {
      ...defaultContent.jumuahSchedule.doorNotice!,
      enabled: true,
      time: "2:00 PM",
      effectiveFrom: "2026-07-01",
      effectiveUntil: "2026-07-31"
    }
  };

  assert.equal(getEffectiveJumuahDoorNotice(schedule, new Date("2026-07-10T18:00:00.000Z"))?.time, "2:00 PM");
  assert.equal(getEffectiveJumuahDoorNotice(schedule, new Date("2026-06-30T18:00:00.000Z")), null);
  assert.equal(getEffectiveJumuahDoorNotice(schedule, new Date("2026-08-01T18:00:00.000Z")), null);
  assert.equal(getEffectiveJumuahDoorNotice(schedule, new Date("2026-07-10T18:00:00.000Z"), false), null);
});

test("Jumu'ah date exception can change or suppress only that service date", () => {
  const schedule = {
    ...defaultContent.jumuahSchedule,
    doorNotice: {
      ...defaultContent.jumuahSchedule.doorNotice!,
      exceptions: [
        { date: "2026-07-10", enabled: true, time: "1:55 PM", body: "Doors close at 1:55 PM today." },
        { date: "2026-07-17", enabled: false }
      ]
    }
  };

  const changed = getEffectiveJumuahDoorNotice(schedule, new Date("2026-07-10T18:00:00.000Z"));
  assert.equal(changed?.time, "1:55 PM");
  assert.equal(changed?.body, "Doors close at 1:55 PM today.");
  assert.equal(getEffectiveJumuahDoorNotice(schedule, new Date("2026-07-17T18:00:00.000Z")), null);
  assert.equal(getEffectiveJumuahDoorNotice(schedule, new Date("2026-07-24T18:00:00.000Z"))?.time, "2:00 PM");
});

test("Jumu'ah notice never invents a time when neither structured nor legacy data exists", () => {
  const schedule = {
    ...defaultContent.jumuahSchedule,
    firstDoorsCloseTime: "",
    doorNotice: undefined
  };
  assert.equal(getEffectiveJumuahDoorNotice(schedule), null);
});

test("History of Fiqh is published without inventing calendar dates", () => {
  const publishedContent = {
    ...defaultContent,
    events: defaultContent.events.map((event) => (
      event.id === "event-history-of-fiqh"
        ? { ...event, date: "Sundays", status: "published" as const, visible: true }
        : event
    ))
  };

  assert.equal(
    getPublicEvents(publishedContent).some((event) => (
      event.id === "event-history-of-fiqh"
      && event.date === "Sundays"
      && event.recurringSchedule === "Sundays at 8:30 PM"
    )),
    true
  );
  assert.equal(
    getPublicEvents({
      ...publishedContent,
      featureFlags: { ...publishedContent.featureFlags, historyOfFiqhEventEnabled: false }
    }).some((event) => event.id === "event-history-of-fiqh"),
    false
  );
});

test("Watch snapshot includes only verified calendar-dated published events", () => {
  const content = {
    ...defaultContent,
    events: [
      {
        ...defaultContent.events[0],
        id: "event-history-of-fiqh",
        title: "History of Fiqh",
        date: "Sundays",
        status: "published" as const,
        visible: true
      },
      {
        ...defaultContent.events[0],
        id: "event-confirmed",
        title: "Confirmed Community Program",
        date: "2026-07-11",
        startTime: "7:00 PM",
        status: "published" as const,
        visible: true
      }
    ]
  };
  const snapshot = createWidgetPrayerSnapshot(content, new Date("2026-07-10T18:00:00.000Z"));
  assert.equal(snapshot.nextEvent?.id, "event-confirmed");
  assert.equal(snapshot.upcomingEvent, "Confirmed Community Program");
});

test("Watch snapshot carries one active important announcement", () => {
  const content = {
    ...defaultContent,
    announcements: [
      {
        ...defaultContent.announcements[0],
        id: "normal",
        priority: "Normal" as const,
        urgent: false,
        visible: true
      },
      {
        ...defaultContent.announcements[0],
        id: "urgent",
        title: "Important parking update",
        body: "Please use the overflow parking area tonight.",
        priority: "Urgent" as const,
        urgent: true,
        visible: true,
        publishedAt: "2026-07-10T12:00:00.000Z"
      }
    ]
  };
  const snapshot = createWidgetPrayerSnapshot(content, new Date("2026-07-10T18:00:00.000Z"));
  assert.equal(snapshot.importantAnnouncement?.id, "urgent");
  assert.equal(snapshot.importantAnnouncement?.priority, "Urgent");
});
