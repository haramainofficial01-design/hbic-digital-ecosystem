import assert from "node:assert/strict";
import test from "node:test";
import { createWidgetPrayerSnapshot, defaultContent, toPublicContent } from "@hbic/shared";
import {
  deriveCurrentPrayerKey,
  deriveDisplayFocus,
  nextDisplayScheduleUpdateMs,
  deriveDisplayAtmosphere,
  displayRenderSignature,
  preferCachedDisplay,
  deriveWeatherVisualState,
  deriveNextDisplayPrayer,
  isAppLaunchTeaserActive,
  isDisplayAnnouncementActive,
  isJumuahDisplayWindow,
  snapshotMatchesCalgaryDate
} from "../lib/tvDisplay";

test("display derives the next prayer from canonical absolute prayer instants", () => {
  const now = new Date("2026-07-09T16:00:00.000Z"); // 10:00 AM Calgary
  const snapshot = createWidgetPrayerSnapshot(defaultContent, now);
  const next = deriveNextDisplayPrayer(snapshot, now);

  assert.equal(next?.entry.key, "dhuhr");
  assert.equal(next?.entry.iqamah, "2:00 PM");
  assert.equal(deriveCurrentPrayerKey(snapshot, now), "fajr");
});

test("Jumu'ah theme begins at Thursday Maghrib and ends at Friday Maghrib", () => {
  const thursday = new Date("2026-07-10T01:00:00.000Z");
  const thursdaySnapshot = createWidgetPrayerSnapshot(defaultContent, thursday);
  const thursdayMaghrib = new Date(thursdaySnapshot.prayers.find((entry) => entry.key === "maghrib")!.adhanDate);
  assert.equal(isJumuahDisplayWindow(thursdaySnapshot, new Date(thursdayMaghrib.getTime() - 1)), false);
  assert.equal(isJumuahDisplayWindow(thursdaySnapshot, thursdayMaghrib), true);

  const friday = new Date("2026-07-10T18:00:00.000Z");
  const fridaySnapshot = createWidgetPrayerSnapshot(defaultContent, friday);
  const fridayMaghrib = new Date(fridaySnapshot.prayers.find((entry) => entry.key === "maghrib")!.adhanDate);
  assert.equal(isJumuahDisplayWindow(fridaySnapshot, new Date(fridayMaghrib.getTime() - 1)), true);
  assert.equal(isJumuahDisplayWindow(fridaySnapshot, fridayMaghrib), false);
});

test("display advances from Maghrib to Isha without a page reload", () => {
  const now = new Date("2026-07-10T04:05:00.000Z"); // 10:05 PM Calgary on July 9
  const snapshot = createWidgetPrayerSnapshot(defaultContent, now);
  const next = deriveNextDisplayPrayer(snapshot, now);

  assert.equal(next?.entry.key, "isha");
  assert.equal(deriveCurrentPrayerKey(snapshot, now), "maghrib");
});

test("TV focus promotes iqamah at the exact adhan boundary and advances at iqamah", () => {
  const reference = new Date("2026-07-10T03:45:00.000Z");
  const snapshot = createWidgetPrayerSnapshot(defaultContent, reference);
  const maghrib = snapshot.prayers.find((entry) => entry.key === "maghrib")!;
  const adhan = new Date(maghrib.adhanDate);
  const iqamah = new Date(maghrib.iqamahDate!);

  const beforeAdhan = deriveDisplayFocus(snapshot, new Date(adhan.getTime() - 1));
  assert.equal(beforeAdhan?.entry.key, "maghrib");
  assert.equal(beforeAdhan?.primaryKind, "adhan");
  assert.equal(beforeAdhan?.date.toISOString(), adhan.toISOString());

  const atAdhan = deriveDisplayFocus(snapshot, adhan);
  assert.equal(atAdhan?.entry.key, "maghrib");
  assert.equal(atAdhan?.primaryKind, "iqamah");
  assert.equal(atAdhan?.date.toISOString(), iqamah.toISOString());
  assert.equal(atAdhan?.secondaryDate?.toISOString(), adhan.toISOString());

  const atIqamah = deriveDisplayFocus(snapshot, iqamah);
  assert.equal(atIqamah?.entry.key, "isha");
  assert.equal(atIqamah?.primaryKind, "adhan");
});

test("TV prayer rendering wakes at countdown changes and exact prayer boundaries", () => {
  const snapshot = createWidgetPrayerSnapshot(defaultContent, new Date("2026-07-10T03:45:00.000Z"));
  const maghrib = snapshot.prayers.find((entry) => entry.key === "maghrib")!;
  const adhan = new Date(maghrib.adhanDate).getTime();
  assert.equal(nextDisplayScheduleUpdateMs(snapshot, new Date(adhan - 125_000)), 5_001);
  assert.equal(nextDisplayScheduleUpdateMs(snapshot, new Date(adhan - 35_000)), 35_000);
  assert.equal(nextDisplayScheduleUpdateMs(snapshot, new Date(adhan - 100)), 100);
  assert.equal(deriveDisplayFocus(snapshot, new Date(adhan))?.primaryKind, "iqamah");
});

test("after Isha the display rolls over to tomorrow Fajr", () => {
  const now = new Date("2026-07-10T05:30:00.000Z"); // 11:30 PM Calgary on July 9
  const snapshot = createWidgetPrayerSnapshot(defaultContent, now);
  const next = deriveNextDisplayPrayer(snapshot, now);

  assert.equal(next?.entry.key, "fajr");
  assert.equal(next?.date.toISOString(), snapshot.tomorrowFajrDate);
});

test("a TV notice respects its start and expiry window", () => {
  const notice = {
    enabled: true,
    message: "Please park responsibly.",
    startsAt: "2026-07-09T12:00:00.000Z",
    expiresAt: "2026-07-09T20:00:00.000Z",
    updatedAt: "2026-07-09T12:00:00.000Z"
  };

  assert.equal(isDisplayAnnouncementActive(notice, new Date("2026-07-09T15:00:00.000Z")), true);
  assert.equal(isDisplayAnnouncementActive(notice, new Date("2026-07-09T20:00:00.000Z")), false);
});

test("Calgary midnight makes the prior daily snapshot ineligible", () => {
  const beforeMidnight = new Date("2026-07-10T05:59:00.000Z");
  const afterMidnight = new Date("2026-07-10T06:01:00.000Z");
  const snapshot = createWidgetPrayerSnapshot(defaultContent, beforeMidnight);

  assert.equal(snapshotMatchesCalgaryDate(snapshot, beforeMidnight), true);
  assert.equal(snapshotMatchesCalgaryDate(snapshot, afterMidnight), false);
});

test("unchanged polls do not rerender and yesterday's cache cannot replace today's schedule", () => {
  const now = new Date("2026-07-10T18:00:00.000Z");
  const snapshot = createWidgetPrayerSnapshot(defaultContent, now);
  const publicContent = toPublicContent(defaultContent);
  const display = {...publicContent.displaySettings, social: publicContent.settings.social,
    contact: {address: publicContent.settings.address, phone: publicContent.settings.phone}};
  const current = {ok: true as const, contentVersion: 8, snapshot, display};
  const generatedOnly = {...current, snapshot: {...snapshot, generatedAt: new Date(now.getTime() + 60_000).toISOString()}};
  assert.equal(displayRenderSignature(current), displayRenderSignature(generatedOnly));
  const changedPrayer = {...current, snapshot: {...snapshot, prayers: snapshot.prayers.map((entry) =>
    entry.key === "maghrib" ? {...entry, iqamah: "9:00 PM"} : entry)}};
  assert.notEqual(displayRenderSignature(current), displayRenderSignature(changedPrayer));
  const newerScheduleCache = {...changedPrayer, snapshot: {...changedPrayer.snapshot,
    sourceUpdatedAt: new Date(Date.parse(snapshot.sourceUpdatedAt) + 1_000).toISOString()}};
  assert.equal(preferCachedDisplay(current, newerScheduleCache, now), true);
  assert.equal(preferCachedDisplay(newerScheduleCache, current, now), false);
  const yesterday = {...current, contentVersion: 9, snapshot: createWidgetPrayerSnapshot(defaultContent, new Date("2026-07-09T18:00:00.000Z"))};
  assert.equal(preferCachedDisplay(current, yesterday, now), false);
  assert.equal(preferCachedDisplay(current, {...current, contentVersion: 9}, now), true);
});

test("TV atmosphere brightens toward Dhuhr and darkens through Isha", () => {
  const reference = new Date("2026-07-09T18:00:00.000Z");
  const snapshot = createWidgetPrayerSnapshot(defaultContent, reference);
  const fajr = deriveDisplayAtmosphere(snapshot, new Date(snapshot.prayers.find((entry) => entry.key === "fajr")!.adhanDate));
  const dhuhr = deriveDisplayAtmosphere(snapshot, new Date(snapshot.prayers.find((entry) => entry.key === "dhuhr")!.adhanDate));
  const maghrib = deriveDisplayAtmosphere(snapshot, new Date(snapshot.prayers.find((entry) => entry.key === "maghrib")!.adhanDate));
  const isha = deriveDisplayAtmosphere(snapshot, new Date(snapshot.prayers.find((entry) => entry.key === "isha")!.adhanDate));

  assert.ok(fajr.daylight < dhuhr.daylight);
  assert.ok(maghrib.daylight < dhuhr.daylight);
  assert.ok(isha.daylight < maghrib.daylight);
  assert.equal(dhuhr.phase, "day");
});

test("launch QR teaser switches to app downloads at the immediate public activation boundary", () => {
  assert.equal(isAppLaunchTeaserActive(new Date("2026-09-17T22:11:13-06:00")), true);
  assert.equal(isAppLaunchTeaserActive(new Date("2026-09-17T22:11:14-06:00")), false);
});

test("live weather resolves to restrained display modes and wind-aware motion", () => {
  const clear = deriveWeatherVisualState({
    temperature: 18,
    condition: "Clear",
    weatherCode: 0,
    cloudCover: 4,
    windSpeed: 8,
    windDirection: 220
  });
  assert.equal(clear.mode, "clear");
  assert.equal(clear.windy, false);
  assert.ok(clear.sunDimming > .9);

  const rain = deriveWeatherVisualState({
    temperature: 7,
    condition: "Rain",
    weatherCode: 63,
    cloudCover: 92,
    precipitation: 4,
    rain: 3.6,
    windSpeed: 31,
    windDirection: 280,
    windGusts: 47
  });
  assert.equal(rain.mode, "rain");
  assert.equal(rain.windy, true);
  assert.ok(rain.intensity > .7);
  assert.ok(rain.motionDuration < clear.motionDuration);
  assert.ok(rain.sunDimming < .15);

  const snow = deriveWeatherVisualState({
    temperature: -9,
    condition: "Heavy snow",
    weatherCode: 75,
    cloudCover: 100,
    precipitation: 2,
    snowfall: 2.4,
    windSpeed: 14
  });
  assert.equal(snow.mode, "snow");
  assert.ok(snow.sunDimming < .1);
});
