import { getPublishedContent, getDatabase } from "../../../../lib/contentStore";
import { getPrayerSyncStatus } from "../../../../lib/prayerSync";
import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../lib/api";
import { getPublicationState } from "../../../../lib/publicationStore";
import { runtimeSecurity } from "../../../../lib/runtimeSecurity";
import { serverBrotliContainmentStatus } from "../../../../lib/serverBrotliContainment";

// Cold-start evidence is available in protected hosting logs even when an
// unauthenticated request correctly receives 401. No secret is logged.
console.info("HBIC_SERVER_RUNTIME_SECURITY", JSON.stringify(runtimeSecurity()));

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth.response;

  try {
    const db = getDatabase();
    const { content, status } = await getPublishedContent();
    const prayerSync = await getPrayerSyncStatus(content, db);
    const publication = await getPublicationState();
    const tokenCount = db ? (await db.collection("pushTokens").where("enabled", "==", true).count().get()).data().count : 0;
    const latestPropagation = db
      ? (await db.collection("contentPropagationLogs").orderBy("sentAt", "desc").limit(1).get()).docs[0]?.data()
      : undefined;

    return jsonResponse({
      ok: true,
      backend: status,
      diagnostics: {
        runtimeSecurity: runtimeSecurity(),
        brotliContainment: serverBrotliContainmentStatus(),
        databaseConfigured: status.configured,
        databaseMode: status.mode,
        schemaVersion: "hbic-content-v1",
        latestPublishedVersion: content.version,
        latestPublishedAt: content.publishedAt,
        latestUpdatedAt: content.updatedAt,
        publicationRevision: publication.revision,
        publicationKind: publication.kind,
        publicationUpdatedAt: publication.updatedAt,
        publicApiPath: "/api/content/published",
        activeOverridesCount: prayerSync.activeOverrides.length,
        pushTokenCount: tokenCount,
        notificationService: db ? "configured" : "unavailable",
        latestPropagationVersion: latestPropagation?.contentVersion,
        latestPropagationAt: latestPropagation?.sentAt,
        latestPropagationStatus: latestPropagation?.status,
        latestPropagationSuccessCount: latestPropagation?.successCount ?? 0,
        latestPropagationFailureCount: latestPropagation?.failureCount ?? 0
      },
      prayerSync
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to load diagnostics." }, { status: 500 });
  }
}
