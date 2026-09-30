import { getAuth } from "firebase-admin/auth";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";
import { getFirebaseApp } from "../../../../../lib/contentStore";

export const dynamic = "force-dynamic";

export function OPTIONS() { return optionsResponse(); }

// This endpoint grants no access to records. It only prepares TOTP for a
// verified, production-allowlisted personal account so shared publishing
// credentials are not needed for administrator onboarding.
export async function POST(request: Request) {
  const app = getFirebaseApp();
  const bearer = request.headers.get("authorization");
  if (!app || !bearer?.startsWith("Bearer ")) {
    return jsonResponse({ ok: false, error: "Sign in with your personal account first." }, { status: 401 });
  }
  const auth = getAuth(app);
  let stage = "verify-token";
  try {
    const token = await auth.verifyIdToken(bearer.slice(7));
    const email = token.email?.trim().toLowerCase();
    const allowed = new Set((process.env.ADMIN_SUPER_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
    if (!email || !token.email_verified || !allowed.has(email)) {
      return jsonResponse({ ok: false, error: "This verified email is not approved for administrator access." }, { status: 403 });
    }
    stage = "read-project-config";
    const config = await auth.projectConfigManager().getProjectConfig();
    const active = config.multiFactorConfig?.state === "ENABLED" &&
      config.multiFactorConfig.providerConfigs?.some((provider) => provider.state === "ENABLED" && Boolean(provider.totpProviderConfig));
    if (!active) {
      stage = "enable-totp";
      await auth.projectConfigManager().updateProjectConfig({
        multiFactorConfig: { state: "ENABLED", providerConfigs: [{ state: "ENABLED", totpProviderConfig: { adjacentIntervals: 2 } }] }
      });
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    const detail = error instanceof Error ? error.message.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "[email]").slice(0, 400) : "unknown";
    console.error("Approved admin MFA preparation failed:", stage, code, detail);
    return jsonResponse({ ok: false, error: "Authenticator setup is unavailable. HBIC must enable TOTP in Firebase Authentication or grant the service account project-configuration access." }, { status: 503 });
  }
}
