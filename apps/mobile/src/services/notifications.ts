import { defaultNotificationPreferences, notificationRouteByType } from "@hbic/shared";
import type { NotificationPreference, NotificationRoute, NotificationType } from "@hbic/shared";
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
const allowedRoutes: NotificationRoute[] = ["/", "/prayer", "/events", "/donate", "/media", "/programs", "/youth", "/contact", "/more"];

export async function registerForPushNotificationsAsync() {
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "HBIC Calgary",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
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
