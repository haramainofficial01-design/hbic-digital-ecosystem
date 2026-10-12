import { createHash, randomBytes } from "node:crypto";
import {
  defaultNotificationPreferences,
  notificationPreferenceKeyByType,
  type NotificationAudience,
  type NotificationPreference,
  type NotificationRoute,
  type NotificationType
} from "@hbic/shared";
import { getDatabase } from "./contentStore";
import { notificationDocument } from "./notificationDocument";
import {
  assertRemoteNotificationType,
  buildContentUpdateExpoPushMessage,
  buildVisibleExpoPushMessage,
  decideTokenRotation,
  visibleIqamahChanges,
  type IqamahChange,
  type ExpoPushMessage
} from "./notificationPayload";

type PushPlatform = "ios" | "android" | "web" | "unknown";
type PrayerChangeName = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
type PrayerChangePreferences = { enabled: boolean; prayers: Record<PrayerChangeName, boolean> };
const prayerChangeNames: PrayerChangeName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export type RegisteredPushToken = {
  token: string;
  platform: PushPlatform;
  deviceName?: string;
  appVersion?: string;
  environment?: "development" | "production" | "unknown";
  installationIdHash?: string;
  preferences: NotificationPreference;
  prayerChangePreferences?: PrayerChangePreferences;
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
  requestId?: string;
  actorKey?: string;
};

type ExpoPushTicket = {
  status?: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

type StoredTicket = { id: string; tokenId: string };
export type PushSendResult = { logId: string; successCount: number; failureCount: number; tokenCount: number; receiptCount: number; status: string;
  acceptedCount?: number; pendingCount?: number; replayed?: boolean };

export class NotificationInputError extends Error {}

const expoPushTokenPattern = /^(Exponent|Expo)PushToken\[[^\]]+\]$/;

function assertExpoPushToken(token: string) {
  if (!expoPushTokenPattern.test(token)) throw new NotificationInputError("Invalid Expo push token.");
}

function tokenId(token: string) {
  return Buffer.from(token).toString("base64url");
}

async function retireInvalidRegistration(db: NonNullable<ReturnType<typeof getDatabase>>, id: string, sentAt: string, updatedAt: string) {
  const ref = db.collection("pushTokens").doc(id);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref), current = snapshot.data();
    if (!snapshot.exists || current?.enabled === false) return;
    // A later app launch may already have refreshed this registration. An old
    // receipt must never disable its replacement or recreate a deleted token.
    if (Date.parse(current?.updatedAt ?? "") > Date.parse(sentAt)) return;
    transaction.set(ref, { enabled: false, updatedAt }, { merge: true });
  });
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
  prayerChangePreferences?: Partial<PrayerChangePreferences>;
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
  if (input.prayerChangePreferences && typeof input.prayerChangePreferences.enabled === "boolean") {
    token.prayerChangePreferences = {
      enabled: input.prayerChangePreferences.enabled,
      prayers: Object.fromEntries(prayerChangeNames.map((prayer) =>
        [prayer, input.prayerChangePreferences?.prayers?.[prayer] !== false])) as Record<PrayerChangeName, boolean>
    };
  } else if (current?.prayerChangePreferences) {
    token.prayerChangePreferences = current.prayerChangePreferences;
  }
  if (input.deviceName?.trim()) token.deviceName = input.deviceName.trim().slice(0, 160);
  if (input.appVersion?.trim()) token.appVersion = input.appVersion.trim().slice(0, 40);
  token.environment = normalizeEnvironment(input.environment);
  if (installationIdHash) token.installationIdHash = installationIdHash;

  await currentRef.set(notificationDocument(token), { merge: true });

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
  // These audiences have no verified membership mapping in pushTokens.
  // Never silently broadcast a targeted message to Everyone.
  return false;
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
      body: JSON.stringify(messages), signal: AbortSignal.timeout(20000)
    });
    lastStatus = response.status;
    const result = (await response.json().catch(() => null)) as { data?: ExpoPushTicket[] } | null;
    if (response.ok && Array.isArray(result?.data)) return result.data;
    // A timeout/5xx may follow dispatch. Retrying could duplicate an alert.
    if (response.status !== 429) break;
    if (attempt < 2) await retryDelay(attempt === 0 ? 250 : 1_000);
  }
  throw new Error(`Expo push service returned HTTP ${lastStatus || "unknown"}.`);
}

async function deliverExpoPushMessages({
  tokens,
  messages,
  logData,
  logCollection = "pushNotificationLogs",
  deduplicationKey
}: {
  tokens: RegisteredPushToken[];
  messages: ExpoPushMessage[];
  logData: Record<string, unknown>;
  logCollection?: "pushNotificationLogs" | "contentPropagationLogs";
  deduplicationKey?: string;
}): Promise<PushSendResult> {
  const db = getDatabase();
  if (!db) throw new Error("Notification storage is not configured.");
  const now = new Date().toISOString();
  const safeLog = notificationDocument(logData);
  const fingerprint = createHash("sha256").update(JSON.stringify({ ...safeLog, requestId: undefined, actorKey: undefined })).digest("hex");
  const logRef = deduplicationKey ? db.collection(logCollection).doc(deduplicationKey) : db.collection(logCollection).doc();
  const existing = await db.runTransaction(async tx => {
    const previous = await tx.get(logRef);
    if (previous.exists) {
      if (previous.data()?.fingerprint !== fingerprint) throw new NotificationInputError("This send request was already used for different content.");
      return previous.data();
    }
    // Durable intent FIRST. Any serialization/storage failure happens before Expo.
    tx.create(logRef, notificationDocument({ ...safeLog, fingerprint, sentAt: now, status: tokens.length ? "dispatching" : "no_tokens", tokenCount: tokens.length,
      successCount: 0, failureCount: 0, pendingCount: tokens.length, tickets: [] }));
    return null;
  });
  const responseSummary = (record: Record<string, unknown>, replayed = false) => ({ logId: logRef.id, successCount: Number(record.successCount ?? 0), acceptedCount: Number(record.successCount ?? 0),
    failureCount: Number(record.failureCount ?? 0), tokenCount: Number(record.tokenCount ?? tokens.length), receiptCount: Array.isArray(record.tickets) ? record.tickets.length : 0,
    pendingCount: Number(record.pendingCount ?? tokens.length), status: String(record.status ?? "dispatch_unknown"), replayed });
  if (existing) return responseSummary(existing, true);

  if (!tokens.length) {
    return responseSummary({ successCount: 0, failureCount: 0, pendingCount: 0, tickets: [], status: "no_tokens" });
  }

  let successCount = 0;
  let failureCount = 0;
  const disabledTokens: string[] = [];
  const tickets: StoredTicket[] = [];
  const ticketErrors: { code: string; message: string }[] = [];

  try {
    for (let batchIndex = 0; batchIndex < messages.length; batchIndex += 100) {
      const messageBatch = messages.slice(batchIndex, batchIndex + 100);
      const tokenBatch = tokens.slice(batchIndex, batchIndex + 100);
      await logRef.set({ currentBatch: batchIndex / 100, status: "dispatching" }, { merge: true });
      const result = await sendExpoMessageBatch(messageBatch);
      if (result.length !== messageBatch.length) throw new Error("Expo returned an incomplete ticket response. Dispatch status is uncertain; do not resend.");
      result.forEach((ticket, index) => {
        const target = tokenBatch[index];
        if (!target) return;
        if (ticket.status === "ok" && ticket.id) {
          successCount += 1;
          if (ticket.id) tickets.push({ id: ticket.id, tokenId: tokenId(target.token) });
        } else {
          failureCount += 1;
          ticketErrors.push({ code: ticket.details?.error ?? "UnknownTicketError", message: ticket.message ?? "Expo did not accept this notification." });
          if (ticket.details?.error === "DeviceNotRegistered") disabledTokens.push(target.token);
        }
      });
      await logRef.set(notificationDocument({ successCount, failureCount, tickets, ticketErrors, pendingCount: tokens.length - failureCount }), { merge: true });
    }
  } catch (error) {
    const uncertain = { successCount, failureCount, tickets, ticketErrors, pendingCount: tokens.length - failureCount, status: "dispatch_unknown",
      error: "Dispatch may have occurred. Check this delivery record before sending again." };
    await logRef.set(notificationDocument(uncertain), { merge: true }).catch(() => undefined);
    return responseSummary(uncertain);
  }

  await Promise.all(
    disabledTokens.map((token) => retireInvalidRegistration(db, tokenId(token), now, now).catch(() => undefined))
  );

  const status = successCount ? failureCount ? "partial" : "accepted" : "failed";
  const summary = { successCount, failureCount, tickets, ticketErrors, pendingCount: tickets.length, status };
  try { await logRef.set(notificationDocument(summary), { merge: true }); }
  catch { return responseSummary({ ...summary, status: "dispatch_unknown" }); }
  return responseSummary(summary);
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
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 160 || typeof input.body !== "string" || !input.body.trim() || input.body.length > 2000) throw new NotificationInputError("Enter a notification title and body within the allowed length.");
  if (input.type && !(input.type in notificationPreferenceKeyByType)) throw new NotificationInputError("Unknown notification type.");
  if (input.route && !["/", "/prayer", "/events", "/donate", "/media", "/programs", "/youth", "/contact", "/more", "/community", "/halal-restaurants", "/notifications", "/quran-academy"].includes(input.route)) throw new NotificationInputError("Choose an app notification destination.");
  if (!["All", "Everyone", "Android", "iOS"].includes(input.audience)) throw new NotificationInputError("This audience has no verified device membership. Choose Everyone, Android or iOS; no notification was sent.");
  if (input.requestId && !/^[A-Za-z0-9_-]{16,100}$/.test(input.requestId)) throw new NotificationInputError("Invalid send request ID.");
  const tokens = targetTokens ?? (await allEnabledTokens())
    .filter((token) => audienceMatches(token, input.audience) && hasEnabledPreference(token, input.type));
  const messages = tokens.map((token) => buildVisibleExpoPushMessage(token.token, {
    ...input,
    // Registrations created by the repaired app have already created the new
    // sound channel. Legacy registrations keep their existing default channel
    // until that installation launches and re-registers.
    androidChannelId: token.appVersion ? undefined : "default"
  }));
  return deliverExpoPushMessages({ tokens, messages, logData: input,
    deduplicationKey: input.requestId ? createHash("sha256").update(`${input.actorKey ?? "admin"}:${input.requestId}`).digest("hex") : undefined });
}

/** A device receives only the prayers it chose, with matching text and data. */
export async function sendIqamahChangeNotification(effectiveDate: string, changes: IqamahChange[]) {
  const selected = (await allEnabledTokens())
    .map((token) => ({ token, changes: visibleIqamahChanges(changes, hasEnabledPreference(token, "iqamahChange"), token.prayerChangePreferences) }))
    .filter(({ changes: visible }) => visible.length > 0);
  const tokens = selected.map(({ token }) => token);
  const messages = selected.map(({ token, changes: visible }) => {
    const body = visible.map(({ prayer, oldTime, newTime }) =>
      `${prayer[0].toUpperCase()}${prayer.slice(1)} ${oldTime} → ${newTime}`).join(" · ");
    return buildVisibleExpoPushMessage(token.token, {
      title: "Masjid Bilal iqamah update",
      body: `Effective ${effectiveDate}: ${body}`.slice(0, 220),
      route: "/prayer", type: "iqamahChange",
      data: { effectiveDate, changes: visible },
      androidChannelId: token.appVersion ? undefined : "default"
    });
  });
  return deliverExpoPushMessages({ tokens, messages,
    logData: { type: "iqamahChange", effectiveDate, changes, audience: "All" } });
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

export async function createPrivatePushTestCode(input: { token: string; installationId: string }) {
  assertExpoPushToken(input.token);
  const db = getDatabase();
  if (!db) throw new Error("Notification storage is not configured.");
  const ref = db.collection("pushTokens").doc(tokenId(input.token)), token = (await ref.get()).data() as RegisteredPushToken | undefined;
  if (!token?.enabled || !token.installationIdHash || token.installationIdHash !== hashInstallationId(input.installationId)) throw new NotificationInputError("This registered device could not be verified.");
  if (Date.now() - Date.parse(String((await ref.get()).data()?.privateTestCodeCreatedAt ?? "")) < 30_000) throw new NotificationInputError("Please wait 30 seconds before creating another device code.");
  const code = randomBytes(6).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  await db.collection("pushTestTargets").doc(createHash("sha256").update(code).digest("hex")).create({ tokenId: ref.id, platform: token.platform, expiresAt });
  await ref.set({ privateTestCodeCreatedAt: new Date().toISOString() }, { merge: true });
  return { code, expiresAt };
}

export async function sendPrivatePushTestCode(input: { code: string; requestId?: string; actorKey?: string }) {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-F0-9]{12}$/.test(code)) throw new NotificationInputError("Enter the private test code shown on your device.");
  const db = getDatabase();
  if (!db) throw new Error("Notification storage is not configured.");
  const target = (await db.collection("pushTestTargets").doc(createHash("sha256").update(code).digest("hex")).get()).data();
  if (!target || Date.parse(target.expiresAt) <= Date.now()) throw new NotificationInputError("This device code expired. Create a new code on your phone.");
  const token = (await db.collection("pushTokens").doc(target.tokenId).get()).data() as RegisteredPushToken | undefined;
  if (!token?.enabled) throw new NotificationInputError("This device no longer has an active push registration.");
  return sendPrivatePushTest({ token: token.token, platform: token.platform, requestId: input.requestId, actorKey: input.actorKey });
}

export async function sendPrivatePushTest(input: { token: string; platform: PushPlatform; requestId?: string; actorKey?: string }) {
  assertExpoPushToken(input.token);
  const db = getDatabase();
  if (!db) throw new Error("Notification storage is not configured.");
  const target = (await db.collection("pushTokens").doc(tokenId(input.token)).get()).data() as RegisteredPushToken | undefined;
  if (!target?.enabled || target.platform !== input.platform) throw new NotificationInputError("Choose a registered, enabled device on the correct platform.");
  return sendPushNotification(
    {
      title: "Masjid Bilal Test",
      body: "Private delivery test. Please check the banner, sound and tap to open notification settings.",
      audience: "All",
      route: "/notifications",
      type: "announcement",
      data: { test: true },
      privateTest: true,
      ...(input.requestId ? { requestId: input.requestId, actorKey: input.actorKey } : {})
    },
    [target]
  );
}

export async function checkPushNotificationReceipts(logId: string, options?: { privateTestOnly?: boolean }) {
  const db = getDatabase();
  if (!db) throw new Error("Notification storage is not configured.");

  if (!/^[A-Za-z0-9_-]{1,128}$/.test(logId)) throw new NotificationInputError("Invalid notification delivery ID.");
  const logRef = db.collection("pushNotificationLogs").doc(logId);
  const log = await logRef.get();
  if (!log.exists) throw new Error("Notification delivery record was not found.");
  if (options?.privateTestOnly && log.data()?.privateTest !== true) {
    throw new Error("This delivery record is not available to the private test workflow.");
  }

  const record = log.data()!;
  const tickets = (record.tickets ?? []) as StoredTicket[];
  const acceptedCount = Number(record.successCount ?? 0), immediateFailures = Number(record.failureCount ?? 0);
  const receiptResults: Record<string, "ok" | "error"> = { ...(record.receiptResults ?? {}) };
  const receiptErrors: Record<string, string> = { ...(record.receiptErrors ?? {}) };
  if (!tickets.length) {
    return { logId, acceptedCount, receiptCount: 0, deliveredCount: 0, failedCount: immediateFailures,
      pendingCount: record.status === "dispatching" || record.status === "dispatch_unknown" ? Number(record.tokenCount ?? 0) - immediateFailures : 0,
      status: record.status, deliveryMeaning: "APNs/FCM receipt, not on-device display confirmation" };
  }
  // Older logs kept the terminal error but not its cause. Recover available
  // error details without replaying the notification or discarding old receipts.
  const pendingTickets = tickets.filter(ticket => !receiptResults[ticket.id] || (receiptResults[ticket.id] === "error" && !receiptErrors[ticket.id]));
  const receipts: Record<string, { status?: "ok" | "error"; details?: { error?: string; apns?: { reason?: string; statusCode?: number } } }> = {};
  for (let offset = 0; offset < pendingTickets.length; offset += 1000) {
  const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ids: pendingTickets.slice(offset, offset + 1000).map((ticket) => ticket.id) }), signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`Expo receipt service returned HTTP ${response.status}.`);

  const result = (await response.json()) as {
    data?: Record<string, { status?: "ok" | "error"; message?: string; details?: { error?: string; apns?: { reason?: string; statusCode?: number } } }>;
  };
  if (!result.data || typeof result.data !== "object") throw new Error("Expo returned an invalid receipt response.");
  Object.assign(receipts, result.data);
  }
  let deliveredCount = 0;
  let failedCount = immediateFailures;
  let pendingCount = Math.max(0, Number(record.tokenCount ?? tickets.length) - acceptedCount - immediateFailures);
  const disabledTokenIds: string[] = [];

  tickets.forEach((ticket) => {
    const receipt = receiptResults[ticket.id] ? { status: receiptResults[ticket.id] } : receipts[ticket.id];
    if (!receipt) pendingCount += 1;
    else if (receipt.status === "ok") { deliveredCount += 1; receiptResults[ticket.id] = "ok"; }
    else if (receipt.status === "error") {
      failedCount += 1;
      receiptResults[ticket.id] = "error";
      const details = receipts[ticket.id]?.details;
      if (details) receiptErrors[ticket.id] = details.apns?.reason ?? details.error ?? "UnknownReceiptError";
      if (details && (details.error === "DeviceNotRegistered" || details.apns?.reason === "BadDeviceToken")) disabledTokenIds.push(ticket.tokenId);
    } else pendingCount += 1;
  });

  const checkedAt = new Date().toISOString();
  await Promise.all(
    disabledTokenIds.map((id) => retireInvalidRegistration(db, id, record.sentAt ?? checkedAt, checkedAt))
  );
  const status = pendingCount ? "pending" : failedCount ? deliveredCount ? "partial" : "failed" : "delivered";
  const errorCounts = Object.values(receiptErrors).reduce<Record<string, number>>((counts, code) => ({ ...counts, [code]: (counts[code] ?? 0) + 1 }), {});
  await logRef.set(notificationDocument({ receiptCheckedAt: checkedAt, deliveredCount, failedCount, pendingCount, status, receiptResults, receiptErrors }), { merge: true });
  return { logId, acceptedCount, receiptCount: tickets.length, deliveredCount, failedCount, pendingCount, status,
    errorCounts,
    deliveryMeaning: "APNs/FCM receipt, not on-device display confirmation" };
}
