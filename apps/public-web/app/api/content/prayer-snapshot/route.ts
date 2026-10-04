import { createWidgetPrayerSnapshot } from "@hbic/shared";
import { jsonResponse, optionsResponse } from "../../../../lib/api";
import { getPublishedContent } from "../../../../lib/contentStore";
import { publicReadHeaders } from "../../../../lib/publicReadPolicy";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  const { content } = await getPublishedContent();
  return jsonResponse({
    ok: true,
    snapshot: createWidgetPrayerSnapshot(content)
  }, { headers: publicReadHeaders });
}
