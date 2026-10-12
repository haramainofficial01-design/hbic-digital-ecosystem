import { parseClock } from "@hbic/shared";

/** The same date-keyed adhan source loaded by Iqamah.ca's public timetable.
 * Parse data only: never execute remotely downloaded JavaScript. */
export const iqamahCaAdhanUrl = "https://iqamah.ca/salahschedule.js";

export function parseIqamahCaAdhan(source: string, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid prayer service date.");
  const row = source.match(new RegExp(`"${date}"\\s*:\\s*\\{([^{}]+)\\}`))?.[1];
  if (!row) throw new Error(`Iqamah.ca has no adhan schedule for ${date}.`);
  const names = ["fajr", "sunrise", "zuhr", "asr", "maghrib", "isha"] as const;
  const values = Object.fromEntries(names.map(name => {
    const value = row.match(new RegExp(`\\b${name}\\s*:\\s*"([^"]+)"`))?.[1]?.trim();
    if (!value || !parseClock(value)) throw new Error(`Iqamah.ca returned an invalid ${name} time.`);
    return [`salah_${name}`, value];
  }));
  return values as Record<`salah_${typeof names[number]}`, string>;
}
