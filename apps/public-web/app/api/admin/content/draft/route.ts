import { normalizeContent, validateContent } from "@hbic/shared";
import { getDraftContent, saveDraftContent } from "../../../../../lib/contentStore";
import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../../lib/api";
import { PublicationRequestError, readPublicationPreconditions } from "../../../../../lib/publicationGuards";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;

  const { content, status, draftUpdatedAt } = await getDraftContent();
  return jsonResponse({ ok: true, content, backend: status, draftUpdatedAt });
}

export async function POST(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { content?: unknown; expectedDraftUpdatedAt?: unknown };
    const content = normalizeContent((body.content ?? body) as Parameters<typeof normalizeContent>[0]);
    const expected = readPublicationPreconditions(body);
    const errors = validateContent(content);

    if (errors.length) {
      return jsonResponse({ ok: false, error: errors.join(" "), errors }, { status: 400 });
    }

    const saved = await saveDraftContent(content, expected);
    return jsonResponse({ ok: true, content: saved.content, backend: saved.status, draftUpdatedAt: saved.draftUpdatedAt });
  } catch (error) {
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Unable to save draft." },
      { status: error instanceof PublicationRequestError ? error.status : 500 }
    );
  }
}
