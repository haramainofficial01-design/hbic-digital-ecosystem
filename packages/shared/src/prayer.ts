import { prayerOrder } from "./constants";
import type { IqamahTime, PrayerName, PrayerTime } from "./types";

export const prayerLabels: Record<PrayerName, string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha"
};

export function getIqamahForPrayer(prayer: PrayerName, iqamah: IqamahTime): string | undefined {
  if (prayer === "sunrise") return undefined;
  const key = `${prayer}Iqamah` as keyof IqamahTime;
  return iqamah[key] as string;
}

export function timeToDate(date: string, time: string): Date {
  const [timePart, modifier] = time.trim().split(" ");
  const [rawHour, rawMinute] = timePart.split(":").map(Number);
  let hour = rawHour;
  if (modifier?.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (modifier?.toUpperCase() === "AM" && hour === 12) hour = 0;
  return new Date(`${date}T${String(hour).padStart(2, "0")}:${String(rawMinute).padStart(2, "0")}:00`);
}

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getNextPrayer(prayer: PrayerTime, now = new Date()) {
  const today = localDateString(now);
  const dateForTimes = prayer.date < today ? today : prayer.date;
  const upcoming = prayerOrder
    .map((name) => ({
      name,
      label: prayerLabels[name],
      time: prayer[name],
      date: timeToDate(dateForTimes, prayer[name])
    }))
    .find((item) => item.date.getTime() > now.getTime());

  const nextFajr = timeToDate(dateForTimes, prayer.fajr);
  while (nextFajr.getTime() <= now.getTime()) {
    nextFajr.setDate(nextFajr.getDate() + 1);
  }

  return upcoming ?? {
    name: "fajr" as const,
    label: "Fajr",
    time: prayer.fajr,
    date: nextFajr
  };
}

export function formatCountdown(target: Date, now = new Date()): string {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
