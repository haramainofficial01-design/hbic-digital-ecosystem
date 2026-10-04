import { revalidatePath } from "next/cache";
import { createWidgetPrayerSnapshot } from "@hbic/shared";
import { getDraftContent, getDatabase, getPublishedContent } from "../../../../lib/contentStore";
import { applyPrayerSync, forcePrayerSync } from "../../../../lib/prayerSync";
import { sendContentUpdateSignal } from "../../../../lib/notificationStore";
import { recordPublicationUpdate } from "../../../../lib/publicationStore";
import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;

  const db = getDatabase();
  const { content, status } = await getDraftContent();
  // The panel must describe the same resolved feed used by the public display,
  // even when the diagnostic cache document has not been populated yet.
  const prayerSync = (await applyPrayerSync(content, db, { preview: true })).status;
  return jsonResponse({ ok: true, backend: status, prayerSync });
}

export async function POST(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;

  try {
    const db = getDatabase();
    const { content, status } = await getPublishedContent({ fresh: true });
    const synced = await forcePrayerSync(content, db);
    revalidatePath("/");
    revalidatePath("/prayer-times");
    const contentVersion = content.version;
    const publication = await recordPublicationUpdate({ kind: "prayer-sync", contentVersion });
    const snapshot = createWidgetPrayerSnapshot(synced.content, new Date());
    let propagation;
    try {
      propagation = await sendContentUpdateSignal({
        contentVersion,
        publicationRevision: publication.revision,
        scheduleRevision: snapshot.scheduleRevision,
        publishedAt: publication.updatedAt
      });
    } catch (error) {
      propagation = { status: "provider_error", error: error instanceof Error ? error.message : "Device refresh failed." };
    }
    return jsonResponse({ ok: true, content: synced.content, backend: status, prayerSync: synced.status, publication, propagation });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to sync prayer data." }, { status: 500 });
  }
}
