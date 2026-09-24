import type {
  AskMasjidSubmissionInput,
  CommunityPublicationStatus,
  DailyBenefit,
  LocalMuslimService,
  NewMuslimResource,
  VolunteerOpportunity
} from "./types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function plainText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function validateAskMasjidSubmission(
  input: unknown,
  allowedCategories: readonly string[]
): { value?: AskMasjidSubmissionInput; errors: string[] } {
  const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const category = plainText(raw.category, 100);
  const value: AskMasjidSubmissionInput = {
    name: plainText(raw.name, 120),
    email: plainText(raw.email, 200).toLowerCase(),
    category,
    question: plainText(raw.question, 3_000),
    consent: raw.consent === true,
    websiteField: plainText(raw.websiteField, 200),
    startedAt: typeof raw.startedAt === "number" ? raw.startedAt : undefined
  };
  const errors: string[] = [];

  if (value.websiteField) errors.push("Unable to accept this submission.");
  if (!emailPattern.test(value.email)) errors.push("Enter a valid email address.");
  if (!allowedCategories.includes(value.category)) errors.push("Choose a valid question category.");
  if (value.question.length < 10) errors.push("Enter a little more detail so the team can route your question.");
  if (!value.consent) errors.push("Consent is required.");
  if (value.startedAt && Date.now() - value.startedAt < 2_000) errors.push("Please review the form before submitting.");

  return errors.length ? { errors } : { value, errors };
}

function isPublished(status: CommunityPublicationStatus, visible: boolean) {
  return status === "published" && visible;
}

export function getPublishedNewMuslimResources(resources: readonly NewMuslimResource[]) {
  return resources
    .filter((resource) => isPublished(resource.status, resource.visible))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getPublishedLocalServices(services: readonly LocalMuslimService[]) {
  return services
    .filter((service) => isPublished(service.status, service.visible))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getCurrentDailyBenefit(benefits: readonly DailyBenefit[], now = new Date()) {
  const timestamp = now.getTime();
  return benefits.find((benefit) => {
    if (!isPublished(benefit.status, benefit.visible)) return false;
    const startsAt = Date.parse(benefit.publishFrom);
    const endsAt = benefit.publishUntil ? Date.parse(benefit.publishUntil) : Number.POSITIVE_INFINITY;
    return Number.isFinite(startsAt) && startsAt <= timestamp && timestamp < endsAt;
  }) ?? null;
}

export function getPublicVolunteerOpportunities(
  opportunities: readonly VolunteerOpportunity[],
  today = new Date().toISOString().slice(0, 10)
) {
  return opportunities.filter((opportunity) => {
    if (opportunity.visible === false || opportunity.status === "closed" || opportunity.status === "full") return false;
    return !opportunity.date || opportunity.date >= today;
  });
}
