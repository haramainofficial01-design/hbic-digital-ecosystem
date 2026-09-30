import type { NotificationPreference } from "@hbic/shared";
import { NotificationInputError, registerPushToken, unregisterPushToken } from "../../../../lib/notificationStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      previousToken?: string;
      installationId?: string;
      platform?: "ios" | "android" | "web" | "unknown";
      deviceName?: string;
      appVersion?: string;
      environment?: "development" | "production";
      preferences?: Partial<NotificationPreference>;
      prayerChangePreferences?: { enabled: boolean; prayers: Record<"fajr" | "dhuhr" | "asr" | "maghrib" | "isha", boolean> };
    };
    if (!body.token) {
      return jsonResponse({ ok: false, error: "Push token is required." }, { status: 400 });
    }

    const token = await registerPushToken({
      token: body.token,
      previousToken: body.previousToken,
      installationId: body.installationId,
      platform: body.platform,
      deviceName: body.deviceName,
      appVersion: body.appVersion,
      environment: body.environment,
      preferences: body.preferences,
      prayerChangePreferences: body.prayerChangePreferences
    });
    return jsonResponse({ ok: true, platform: token.platform });
  } catch (error) {
    const status = error instanceof NotificationInputError ? 400 : 500;
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to register push token." }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; installationId?: string };
    if (!body.token) {
      return jsonResponse({ ok: false, error: "Push token is required." }, { status: 400 });
    }
    await unregisterPushToken(body.token, body.installationId);
    return jsonResponse({ ok: true });
  } catch (error) {
    const status = error instanceof NotificationInputError ? 400 : 500;
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to remove push token." }, { status });
  }
}
