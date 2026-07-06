import { normalizeContent, validateContent } from "@hbic/shared";
import { getDraftContent, saveDraftContent } from "../../../../../lib/contentStore";
import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const auth = requireAdminSecret(request);
  if (!auth.ok) return auth.response;

  const { content, status } = await getDraftContent();
  return jsonResponse({ ok: true, content, backend: status });
}

export async function POST(request: Request) {
  const auth = requireAdminSecret(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { content?: unknown };
    const content = normalizeContent((body.content ?? body) as Parameters<typeof normalizeContent>[0]);
    const errors = validateContent(content);

    if (errors.length) {
      return jsonResponse({ ok: false, error: errors.join(" "), errors }, { status: 400 });
    }

    const saved = await saveDraftContent(content);
    return jsonResponse({ ok: true, content: saved.content, backend: saved.status });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to save draft." }, { status: 500 });
  }
}
