import { NotificationInputError, sendPrivatePushTestCode, sendPrivatePushTest } from "../../../../../lib/notificationStore";
import { jsonResponse, optionsResponse, requireAdminSecret, requirePrivateNotificationTestSecret } from "../../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const testAuthorization = requirePrivateNotificationTestSecret(request);
  const adminAuthorization = testAuthorization.ok ? null : await requireAdminSecret(request);
  if (!testAuthorization.ok && !adminAuthorization?.ok) return adminAuthorization?.response ?? testAuthorization.response;

  try {
    const body = (await request.json()) as { code?: string; token?: string; platform?: "ios" | "android"; requestId?: string };
    const actorKey = adminAuthorization?.ok ? adminAuthorization.actor.email : "private-test";
    const result = body.code ? await sendPrivatePushTestCode({ code: body.code, requestId: body.requestId, actorKey })
      : body.token && ["ios", "android"].includes(body.platform ?? "") ? await sendPrivatePushTest({ token: body.token, platform: body.platform!, requestId: body.requestId, actorKey }) : null;
    if (!result) {
      return jsonResponse({ ok: false, error: "An explicitly authorized registered device code or token is required. No notification was sent." }, { status: 400 });
    }
    return jsonResponse({ ok: true, result });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to send the private test notification." }, { status: error instanceof NotificationInputError ? 400 : 500 });
  }
}
