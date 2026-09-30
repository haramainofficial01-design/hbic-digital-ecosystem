import type { NotificationRoute, NotificationType } from "@hbic/shared";

export const communityNotificationChannelId = "community_updates_v1";

export type ExpoPushMessage = {
  to: string;
  title?: string;
  body?: string;
  channelId?: string;
  sound?: "default";
  priority?: "high";
  interruptionLevel?: "active";
  contentAvailable?: boolean;
  ttl?: number;
  data: Record<string, unknown>;
};

export type VisibleNotificationPayload = {
  title: string;
  body: string;
  route?: NotificationRoute;
  type?: NotificationType;
  data?: Record<string, unknown>;
  androidChannelId?: string;
};

export type IqamahChange = { prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"; oldTime: string; newTime: string };

export function visibleIqamahChanges(
  changes: IqamahChange[],
  globalEnabled: boolean,
  perPrayer?: { enabled: boolean; prayers: Partial<Record<IqamahChange["prayer"], boolean>> }
) {
  if (!globalEnabled || perPrayer?.enabled === false) return [];
  return changes.filter(({ prayer }) => perPrayer?.prayers?.[prayer] !== false);
}

const locallyScheduledTypes = new Set<NotificationType>(["prayerReminder", "iqamahReminder"]);

export type TokenRotationAction = "delete" | "disable-legacy" | "ignore";

export function decideTokenRotation(
  currentInstallationIdHash: string | undefined,
  previousInstallationIdHash: string | undefined
): TokenRotationAction {
  if (currentInstallationIdHash && previousInstallationIdHash === currentInstallationIdHash) return "delete";
  if (!previousInstallationIdHash) return "disable-legacy";
  return "ignore";
}

export function assertRemoteNotificationType(type?: NotificationType) {
  if (type && locallyScheduledTypes.has(type)) {
    throw new Error("Routine prayer and iqamah alerts are scheduled locally on each device and cannot be sent remotely.");
  }
}

export function buildVisibleExpoPushMessage(token: string, input: VisibleNotificationPayload): ExpoPushMessage {
  assertRemoteNotificationType(input.type);
  return {
    to: token,
    title: input.title,
    body: input.body,
    channelId: input.androidChannelId ?? communityNotificationChannelId,
    sound: "default",
    priority: "high",
    interruptionLevel: "active",
    data: {
      route: input.route ?? "/",
      type: input.type ?? "announcement",
      ...(input.data ?? {})
    }
  };
}

export function buildContentUpdateExpoPushMessage(
  token: string,
  input: { contentVersion: number; publicationRevision?: number; scheduleRevision?: string; publishedAt: string }
): ExpoPushMessage {
  return {
    to: token,
    priority: "high",
    contentAvailable: true,
    ttl: 300,
    data: {
      type: "contentUpdate",
      route: "/",
      contentVersion: input.contentVersion,
      publicationRevision: input.publicationRevision,
      scheduleRevision: input.scheduleRevision,
      publishedAt: input.publishedAt
    }
  };
}
