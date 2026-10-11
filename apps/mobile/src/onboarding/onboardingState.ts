export const onboardingSchemaVersion = 1;
export const currentOnboardingVersion = 1;
export const onboardingPageCount = 7;

export type OnboardingCompletionSource = "first-install" | "legacy-migration" | "settings-replay";

export interface OnboardingRecord {
  schemaVersion: typeof onboardingSchemaVersion;
  completedVersion: number;
  currentStep: number;
  status: "in-progress" | "complete";
  source: OnboardingCompletionSource;
  updatedAt: string;
}
export function createOnboardingRecord({
  currentStep = 0,
  source = "first-install",
  status = "in-progress",
  now = new Date()
}: {
  currentStep?: number;
  source?: OnboardingCompletionSource;
  status?: OnboardingRecord["status"];
  now?: Date;
} = {}): OnboardingRecord {
  return {
    schemaVersion: onboardingSchemaVersion,
    completedVersion: status === "complete" ? currentOnboardingVersion : 0,
    currentStep,
    status,
    source,
    updatedAt: now.toISOString()
  };
}

export function normalizeOnboardingRecord(value: unknown): OnboardingRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<OnboardingRecord>;
  if (candidate.schemaVersion !== onboardingSchemaVersion) return null;
  if (candidate.status !== "in-progress" && candidate.status !== "complete") return null;
  if (!Number.isInteger(candidate.currentStep) || (candidate.currentStep ?? -1) < 0) return null;
  if (typeof candidate.completedVersion !== "number") return null;
  if (typeof candidate.updatedAt !== "string") return null;
  const source = candidate.source;
  if (source !== "first-install" && source !== "legacy-migration" && source !== "settings-replay") return null;
  return candidate as OnboardingRecord;
}

export function shouldPresentOnboarding(record: OnboardingRecord | null) {
  if (!record) return true;
  return record.status !== "complete" || record.completedVersion < currentOnboardingVersion;
}
