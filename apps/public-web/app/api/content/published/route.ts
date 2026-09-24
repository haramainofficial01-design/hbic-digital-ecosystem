import { toPublicContent } from "@hbic/shared";
import { getPublishedContent } from "../../../../lib/contentStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  const { content, status } = await getPublishedContent();
  return jsonResponse({ ok: true, content: toPublicContent(content), backend: status });
}
