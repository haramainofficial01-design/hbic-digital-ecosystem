import { getPublishedContentVersion } from "../../../../lib/contentStore";
import { getPublicationState } from "../../../../lib/publicationStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const [content, publication] = await Promise.all([getPublishedContentVersion(), getPublicationState()]);
    return jsonResponse({
      ok: true,
      version: content.version,
      publicationRevision: publication.revision,
      publicationKind: publication.kind,
      publicationUpdatedAt: publication.updatedAt,
      updatedAt: content.updatedAt,
      publishedAt: content.publishedAt
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Published version is unavailable." }, { status: 503 });
  }
}
