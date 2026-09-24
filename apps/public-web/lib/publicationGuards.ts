export class PublicationRequestError extends Error {
  constructor(message: string, public readonly status: number = 400) {
    super(message);
  }
}

export type PublicationPreconditions = {
  expectedDraftUpdatedAt?: string | null;
  expectedPublishedVersion?: number;
};

export function readPublicationPreconditions(value: unknown): PublicationPreconditions {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PublicationRequestError("A publication request must be an object.");
  }
  const input = value as Record<string, unknown>;
  const draft = input.expectedDraftUpdatedAt;
  const version = input.expectedPublishedVersion;
  if (draft !== undefined && draft !== null && (typeof draft !== "string" || !draft.trim())) {
    throw new PublicationRequestError("The draft revision is invalid.");
  }
  if (version !== undefined && (typeof version !== "number" || !Number.isSafeInteger(version) || version < 0)) {
    throw new PublicationRequestError("The published version is invalid.");
  }
  return { expectedDraftUpdatedAt: draft as string | null | undefined, expectedPublishedVersion: version as number | undefined };
}

export function assertPublicationPreconditions(
  current: { draftUpdatedAt: string | null; publishedVersion?: number },
  expected: PublicationPreconditions
) {
  if (expected.expectedDraftUpdatedAt !== undefined && expected.expectedDraftUpdatedAt !== current.draftUpdatedAt) {
    throw new PublicationRequestError("The saved draft changed in another session. Load the latest draft before saving or publishing.", 409);
  }
  if (expected.expectedPublishedVersion !== undefined && expected.expectedPublishedVersion !== current.publishedVersion) {
    throw new PublicationRequestError("A newer public version exists. Reload and review the latest draft before publishing.", 409);
  }
}
