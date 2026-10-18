export const bilalTourCampaign = "hbic-bilal-welcome-2026-10-v1";
export const bilalTourSteps = [
  { title: "Meet Bilal", body: "Your Masjid Bilal guide, right here when you need a hand.", detail: "Ask about prayer times, Academy information, donations or using the app.", icon: "chat" },
  { title: "A question. A clear source.", body: "Choose a suggested question or write your own. Open the source link to check the published information.", detail: "Bilal uses HBIC’s published information. When an answer isn’t available, you’ll be directed to the office.", icon: "source" },
  { title: "Your space. Your choice.", body: "Open Bilal whenever you need help. Your language follows your settings, and Clear chat removes this conversation.", detail: "Never share personal, student or payment details. Bilal can’t access private accounts or give religious rulings.", icon: "privacy" }
] as const;

export interface BilalTourStorage { read(): Promise<string | null>; write(value: string | null): Promise<void> }
/** Local, persist-before-display claim. No chat, user identifier or server write. */
export class BilalTourLedger {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: BilalTourStorage) {}
  async seen(): Promise<boolean> {
    try { const value = await this.storage.read(); return value === null ? false : value === bilalTourCampaign || !/^hbic-bilal-welcome-[a-z0-9-]{1,80}$/.test(value); }
    catch { return true; }
  }
  claim(stillEligible: () => boolean = () => true): Promise<boolean> {
    const task = this.queue.then(async () => {
      try {
        if (await this.seen() || !stillEligible()) return false;
        await this.storage.write(bilalTourCampaign);
        if (!stillEligible()) { await this.storage.write(null); return false; }
        return true;
      } catch { return false; }
    });
    this.queue = task.catch(() => {}); return task;
  }
  async markSeen() { try { await this.storage.write(bilalTourCampaign); } catch { /* Do not block onboarding or manual help. */ } }
}

export function bilalTourQuiet(input: { now: number; prayerTimes: number[]; lastInteractionAt: number; deferredUntil: number; recentUrgentAt?: number }) {
  return input.now - input.lastInteractionAt >= 6000 && input.now >= input.deferredUntil
    && !(input.recentUrgentAt && input.now - input.recentUrgentAt < 120_000)
    && input.prayerTimes.length > 0 && input.prayerTimes.every(Number.isFinite)
    && !input.prayerTimes.some(time => input.now >= time - 120_000 && input.now <= time + 600_000);
}
