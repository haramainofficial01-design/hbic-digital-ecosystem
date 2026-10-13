import { revalidatePath } from "next/cache";
import { createWidgetPrayerSnapshot, publicRevalidationPaths } from "@hbic/shared";
import { publishDraftContent } from "../../../../../lib/contentStore";
import { sendContentUpdateSignal } from "../../../../../lib/notificationStore";
import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../../lib/api";
import { PublicationRequestError, readPublicationPreconditions } from "../../../../../lib/publicationGuards";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;

  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const expected = readPublicationPreconditions(body);
    if (body.signalDevices !== undefined && typeof body.signalDevices !== "boolean") {
      throw new PublicationRequestError("The device refresh choice must be a boolean.");
    }
    const published = await publishDraftContent(expected);
    publicRevalidationPaths.forEach((path) => revalidatePath(path));
    const prayerSnapshot = createWidgetPrayerSnapshot(published.content, new Date());
    const publication = published.publication;
    let propagation;
    try {
      propagation = body.signalDevices === false ? { status: "skipped_by_request", successCount: 0, failureCount: 0 } : await sendContentUpdateSignal({
        contentVersion: published.content.version,
        publicationRevision: publication.revision,
        scheduleRevision: prayerSnapshot.scheduleRevision,
        publishedAt: published.content.publishedAt || published.content.updatedAt
      });
    } catch (error) {
      propagation = {
        status: "provider_error",
        error: error instanceof Error ? error.message : "The device refresh signal could not be sent."
      };
    }

    return jsonResponse({
      ok: true,
      content: published.content,
      backend: published.status,
      revalidated: publicRevalidationPaths,
      publication,
      propagation
    });
  } catch (error) {
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Unable to publish draft." },
      { status: error instanceof PublicationRequestError ? error.status : error instanceof SyntaxError ? 400 : 500 }
    );
  }
}
