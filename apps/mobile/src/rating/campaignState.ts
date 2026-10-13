import { validRatingCampaignId, type RatingCampaign } from "@hbic/shared";

export const ratingIdleDelayMs = 15_000;
export const ratingNotificationQuietMs = 120_000;
export const ratingPrayerBeforeMs = 2 * 60_000;
export const ratingPrayerAfterMs = 10 * 60_000;

export interface RatingEligibility {
  platform: string;
  campaign: RatingCampaign;
  homeReady: boolean;
  homeFocused: boolean;
  foreground: boolean;
  onboarding: boolean;
  contentFresh: boolean;
  notificationCheckComplete: boolean;
  nativeReviewAvailable: boolean;
  deferredUntil: number;
  prayerTimes: number[];
  now: number;
}

export function ratingIsEligible(input: RatingEligibility): boolean {
  return (input.platform === "android" || (input.platform === "ios" && input.nativeReviewAvailable))
    && input.campaign.enabled === true && validRatingCampaignId(input.campaign.id)
    && input.homeReady && input.homeFocused && input.foreground && !input.onboarding
    && input.contentFresh && input.notificationCheckComplete
    && input.now >= input.deferredUntil
    // Suppress invitations when the canonical prayer schedule is unavailable.
    && input.prayerTimes.length > 0 && input.prayerTimes.every(Number.isFinite)
    && !input.prayerTimes.some(time => input.now >= time - ratingPrayerBeforeMs && input.now <= time + ratingPrayerAfterMs);
}

interface CampaignRecord { version: 1; attempted: string[] }
export interface CampaignStorage { read: () => Promise<string | null>; write: (value: string) => Promise<void> }

function parseRecord(raw: string | null): CampaignRecord {
  if (raw === null) return { version: 1, attempted: [] };
  const value = JSON.parse(raw) as CampaignRecord;
  if (value.version !== 1 || !Array.isArray(value.attempted) || !value.attempted.every(validRatingCampaignId)) {
    throw new Error("Invalid rating campaign record");
  }
  return { version: 1, attempted: [...new Set(value.attempted)] };
}

/** Serialize claims, persist before presentation, and fail closed on storage errors. */
export class RatingCampaignLedger {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: CampaignStorage) {}

  claim(id: string, stillEligible: () => boolean): Promise<boolean> {
    const operation = this.queue.then(async () => {
      try {
        if (!validRatingCampaignId(id) || !stillEligible()) return false;
        const previous = parseRecord(await this.storage.read());
        if (previous.attempted.includes(id) || !stillEligible()) return false;
        await this.storage.write(JSON.stringify({ version: 1, attempted: [...previous.attempted, id] }));
        if (!stillEligible()) {
          // A notification/route change during the disk write is not a presentation.
          await this.storage.write(JSON.stringify(previous));
          return false;
        }
        return true;
      } catch { return false; }
    });
    this.queue = operation.catch(() => {});
    return operation;
  }

  /** Used only when the native API explicitly declined before making a request. */
  release(id: string): Promise<void> {
    const operation = this.queue.then(async () => {
      const record = parseRecord(await this.storage.read());
      await this.storage.write(JSON.stringify({ ...record, attempted: record.attempted.filter(value => value !== id) }));
    }).catch(() => {});
    this.queue = operation;
    return operation;
  }
}
