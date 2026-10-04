import { getPublishedContentVersion } from "../../../../lib/contentStore";
import { getPublicationState } from "../../../../lib/publicationStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";
import { createReadCache } from "../../../../lib/readCache";
import { publicReadHeaders, publicReadTtlMs, registerPublicReadInvalidator } from "../../../../lib/publicReadPolicy";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

const versionReads = createReadCache(async () => {
    const [content, publication] = await Promise.all([getPublishedContentVersion(), getPublicationState()]);
    return {
      ok: true,
      version: content.version,
      publicationRevision: publication.revision,
      publicationKind: publication.kind,
      publicationUpdatedAt: publication.updatedAt,
      updatedAt: content.updatedAt,
      publishedAt: content.publishedAt
    };
}, publicReadTtlMs);
registerPublicReadInvalidator(versionReads.clear);

export async function GET() {
  try {
    return jsonResponse(await versionReads.get(), { headers: publicReadHeaders });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Published version is unavailable." }, { status: 503 });
  }
}
