import { checkPushNotificationReceipts } from "../../../../../lib/notificationStore";
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
    const body = (await request.json()) as { logId?: string };
    if (!body.logId?.trim()) return jsonResponse({ ok: false, error: "Notification delivery ID is required." }, { status: 400 });
    const result = await checkPushNotificationReceipts(body.logId.trim(), { privateTestOnly: testAuthorization.ok });
    return jsonResponse({ ok: true, result });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to check notification delivery." }, { status: 500 });
  }
}
