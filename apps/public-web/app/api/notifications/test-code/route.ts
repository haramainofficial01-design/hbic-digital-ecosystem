import { createPrivatePushTestCode, NotificationInputError } from "../../../../lib/notificationStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";
export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.token !== "string" || typeof body.installationId !== "string") return jsonResponse({ ok: false, error: "Registered device proof is required." }, { status: 400 });
    const result = await createPrivatePushTestCode({ token: body.token, installationId: body.installationId });
    return jsonResponse({ ok: true, ...result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Device code unavailable." }, { status: error instanceof NotificationInputError ? 403 : 500 }); }
}
