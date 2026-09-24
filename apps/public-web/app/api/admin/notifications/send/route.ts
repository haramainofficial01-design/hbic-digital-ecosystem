import type { NotificationAudience, NotificationRoute, NotificationType } from "@hbic/shared";
import { NotificationInputError, sendPushNotification } from "../../../../../lib/notificationStore";
import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      audience?: NotificationAudience | "Android" | "iOS" | "Everyone";
      route?: NotificationRoute;
      type?: NotificationType;
      eventId?: string;
    };

    if (!body.title?.trim()) return jsonResponse({ ok: false, error: "Notification title is required." }, { status: 400 });
    if (!body.body?.trim()) return jsonResponse({ ok: false, error: "Notification body is required." }, { status: 400 });

    const result = await sendPushNotification({
      title: body.title.trim(),
      body: body.body.trim(),
      audience: body.audience ?? "All",
      route: body.route ?? "/",
      type: body.type ?? "announcement",
      data: body.route === "/events" && body.eventId?.trim()
        ? { eventId: body.eventId.trim().slice(0, 160) }
        : undefined
    });

    return jsonResponse({ ok: true, result });
  } catch (error) {
    const status = error instanceof NotificationInputError || (error instanceof Error && error.message.includes("scheduled locally")) ? 400 : 500;
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to send notification." }, { status });
  }
}
