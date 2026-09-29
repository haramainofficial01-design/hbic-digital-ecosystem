import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseApp } from "./firebaseAdmin";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Private-Notification-Test",
  "Access-Control-Max-Age": "86400"
};

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers ?? {})
    }
  });
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getBasicCredentials(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(authorization.slice("Basic ".length), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 1) return null;
    return { email: decoded.slice(0, separator).trim().toLowerCase(), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

function configuredSuperAdmins() {
  return new Set(
    (process.env.ADMIN_SUPER_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function requireAdminSecret(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const app = getFirebaseApp();
    if (!app) {
      return {
        ok: false as const,
        response: jsonResponse({ ok: false, error: "Individual administrator sign-in is not configured." }, { status: 503 })
      };
    }
    try {
      // Verify the signed token locally. The production service account does not
      // have permission to look up Auth users, so getUser/checkRevoked blocks
      // otherwise-valid personal admin sessions.
      const token = await getAuth(app).verifyIdToken(authorization.slice("Bearer ".length));
      const email = token.email?.trim().toLowerCase();
      const allowlistedRole = email && configuredSuperAdmins().has(email) ? "superAdmin" : undefined;
      const role = typeof token.adminRole === "string" ? token.adminRole : allowlistedRole;
      // Enrollment alone is insufficient: this claim is issued only after an
      // actual MFA sign-in challenge. Keep Academy child records MFA-protected.
      if (!email || !token.email_verified || !role || !token.firebase?.sign_in_second_factor) throw new Error("unauthorized");
      return {
        ok: true as const,
        actor: { uid: token.uid, email, role, kind: "firebase-account" as const }
      };
    } catch {
      return {
        ok: false as const,
        response: jsonResponse({ ok: false, error: "Administrator sign-in or MFA verification is required." }, { status: 401 })
      };
    }
  }

  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredEmail || !configuredPassword) {
    return {
      ok: false as const,
      response: jsonResponse(
        {
          ok: false,
          error: "Administrator sign-in is not configured on this deployment."
        },
        { status: 503 }
      )
    };
  }

  const provided = getBasicCredentials(request);
  if (!provided || !safeEqual(provided.email, configuredEmail) || !safeEqual(provided.password, configuredPassword)) {
    return {
      ok: false as const,
      response: jsonResponse({ ok: false, error: "Unable to sign in. Check your credentials and try again." }, { status: 401 })
    };
  }

  return { ok: true as const, actor: { email: configuredEmail, kind: "shared-account" as const } };
}

/**
 * This is intentionally separate from the normal publishing credential. It is
 * only used for one-device delivery checks and is disabled when its short-lived
 * production environment variable is removed.
 */
export function requirePrivateNotificationTestSecret(request: Request) {
  const configuredSecret = process.env.PRIVATE_NOTIFICATION_TEST_SECRET;
  if (!configuredSecret) {
    return {
      ok: false as const,
      response: jsonResponse({ ok: false, error: "Private notification testing is not enabled." }, { status: 404 })
    };
  }

  if (request.headers.get("x-private-notification-test") !== configuredSecret) {
    return {
      ok: false as const,
      response: jsonResponse({ ok: false, error: "Private notification test authorization failed." }, { status: 401 })
    };
  }

  return { ok: true as const };
}
