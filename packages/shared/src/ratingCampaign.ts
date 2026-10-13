import type { HbicContent } from "./content";

export interface RatingCampaign {
  id: string;
  enabled: boolean;
}

export const defaultRatingCampaign: RatingCampaign = {
  id: "hbic-rating-2026-10",
  enabled: false
};

export function validRatingCampaignId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value);
}

/** Old content, malformed flags and cached defaults cannot start a campaign. */
export function normalizeRatingCampaign(value: unknown): RatingCampaign {
  if (!value || typeof value !== "object") return { ...defaultRatingCampaign };
  const input = value as Record<string, unknown>;
  if (!validRatingCampaignId(input.id)) return { ...defaultRatingCampaign };
  return { id: input.id, enabled: input.enabled === true };
}
/** A rating-only publication must not broadcast a device refresh push. */
export function isRatingCampaignOnlyChange(before: HbicContent, after: HbicContent): boolean {
  if (JSON.stringify(normalizeRatingCampaign(before.settings.ratingCampaign)) === JSON.stringify(normalizeRatingCampaign(after.settings.ratingCampaign))) return false;
  // Key order and refresh bookkeeping are not user-visible content changes.
  // Actual prayer times, expiry dates, flags and every other setting still count.
  const stable = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stable);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).filter(([key, item]) =>
      item !== undefined && !["updatedAt", "lastUpdated", "importedAt"].includes(key)
    ).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  };
  const withoutCampaign = (content: HbicContent) => ({
    ...content, settings: { ...content.settings, ratingCampaign: undefined },
    status: undefined, version: undefined, updatedAt: undefined, publishedAt: undefined
  });
  return JSON.stringify(stable(withoutCampaign(before))) === JSON.stringify(stable(withoutCampaign(after)));
}
