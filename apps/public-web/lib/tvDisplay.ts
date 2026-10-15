import {
  addDays,
  dateStringInTimeZone,
  derivePrayerCelestialPosition,
  masjidTimeZone,
  timeToDate,
  type PrayerName,
  type TvDisplayAnnouncement,
  type WidgetPrayerEntry,
  type WidgetPrayerSnapshot
} from "@hbic/shared";
import { appLaunchCampaign, isAppLaunchCampaignActive } from "./appLaunch";

export interface TvDisplayPublicSettings {
  title: string;
  showGregorianDate: boolean;
  showHijriDate: boolean;
  showJumuah: boolean;
  showQrCode: boolean;
  showWebsite: boolean;
  showSocialLinks: boolean;
  showWeather: boolean;
  announcement: TvDisplayAnnouncement;
  social: {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };
  contact: {
    address: string;
    phone: string;
  };
}

export interface TvDisplayPayload {
  ok: true;
  contentVersion: number;
  snapshot: WidgetPrayerSnapshot;
  display: TvDisplayPublicSettings;
}

/** Ignore generatedAt/current-focus fields that change as time passes; the
 * display computes those locally. Preserve every field actually shown on TV. */
export function displayRenderSignature(payload: TvDisplayPayload) {
  const { snapshot, display } = payload;
  return JSON.stringify([
    payload.contentVersion, snapshot.serviceDate, snapshot.scheduleRevision,
    snapshot.prayers, snapshot.tomorrowFajrDate, snapshot.tomorrowFajrIqamah,
    snapshot.jumuahState, snapshot.hijriDate, snapshot.availability,
    snapshot.state, snapshot.stale, display
  ]);
}

export function preferCachedDisplay(initial: TvDisplayPayload, cached: TvDisplayPayload, now: Date) {
  if (!snapshotMatchesCalgaryDate(cached.snapshot, now) || cached.contentVersion < initial.contentVersion) return false;
  if (cached.contentVersion > initial.contentVersion) return true;
  return Date.parse(cached.snapshot.sourceUpdatedAt) > Date.parse(initial.snapshot.sourceUpdatedAt)
    && displayRenderSignature(cached) !== displayRenderSignature(initial);
}

export interface TvWeatherReading {
  temperature: number;
  condition: string;
  observedAt?: string;
  weatherCode?: number;
  cloudCover?: number;
  precipitation?: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
  windSpeed?: number;
  windDirection?: number;
  windGusts?: number;
}

export type TvWeatherMode = "clear" | "clouds" | "fog" | "rain" | "snow" | "storm";

export interface TvWeatherVisualState {
  mode: TvWeatherMode;
  intensity: number;
  cloudiness: number;
  windy: boolean;
  windSpeed: number;
  windDirection: number;
  motionDuration: number;
  sunDimming: number;
}

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** Converts the current Calgary reading into restrained, deterministic display effects. */
export function deriveWeatherVisualState(reading?: TvWeatherReading | null): TvWeatherVisualState {
  if (!reading) {
    return {
      mode: "clear",
      intensity: 0,
      cloudiness: 0,
      windy: false,
      windSpeed: 0,
      windDirection: 0,
      motionDuration: 70,
      sunDimming: 1
    };
  }

  const condition = reading.condition.toLowerCase();
  const precipitation = Math.max(0, reading.precipitation ?? 0);
  const rain = Math.max(0, reading.rain ?? 0) + Math.max(0, reading.showers ?? 0);
  const snowfall = Math.max(0, reading.snowfall ?? 0);
  const cloudiness = clampUnit(Math.max(
    (reading.cloudCover ?? 0) / 100,
    condition.includes("cloud") ? .52 : 0,
    condition.includes("fog") ? .76 : 0
  ));
  const windSpeed = Math.max(0, reading.windSpeed ?? 0);
  const windGusts = Math.max(windSpeed, reading.windGusts ?? 0);
  const storm = condition.includes("thunder") || [95, 96, 99].includes(reading.weatherCode ?? -1);
  const snow = snowfall > 0 || condition.includes("snow");
  const wet = precipitation > 0 || rain > 0 || /(rain|drizzle|shower)/.test(condition);
  const fog = condition.includes("fog");
  const mode: TvWeatherMode = storm ? "storm" : snow ? "snow" : wet ? "rain" : fog ? "fog" : cloudiness >= .24 ? "clouds" : "clear";
  const effectiveCloudiness = Math.max(
    cloudiness,
    mode === "storm" ? .84 : 0,
    mode === "rain" || mode === "snow" ? .62 : 0,
    mode === "fog" ? .76 : 0
  );
  const intensity = mode === "storm"
    ? clampUnit(.72 + Math.max(precipitation, rain) / 8)
    : mode === "snow"
      ? clampUnit(.28 + snowfall / 3)
      : mode === "rain"
        ? clampUnit(.24 + Math.max(precipitation, rain) / 5)
        : mode === "fog"
          ? clampUnit(.48 + cloudiness * .35)
          : mode === "clouds"
            ? clampUnit(.18 + cloudiness * .48)
            : 0;
  const windy = windSpeed >= 24 || windGusts >= 38;

  return {
    mode,
    intensity,
    cloudiness: effectiveCloudiness,
    windy,
    windSpeed,
    windDirection: ((reading.windDirection ?? 0) % 360 + 360) % 360,
    motionDuration: Math.max(16, Math.min(74, 74 - windSpeed * 1.25)),
    sunDimming: Math.max(
      .04,
      1 - effectiveCloudiness * .9 - (mode === "rain" || mode === "snow" ? .08 : 0) - (mode === "storm" ? .15 : 0)
    )
  };
}

/** Shared reveal time moved forward at HBIC's request for immediate public activation. */
export const appLaunchRevealAt = appLaunchCampaign.launchAt;

export function isAppLaunchTeaserActive(now = new Date()) {
  return !isAppLaunchCampaignActive(now);
}

export interface DerivedDisplayPrayer {
  entry: WidgetPrayerEntry;
  date: Date;
  iqamahDate?: Date;
}

export interface DerivedDisplayFocus extends DerivedDisplayPrayer {
  primaryKind: "adhan" | "iqamah";
  secondaryDate?: Date;
}

export type DisplayAtmospherePhase = "night" | "fajr" | "day" | "asr" | "maghrib" | "isha";

export interface DisplayAtmosphere {
  phase: DisplayAtmospherePhase;
  daylight: number;
  sunProgress: number;
  sunAltitude: number;
  sunVisibility: number;
  sunWarmth: number;
  skyTop: string;
  skyMiddle: string;
  skyBottom: string;
  blueGlow: string;
}

type AtmosphereStop = {
  key: "midnight" | PrayerName | "tomorrow";
  phase: DisplayAtmospherePhase;
  daylight: number;
  colors: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
};

const atmosphereStops: AtmosphereStop[] = [
  { key: "midnight", phase: "night", daylight: .03, colors: [[3, 14, 31], [4, 24, 46], [2, 10, 24], [20, 72, 132]] },
  { key: "fajr", phase: "fajr", daylight: .38, colors: [[14, 46, 74], [18, 64, 91], [5, 25, 47], [57, 139, 190]] },
  { key: "sunrise", phase: "day", daylight: .76, colors: [[28, 88, 120], [23, 79, 108], [7, 35, 60], [82, 171, 218]] },
  { key: "dhuhr", phase: "day", daylight: 1, colors: [[32, 109, 145], [20, 86, 120], [7, 42, 70], [91, 184, 226]] },
  { key: "asr", phase: "asr", daylight: .72, colors: [[23, 77, 111], [16, 63, 96], [6, 31, 57], [66, 151, 203]] },
  { key: "maghrib", phase: "maghrib", daylight: .26, colors: [[13, 39, 73], [11, 45, 79], [4, 21, 43], [50, 113, 177]] },
  { key: "isha", phase: "isha", daylight: .07, colors: [[4, 20, 43], [5, 29, 56], [2, 13, 30], [27, 83, 151]] },
  { key: "tomorrow", phase: "night", daylight: .03, colors: [[3, 14, 31], [4, 24, 46], [2, 10, 24], [20, 72, 132]] }
];

function mixColor(from: [number, number, number], to: [number, number, number], progress: number) {
  const channels = from.map((value, index) => Math.round(value + (to[index] - value) * progress));
  return `rgb(${channels.join(" ")})`;
}

/** Continuous, schedule-aware TV atmosphere using absolute Calgary prayer instants. */
export function deriveDisplayAtmosphere(snapshot: WidgetPrayerSnapshot, now: Date): DisplayAtmosphere {
  const prayerInstants = Object.fromEntries(snapshot.prayers.map((entry) => [entry.key, Date.parse(entry.adhanDate)]));
  const midnight = timeToDate(snapshot.serviceDate, "12:00 AM", masjidTimeZone)?.getTime() ?? now.getTime();
  const tomorrow = timeToDate(addDays(snapshot.serviceDate, 1), "12:00 AM", masjidTimeZone)?.getTime() ?? midnight + 86_400_000;
  const timedStops = atmosphereStops.map((stop) => ({
    ...stop,
    time: stop.key === "midnight" ? midnight : stop.key === "tomorrow" ? tomorrow : prayerInstants[stop.key]
  })).filter((stop) => Number.isFinite(stop.time));
  const nowTime = Math.max(midnight, Math.min(tomorrow, now.getTime()));
  const upperIndex = timedStops.findIndex((stop) => stop.time > nowTime);
  const toIndex = upperIndex <= 0 ? 1 : upperIndex;
  const from = timedStops[toIndex - 1] ?? timedStops[0];
  const to = timedStops[toIndex] ?? timedStops[timedStops.length - 1];
  const duration = Math.max(1, to.time - from.time);
  const progress = Math.max(0, Math.min(1, (nowTime - from.time) / duration));
  const colors = from.colors.map((color, index) => mixColor(color, to.colors[index], progress));
  const celestial = derivePrayerCelestialPosition({
    fajr: Number.isFinite(prayerInstants.fajr) ? new Date(prayerInstants.fajr) : null,
    sunrise: Number.isFinite(prayerInstants.sunrise) ? new Date(prayerInstants.sunrise) : null,
    maghrib: Number.isFinite(prayerInstants.maghrib) ? new Date(prayerInstants.maghrib) : null,
    isha: Number.isFinite(prayerInstants.isha) ? new Date(prayerInstants.isha) : null
  }, now);

  return {
    phase: from.phase,
    daylight: from.daylight + (to.daylight - from.daylight) * progress,
    sunProgress: celestial.progress,
    sunAltitude: celestial.altitude,
    sunVisibility: celestial.visibility,
    sunWarmth: celestial.warmth,
    skyTop: colors[0],
    skyMiddle: colors[1],
    skyBottom: colors[2],
    blueGlow: colors[3]
  };
}

export function deriveNextDisplayPrayer(snapshot: WidgetPrayerSnapshot, now: Date): DerivedDisplayPrayer | null {
  const upcoming = snapshot.prayers
    .filter((entry) => entry.key !== "sunrise")
    .map((entry) => ({ entry, date: new Date(entry.adhanDate), iqamahDate: entry.iqamahDate ? new Date(entry.iqamahDate) : undefined }))
    .find(({ date }) => Number.isFinite(date.getTime()) && date.getTime() > now.getTime());
  if (upcoming) return upcoming;

  const fajr = snapshot.prayers.find((entry) => entry.key === "fajr");
  const tomorrowFajr = snapshot.tomorrowFajrDate ? new Date(snapshot.tomorrowFajrDate) : null;
  if (!fajr || !tomorrowFajr || !Number.isFinite(tomorrowFajr.getTime())) return null;
  const tomorrowDate = addDays(snapshot.serviceDate, 1);
  const iqamah = snapshot.tomorrowFajrIqamah ?? fajr.iqamah;
  const iqamahDate = iqamah ? timeToDate(tomorrowDate, iqamah, masjidTimeZone) ?? undefined : undefined;
  return { entry: { ...fajr, iqamah }, date: tomorrowFajr, iqamahDate };
}

/**
 * Resolves the next meaningful congregation event for the continuously-running TV.
 * A salah stays focused from its adhan through its pending iqamah, then advances.
 */
export function deriveDisplayFocus(snapshot: WidgetPrayerSnapshot, now: Date): DerivedDisplayFocus | null {
  const nowTime = now.getTime();
  const prayers = snapshot.prayers.filter((entry) => entry.key !== "sunrise");

  for (const entry of prayers) {
    const date = new Date(entry.adhanDate);
    if (!Number.isFinite(date.getTime())) continue;
    const iqamahDate = entry.iqamahDate ? new Date(entry.iqamahDate) : undefined;
    const hasUpcomingIqamah = Boolean(
      iqamahDate
      && Number.isFinite(iqamahDate.getTime())
      && iqamahDate.getTime() > date.getTime()
      && nowTime < iqamahDate.getTime()
    );

    if (nowTime < date.getTime()) {
      return {
        entry,
        date,
        iqamahDate,
        primaryKind: "adhan",
        secondaryDate: hasUpcomingIqamah ? iqamahDate : undefined
      };
    }

    if (hasUpcomingIqamah) {
      return {
        entry,
        date: iqamahDate!,
        iqamahDate,
        primaryKind: "iqamah",
        secondaryDate: date
      };
    }
  }

  const tomorrow = deriveNextDisplayPrayer(snapshot, now);
  return tomorrow ? { ...tomorrow, primaryKind: "adhan", secondaryDate: tomorrow.iqamahDate } : null;
}

/** The TV countdown shows minutes, not seconds. Wake its prayer subtree only
 * when the label can change or the exact next adhan/iqamah arrives. The clock
 * hands and digital seconds continue on their separate one-second timer. */
export function nextDisplayScheduleUpdateMs(snapshot: WidgetPrayerSnapshot, now: Date) {
  const target = deriveDisplayFocus(snapshot, now)?.date.getTime();
  if (target === undefined || !Number.isFinite(target)) return 60_000;
  const remaining = target - now.getTime();
  if (remaining <= 0) return 50;
  const nextLabelChange = remaining >= 60_000 ? remaining % 60_000 + 1 : remaining;
  return Math.max(50, Math.min(60_000, remaining, nextLabelChange));
}

export function deriveCurrentPrayerKey(snapshot: WidgetPrayerSnapshot, now: Date): PrayerName | undefined {
  return [...snapshot.prayers]
    .filter((entry) => entry.key !== "sunrise" && Date.parse(entry.adhanDate) <= now.getTime())
    .reverse()[0]?.key;
}

export function isDisplayAnnouncementActive(announcement: TvDisplayAnnouncement, now: Date) {
  if (!announcement.enabled || !announcement.message.trim()) return false;
  const startsAt = announcement.startsAt ? Date.parse(announcement.startsAt) : Number.NEGATIVE_INFINITY;
  const expiresAt = announcement.expiresAt ? Date.parse(announcement.expiresAt) : Number.POSITIVE_INFINITY;
  return startsAt <= now.getTime() && expiresAt > now.getTime();
}

export function snapshotMatchesCalgaryDate(snapshot: WidgetPrayerSnapshot, now: Date) {
  return snapshot.serviceDate === dateStringInTimeZone(now, masjidTimeZone);
}

/** Jumu'ah presentation runs from the canonical Thursday Maghrib to Friday Maghrib. */
export function isJumuahDisplayWindow(snapshot: WidgetPrayerSnapshot, now: Date) {
  if (!snapshotMatchesCalgaryDate(snapshot, now)) return false;
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: masjidTimeZone, weekday: "short" }).format(now);
  const maghrib = snapshot.prayers.find((entry) => entry.key === "maghrib");
  const maghribTime = maghrib ? Date.parse(maghrib.adhanDate) : Number.NaN;
  if (!Number.isFinite(maghribTime)) return false;
  if (weekday === "Thu") return now.getTime() >= maghribTime;
  if (weekday === "Fri") return now.getTime() < maghribTime;
  return false;
}

export function socialHandle(url?: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const handle = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    return handle.startsWith("@") ? handle : handle ? `@${handle}` : "";
  } catch {
    return "";
  }
}
