import { createWidgetPrayerSnapshot, toPublicContent } from "@hbic/shared";
import { jsonResponse, optionsResponse } from "../../../lib/api";
import { getPublishedContent } from "../../../lib/contentStore";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  const { content } = await getPublishedContent();
  const publicContent = toPublicContent(content);
  return jsonResponse({
    ok: true,
    contentVersion: content.version,
    snapshot: createWidgetPrayerSnapshot(content),
    display: {
      ...publicContent.displaySettings,
      social: publicContent.settings.social,
      contact: {
        address: publicContent.settings.address,
        phone: publicContent.settings.phone
      }
    }
  }, { headers: { "Cache-Control": "no-store" } });
}
