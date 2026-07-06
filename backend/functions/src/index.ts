import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { initializeApp } from "firebase-admin/app";

initializeApp();

const db = getFirestore();

function requireNotificationRole(context: { auth?: { token?: Record<string, unknown> } }) {
  const role = context.auth?.token?.adminRole;
  if (!["superAdmin", "director", "caretaker"].includes(String(role))) {
    throw new HttpsError("permission-denied", "Only approved admins can send notifications.");
  }
}

export const sendCommunityNotification = onCall(async (request) => {
  requireNotificationRole(request);
  const { title, body, topic = "community" } = request.data as { title?: string; body?: string; topic?: string };

  if (!title || !body) {
    throw new HttpsError("invalid-argument", "Title and body are required.");
  }

  await getMessaging().send({
    topic,
    notification: { title, body },
    data: { source: "hbic-admin", topic }
  });

  await db.collection("pushNotificationLogs").add({
    type: topic,
    title,
    body,
    sentAt: new Date().toISOString(),
    sentBy: request.auth?.uid ?? "unknown",
    audience: topic
  });

  return { ok: true };
});

export const writeAuditLog = onCall(async (request) => {
  const role = request.auth?.token?.adminRole;
  if (!role) throw new HttpsError("permission-denied", "Admin auth is required.");

  const { action, collection, recordId } = request.data as Record<string, string>;
  await db.collection("auditLogs").add({
    action,
    collection,
    recordId,
    actorName: request.auth?.token?.name ?? request.auth?.uid,
    actorRole: role,
    createdAt: new Date().toISOString()
  });
  return { ok: true };
});
