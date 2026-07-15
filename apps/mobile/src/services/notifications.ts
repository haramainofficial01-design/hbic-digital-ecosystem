import { defaultNotificationPreferences, notificationRouteByType } from "@hbic/shared";
import type { NotificationPreference, NotificationRoute, NotificationType } from "@hbic/shared";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

const preferenceFile = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}hbic-notification-preferences.json` : "";
const apiBase = (process.env.EXPO_PUBLIC_API_URL || "https://hbic-calgary.vercel.app").replace(/\/$/, "");
const allowedRoutes: NotificationRoute[] = ["/", "/prayer", "/events", "/donate", "/media", "/programs", "/youth", "/contact", "/more"];

export async function registerForPushNotificationsAsync({ requestPermission = true }: { requestPermission?: boolean } = {}) {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Masjid Bilal",
      description: "Prayer reminders and community updates from Masjid Bilal.",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lightColor: "#0C9BA8"
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted" && requestPermission) {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  const projectId = Constants.easConfig?.projectId ?? (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const response = await fetch(`${apiBase}/api/notifications/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: token.data,
      platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown"
    })
  });
  if (!response.ok) throw new Error("Unable to finish notification setup.");
  return token.data;
}

export async function refreshPushRegistrationAsync() {
  return registerForPushNotificationsAsync({ requestPermission: false });
}

export function getDefaultNotificationPreferences(): NotificationPreference {
  return defaultNotificationPreferences;
}

export async function loadNotificationPreferences(): Promise<NotificationPreference> {
  if (!preferenceFile) return defaultNotificationPreferences;
  try {
    const info = await FileSystem.getInfoAsync(preferenceFile);
    if (!info.exists) return defaultNotificationPreferences;
    const saved = JSON.parse(await FileSystem.readAsStringAsync(preferenceFile)) as Partial<NotificationPreference>;
    return { ...defaultNotificationPreferences, ...saved };
  } catch {
    return defaultNotificationPreferences;
  }
}

export async function saveNotificationPreferences(preferences: NotificationPreference) {
  if (!preferenceFile) return;
  await FileSystem.writeAsStringAsync(preferenceFile, JSON.stringify(preferences, null, 2));
}

export async function scheduleLocalReminder({
  title,
  body,
  seconds = 5,
  route = "/"
}: {
  title: string;
  body: string;
  seconds?: number;
  route?: NotificationRoute;
}) {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { route }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false
    }
  });
}

export function resolveNotificationRoute(data: Record<string, unknown> | undefined): NotificationRoute {
  const explicitRoute = typeof data?.route === "string" ? data.route : undefined;
  if (explicitRoute && allowedRoutes.includes(explicitRoute as NotificationRoute)) {
    return explicitRoute as NotificationRoute;
  }

  const type = typeof data?.type === "string" ? data.type : undefined;
  if (type && type in notificationRouteByType) {
    return notificationRouteByType[type as NotificationType];
  }

  return "/";
}
