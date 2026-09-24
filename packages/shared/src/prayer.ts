import { prayerOrder } from "./constants";
import type { HijriSettings, IqamahTime, PrayerName, PrayerTime } from "./types";

export const masjidTimeZone = "America/Edmonton";
export const congregationalPrayerOrder = prayerOrder.filter((prayer): prayer is Exclude<PrayerName, "sunrise"> => prayer !== "sunrise");

export const prayerLabels: Record<PrayerName, string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha"
};

export interface ClockTime {
  hour: number;
  minute: number;
}

export function getIqamahForPrayer(prayer: PrayerName, iqamah: IqamahTime): string | undefined {
  if (prayer === "sunrise") return undefined;
  const key = `${prayer}Iqamah` as keyof IqamahTime;
  return iqamah[key] as string;
}

export function parseClock(time: string): ClockTime | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  const modifier = match[3].toUpperCase();
  if (modifier === "PM" && hour !== 12) hour += 12;
  if (modifier === "AM" && hour === 12) hour = 0;
  return { hour, minute };
}

export function datePartsInTimeZone(date: Date, timeZone = masjidTimeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second")
  };
}

export function dateStringInTimeZone(date: Date, timeZone = masjidTimeZone) {
  const parts = datePartsInTimeZone(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function timeZoneOffset(date: Date, timeZone: string) {
  const parts = datePartsInTimeZone(date, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - date.getTime();
}

/** Converts an HBIC wall-clock time into a real instant in the masjid timezone. */
export function timeToDate(date: string, time: string, timeZone = masjidTimeZone): Date | null {
  const [year, month, day] = date.split("-").map(Number);
  const clock = parseClock(time);
  if (
    !clock ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const { hour, minute } = clock;
  const wallClock = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstGuess = new Date(wallClock);
  const firstOffset = timeZoneOffset(firstGuess, timeZone);
  let result = new Date(wallClock - firstOffset);
  const correctedOffset = timeZoneOffset(result, timeZone);
  if (correctedOffset !== firstOffset) result = new Date(wallClock - correctedOffset);
  return result;
}

export interface PrayerCelestialPosition {
  /** Horizontal travel from the sunrise side to the sunset side of the surface. */
  progress: number;
  /** Normalized height above the horizon, peaking near the middle of the prayer day. */
  altitude: number;
  /** Gentle dawn/dusk fade so the light source never pops into view. */
  visibility: number;
  /** Warmth is strongest near sunrise and Maghrib, cooler around Dhuhr. */
  warmth: number;
}

export interface PrayerCelestialInstants {
  fajr?: Date | null;
  sunrise?: Date | null;
  maghrib?: Date | null;
  isha?: Date | null;
}

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

/**
 * One shared, schedule-aware sun path for web, mobile, and the masjid display.
 * This intentionally follows HBIC's Calgary prayer instants instead of the
 * viewer's device timezone or an arbitrary looping animation.
 */
export function derivePrayerCelestialPosition(
  instants: PrayerCelestialInstants,
  now = new Date()
): PrayerCelestialPosition {
  const nowTime = now.getTime();
  const fajr = instants.fajr?.getTime();
  const sunrise = instants.sunrise?.getTime();
  const maghrib = instants.maghrib?.getTime();
  const isha = instants.isha?.getTime();

  if (!Number.isFinite(sunrise) || !Number.isFinite(maghrib) || maghrib! <= sunrise!) {
    return { progress: 0, altitude: 0, visibility: 0, warmth: 1 };
  }

  const progress = clampUnit((nowTime - sunrise!) / (maghrib! - sunrise!));
  const altitude = Math.sin(progress * Math.PI);
  const warmth = clampUnit(1 - altitude * 0.72);
  let visibility = 0;

  if (nowTime >= sunrise! && nowTime <= maghrib!) {
    visibility = 0.72 + altitude * 0.28;
  } else if (Number.isFinite(fajr) && nowTime >= fajr! && nowTime < sunrise!) {
    visibility = 0.18 * clampUnit((nowTime - fajr!) / (sunrise! - fajr!));
  } else if (Number.isFinite(isha) && nowTime > maghrib! && nowTime <= isha!) {
    visibility = 0.28 * (1 - clampUnit((nowTime - maghrib!) / (isha! - maghrib!)));
  }

  return { progress, altitude, visibility, warmth };
}

export function getPrayerCelestialPosition(
  prayer: PrayerTime,
  now = new Date(),
  timeZone = masjidTimeZone
) {
  const serviceDate = dateStringInTimeZone(now, timeZone);
  return derivePrayerCelestialPosition({
    fajr: timeToDate(serviceDate, prayer.fajr, timeZone),
    sunrise: timeToDate(serviceDate, prayer.sunrise, timeZone),
    maghrib: timeToDate(serviceDate, prayer.maghrib, timeZone),
    isha: timeToDate(serviceDate, prayer.isha, timeZone)
  }, now);
}

export interface NextPrayer {
  name: Exclude<PrayerName, "sunrise">;
  label: string;
  time: string;
  date: Date;
  scheduleDate: string;
}

/**
 * The next congregation-facing event for a prayer. Between Adhan and Iqamah,
 * the prayer remains the next prayer while the Iqamah becomes the countdown
 * target. This keeps the same state consistent across web, mobile, and widgets.
 */
export interface NextPrayerFocus extends NextPrayer {
  kind: "adhan" | "iqamah";
  adhanTime: string;
  adhanDate: Date;
  iqamahTime?: string;
  iqamahDate?: Date;
}

export interface PrayerScheduleState {
  scheduleDate: string;
  prayers: Array<{
    name: PrayerName;
    label: string;
    time: string;
    date: Date;
  }>;
  unavailableReason?: "missing-prayer-time" | "malformed-prayer-time" | "non-sequential-prayer-time";
}

export interface HijriDate {
  day: number;
  month: string;
  year: number;
  adjustmentDays: number;
  isWhiteDay: boolean;
  label: string;
}

export interface UpcomingWhiteDay {
  gregorianDate: string;
  hijriDate: HijriDate;
}

/** Returns the local Hijri calendar date with the approved masjid adjustment applied. */
export function getHijriDate(date = new Date(), adjustmentDays = 0, timeZone = masjidTimeZone): HijriDate | null {
  if (!Number.isInteger(adjustmentDays) || adjustmentDays < -2 || adjustmentDays > 2) return null;
  const adjustedDate = new Date(date.getTime() + adjustmentDays * 86_400_000);
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      timeZone,
      day: "numeric",
      month: "long",
      year: "numeric"
    }).formatToParts(adjustedDate);
    const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
    const day = Number(read("day"));
    const year = Number(read("year"));
    const month = read("month")?.trim();
    if (!Number.isFinite(day) || !Number.isFinite(year) || !month) return null;
    return {
      day,
      month,
      year,
      adjustmentDays,
      isWhiteDay: day >= 13 && day <= 15,
      label: `${day} ${month} ${year} AH`
    };
  } catch {
    return null;
  }
}

/** Resolves the management-controlled Hijri date, including an exact date override. */
export function resolveHijriDate(
  date = new Date(),
  settings: HijriSettings,
  timeZone = masjidTimeZone
): HijriDate | null {
  const gregorianDate = dateStringInTimeZone(date, timeZone);
  const override = settings.overrides?.find((entry) => entry.gregorianDate === gregorianDate);
  if (override) {
    if (
      !Number.isInteger(override.day) ||
      override.day < 1 ||
      override.day > 30 ||
      !Number.isInteger(override.year) ||
      !override.month.trim()
    ) {
      return null;
    }
    return {
      day: override.day,
      month: override.month.trim(),
      year: override.year,
      adjustmentDays: settings.adjustmentDays,
      isWhiteDay: override.day >= 13 && override.day <= 15,
      label: override.label?.trim() || `${override.day} ${override.month.trim()} ${override.year} AH`
    };
  }
  return getHijriDate(date, settings.adjustmentDays, timeZone);
}

export function getUpcomingWhiteDays(
  date = new Date(),
  settings: HijriSettings,
  timeZone = masjidTimeZone,
  searchDays = 40
): UpcomingWhiteDay[] {
  const results: UpcomingWhiteDay[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset <= searchDays && results.length < 3; offset += 1) {
    const candidate = new Date(date.getTime() + offset * 86_400_000);
    const gregorianDate = dateStringInTimeZone(candidate, timeZone);
    if (seen.has(gregorianDate)) continue;
    seen.add(gregorianDate);
    const hijriDate = resolveHijriDate(candidate, settings, timeZone);
    if (hijriDate?.isWhiteDay) results.push({ gregorianDate, hijriDate });
  }
  return results;
}

/** Upcoming White Days in the current Sunday–Saturday local calendar week. */
export function getWhiteDaysRemainingThisWeek(
  date = new Date(),
  settings: HijriSettings,
  timeZone = masjidTimeZone
): UpcomingWhiteDay[] {
  const today = dateStringInTimeZone(date, timeZone);
  const todayUtc = new Date(`${today}T12:00:00Z`);
  const daysUntilSaturday = 6 - todayUtc.getUTCDay();
  const endOfWeek = new Date(todayUtc.getTime() + daysUntilSaturday * 86_400_000)
    .toISOString().slice(0, 10);
  return getUpcomingWhiteDays(date, settings, timeZone, 7)
    .filter(({ gregorianDate }) => gregorianDate >= today && gregorianDate <= endOfWeek);
}

/**
 * Parses and validates the complete daily schedule once so every consumer uses
 * the same absolute instants. A malformed or incomplete schedule is rejected
 * instead of silently turning a missing prayer into midnight.
 */
export function getPrayerScheduleState(
  prayer: PrayerTime,
  now = new Date(),
  timeZone = masjidTimeZone
): PrayerScheduleState {
  const today = dateStringInTimeZone(now, timeZone);
  const scheduleDate = prayer.date >= today ? prayer.date : today;
  const entries: PrayerScheduleState["prayers"] = [];

  for (const name of prayerOrder) {
    const time = prayer[name]?.trim();
    if (!time) {
      return { scheduleDate, prayers: [], unavailableReason: "missing-prayer-time" };
    }
    const date = timeToDate(scheduleDate, time, timeZone);
    if (!date) {
      return { scheduleDate, prayers: [], unavailableReason: "malformed-prayer-time" };
    }
    entries.push({ name, label: prayerLabels[name], time, date });
  }

  if (entries.some((entry, index) => index > 0 && entry.date <= entries[index - 1].date)) {
    return { scheduleDate, prayers: [], unavailableReason: "non-sequential-prayer-time" };
  }

  return { scheduleDate, prayers: entries };
}

/**
 * Finds the next congregational prayer using the masjid's wall-clock schedule.
 * Sunrise stays in the daily table, but is never returned as a next prayer.
 */
export function getNextPrayer(prayer: PrayerTime, now = new Date(), timeZone = masjidTimeZone): NextPrayer | null {
  const schedule = getPrayerScheduleState(prayer, now, timeZone);
  if (schedule.unavailableReason) return null;

  const upcoming = schedule.prayers
    .filter((entry): entry is typeof entry & { name: Exclude<PrayerName, "sunrise"> } => entry.name !== "sunrise")
    .map((entry) => ({ ...entry, scheduleDate: schedule.scheduleDate }))
    .find((item) => item.date.getTime() > now.getTime());

  if (upcoming) return upcoming;

  const nextScheduleDate = addDays(schedule.scheduleDate, 1);
  const nextFajrDate = timeToDate(nextScheduleDate, prayer.fajr, timeZone);
  if (!nextFajrDate) return null;
  return {
    name: "fajr",
    label: "Fajr",
    time: prayer.fajr,
    date: nextFajrDate,
    scheduleDate: nextScheduleDate
  };
}

/**
 * Finds the next prayer-facing event, promoting a pending Iqamah after its
 * Adhan has begun. The prayer name remains stable so consumers never jump to
 * the following Salah while the congregation is still waiting to stand.
 */
export function getNextPrayerFocus(
  prayer: PrayerTime,
  iqamah: IqamahTime,
  now = new Date(),
  timeZone = masjidTimeZone
): NextPrayerFocus | null {
  const schedule = getPrayerScheduleState(prayer, now, timeZone);
  if (schedule.unavailableReason) return null;

  const buildFocus = (
    entry: { name: Exclude<PrayerName, "sunrise">; label: string; time: string; date: Date },
    scheduleDate: string
  ): NextPrayerFocus | null => {
    const iqamahTime = getIqamahForPrayer(entry.name, iqamah);
    const iqamahDate = iqamahTime ? timeToDate(scheduleDate, iqamahTime, timeZone) : null;
    const validIqamah = Boolean(iqamahDate && iqamahDate.getTime() > entry.date.getTime());
    if (now.getTime() < entry.date.getTime()) {
      return {
        name: entry.name,
        label: entry.label,
        time: entry.time,
        date: entry.date,
        scheduleDate,
        kind: "adhan",
        adhanTime: entry.time,
        adhanDate: entry.date,
        ...(iqamahTime && validIqamah ? { iqamahTime, iqamahDate: iqamahDate! } : {})
      };
    }
    if (validIqamah && now.getTime() < iqamahDate!.getTime()) {
      return {
        name: entry.name,
        label: entry.label,
        time: iqamahTime!,
        date: iqamahDate!,
        scheduleDate,
        kind: "iqamah",
        adhanTime: entry.time,
        adhanDate: entry.date,
        iqamahTime: iqamahTime!,
        iqamahDate: iqamahDate!
      };
    }
    return null;
  };

  const today = schedule.prayers
    .filter((entry): entry is typeof entry & { name: Exclude<PrayerName, "sunrise"> } => entry.name !== "sunrise")
    .map((entry) => buildFocus(entry, schedule.scheduleDate))
    .find((entry): entry is NextPrayerFocus => Boolean(entry));
  if (today) return today;

  const nextScheduleDate = addDays(schedule.scheduleDate, 1);
  const nextFajrDate = timeToDate(nextScheduleDate, prayer.fajr, timeZone);
  if (!nextFajrDate) return null;
  const fajrEntry = {
    name: "fajr" as const,
    label: "Fajr",
    time: prayer.fajr,
    date: nextFajrDate
  };
  return buildFocus(fajrEntry, nextScheduleDate) ?? {
    ...fajrEntry,
    scheduleDate: nextScheduleDate,
    kind: "adhan",
    adhanTime: fajrEntry.time,
    adhanDate: fajrEntry.date
  };
}

export function formatCountdown(target: Date, now = new Date()): string {
  const diff = Math.max(0, target.getTime() - now.getTime());
  if (diff > 0 && diff < 60_000) return "<1m";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

/**
 * The restrained public Jumu'ah treatment follows the masjid's canonical
 * Calgary Maghrib, rather than a fixed weekday clock or the device timezone.
 */
export function isJumuahWindow(prayer: PrayerTime, now = new Date(), timeZone = masjidTimeZone) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
  if (weekday !== "Thu" && weekday !== "Fri") return false;
  const serviceDate = dateStringInTimeZone(now, timeZone);
  const maghrib = timeToDate(serviceDate, prayer.maghrib, timeZone);
  if (!maghrib) return false;
  return weekday === "Thu" ? now.getTime() >= maghrib.getTime() : now.getTime() < maghrib.getTime();
}
