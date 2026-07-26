import { sendLatestRegisteredPrivatePushTest, sendPrivatePushTest } from "../../../../../lib/notificationStore";
import { jsonResponse, optionsResponse, requireAdminSecret, requirePrivateNotificationTestSecret } from "../../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const testAuthorization = requirePrivateNotificationTestSecret(request);
  const adminAuthorization = testAuthorization.ok ? null : requireAdminSecret(request);
  if (!testAuthorization.ok && !adminAuthorization?.ok) return adminAuthorization?.response ?? testAuthorization.response;

  try {
    const body = (await request.json()) as { token?: string; platform?: "ios" | "android" };
    if (!body.platform) {
      return jsonResponse({ ok: false, error: "A platform is required." }, { status: 400 });
    }

    const result = testAuthorization.ok
      ? await sendLatestRegisteredPrivatePushTest(body.platform)
      : body.token
        ? await sendPrivatePushTest({ token: body.token, platform: body.platform })
        : null;
    if (!result) {
      return jsonResponse({ ok: false, error: "A single device token is required for this admin test." }, { status: 400 });
    }
    return jsonResponse({ ok: true, result });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to send the private test notification." }, { status: 500 });
  }
}
