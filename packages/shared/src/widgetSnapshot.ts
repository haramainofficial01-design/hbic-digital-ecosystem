import type { HbicContent } from "./content";
import { getEffectiveJumuahDoorNotice } from "./jumuah";
import {
  addDays,
  dateStringInTimeZone,
  getIqamahForPrayer,
  getIqamahForPrayerDate,
  getNextPrayerFocus,
  getPrayerScheduleState,
  getUpcomingWhiteDays,
  masjidTimeZone,
  resolvedMasjidTimeZone,
  resolveHijriDate,
  timeToDate
} from "./prayer";
import type { PrayerName } from "./types";

export interface WidgetPrayerEntry {
  key: PrayerName;
  name: string;
  adhan: string;
  adhanDate: string;
  iqamah?: string;
  iqamahDate?: string;
}

export interface WidgetJumuahEntry {
  label: string;
  khutbah: string;
  khutbahDate?: string;
  iqamah: string;
  iqamahDate?: string;
}

export interface WidgetHijriState {
  day: number;
  month: string;
  year: number;
  label: string;
  gregorianDate: string;
  adjustmentDays: number;
  isWhiteDay: boolean;
  upcomingWhiteDays: Array<{
    gregorianDate: string;
    label: string;
  }>;
}

export interface WidgetJumuahState {
  enabled: boolean;
  serviceDate: string;
  firstDoorsCloseTime?: string;
  title?: string;
  notice?: string;
  titleUr?: string;
  noticeUr?: string;
  parkingNotice?: string;
  capacityNotice?: string;
  sessions: WidgetJumuahEntry[];
}

export interface WidgetEventState {
  id: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  summary: string;
  category: string;
}

export interface WidgetAnnouncementState {
  id: string;
  title: string;
  body: string;
  priority: "High" | "Urgent";
  destination?: string;
}

export interface WidgetPrayerSnapshot {
  schemaVersion: 2;
  masjidID: "masjid-bilal-calgary";
  masjidName: string;
  scheduleRevision: string;
  masjidTimeZoneIdentifier: string;
  serviceDate: string;
  timezone: string;
  scheduleDate: string;
  currentPrayerKey?: PrayerName;
  currentPrayer?: WidgetPrayerEntry;
  nextPrayerKey: PrayerName | "";
  nextPrayerName: string;
  nextPrayerTime: string;
  nextPrayerDate: string;
  tomorrowFajrDate?: string;
  tomorrowFajrIqamah?: string;
  tomorrowFajrIqamahDate?: string;
  nextIqamah?: string;
  nextIqamahDate?: string;
  prayers: WidgetPrayerEntry[];
  jumuah: WidgetJumuahEntry[];
  jumuahState: WidgetJumuahState;
  generatedAt: string;
  sourceUpdatedAt: string;
  expiresAt: string;
  state: "fresh" | "cached";
  availability: "available" | "unavailable";
  stale: boolean;
  staleReason?: "cached" | "expired" | "source-unavailable" | "missing-schedule" | "malformed-schedule";
  upcomingEvent?: string;
  nextEvent?: WidgetEventState;
  importantAnnouncement?: WidgetAnnouncementState;
  hijri?: WidgetHijriState;
  hijriDate?: string;
  isWhiteDay?: boolean;
}

interface SnapshotOptions {
  cached?: boolean;
  refreshedAt?: string;
}

export const dateInMasjidTimeZone = timeToDate;

function nextFridayDate(now: Date) {
  const today = dateStringInTimeZone(now, masjidTimeZone);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: resolvedMasjidTimeZone(now),
    weekday: "short"
  }).format(now);
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const daysUntilFriday = weekdayIndex < 0 ? 0 : (5 - weekdayIndex + 7) % 7;
  return addDays(today, daysUntilFriday);
}

function newestTimestamp(...values: Array<string | undefined>) {
  const valid = values
    .filter((value): value is string => Boolean(value && !Number.isNaN(Date.parse(value))))
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  return valid[0] ?? new Date(0).toISOString();
}

export function createWidgetPrayerSnapshot(
  content: HbicContent,
  now = new Date(),
  options: SnapshotOptions = {}
): WidgetPrayerSnapshot {
  const today = dateStringInTimeZone(now, masjidTimeZone);
  const schedule = getPrayerScheduleState(content.prayerTime, now, masjidTimeZone);
  const scheduleDate = schedule.scheduleDate;
  const prayers = schedule.prayers.map(({ name: key, label: name, time: adhan, date }) => {
    const iqamah = getIqamahForPrayer(key, content.iqamahTime);
    const iqamahDate = iqamah ? timeToDate(scheduleDate, iqamah) : null;
    return {
      key,
      name,
      adhan,
      adhanDate: date.toISOString(),
      ...(iqamah && iqamahDate
        ? {
            iqamah,
            iqamahDate: iqamahDate.toISOString()
          }
        : {})
    } satisfies WidgetPrayerEntry;
  });

  const nextPrayerState = getNextPrayerFocus(content.prayerTime, content.iqamahTime, now);
  const nextIqamahDateValue = nextPrayerState?.iqamahDate ?? null;
  const currentPrayer = [...prayers]
    .filter((entry) => entry.key !== "sunrise")
    .reverse()
    .find((entry) => Date.parse(entry.adhanDate) <= now.getTime());
  const isConfirmedCalendarDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = Date.parse(`${value}T12:00:00Z`);
    return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
  };
  const nextEvent = content.events
    .filter((event) =>
      event.status === "published" &&
      event.visible !== false &&
      isConfirmedCalendarDate(event.date) &&
      event.date >= today
    )
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const importantAnnouncement = content.announcements
    .filter((announcement) =>
      announcement.visible !== false &&
      announcement.archived !== true &&
      (announcement.urgent || announcement.priority === "High" || announcement.priority === "Urgent") &&
      (!announcement.expiresAt || Date.parse(announcement.expiresAt) > now.getTime()) &&
      (!announcement.publishedAt || Date.parse(announcement.publishedAt) <= now.getTime())
    )
    .sort((a, b) => {
      const priority = (value: typeof a) => value.urgent || value.priority === "Urgent" ? 2 : 1;
      return priority(b) - priority(a) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    })[0];
  const generatedAt = now.toISOString();
  const jumuahServiceDate = nextFridayDate(now);
  const jumuah = [
    {
      label: "First Jumu'ah",
      khutbah: content.jumuahSchedule.firstKhutbahTime,
      iqamah: content.jumuahSchedule.firstIqamahTime
    },
    {
      label: "Second Jumu'ah",
      khutbah: content.jumuahSchedule.secondKhutbahTime,
      iqamah: content.jumuahSchedule.secondIqamahTime
    }
  ]
    .filter((entry) => entry.khutbah.trim() && entry.khutbah !== "Unavailable")
    .map((entry) => {
      const khutbahDate = timeToDate(jumuahServiceDate, entry.khutbah);
      const iqamahDate = timeToDate(jumuahServiceDate, entry.iqamah);
      return {
        ...entry,
        ...(khutbahDate ? { khutbahDate: khutbahDate.toISOString() } : {}),
        ...(iqamahDate ? { iqamahDate: iqamahDate.toISOString() } : {})
      } satisfies WidgetJumuahEntry;
    });
  const hijri = content.featureFlags.hijriDateEnabled
    ? resolveHijriDate(now, content.hijriSettings)
    : null;
  const upcomingWhiteDays = content.featureFlags.whiteDaysEnabled
    ? getUpcomingWhiteDays(now, content.hijriSettings)
    : [];
  const sourceUpdatedAt = newestTimestamp(
    options.refreshedAt,
    content.prayerTime.lastUpdated,
    content.prayerTime.importedAt,
    content.iqamahTime.updatedAt,
    content.jumuahSchedule.updatedAt,
    content.updatedAt
  );
  const tomorrowFajr = timeToDate(addDays(scheduleDate, 1), content.prayerTime.fajr);
  const tomorrowFajrIqamah = tomorrowFajr
    ? getIqamahForPrayerDate("fajr", content.iqamahTime, addDays(scheduleDate, 1), tomorrowFajr, now)
    : undefined;
  const expiresAt = timeToDate(addDays(scheduleDate, 1), "12:00 AM");
  const availability = nextPrayerState && prayers.length ? "available" : "unavailable";
  const stale = options.cached === true || availability === "unavailable";
  const staleReason = options.cached
    ? "cached"
    : schedule.unavailableReason === "missing-prayer-time"
      ? "missing-schedule"
      : schedule.unavailableReason
        ? "malformed-schedule"
        : undefined;
  const scheduleRevision = [
    content.version,
    content.prayerTime.date,
    content.iqamahTime.date,
    sourceUpdatedAt
  ].join(":");
  const hijriState = hijri
    ? {
        ...hijri,
        gregorianDate: today,
        isWhiteDay: content.featureFlags.whiteDaysEnabled && hijri.isWhiteDay,
        upcomingWhiteDays: upcomingWhiteDays.map((entry) => ({
          gregorianDate: entry.gregorianDate,
          label: entry.hijriDate.label
        }))
      } satisfies WidgetHijriState
    : undefined;
  const doorNotice = getEffectiveJumuahDoorNotice(
    content.jumuahSchedule,
    timeToDate(jumuahServiceDate, "12:00 PM") ?? now,
    content.featureFlags.jumuahDoorNoticeEnabled
  );
  const jumuahState: WidgetJumuahState = {
    enabled: jumuah.length > 0,
    serviceDate: jumuahServiceDate,
    firstDoorsCloseTime: doorNotice?.time,
    title: doorNotice?.title,
    notice: doorNotice?.body,
    titleUr: doorNotice?.titleUr,
    noticeUr: doorNotice?.bodyUr,
    parkingNotice: doorNotice?.parkingNotice,
    capacityNotice: doorNotice?.capacityNotice,
    sessions: jumuah
  };

  return {
    schemaVersion: 2,
    masjidID: "masjid-bilal-calgary",
    masjidName: content.settings.shortName || content.settings.masjidName || "Masjid Bilal",
    scheduleRevision,
    masjidTimeZoneIdentifier: masjidTimeZone,
    serviceDate: scheduleDate,
    timezone: masjidTimeZone,
    scheduleDate,
    currentPrayerKey: currentPrayer?.key,
    currentPrayer,
    nextPrayerKey: nextPrayerState?.name ?? "",
    nextPrayerName: nextPrayerState?.label ?? "Prayer times",
    nextPrayerTime: nextPrayerState?.time ?? "Unavailable",
    nextPrayerDate: nextPrayerState?.date.toISOString() ?? "",
    tomorrowFajrDate: tomorrowFajr?.toISOString(),
    tomorrowFajrIqamah,
    tomorrowFajrIqamahDate: tomorrowFajrIqamah ? timeToDate(addDays(scheduleDate, 1), tomorrowFajrIqamah)?.toISOString() : undefined,
    nextIqamah: nextPrayerState?.iqamahTime,
    nextIqamahDate: nextIqamahDateValue?.toISOString(),
    prayers,
    jumuah,
    jumuahState,
    generatedAt,
    sourceUpdatedAt,
    expiresAt: expiresAt?.toISOString() ?? "",
    state: options.cached ? "cached" : "fresh",
    availability,
    stale,
    staleReason,
    upcomingEvent: nextEvent?.title,
    nextEvent: nextEvent
      ? {
          id: nextEvent.id,
          title: nextEvent.title,
          date: nextEvent.date,
          startTime: nextEvent.startTime,
          location: nextEvent.location,
          summary: nextEvent.summary || nextEvent.description,
          category: nextEvent.category
        }
      : undefined,
    importantAnnouncement: importantAnnouncement
      ? {
          id: importantAnnouncement.id,
          title: importantAnnouncement.title,
          body: importantAnnouncement.body,
          priority: importantAnnouncement.urgent ? "Urgent" : "High",
          destination: importantAnnouncement.destination
        }
      : undefined,
    hijri: hijriState,
    hijriDate: hijriState?.label,
    isWhiteDay: hijriState?.isWhiteDay
  };
}

export const defaultWidgetPrayerSnapshot: WidgetPrayerSnapshot = {
  schemaVersion: 2,
  masjidID: "masjid-bilal-calgary",
  masjidName: "Masjid Bilal",
  scheduleRevision: "unavailable",
  masjidTimeZoneIdentifier: masjidTimeZone,
  serviceDate: "",
  timezone: masjidTimeZone,
  scheduleDate: "",
  nextPrayerKey: "",
  nextPrayerName: "Prayer times",
  nextPrayerTime: "Unavailable",
  nextPrayerDate: "",
  prayers: [],
  jumuah: [],
  jumuahState: {
    enabled: false,
    serviceDate: "",
    sessions: []
  },
  generatedAt: new Date(0).toISOString(),
  sourceUpdatedAt: new Date(0).toISOString(),
  expiresAt: "",
  state: "cached",
  availability: "unavailable",
  stale: true,
  staleReason: "missing-schedule"
};
