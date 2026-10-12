/** Presentation only: the authenticated Academy API remains the schedule authority. */
export type ParentCalendarItem = { id: string; title: string; date: string; type: string; note?: string };
export const academyClassTimeLabel = "5:30–7:00 PM";

function calendarDate(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? parsed : null;
}

export function academyCalendarDateLabel(date: string) {
  const parsed = calendarDate(date);
  return parsed ? new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(parsed) : date;
}

export function academyCalendarMonthLabel(month: string) {
  const parsed = calendarDate(`${month}-01`);
  return parsed ? new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", month: "long", year: "numeric" }).format(parsed) : month;
}

export function academyCalendarMonthCells(month: string): (string | null)[] {
  const first = calendarDate(`${month}-01`);
  if (!first) return [];
  const offset = (first.getUTCDay() + 6) % 7; // Monday first.
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, index) => index >= offset && index < offset + count ? `${month}-${String(index - offset + 1).padStart(2, "0")}` : null);
}

export function academyCalendarMonths(from: string, through: string) {
  const first = calendarDate(`${from}-01`), last = calendarDate(`${through}-01`);
  if (!first || !last) return [];
  const months: string[] = [];
  for (let date = first; date <= last && months.length < 24; date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))) months.push(date.toISOString().slice(0, 7));
  return months;
}

export function academyCalendarKind(item: ParentCalendarItem) {
  if (item.type === "no_class" || item.type === "holiday") return "closure";
  if (item.type === "special_class" || item.type === "class" && /fun thursday|special activity/i.test(`${item.title} ${item.note ?? ""}`)) return "special";
  if (item.type === "time_changed") return "changed";
  return item.type === "class" ? "class" : "event";
}

export function academyCalendarBadge(item: ParentCalendarItem) {
  return { closure: "No class", special: "Special Thursday", changed: "Time changed", class: "Class", event: "Update" }[academyCalendarKind(item)];
}

export function academyParentCalendar(items: readonly ParentCalendarItem[], today: string, enrollmentStartPeriod?: string | null) {
  // Do not generate classes or reinterpret staff closures in the parent UI.
  const upcoming = items.filter(item => calendarDate(item.date) && item.date >= today)
    .slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const firstDate = enrollmentStartPeriod && `${enrollmentStartPeriod}-01` > today ? `${enrollmentStartPeriod}-01` : today;
  const nextClass = upcoming.find(item => item.date >= firstDate && ["class", "special", "changed"].includes(academyCalendarKind(item)));
  const months = [...new Set(upcoming.map(item => item.date.slice(0, 7)))];
  return { upcoming, nextClass, months };
}
