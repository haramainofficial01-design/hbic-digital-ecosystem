import { createRestaurantInterestSubmission } from "../../../../lib/halalStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  try {
    const result = await createRestaurantInterestSubmission(request, await request.json());
    if (!result.ok) return jsonResponse(result, { status: result.status });
    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit this form right now.";
    const rateLimited = message.startsWith("Too many submissions");
    return jsonResponse({ ok: false, error: message }, { status: rateLimited ? 429 : 503 });
  }
}
