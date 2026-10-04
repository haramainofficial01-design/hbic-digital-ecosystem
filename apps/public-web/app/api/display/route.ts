import { createWidgetPrayerSnapshot, toPublicContent, dateStringInTimeZone, masjidTimeZone } from "@hbic/shared";
import { jsonResponse, optionsResponse } from "../../../lib/api";
import { getPublishedContent } from "../../../lib/contentStore";
import { createReadCache } from "../../../lib/readCache";
import { publicReadHeaders, publicReadTtlMs, registerPublicReadInvalidator } from "../../../lib/publicReadPolicy";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

async function readDisplay(fresh = false) {
  const { content } = await getPublishedContent({ fresh });
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
}
const displayReads = createReadCache(() => readDisplay(), publicReadTtlMs);
registerPublicReadInvalidator(displayReads.clear);

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.has("verify")) {
    return jsonResponse(await readDisplay(true), { headers: { "Cache-Control": "no-store" } });
  }
  return jsonResponse(await displayReads.get(dateStringInTimeZone(new Date(), masjidTimeZone)), { headers: publicReadHeaders });
}
