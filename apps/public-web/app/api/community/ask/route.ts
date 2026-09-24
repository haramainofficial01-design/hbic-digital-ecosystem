import { createAskMasjidSubmission } from "../../../../lib/communityStore";
import { getPublishedContent } from "../../../../lib/contentStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  try {
    const { content } = await getPublishedContent();
    if (!content.featureFlags.askMasjidEnabled || !content.askMasjidSettings.enabled) {
      return jsonResponse({ ok: false, error: "Private questions are not currently open." }, { status: 404 });
    }
    const result = await createAskMasjidSubmission(
      request,
      await request.json(),
      content.askMasjidSettings
    );
    if (!result.ok) return jsonResponse(result, { status: result.status });
    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit this question right now.";
    const rateLimited = message.startsWith("Too many submissions");
    return jsonResponse({ ok: false, error: message }, { status: rateLimited ? 429 : 503 });
  }
}
