import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { recordRemoteNotificationReceivedAsync } from "./notifications";
import { refreshPublishedContentInBackground } from "./publishedContent";

export const backgroundNotificationTaskName = "masjid-bilal-background-notification-v1";
// expo-notifications 0.32 declares these native result codes but does not re-export
// the enum from its public TypeScript index. Keep the values aligned with the
// installed BackgroundNotificationTasksModule contract.
const backgroundNotificationResult = { noData: 1, newData: 2, failed: 3 } as const;

export function extractBackgroundNotificationData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const root = payload as Record<string, unknown>;
  if ("actionIdentifier" in root) {
    const notification = root.notification as { request?: { content?: { data?: Record<string, unknown> } } } | undefined;
    return notification?.request?.content?.data ?? {};
  }

  const raw = root.data;
  if (!raw || typeof raw !== "object") return {};
  const data = raw as Record<string, unknown>;
  if (typeof data.dataString === "string") {
    try {
      const parsed = JSON.parse(data.dataString) as unknown;
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return data;
}

if (!TaskManager.isTaskDefined(backgroundNotificationTaskName)) {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(backgroundNotificationTaskName, async ({ data, error }) => {
    if (error) return backgroundNotificationResult.failed;
    const notificationData = extractBackgroundNotificationData(data);
    await recordRemoteNotificationReceivedAsync(notificationData);
    if (notificationData.type !== "contentUpdate") return backgroundNotificationResult.noData;
    try {
      await refreshPublishedContentInBackground();
      return backgroundNotificationResult.newData;
    } catch {
      return backgroundNotificationResult.failed;
    }
  });
}

if (Platform.OS !== "web") {
  void Notifications.registerTaskAsync(backgroundNotificationTaskName).catch((error) => {
    if (__DEV__) console.warn("Masjid Bilal background content updates could not be registered.", error);
  });
}
