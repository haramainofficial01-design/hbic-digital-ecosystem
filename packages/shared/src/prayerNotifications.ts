import { addDays, dateStringInTimeZone, masjidTimeZone } from "./prayer";
import type { PrayerName } from "./types";
import type { WidgetPrayerEntry, WidgetPrayerSnapshot } from "./widgetSnapshot";

export type AdhanPrayerName = Exclude<PrayerName, "sunrise">;
export type PrayerAlertSound = "adhan" | "notification" | "silent";
export type PrayerReminderMinutes = 0 | 5 | 10 | 15;

export interface PrayerAlertPreferences {
  enabled: boolean;
  prayers: Record<AdhanPrayerName, boolean>;
  sound: PrayerAlertSound;
  reminderMinutes: PrayerReminderMinutes;
  jumuahReminders: boolean;
}

export interface PlannedPrayerNotification {
  identifier: string;
  kind: "adhan" | "pre-prayer" | "jumuah";
  prayer: AdhanPrayerName | "jumuah";
  prayerDate: string;
  fireDate: string;
  title: string;
  body: string;
  sound: PrayerAlertSound;
  scheduleRevision: string;
  serviceDate: string;
}

export type PrayerNotificationPlanStatus =
  | "ready"
  | "disabled"
  | "unavailable"
  | "stale"
  | "invalid";

export interface PrayerNotificationPlan {
  status: PrayerNotificationPlanStatus;
  preserveExisting: boolean;
  scheduleRevision: string;
  serviceDate: string;
  fingerprint: string;
  notifications: PlannedPrayerNotification[];
  reason?: string;
}

export interface PrayerNotificationScheduleDiff {
  cancel: string[];
  schedule: PlannedPrayerNotification[];
  unchanged: boolean;
}

export const prayerNotificationOwner = "masjid-bilal-prayer-scheduler-v1";
export const prayerNotificationIdentifierPrefix = "prayer-";

export const defaultPrayerAlertPreferences: PrayerAlertPreferences = {
  enabled: false,
  prayers: {
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true
  },
  sound: "notification",
  reminderMinutes: 0,
  jumuahReminders: false
};

const prayerLabels: Record<AdhanPrayerName, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha"
};

function normalizePreferences(preferences: PrayerAlertPreferences): PrayerAlertPreferences {
  return {
    ...defaultPrayerAlertPreferences,
    ...preferences,
    prayers: {
      ...defaultPrayerAlertPreferences.prayers,
      ...(preferences.prayers ?? {})
    }
  };
}

function preferenceFingerprint(preferences: PrayerAlertPreferences) {
  const normalized = normalizePreferences(preferences);
  return JSON.stringify({
    enabled: normalized.enabled,
    prayers: normalized.prayers,
    sound: normalized.sound,
    reminderMinutes: normalized.reminderMinutes,
    jumuahReminders: normalized.jumuahReminders
  });
}

function invalidPlan(
  snapshot: WidgetPrayerSnapshot,
  preferences: PrayerAlertPreferences,
  status: Extract<PrayerNotificationPlanStatus, "unavailable" | "stale" | "invalid">,
  reason: string
): PrayerNotificationPlan {
  return {
    status,
    preserveExisting: true,
    scheduleRevision: snapshot.scheduleRevision,
    serviceDate: snapshot.serviceDate,
    fingerprint: `${snapshot.scheduleRevision}:${preferenceFingerprint(preferences)}`,
    notifications: [],
    reason
  };
}

function adhanNotification(
  entry: WidgetPrayerEntry,
  prayer: AdhanPrayerName,
  prayerDate: string,
  snapshot: WidgetPrayerSnapshot,
  preferences: PrayerAlertPreferences
): PlannedPrayerNotification {
  const iqamahText = entry.iqamah ? ` Iqamah is at ${entry.iqamah}.` : "";
  return {
    identifier: `${prayerNotificationIdentifierPrefix}${prayer}-${prayerDate}`,
    kind: "adhan",
    prayer,
    prayerDate,
    fireDate: entry.adhanDate,
    title: prayerLabels[prayer],
    body: `It is time for ${prayerLabels[prayer]} at Masjid Bilal.${iqamahText}`,
    sound: preferences.sound,
    scheduleRevision: snapshot.scheduleRevision,
    serviceDate: snapshot.serviceDate
  };
}

function prePrayerNotification(
  entry: WidgetPrayerEntry,
  prayer: AdhanPrayerName,
  prayerDate: string,
  snapshot: WidgetPrayerSnapshot,
  preferences: PrayerAlertPreferences
): PlannedPrayerNotification {
  const minutes = preferences.reminderMinutes;
  return {
    identifier: `${prayerNotificationIdentifierPrefix}${prayer}-${prayerDate}-pre-${minutes}`,
    kind: "pre-prayer",
    prayer,
    prayerDate,
    fireDate: new Date(Date.parse(entry.adhanDate) - minutes * 60_000).toISOString(),
    title: `${prayerLabels[prayer]} in ${minutes} minutes`,
    body: `${prayerLabels[prayer]} at Masjid Bilal begins at ${entry.adhan}.`,
    sound: "notification",
    scheduleRevision: snapshot.scheduleRevision,
    serviceDate: snapshot.serviceDate
  };
}

function jumuahNotification(
  snapshot: WidgetPrayerSnapshot,
  preferences: PrayerAlertPreferences
): PlannedPrayerNotification | null {
  const session = snapshot.jumuahState.sessions[0];
  const fireAt = Date.parse(session?.khutbahDate ?? "");
  if (!session || !Number.isFinite(fireAt)) return null;
  return {
    identifier: `${prayerNotificationIdentifierPrefix}jumuah-${snapshot.jumuahState.serviceDate}`,
    kind: "jumuah",
    prayer: "jumuah",
    prayerDate: snapshot.jumuahState.serviceDate,
    fireDate: new Date(fireAt).toISOString(),
    title: "Jumu'ah at Masjid Bilal",
    body: `${session.label} khutbah begins at ${session.khutbah}.`,
    sound: "notification",
    scheduleRevision: snapshot.scheduleRevision,
    serviceDate: snapshot.serviceDate
  };
}

/**
 * Creates a bounded, deterministic plan from canonical absolute prayer instants.
 * A cached/stale or mismatched snapshot never replaces an already valid OS schedule.
 */
export function createPrayerNotificationPlan(
  snapshot: WidgetPrayerSnapshot,
  preferencesInput: PrayerAlertPreferences,
  now = new Date()
): PrayerNotificationPlan {
  const preferences = normalizePreferences(preferencesInput);
  const fingerprint = `${snapshot.scheduleRevision}:${preferenceFingerprint(preferences)}`;

  if (!preferences.enabled && !preferences.jumuahReminders) {
    return {
      status: "disabled",
      preserveExisting: false,
      scheduleRevision: snapshot.scheduleRevision,
      serviceDate: snapshot.serviceDate,
      fingerprint,
      notifications: []
    };
  }

  if (
    snapshot.schemaVersion !== 2 ||
    (snapshot.masjidTimeZoneIdentifier || snapshot.timezone) !== masjidTimeZone ||
    !snapshot.scheduleRevision.trim() ||
    !snapshot.serviceDate.match(/^\d{4}-\d{2}-\d{2}$/)
  ) {
    return invalidPlan(snapshot, preferences, "invalid", "The canonical prayer snapshot contract is invalid.");
  }

  if (snapshot.availability !== "available" || !snapshot.prayers.length) {
    return invalidPlan(snapshot, preferences, "unavailable", "The canonical prayer schedule is unavailable.");
  }

  const currentServiceDate = dateStringInTimeZone(now, masjidTimeZone);
  const expiresAt = Date.parse(snapshot.expiresAt);
  if (
    snapshot.stale ||
    snapshot.state !== "fresh" ||
    snapshot.serviceDate !== currentServiceDate ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= now.getTime()
  ) {
    return invalidPlan(snapshot, preferences, "stale", "The snapshot is not fresh for the current Calgary service date.");
  }

  const nextServiceDate = addDays(snapshot.serviceDate, 1);
  const latestAllowed = now.getTime() + 7 * 86_400_000;
  const notifications = new Map<string, PlannedPrayerNotification>();

  const append = (entry: WidgetPrayerEntry, prayer: AdhanPrayerName, expectedDate: string) => {
    if (!preferences.prayers[prayer]) return;
    const fireAt = Date.parse(entry.adhanDate);
    if (!Number.isFinite(fireAt) || fireAt <= now.getTime() || fireAt > latestAllowed) return;
    const prayerDate = dateStringInTimeZone(new Date(fireAt), masjidTimeZone);
    if (prayerDate !== expectedDate) return;

    const adhan = adhanNotification(entry, prayer, prayerDate, snapshot, preferences);
    notifications.set(adhan.identifier, adhan);

    if (preferences.reminderMinutes > 0) {
      const reminder = prePrayerNotification(entry, prayer, prayerDate, snapshot, preferences);
      if (Date.parse(reminder.fireDate) > now.getTime()) notifications.set(reminder.identifier, reminder);
    }
  };

  if (preferences.enabled) {
    snapshot.prayers.forEach((entry) => {
      if (entry.key === "sunrise") return;
      append(entry, entry.key, snapshot.serviceDate);
    });

    if (snapshot.tomorrowFajrDate && preferences.prayers.fajr) {
      const todayFajr = snapshot.prayers.find((entry) => entry.key === "fajr");
      if (todayFajr) {
        append(
          { ...todayFajr, adhanDate: snapshot.tomorrowFajrDate,
            iqamah: snapshot.tomorrowFajrIqamah ?? todayFajr.iqamah,
            iqamahDate: snapshot.nextPrayerKey === "fajr" ? snapshot.nextIqamahDate : undefined },
          "fajr",
          nextServiceDate
        );
      }
    }
  }

  if (preferences.jumuahReminders && snapshot.jumuahState.enabled) {
    const jumuah = jumuahNotification(snapshot, preferences);
    const fireAt = Date.parse(jumuah?.fireDate ?? "");
    if (
      jumuah &&
      snapshot.jumuahState.serviceDate.match(/^\d{4}-\d{2}-\d{2}$/) &&
      fireAt > now.getTime() &&
      fireAt <= latestAllowed &&
      dateStringInTimeZone(new Date(fireAt), masjidTimeZone) === snapshot.jumuahState.serviceDate
    ) {
      notifications.set(jumuah.identifier, jumuah);
    }
  }

  return {
    status: "ready",
    preserveExisting: false,
    scheduleRevision: snapshot.scheduleRevision,
    serviceDate: snapshot.serviceDate,
    fingerprint,
    notifications: [...notifications.values()].sort((left, right) => Date.parse(left.fireDate) - Date.parse(right.fireDate))
  };
}

export function diffPrayerNotificationSchedule(
  existingOwnedIdentifiers: string[],
  plan: PrayerNotificationPlan,
  previousFingerprint?: string
): PrayerNotificationScheduleDiff {
  if (plan.preserveExisting) return { cancel: [], schedule: [], unchanged: true };

  const existing = [...new Set(existingOwnedIdentifiers)].sort();
  const desired = [...new Set(plan.notifications.map((notification) => notification.identifier))].sort();
  const sameIdentifiers = existing.length === desired.length && existing.every((identifier, index) => identifier === desired[index]);

  if (previousFingerprint === plan.fingerprint && sameIdentifiers) {
    return { cancel: [], schedule: [], unchanged: true };
  }

  return {
    cancel: existing,
    schedule: plan.notifications,
    unchanged: false
  };
}
