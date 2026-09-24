import type { AskMasjidSubmissionStatus } from "@hbic/shared";
import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../lib/api";
import {
  deleteAskMasjidSubmission,
  getAskMasjidAdminData,
  updateAskMasjidSubmission
} from "../../../../lib/communityStore";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function DELETE(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as { id?: string };
    if (!body.id) return jsonResponse({ ok: false, error: "Question ID is required." }, { status: 400 });
    await deleteAskMasjidSubmission(body.id);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Unable to delete the private question." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;
  try {
    return jsonResponse({ ok: true, submissions: await getAskMasjidAdminData() });
  } catch (error) {
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Unable to load private questions." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as {
      id?: string;
      status?: AskMasjidSubmissionStatus;
      routedTo?: string;
      adminNote?: string;
    };
    if (!body.id || !body.status) {
      return jsonResponse({ ok: false, error: "Question ID and status are required." }, { status: 400 });
    }
    await updateAskMasjidSubmission(body as Required<Pick<typeof body, "id" | "status">> & typeof body);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Unable to update the private question." },
      { status: 500 }
    );
  }
}
