import {
  defaultNotificationPreferences,
  notificationPreferenceKeyByType,
  type NotificationAudience,
  type NotificationPreference,
  type NotificationRoute,
  type NotificationType
} from "@hbic/shared";
import { getDatabase } from "./contentStore";

type PushPlatform = "ios" | "android" | "web" | "unknown";

export type RegisteredPushToken = {
  token: string;
  platform: PushPlatform;
  deviceName?: string;
  preferences: NotificationPreference;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type SendNotificationInput = {
  title: string;
  body: string;
  audience: NotificationAudience | "Android" | "iOS" | "Everyone";
  route?: NotificationRoute;
  type?: NotificationType;
  privateTest?: boolean;
};

type ExpoPushTicket = {
  status?: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

type StoredTicket = {
  id: string;
  tokenId: string;
};

function tokenId(token: string) {
  return Buffer.from(token).toString("base64url");
}

export async function registerPushToken(input: {
  token: string;
  platform?: PushPlatform;
  deviceName?: string;
  preferences?: Partial<NotificationPreference>;
}) {
  const db = getDatabase();
  if (!db) throw new Error("Push token storage is not configured.");
  if (!/^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(input.token)) throw new Error("Invalid Expo push token.");

  const now = new Date().toISOString();
  const token: RegisteredPushToken = {
    token: input.token,
    platform: input.platform ?? "unknown",
    preferences: { ...defaultNotificationPreferences, ...(input.preferences ?? {}) },
    enabled: true,
    createdAt: now,
    updatedAt: now
  };
  if (input.deviceName) token.deviceName = input.deviceName;

  await db.collection("pushTokens").doc(tokenId(input.token)).set(token, { merge: true });
  return token;
}

function audienceMatches(token: RegisteredPushToken, audience: SendNotificationInput["audience"]) {
  if (audience === "All" || audience === "Everyone") return true;
  if (audience === "Android") return token.platform === "android";
  if (audience === "iOS") return token.platform === "ios";
  return true;
}

function hasEnabledPreference(token: RegisteredPushToken, type: NotificationType | undefined) {
  if (!type) return true;
  const preferenceKey = notificationPreferenceKeyByType[type];
  return token.preferences?.[preferenceKey] ?? defaultNotificationPreferences[preferenceKey];
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export async function sendPushNotification(input: SendNotificationInput, targetTokens?: RegisteredPushToken[]) {
  const db = getDatabase();
  if (!db) throw new Error("Notification storage is not configured.");

  const tokens = targetTokens
    ? targetTokens
    : (await db.collection("pushTokens").where("enabled", "==", true).get()).docs
        .map((doc) => doc.data() as RegisteredPushToken)
        .filter((token) => audienceMatches(token, input.audience) && hasEnabledPreference(token, input.type));

  const now = new Date().toISOString();
  const logRef = db.collection("pushNotificationLogs").doc();

  if (!tokens.length) {
    await logRef.set({
      ...input,
      sentAt: now,
      successCount: 0,
      failureCount: 0,
      status: "no_tokens"
    });
    return { successCount: 0, failureCount: 0, tokenCount: 0, status: "no_tokens" };
  }

  let successCount = 0;
  let failureCount = 0;
  const disabledTokens: string[] = [];
  const tickets: StoredTicket[] = [];

  for (const tokenBatch of chunk(tokens, 100)) {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(tokenBatch.map((item) => ({
        to: item.token,
        title: input.title,
        body: input.body,
        channelId: "default",
        priority: "high",
        data: {
          route: input.route ?? "/",
          type: input.type ?? "announcement"
        }
      })))
    });
    const result = (await response.json().catch(() => null)) as { data?: ExpoPushTicket[] } | null;
    if (!response.ok || !result?.data) throw new Error(`Expo push service returned HTTP ${response.status}.`);

    result.data.forEach((ticket, index) => {
      if (ticket.status === "ok") {
        successCount += 1;
        if (ticket.id) tickets.push({ id: ticket.id, tokenId: tokenId(tokenBatch[index].token) });
        return;
      }
      failureCount += 1;
      if (ticket.details?.error === "DeviceNotRegistered") disabledTokens.push(tokenBatch[index].token);
    });
  }

  await Promise.all(
    disabledTokens.map((token) => db.collection("pushTokens").doc(tokenId(token)).set({ enabled: false, updatedAt: now }, { merge: true }))
  );

  await logRef.set({
    ...input,
    sentAt: now,
    successCount,
    failureCount,
    tokenCount: tokens.length,
    tickets,
    status: failureCount ? "partial" : "accepted"
  });

  return {
    logId: logRef.id,
    successCount,
    failureCount,
    tokenCount: tokens.length,
    receiptCount: tickets.length,
    status: failureCount ? "partial" : "accepted"
  };
}

export async function sendPrivatePushTest(input: { token: string; platform: PushPlatform }) {
  if (!/^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(input.token)) throw new Error("Invalid Expo push token.");

  return sendPushNotification(
    {
      title: "Masjid Bilal Test",
      body: "Android notifications are connected successfully.",
      audience: "All",
      route: "/",
      type: "announcement",
      privateTest: true
    },
    [
      {
        token: input.token,
        platform: input.platform,
        preferences: defaultNotificationPreferences,
        enabled: true,
        createdAt: "",
        updatedAt: ""
      }
    ]
  );
}

export async function sendLatestRegisteredPrivatePushTest(platform: Extract<PushPlatform, "android" | "ios">) {
  const db = getDatabase();
  if (!db) throw new Error("Notification storage is not configured.");

  const snapshot = await db.collection("pushTokens").where("enabled", "==", true).where("platform", "==", platform).get();
  const target = snapshot.docs
    .map((document) => document.data() as RegisteredPushToken)
    .sort((left, right) => Date.parse(right.updatedAt || "") - Date.parse(left.updatedAt || ""))[0];

  if (!target) throw new Error(`No enabled ${platform} device is registered for a private notification test.`);
  return sendPrivatePushTest({ token: target.token, platform });
}

export async function checkPushNotificationReceipts(logId: string, options?: { privateTestOnly?: boolean }) {
  const db = getDatabase();
  if (!db) throw new Error("Notification storage is not configured.");

  const logRef = db.collection("pushNotificationLogs").doc(logId);
  const log = await logRef.get();
  if (!log.exists) throw new Error("Notification delivery record was not found.");
  if (options?.privateTestOnly && log.data()?.privateTest !== true) {
    throw new Error("This delivery record is not available to the private test workflow.");
  }

  const tickets = (log.data()?.tickets ?? []) as StoredTicket[];
  if (!tickets.length) {
    return { logId, receiptCount: 0, deliveredCount: 0, failedCount: 0, pendingCount: 0, status: "no_receipts" };
  }

  const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ids: tickets.map((ticket) => ticket.id) })
  });
  if (!response.ok) throw new Error(`Expo receipt service returned HTTP ${response.status}.`);

  const result = (await response.json()) as {
    data?: Record<string, { status?: "ok" | "error"; message?: string; details?: { error?: string } }>;
  };
  let deliveredCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  const disabledTokenIds: string[] = [];

  tickets.forEach((ticket) => {
    const receipt = result.data?.[ticket.id];
    if (!receipt) {
      pendingCount += 1;
    } else if (receipt.status === "ok") {
      deliveredCount += 1;
    } else {
      failedCount += 1;
      if (receipt.details?.error === "DeviceNotRegistered") disabledTokenIds.push(ticket.tokenId);
    }
  });

  const checkedAt = new Date().toISOString();
  await Promise.all(
    disabledTokenIds.map((id) => db.collection("pushTokens").doc(id).set({ enabled: false, updatedAt: checkedAt }, { merge: true }))
  );
  const status = pendingCount ? "pending" : failedCount ? "failed" : "delivered";
  await logRef.set({ receiptCheckedAt: checkedAt, deliveredCount, failedCount, pendingCount, status }, { merge: true });
  return { logId, receiptCount: tickets.length, deliveredCount, failedCount, pendingCount, status };
}
