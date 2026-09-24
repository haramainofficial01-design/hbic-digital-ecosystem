import { dateStringInTimeZone, masjidTimeZone } from "./prayer";
import type { JumuahSchedule } from "./types";

export interface EffectiveJumuahDoorNotice {
  time: string;
  title: string;
  body: string;
  titleUr?: string;
  bodyUr?: string;
  parkingNotice?: string;
  capacityNotice?: string;
  serviceDate: string;
}

export function getEffectiveJumuahDoorNotice(
  schedule: JumuahSchedule,
  now = new Date(),
  featureEnabled = true,
  timeZone = masjidTimeZone
): EffectiveJumuahDoorNotice | null {
  if (!featureEnabled) return null;

  const serviceDate = dateStringInTimeZone(now, timeZone);
  const notice = schedule.doorNotice;

  if (notice) {
    if (!notice.enabled) return null;
    if (notice.effectiveFrom && serviceDate < notice.effectiveFrom) return null;
    if (notice.effectiveUntil && serviceDate > notice.effectiveUntil) return null;

    const exception = notice.exceptions?.find((item) => item.date === serviceDate);
    if (exception && !exception.enabled) return null;

    const time = exception?.time?.trim() || notice.time.trim();
    if (!time) return null;

    return {
      time,
      title: notice.title.trim() || "First Jumu'ah",
      body: exception?.body?.trim() || notice.body.trim() || `Doors close at ${time} for the first Jumu'ah prayer.`,
      titleUr: notice.titleUr?.trim() || undefined,
      bodyUr: notice.bodyUr?.trim() || undefined,
      parkingNotice: notice.parkingNotice?.trim() || undefined,
      capacityNotice: notice.capacityNotice?.trim() || undefined,
      serviceDate
    };
  }

  const legacyTime = schedule.firstDoorsCloseTime?.trim();
  if (!legacyTime) return null;

  return {
    time: legacyTime,
    title: "First Jumu'ah",
    body: `Doors close at ${legacyTime} for the first Jumu'ah prayer.`,
    serviceDate
  };
}
