import { createHash } from "node:crypto";
import {
  defaultNotificationPreferences,
  notificationPreferenceKeyByType,
  type NotificationAudience,
  type NotificationPreference,
  type NotificationRoute,
  type NotificationType
} from "@hbic/shared";
import { getDatabase } from "./contentStore";
import {
  assertRemoteNotificationType,
  buildContentUpdateExpoPushMessage,
  buildVisibleExpoPushMessage,
  decideTokenRotation,
  type ExpoPushMessage
} from "./notificationPayload";

type PushPlatform = "ios" | "android" | "web" | "unknown";

export type RegisteredPushToken = {
  token: string;
  platform: PushPlatform;
  deviceName?: string;
  appVersion?: string;
  environment?: "development" | "production" | "unknown";
  installationIdHash?: string;
  preferences: NotificationPreference;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
};

type SendNotificationInput = {
  title: string;
  body: string;
  audience: NotificationAudience | "Android" | "iOS" | "Everyone";
  route?: NotificationRoute;
  type?: NotificationType;
  data?: Record<string, unknown>;
  privateTest?: boolean;
};

type ExpoPushTicket = {
  status?: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

type StoredTicket = { id: string; tokenId: string };

export class NotificationInputError extends Error {}

const expoPushTokenPattern = /^(Exponent|Expo)PushToken\[[^\]]+\]$/;

function assertExpoPushToken(token: string) {
  if (!expoPushTokenPattern.test(token)) throw new NotificationInputError("Invalid Expo push token.");
}

function tokenId(token: string) {
  return Buffer.from(token).toString("base64url");
}

function hashInstallationId(installationId?: string) {
  const normalized = installationId?.trim();
  return normalized ? createHash("sha256").update(normalized).digest("base64url") : undefined;
}

function normalizeEnvironment(value?: string): RegisteredPushToken["environment"] {
  return value === "development" || value === "production" ? value : "unknown";
}

export async function registerPushToken(input: {
  token: string;
  previousToken?: string;
  installationId?: string;
  platform?: PushPlatform;
  deviceName?: string;
  appVersion?: string;
  environment?: string;
  preferences?: Partial<NotificationPreference>;
}) {
  const db = getDatabase();
  if (!db) throw new Error("Push token storage is not configured.");
  assertExpoPushToken(input.token);
  if (input.previousToken) assertExpoPushToken(input.previousToken);

  const now = new Date().toISOString();
  const currentRef = db.collection("pushTokens").doc(tokenId(input.token));
  const currentSnapshot = await currentRef.get();
  const current = currentSnapshot.data() as RegisteredPushToken | undefined;
  const installationIdHash = hashInstallationId(input.installationId);
  const token: RegisteredPushToken = {
    token: input.token,
    platform: input.platform ?? "unknown",
    preferences: { ...defaultNotificationPreferences, ...(current?.preferences ?? {}), ...(input.preferences ?? {}) },
    enabled: true,
    createdAt: current?.createdAt || now,
    updatedAt: now,
    lastSeenAt: now
  };
  if (input.deviceName?.trim()) token.deviceName = input.deviceName.trim().slice(0, 160);
  if (input.appVersion?.trim()) token.appVersion = input.appVersion.trim().slice(0, 40);
  token.environment = normalizeEnvironment(input.environment);
  if (installationIdHash) token.installationIdHash = installationIdHash;

  await currentRef.set(token, { merge: true });

  if (input.previousToken && input.previousToken !== input.token) {
    const previousRef = db.collection("pushTokens").doc(tokenId(input.previousToken));
    const previousSnapshot = await previousRef.get();
    const previous = previousSnapshot.data() as RegisteredPushToken | undefined;
    if (previous) {
      const rotationAction = decideTokenRotation(installationIdHash, previous.installationIdHash);
      if (rotationAction === "delete") {
        await previousRef.delete();
      } else if (rotationAction === "disable-legacy") {
        await previousRef.set({ enabled: false, updatedAt: now, disabledReason: "legacy_token_rotated" }, { merge: true });
      }
    }
  }

  return token;
}

export async function unregisterPushToken(token: string, installationId?: string) {
  const db = getDatabase();
  if (!db) throw new Error("Push token storage is not configured.");
  assertExpoPushToken(token);
  const ref = db.collection("pushTokens").doc(tokenId(token));
  const snapshot = await ref.get();
  const stored = snapshot.data() as RegisteredPushToken | undefined;
  const suppliedHash = hashInstallationId(installationId);
  if (stored?.installationIdHash && stored.installationIdHash !== suppliedHash) {
    throw new NotificationInputError("This device registration could not be verified.");
  }
  await ref.delete();
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

function retryDelay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sendExpoMessageBatch(messages: ExpoPushMessage[]) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages)
    });
    lastStatus = response.status;
    const result = (await response.json().catch(() => null)) as { data?: ExpoPushTicket[] } | null;
    if (response.ok && result?.data) return result.data;
    if (response.status !== 429 && response.status < 500) break;
    if (attempt < 2) await retryDelay(attempt === 0 ? 250 : 1_000);
  }
  throw new Error(`Expo push service returned HTTP ${lastStatus || "unknown"}.`);
}

async function deliverExpoPushMessages({
  tokens,
  messages,
  logData,
  logCollection = "pushNotificationLogs"
}: {
  tokens: RegisteredPushToken[];
  messages: ExpoPushMessage[];
  logData: Record<string, unknown>;
  logCollection?: "pushNotificationLogs" | "contentPropagationLogs";
}) {
  const db = getDatabase();
  if (!db) throw new Error("Notification storage is not configured.");
  const now = new Date().toISOString();
  const logRef = db.collection(logCollection).doc();

  if (!tokens.length) {
    await logRef.set({ ...logData, sentAt: now, successCount: 0, failureCount: 0, tokenCount: 0, status: "no_tokens" });
    return { logId: logRef.id, successCount: 0, failureCount: 0, tokenCount: 0, receiptCount: 0, status: "no_tokens" };
  }

  let successCount = 0;
  let failureCount = 0;
  const disabledTokens: string[] = [];
  const tickets: StoredTicket[] = [];

  try {
    for (let batchIndex = 0; batchIndex < messages.length; batchIndex += 100) {
      const messageBatch = messages.slice(batchIndex, batchIndex + 100);
      const tokenBatch = tokens.slice(batchIndex, batchIndex + 100);
      const result = await sendExpoMessageBatch(messageBatch);
      result.forEach((ticket, index) => {
        const target = tokenBatch[index];
        if (!target) return;
        if (ticket.status === "ok") {
          successCount += 1;
          if (ticket.id) tickets.push({ id: ticket.id, tokenId: tokenId(target.token) });
        } else {
          failureCount += 1;
          if (ticket.details?.error === "DeviceNotRegistered") disabledTokens.push(target.token);
        }
      });
    }
  } catch (error) {
    await logRef.set({
      ...logData,
      sentAt: now,
      successCount,
      failureCount: failureCount + tokens.length - successCount - failureCount,
      tokenCount: tokens.length,
      tickets,
      status: "provider_error",
      error: error instanceof Error ? error.message : "Expo push delivery failed."
    });
    throw error;
  }

  await Promise.all(
    disabledTokens.map((token) => db.collection("pushTokens").doc(tokenId(token)).set({ enabled: false, updatedAt: now }, { merge: true }))
  );

  const status = failureCount ? "partial" : "accepted";
  await logRef.set({ ...logData, sentAt: now, successCount, failureCount, tokenCount: tokens.length, tickets, status });
  return { logId: logRef.id, successCount, failureCount, tokenCount: tokens.length, receiptCount: tickets.length, status };
}

async function allEnabledTokens() {
  const db = getDatabase();
  if (!db) throw new Error("Notification storage is not configured.");
  return (await db.collection("pushTokens").where("enabled", "==", true).get()).docs
    .map((document) => document.data() as RegisteredPushToken)
    .filter((token) => expoPushTokenPattern.test(token.token));
}

export async function sendPushNotification(input: SendNotificationInput, targetTokens?: RegisteredPushToken[]) {
  assertRemoteNotificationType(input.type);
  const tokens = targetTokens ?? (await allEnabledTokens())
    .filter((token) => audienceMatches(token, input.audience) && hasEnabledPreference(token, input.type));
  const messages = tokens.map((token) => buildVisibleExpoPushMessage(token.token, {
    ...input,
    // Registrations created by the repaired app have already created the new
    // sound channel. Legacy registrations keep their existing default channel
    // until that installation launches and re-registers.
    androidChannelId: token.appVersion ? undefined : "default"
  }));
  return deliverExpoPushMessages({ tokens, messages, logData: input });
}

export async function sendContentUpdateSignal(input: {
  contentVersion: number;
  publicationRevision?: number;
  scheduleRevision?: string;
  publishedAt: string;
}) {
  const tokens = await allEnabledTokens();
  const messages = tokens.map((token) => buildContentUpdateExpoPushMessage(token.token, input));
  return deliverExpoPushMessages({
    tokens,
    messages,
    logCollection: "contentPropagationLogs",
    logData: { signalType: "contentUpdate", ...input }
  });
}

export async function sendPrivatePushTest(input: { token: string; platform: PushPlatform }) {
  assertExpoPushToken(input.token);
  return sendPushNotification(
    {
      title: "Masjid Bilal Test",
      body: "Sound, banner, and notification delivery are connected successfully.",
      audience: "All",
      route: "/notifications",
      type: "announcement",
      data: { test: true },
      privateTest: true
    },
    [{
      token: input.token,
      platform: input.platform,
      appVersion: "1.5.0",
      preferences: defaultNotificationPreferences,
      enabled: true,
      createdAt: "",
      updatedAt: ""
    }]
  );
}

export async function sendLatestRegisteredPrivatePushTest(platform: Extract<PushPlatform, "android" | "ios">) {
  const tokens = (await allEnabledTokens())
    .filter((token) => token.platform === platform)
    .sort((left, right) => Date.parse(right.lastSeenAt || right.updatedAt || "") - Date.parse(left.lastSeenAt || left.updatedAt || ""));
  const target = tokens[0];
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
    if (!receipt) pendingCount += 1;
    else if (receipt.status === "ok") deliveredCount += 1;
    else {
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
