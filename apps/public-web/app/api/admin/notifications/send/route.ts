import type { NotificationAudience, NotificationRoute, NotificationType } from "@hbic/shared";
import { sendPushNotification } from "../../../../../lib/notificationStore";
import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const auth = requireAdminSecret(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      audience?: NotificationAudience | "Android" | "iOS" | "Everyone";
      route?: NotificationRoute;
      type?: NotificationType;
    };

    if (!body.title?.trim()) return jsonResponse({ ok: false, error: "Notification title is required." }, { status: 400 });
    if (!body.body?.trim()) return jsonResponse({ ok: false, error: "Notification body is required." }, { status: 400 });

    const result = await sendPushNotification({
      title: body.title.trim(),
      body: body.body.trim(),
      audience: body.audience ?? "All",
      route: body.route ?? "/",
      type: body.type ?? "announcement"
    });

    return jsonResponse({ ok: true, result });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to send notification." }, { status: 500 });
  }
}
