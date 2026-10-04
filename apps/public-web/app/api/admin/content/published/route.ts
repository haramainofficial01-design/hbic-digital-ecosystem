import { getPublishedContent } from "../../../../../lib/contentStore";
import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;

  try {
    const { content, status } = await getPublishedContent({ fresh: true });
    return jsonResponse({ ok: true, content, backend: status });
  } catch (error) {
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Unable to load the protected published record." },
      { status: 500 }
    );
  }
}
