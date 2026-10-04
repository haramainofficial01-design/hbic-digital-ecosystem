import { toPublicContent } from "@hbic/shared";
import { getPublishedContent } from "../../../../lib/contentStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";
import { publicReadHeaders } from "../../../../lib/publicReadPolicy";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  // Explicit administrator publish/compare checks must not read the public TTL
  // cache. These are one-off actions, not the automatic polling path.
  const fresh = ["verify", "compare", "prayerPanel"].some((key) => query?.has(key));
  const { content, status } = await getPublishedContent({ fresh });
  return jsonResponse({ ok: true, content: toPublicContent(content), backend: status }, { headers: fresh ? { "Cache-Control": "no-store" } : publicReadHeaders });
}
