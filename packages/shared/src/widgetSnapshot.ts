import type { HbicContent } from "./content";
import { defaultContent } from "./content";
import { formatCountdown, getIqamahForPrayer, getNextPrayer } from "./prayer";
import type { PrayerName } from "./types";

export interface WidgetPrayerSnapshot {
  masjidName: string;
  nextPrayer: string;
  nextPrayerKey: PrayerName;
  nextPrayerTime: string;
  nextIqamah?: string;
  countdown: string;
  jumuah: string;
  source: string;
  updatedAt: string;
  upcomingEvent?: string;
  ramadan?: {
    suhoorEnd: string;
    iftar: string;
    taraweeh: string;
  };
}

export function createWidgetPrayerSnapshot(content: HbicContent, now = new Date()): WidgetPrayerSnapshot {
  const nextPrayer = getNextPrayer(content.prayerTime, now);
  const nextIqamah = getIqamahForPrayer(nextPrayer.name, content.iqamahTime);
  const nextEvent = content.events.find((event) => event.date >= content.prayerTime.date);

  return {
    masjidName: content.settings.shortName || content.settings.masjidName,
    nextPrayer: nextPrayer.label,
    nextPrayerKey: nextPrayer.name,
    nextPrayerTime: nextPrayer.time,
    nextIqamah,
    countdown: formatCountdown(nextPrayer.date, now),
    jumuah: `${content.jumuahSchedule.firstIqamahTime} / ${content.jumuahSchedule.secondIqamahTime}`,
    source: content.iqamahTime.source || content.prayerTime.source,
    updatedAt: content.updatedAt,
    upcomingEvent: nextEvent?.title,
    ramadan: content.settings.ramadanMode
      ? {
          suhoorEnd: content.ramadanSchedule.suhoorEnd,
          iftar: content.ramadanSchedule.iftar,
          taraweeh: content.ramadanSchedule.taraweeh
        }
      : undefined
  };
}

export const defaultWidgetPrayerSnapshot = createWidgetPrayerSnapshot(defaultContent);
