import { getPublishedContent } from "../../../../lib/contentStore";
import { getPublicHalalRestaurants } from "../../../../lib/halalStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  const { content } = await getPublishedContent();
  const restaurants = await getPublicHalalRestaurants(content.featureFlags.halalDirectoryListingsEnabled);
  return jsonResponse({ ok: true, restaurants });
}
