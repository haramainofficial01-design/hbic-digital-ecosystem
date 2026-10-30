import { dateStringInTimeZone, masjidTimeZone } from "./prayer";

export interface AcademyStarMonth {
  month: string;
  photosUntil?: string;
  winners: { side: "brothers" | "sisters"; name: string; photoEnabled?: boolean }[];
  highlightUrl?: string;
}

/** Only approved relative photo endpoints are exposed; superseded months are names-only. */
export function getAcademyStarMonths(input: unknown, now = new Date()) {
  if (!Array.isArray(input) || !Number.isFinite(now.getTime())) return [];
  const thisMonth = dateStringInTimeZone(now, masjidTimeZone).slice(0, 7);
  const seen = new Set<string>();
  const months: AcademyStarMonth[] = input.filter((row): row is AcademyStarMonth => {
    if (!row || typeof row.month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) || row.month > thisMonth || seen.has(row.month) || !Array.isArray(row.winners) || !row.winners.some((w: AcademyStarMonth["winners"][number]) => w && ["brothers", "sisters"].includes(w.side) && typeof w.name === "string" && w.name.trim() && w.name.length <= 80 && !/[<>\u0000-\u001f]/.test(w.name))) return false;
    seen.add(row.month); return true;
  }).sort((a, b) => a.month.localeCompare(b.month)).slice(-36);
  const newest = months.at(-1)?.month;
  return months.map(row => {
    const photosVisible = row.month === newest && (row.photosUntil === undefined || (typeof row.photosUntil === "string" && Date.parse(row.photosUntil) > now.getTime()));
    const sides = new Set<string>();
    return {
      month: row.month,
      photosUntil: row.photosUntil,
      highlightUrl: typeof row.highlightUrl === "string" && /^https:\/\/(www\.)?instagram\.com\/(reel|p|stories\/highlights)\/[A-Za-z0-9_-]+\/?(?:\?[^\s]*)?$/.test(row.highlightUrl) ? row.highlightUrl : undefined,
      winners: row.winners.filter(w => {
        if (!w || !["brothers", "sisters"].includes(w.side) || sides.has(w.side) || typeof w.name !== "string" || !w.name.trim() || w.name.length > 80 || /[<>\u0000-\u001f]/.test(w.name)) return false;
        sides.add(w.side); return true;
      }).map(w => ({ side: w.side, name: w.name.trim(), photoEnabled: photosVisible && w.photoEnabled === true,
        photoUrl: photosVisible && w.photoEnabled === true ? `/api/academy/stars/${row.month}/${w.side}` : undefined }))
    };
  }).filter(row => row.winners.length);
}

export function academyStarMonthLabel(month: string, locale = "en-CA") {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", calendar: "gregory", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`));
}
