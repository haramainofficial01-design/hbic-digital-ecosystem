import "server-only";

import { getDatabase } from "./contentStore";
import { invalidatePublicReads } from "./publicReadPolicy";

const publicationStateRef = () => getDatabase()?.collection("publicationState").doc("current") ?? null;

export type PublicationKind = "content" | "halal-directory" | "prayer-sync";

export async function getPublicationState() {
  const ref = publicationStateRef();
  if (!ref) return { revision: 0, updatedAt: new Date(0).toISOString(), kind: "content" as PublicationKind };
  const snapshot = await ref.get();
  const data = snapshot.data();
  return {
    revision: Number(data?.revision ?? 0),
    updatedAt: String(data?.updatedAt ?? new Date(0).toISOString()),
    kind: (data?.kind ?? "content") as PublicationKind,
    contentVersion: typeof data?.contentVersion === "number" ? data.contentVersion : undefined
  };
}

export async function recordPublicationUpdate(input: { kind: PublicationKind; contentVersion?: number }) {
  const db = getDatabase();
  const ref = publicationStateRef();
  if (!db || !ref) throw new Error("Publication state storage is not configured.");
  const updatedAt = new Date().toISOString();
  const result = await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    const revision = Number(current.data()?.revision ?? 0) + 1;
    transaction.set(ref, {
      revision,
      updatedAt,
      kind: input.kind,
      ...(typeof input.contentVersion === "number" ? { contentVersion: input.contentVersion } : {})
    });
    return { revision, updatedAt, kind: input.kind, contentVersion: input.contentVersion };
  });
  invalidatePublicReads();
  return result;
}
