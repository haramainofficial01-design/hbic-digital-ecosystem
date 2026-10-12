import {
  createPrayerNotificationPlan,
  defaultNotificationPreferences,
  defaultPrayerAlertPreferences,
  diffPrayerNotificationSchedule,
  isNotificationPermissionAuthorized,
  prayerNotificationIdentifierPrefix,
  prayerNotificationOwner,
  resolveNotificationDestination,
  resolveNotificationPermissionState,
  resolveNotificationRoute,
  type NotificationPreference,
  type PrayerAlertPreferences,
  type PrayerAlertSound,
  type WidgetPrayerSnapshot
} from "@hbic/shared";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

export const notificationChannels = {
  prayerAdhan: "prayer_adhan_v3",
  prayerStandard: "prayer_notifications_v1",
  prayerSilent: "prayer_silent_v1",
  quietReminders: "quiet_reminders_v1",
  community: "community_updates_v1"
} as const;

export const adhanAudioStatus = {
  available: true,
  fileName: "adhan_madinah_marwan_qassas_short.wav",
  status: "AVAILABLE · MADINAH ADHAN" as const,
  attribution: "Muhammad Marwan Qassas · Masjid an-Nabawi"
};

export interface NotificationSettings {
  schemaVersion: 2;
  remote: NotificationPreference;
  prayer: PrayerAlertPreferences;
}

type ReconciliationResult =
  | "scheduled"
  | "unchanged"
  | "disabled"
  | "permission-required"
  | "snapshot-preserved"
  | "error";

interface PrayerScheduleState {
  schemaVersion: 1;
  fingerprint?: string;
  scheduleRevision?: string;
  serviceDate?: string;
  scheduledIdentifiers: string[];
  scheduledCount: number;
  nextScheduledAt?: string;
  lastReconciledAt?: string;
  lastReconciliationResult?: ReconciliationResult;
  lastReconciliationError?: string;
  lastLocalTestAt?: string;
  lastRemoteNotificationAt?: string;
  lastRemoteNotificationType?: string;
}

export interface NotificationDiagnostics {
  permission: "authorized" | "provisional" | "denied" | "not-determined";
  canAskAgain: boolean;
  soundPermission: "enabled" | "disabled" | "unknown";
  remoteRegistration: "registered" | "not-registered";
  maskedExpoToken?: string;
  androidChannelId?: string;
  androidChannelSound?: "default" | "custom" | "muted" | "unavailable";
  androidChannelImportance?: number;
  scheduledPrayerAlerts: number;
  nextScheduledAlert?: string;
  scheduleRevision?: string;
  serviceDate?: string;
  lastScheduleReconciliation?: string;
  lastScheduleResult?: ReconciliationResult;
  lastLocalTest?: string;
  lastRemoteNotification?: string;
  adhanAudio: typeof adhanAudioStatus.status;
}

const preferenceFile = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}hbic-notification-preferences.json` : "";
const pushTokenFile = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}hbic-notification-token.txt` : "";
const installationFile = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}hbic-notification-installation.txt` : "";
const prayerScheduleFile = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}hbic-prayer-notification-schedule.json` : "";
const apiBase = (process.env.EXPO_PUBLIC_API_URL || "https://hbic.ca").replace(/\/$/, "");
let lastRegisteredSignature: string | null = null;
let registrationInFlight: Promise<string | null> | null = null;
let registrationInFlightSignature: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    const isSilent = data?.soundMode === "silent";
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      // Expo requires this to remain true for an Android heads-up presentation.
      // Silent Android alerts use a no-sound channel; iOS can disable sound here.
      shouldPlaySound: Platform.OS === "android" ? true : !isSilent,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.HIGH
    };
  }
});

function defaultSettings(): NotificationSettings {
  return {
    schemaVersion: 2,
    remote: { ...defaultNotificationPreferences },
    prayer: {
      ...defaultPrayerAlertPreferences,
      prayers: { ...defaultPrayerAlertPreferences.prayers }
    }
  };
}

function normalizePrayerPreferences(input?: Partial<PrayerAlertPreferences>): PrayerAlertPreferences {
  const reminder = input?.reminderMinutes;
  return {
    ...defaultPrayerAlertPreferences,
    ...input,
    sound: input?.sound === "adhan" && !adhanAudioStatus.available ? "notification" : input?.sound ?? defaultPrayerAlertPreferences.sound,
    reminderMinutes: reminder === 5 || reminder === 10 || reminder === 15 ? reminder : 0,
    prayers: {
      ...defaultPrayerAlertPreferences.prayers,
      ...(input?.prayers ?? {})
    }
  };
}

function permissionIsAuthorized(permission: Notifications.NotificationPermissionsStatus) {
  return isNotificationPermissionAuthorized({
    granted: permission.granted,
    status: permission.status,
    iosAuthorizationStatus: permission.ios?.status
  });
}

function permissionLabel(permission: Notifications.NotificationPermissionsStatus): NotificationDiagnostics["permission"] {
  return resolveNotificationPermissionState({
    granted: permission.granted,
    status: permission.status,
    iosAuthorizationStatus: permission.ios?.status
  });
}

async function fileExists(path: string) {
  if (!path) return false;
  return (await FileSystem.getInfoAsync(path)).exists;
}

async function readTextFile(path: string) {
  if (!path || !(await fileExists(path))) return "";
  return (await FileSystem.readAsStringAsync(path)).trim();
}

async function readScheduleState(): Promise<PrayerScheduleState> {
  const empty: PrayerScheduleState = {
    schemaVersion: 1,
    scheduledIdentifiers: [],
    scheduledCount: 0
  };
  if (!prayerScheduleFile) return empty;
  try {
    if (!(await fileExists(prayerScheduleFile))) return empty;
    return { ...empty, ...(JSON.parse(await FileSystem.readAsStringAsync(prayerScheduleFile)) as Partial<PrayerScheduleState>) };
  } catch {
    return empty;
  }
}

async function writeScheduleState(patch: Partial<PrayerScheduleState>) {
  if (!prayerScheduleFile) return;
  const current = await readScheduleState();
  await FileSystem.writeAsStringAsync(prayerScheduleFile, JSON.stringify({ ...current, ...patch, schemaVersion: 1 }, null, 2));
}

async function installationId() {
  const existing = await readTextFile(installationFile);
  if (existing) return existing;
  const generated = `install-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  if (installationFile) await FileSystem.writeAsStringAsync(installationFile, generated);
  return generated;
}

function maskToken(token: string) {
  if (token.length <= 18) return "registered";
  return `${token.slice(0, 11)}…${token.slice(-6)}`;
}

export async function ensureNotificationChannelsAsync() {
  if (Platform.OS !== "android") return;

  await Promise.all([
    Notifications.setNotificationChannelAsync(notificationChannels.community, {
      name: "Community updates",
      description: "Announcements, events, cancellations, and important Masjid Bilal updates.",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 180],
      lightColor: "#087B83",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
    }),
    Notifications.setNotificationChannelAsync(notificationChannels.prayerStandard, {
      name: "Prayer alerts",
      description: "Prayer-time alerts using the standard notification sound.",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 220, 100, 220],
      lightColor: "#E7C66B",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
    }),
    Notifications.setNotificationChannelAsync(notificationChannels.prayerSilent, {
      name: "Silent prayer alerts",
      description: "Visible prayer-time alerts without notification audio.",
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      vibrationPattern: null,
      lightColor: "#E7C66B",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
    }),
    Notifications.setNotificationChannelAsync(notificationChannels.quietReminders, {
      name: "Prayer reminders",
      description: "Optional reminders shortly before prayer.",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      vibrationPattern: [0, 140],
      lightColor: "#087B83",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
    })
  ]);

  if (adhanAudioStatus.available && adhanAudioStatus.fileName) {
    await Notifications.setNotificationChannelAsync(notificationChannels.prayerAdhan, {
      name: "Adhan prayer alerts",
      description: "Prayer-time alerts using the approved short Adhan excerpt.",
      importance: Notifications.AndroidImportance.HIGH,
      sound: adhanAudioStatus.fileName,
      vibrationPattern: [0, 220, 100, 220],
      lightColor: "#E7C66B",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
    });
  }
}

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  const defaults = defaultSettings();
  if (!preferenceFile) return defaults;
  try {
    if (!(await fileExists(preferenceFile))) return defaults;
    const saved = JSON.parse(await FileSystem.readAsStringAsync(preferenceFile)) as Partial<NotificationSettings> & Partial<NotificationPreference>;
    if (saved.schemaVersion === 2 && saved.remote && saved.prayer) {
      return {
        schemaVersion: 2,
        remote: { ...defaultNotificationPreferences, ...saved.remote },
        prayer: normalizePrayerPreferences(saved.prayer)
      };
    }

    // Legacy preference files contained only remote category booleans. Prayer
    // alerts remain off until the user explicitly completes the new consent flow.
    return {
      schemaVersion: 2,
      remote: { ...defaultNotificationPreferences, ...(saved as Partial<NotificationPreference>) },
      prayer: normalizePrayerPreferences()
    };
  } catch {
    return defaults;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings) {
  if (!preferenceFile) return;
  const normalized: NotificationSettings = {
    schemaVersion: 2,
    remote: { ...defaultNotificationPreferences, ...settings.remote },
    prayer: normalizePrayerPreferences(settings.prayer)
  };
  await FileSystem.writeAsStringAsync(preferenceFile, JSON.stringify(normalized, null, 2));
}

export async function loadNotificationPreferences(): Promise<NotificationPreference> {
  return (await loadNotificationSettings()).remote;
}

export async function saveNotificationPreferences(preferences: NotificationPreference) {
  const settings = await loadNotificationSettings();
  await saveNotificationSettings({ ...settings, remote: preferences });
}

export async function registerForPushNotificationsAsync({
  requestPermission = true,
  preferences
}: {
  requestPermission?: boolean;
  preferences?: NotificationPreference;
} = {}) {
  await ensureNotificationChannelsAsync();

  const existing = await Notifications.getPermissionsAsync();
  let permission = existing;
  if (!permissionIsAuthorized(permission) && requestPermission && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true }
    });
  }
  if (!permissionIsAuthorized(permission)) return null;

  const projectId = Constants.easConfig?.projectId ?? (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const resolvedPreferences = { ...defaultNotificationPreferences, ...(preferences ?? {}) };
  const prayer = (await loadNotificationSettings()).prayer;
  const prayerChangePreferences = { enabled: prayer.enabled, prayers: prayer.prayers };
  const previousToken = await readTextFile(pushTokenFile);
  const resolvedInstallationId = await installationId();
  const signature = `${token.data}:${JSON.stringify(resolvedPreferences)}:${JSON.stringify(prayerChangePreferences)}`;
  if (lastRegisteredSignature === signature) return token.data;
  if (registrationInFlight && registrationInFlightSignature === signature) return registrationInFlight;

  const registration = (async () => {
    const response = await fetch(`${apiBase}/api/notifications/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token.data,
        previousToken: previousToken && previousToken !== token.data ? previousToken : undefined,
        installationId: resolvedInstallationId,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown",
        appVersion: Constants.expoConfig?.version,
        environment: __DEV__ ? "development" : "production",
        preferences: resolvedPreferences,
        prayerChangePreferences
      })
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(result?.error || "Unable to finish notification setup.");
    }
    if (pushTokenFile) await FileSystem.writeAsStringAsync(pushTokenFile, token.data);
    lastRegisteredSignature = signature;
    return token.data;
  })();

  registrationInFlight = registration;
  registrationInFlightSignature = signature;
  try {
    return await registration;
  } finally {
    if (registrationInFlight === registration) {
      registrationInFlight = null;
      registrationInFlightSignature = null;
    }
  }
}

export async function hasStoredPushRegistrationAsync() {
  return Boolean(await readTextFile(pushTokenFile));
}

export async function removePushRegistrationAsync() {
  const token = await readTextFile(pushTokenFile);
  if (token) {
    const response = await fetch(`${apiBase}/api/notifications/register`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, installationId: await installationId() })
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(result?.error || "Unable to remove this device from notifications.");
    }
  }

  await Notifications.unregisterForNotificationsAsync();
  if (pushTokenFile && await fileExists(pushTokenFile)) {
    await FileSystem.deleteAsync(pushTokenFile, { idempotent: true });
  }
  lastRegisteredSignature = null;
}

export async function refreshPushRegistrationAsync(preferences?: NotificationPreference) {
  return registerForPushNotificationsAsync({ requestPermission: false, preferences });
}

export function getDefaultNotificationPreferences(): NotificationPreference {
  return defaultNotificationPreferences;
}

function channelForSound(sound: PrayerAlertSound, kind: "adhan" | "pre-prayer" | "jumuah") {
  if (kind === "pre-prayer" || kind === "jumuah") return notificationChannels.quietReminders;
  if (sound === "silent") return notificationChannels.prayerSilent;
  if (sound === "adhan" && adhanAudioStatus.available) return notificationChannels.prayerAdhan;
  return notificationChannels.prayerStandard;
}

function contentSound(sound: PrayerAlertSound, kind: "adhan" | "pre-prayer" | "jumuah") {
  if (kind === "pre-prayer" || kind === "jumuah") return "default";
  if (sound === "silent") return false;
  if (sound === "adhan" && adhanAudioStatus.available && adhanAudioStatus.fileName) return adhanAudioStatus.fileName;
  return "default";
}

export async function reconcilePrayerNotificationsAsync(snapshot: WidgetPrayerSnapshot, now = new Date()) {
  await ensureNotificationChannelsAsync();
  const settings = await loadNotificationSettings();
  const plan = createPrayerNotificationPlan(snapshot, settings.prayer, now);
  const state = await readScheduleState();

  if (plan.preserveExisting) {
    await writeScheduleState({
      scheduleRevision: plan.scheduleRevision,
      serviceDate: plan.serviceDate,
      lastReconciledAt: now.toISOString(),
      lastReconciliationResult: "snapshot-preserved",
      lastReconciliationError: plan.reason
    });
    return { plan, changed: false, scheduledCount: state.scheduledCount };
  }

  const permission = await Notifications.getPermissionsAsync();
  if (plan.status === "ready" && !permissionIsAuthorized(permission)) {
    await writeScheduleState({
      scheduleRevision: plan.scheduleRevision,
      serviceDate: plan.serviceDate,
      lastReconciledAt: now.toISOString(),
      lastReconciliationResult: "permission-required",
      lastReconciliationError: "Notification permission is not authorized."
    });
    return { plan, changed: false, scheduledCount: state.scheduledCount };
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ownedIdentifiers = scheduled
    .filter((request) => request.content.data?.owner === prayerNotificationOwner || request.identifier.startsWith(prayerNotificationIdentifierPrefix))
    .map((request) => request.identifier);
  const diff = diffPrayerNotificationSchedule(ownedIdentifiers, plan, state.fingerprint);

  if (diff.unchanged) {
    await writeScheduleState({
      fingerprint: plan.fingerprint,
      scheduleRevision: plan.scheduleRevision,
      serviceDate: plan.serviceDate,
      scheduledIdentifiers: ownedIdentifiers,
      scheduledCount: ownedIdentifiers.length,
      nextScheduledAt: plan.notifications[0]?.fireDate,
      lastReconciledAt: now.toISOString(),
      lastReconciliationResult: plan.status === "disabled" ? "disabled" : "unchanged",
      lastReconciliationError: undefined
    });
    return { plan, changed: false, scheduledCount: ownedIdentifiers.length };
  }

  try {
    await Promise.all(diff.cancel.map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)));
    for (const item of diff.schedule) {
      await Notifications.scheduleNotificationAsync({
        identifier: item.identifier,
        content: {
          title: item.title,
          body: item.body,
          sound: contentSound(item.sound, item.kind),
          priority: Notifications.AndroidNotificationPriority.HIGH,
          interruptionLevel: "active",
          categoryIdentifier: item.kind === "jumuah" ? "jumuah-reminder" : "prayer-alert",
          data: {
            owner: prayerNotificationOwner,
            route: "/prayer",
            prayer: item.prayer,
            type: item.kind === "jumuah" ? "jumuahReminder" : "prayerReminder",
            notificationKind: item.kind,
            scheduleRevision: item.scheduleRevision,
            serviceDate: item.serviceDate,
            soundMode: item.sound
          }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(item.fireDate),
          channelId: channelForSound(item.sound, item.kind)
        }
      });
    }

    await writeScheduleState({
      fingerprint: plan.fingerprint,
      scheduleRevision: plan.scheduleRevision,
      serviceDate: plan.serviceDate,
      scheduledIdentifiers: plan.notifications.map((item) => item.identifier),
      scheduledCount: plan.notifications.length,
      nextScheduledAt: plan.notifications[0]?.fireDate,
      lastReconciledAt: now.toISOString(),
      lastReconciliationResult: plan.status === "disabled" ? "disabled" : "scheduled",
      lastReconciliationError: undefined
    });
    return { plan, changed: true, scheduledCount: plan.notifications.length };
  } catch (error) {
    await writeScheduleState({
      lastReconciledAt: now.toISOString(),
      lastReconciliationResult: "error",
      lastReconciliationError: error instanceof Error ? error.message : "Unable to reconcile prayer alerts."
    });
    throw error;
  }
}

export async function schedulePrayerNotificationTestAsync(sound: PrayerAlertSound, seconds = 7) {
  await ensureNotificationChannelsAsync();
  const effectiveSound = sound === "adhan" && !adhanAudioStatus.available ? "notification" : sound;
  await Notifications.cancelScheduledNotificationAsync("prayer-test").catch(() => undefined);
  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: "prayer-test",
    content: {
      title: "Test Prayer Alert",
      body: "This is a test from Masjid Bilal. It is not a real prayer alert.",
      sound: contentSound(effectiveSound, "adhan"),
      priority: Notifications.AndroidNotificationPriority.HIGH,
      interruptionLevel: "active",
      data: {
        route: "/notifications",
        type: "prayerReminder",
        prayer: "fajr",
        soundMode: effectiveSound,
        test: true
      }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      channelId: channelForSound(effectiveSound, "adhan")
    }
  });
  await writeScheduleState({ lastLocalTestAt: new Date().toISOString() });
  return identifier;
}

export async function recordRemoteNotificationReceivedAsync(data?: Record<string, unknown>) {
  await writeScheduleState({
    lastRemoteNotificationAt: new Date().toISOString(),
    lastRemoteNotificationType: typeof data?.type === "string" ? data.type : "unknown"
  });
}

export async function getNotificationDiagnosticsAsync(): Promise<NotificationDiagnostics> {
  await ensureNotificationChannelsAsync();
  const permission = await Notifications.getPermissionsAsync();
  const token = await readTextFile(pushTokenFile);
  const state = await readScheduleState();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const owned = scheduled.filter((request) => request.content.data?.owner === prayerNotificationOwner || request.identifier.startsWith(prayerNotificationIdentifierPrefix));
  const settings = await loadNotificationSettings();
  const activeChannelId = channelForSound(settings.prayer.sound, "adhan");
  const channel = Platform.OS === "android" ? await Notifications.getNotificationChannelAsync(activeChannelId) : null;

  return {
    permission: permissionLabel(permission),
    canAskAgain: permission.canAskAgain,
    soundPermission: permission.ios?.allowsSound === true
      ? "enabled"
      : permission.ios?.allowsSound === false
        ? "disabled"
        : permissionIsAuthorized(permission)
          ? "unknown"
          : "disabled",
    remoteRegistration: token ? "registered" : "not-registered",
    maskedExpoToken: token ? maskToken(token) : undefined,
    androidChannelId: Platform.OS === "android" ? activeChannelId : undefined,
    androidChannelSound: Platform.OS === "android"
      ? channel?.sound === "default"
        ? "default"
        : channel?.sound
          ? "custom"
          : channel
            ? "muted"
            : "unavailable"
      : undefined,
    androidChannelImportance: channel?.importance,
    scheduledPrayerAlerts: owned.length,
    nextScheduledAlert: state.nextScheduledAt,
    scheduleRevision: state.scheduleRevision,
    serviceDate: state.serviceDate,
    lastScheduleReconciliation: state.lastReconciledAt,
    lastScheduleResult: state.lastReconciliationResult,
    lastLocalTest: state.lastLocalTestAt,
    lastRemoteNotification: state.lastRemoteNotificationAt,
    adhanAudio: adhanAudioStatus.status
  };
}

/** Pair this installation privately without exposing its push token in admin UI. */
export async function createPrivateNotificationTestCodeAsync() {
  const token = await registerForPushNotificationsAsync({ requestPermission: true });
  if (!token) throw new Error("Enable notifications for this phone before creating a private test code.");
  const response = await fetch(`${apiBase}/api/notifications/test-code`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, installationId: await installationId() })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "Private device code could not be created.");
  return result as { code: string; expiresAt: string };
}

export async function openNotificationSystemSettingsAsync(channelId?: string) {
  if (Platform.OS === "android") {
    const appId = Application.applicationId || "ca.hbic.calgary.app";
    const action = channelId
      ? "android.settings.CHANNEL_NOTIFICATION_SETTINGS"
      : "android.settings.APP_NOTIFICATION_SETTINGS";
    const extras = [{ key: "android.provider.extra.APP_PACKAGE", value: appId }];
    if (channelId) extras.push({ key: "android.provider.extra.CHANNEL_ID", value: channelId });
    await Linking.sendIntent(action, extras);
    return;
  }
  await Linking.openSettings();
}

export { resolveNotificationDestination, resolveNotificationRoute };
