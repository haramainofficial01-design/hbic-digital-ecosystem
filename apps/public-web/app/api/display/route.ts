import { createWidgetPrayerSnapshot, toPublicContent, dateStringInTimeZone, masjidTimeZone } from "@hbic/shared";
import { jsonResponse, optionsResponse } from "../../../lib/api";
import { getPublishedContent } from "../../../lib/contentStore";
import { createReadCache } from "../../../lib/readCache";
import { publicReadHeaders, publicReadTtlMs, registerPublicReadInvalidator } from "../../../lib/publicReadPolicy";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

const displayReads = createReadCache(async () => {
  const { content } = await getPublishedContent();
  const publicContent = toPublicContent(content);
  return {
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
  };
}, publicReadTtlMs);
registerPublicReadInvalidator(displayReads.clear);

export async function GET() {
  return jsonResponse(await displayReads.get(dateStringInTimeZone(new Date(), masjidTimeZone)), { headers: publicReadHeaders });
}
