import type { HalalRestaurant, RestaurantInterestStatus } from "@hbic/shared";
import { revalidatePath } from "next/cache";
import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../lib/api";
import {
  deleteRestaurantInterestSubmission,
  getHalalAdminData,
  saveHalalRestaurant,
  updateRestaurantInterestSubmission
} from "../../../../lib/halalStore";
import { getPublishedContentVersion } from "../../../../lib/contentStore";
import { sendContentUpdateSignal } from "../../../../lib/notificationStore";
import { recordPublicationUpdate } from "../../../../lib/publicationStore";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function DELETE(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as { id?: string };
    if (!body.id) return jsonResponse({ ok: false, error: "Submission ID is required." }, { status: 400 });
    await deleteRestaurantInterestSubmission(body.id);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to delete the directory submission." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;
  try {
    return jsonResponse({ ok: true, ...(await getHalalAdminData()) });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to load directory moderation." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as {
      action?: "update-submission" | "save-restaurant";
      id?: string;
      status?: RestaurantInterestStatus;
      adminNote?: string;
      restaurant?: HalalRestaurant;
    };
    let propagation;
    if (body.action === "update-submission" && body.id && body.status) {
      await updateRestaurantInterestSubmission({ id: body.id, status: body.status, adminNote: body.adminNote });
    } else if (body.action === "save-restaurant" && body.restaurant) {
      const saved = await saveHalalRestaurant(body.restaurant);
      if (saved.publicChanged) {
        revalidatePath("/halal-restaurants");
        const content = await getPublishedContentVersion();
        const publication = await recordPublicationUpdate({ kind: "halal-directory", contentVersion: content.version });
        try {
          propagation = await sendContentUpdateSignal({
            contentVersion: content.version,
            publicationRevision: publication.revision,
            publishedAt: publication.updatedAt
          });
        } catch (error) {
          propagation = { status: "provider_error", error: error instanceof Error ? error.message : "Device refresh failed." };
        }
      }
    } else {
      return jsonResponse({ ok: false, error: "A valid moderation action is required." }, { status: 400 });
    }
    return jsonResponse({ ok: true, propagation });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to save directory moderation." }, { status: 500 });
  }
}
