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
