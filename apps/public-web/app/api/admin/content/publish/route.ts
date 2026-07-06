import { revalidatePath } from "next/cache";
import { publicRevalidationPaths } from "@hbic/shared";
import { publishDraftContent } from "../../../../../lib/contentStore";
import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const auth = requireAdminSecret(request);
  if (!auth.ok) return auth.response;

  try {
    const published = await publishDraftContent();
    publicRevalidationPaths.forEach((path) => revalidatePath(path));

    return jsonResponse({
      ok: true,
      content: published.content,
      backend: published.status,
      revalidated: publicRevalidationPaths
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to publish draft." }, { status: 500 });
  }
}
