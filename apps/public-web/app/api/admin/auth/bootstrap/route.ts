import { randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { optionsResponse, requireAdminSecret, jsonResponse } from "../../../../../lib/api";
import { getDatabase, getFirebaseApp } from "../../../../../lib/contentStore";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const authorization = await requireAdminSecret(request);
  if (!authorization.ok) return authorization.response;
  if (authorization.actor.kind !== "shared-account") {
    return jsonResponse({ ok: false, error: "The bootstrap credential is no longer available." }, { status: 409 });
  }

  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const allowed = new Set(
    (process.env.ADMIN_SUPER_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
  if (!email || !allowed.has(email)) {
    return jsonResponse({ ok: false, error: "This email is not approved for super-admin bootstrap." }, { status: 403 });
  }

  const app = getFirebaseApp();
  const database = getDatabase();
  if (!app || !database) {
    return jsonResponse({ ok: false, error: "Firebase administration is not configured." }, { status: 503 });
  }

  const auth = getAuth(app);
  let created = false;
  let user;
  try {
    user = await auth.getUserByEmail(email);
    user = await auth.updateUser(user.uid, { disabled: false, emailVerified: true });
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    user = await auth.createUser({
      email,
      emailVerified: true,
      password: randomBytes(36).toString("base64url"),
      displayName: "HBIC Super Admin"
    });
    created = true;
  }

  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), adminRole: "superAdmin" });
  const now = new Date().toISOString();
  await Promise.all([
    database.collection("adminRoles").doc(user.uid).set({ email, role: "superAdmin", active: true, updatedAt: now }, { merge: true }),
    database.collection("users").doc(user.uid).set({ email, displayName: user.displayName ?? "HBIC Super Admin", adminRole: "superAdmin", updatedAt: now }, { merge: true }),
    database.collection("auditLogs").add({
      action: created ? "admin.bootstrap.created" : "admin.bootstrap.updated",
      collection: "adminRoles",
      recordId: user.uid,
      actorName: authorization.actor.email,
      actorRole: "migration-bootstrap",
      targetEmail: email,
      createdAt: now
    })
  ]);

  return jsonResponse({
    ok: true,
    email,
    uid: user.uid,
    created,
    role: "superAdmin",
    passwordResetRequired: true
  });
}
