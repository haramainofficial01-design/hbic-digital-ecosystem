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
  if (item.type === "special_class" || item.type === "class" && /\bfun (?:class|thursday)\b|special activity/i.test(`${item.title} ${item.note ?? ""}`)) return "special";
  if (item.type === "time_changed") return "changed";
  return item.type === "class" ? "class" : "event";
}

export function academyCalendarBadge(item: ParentCalendarItem) {
  return { closure: "No class", special: "Fun Class", changed: "Time changed", class: "Class", event: "Update" }[academyCalendarKind(item)];
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

/** Collection instructions use the authenticated class calendar, never an invented class date. */
export function academyCashCollectionNotice(family: {
  paymentChoice: string; paymentState: string; enrollmentState: string; billingPeriod: string;
  amountCents: number | null; enrollmentStartPeriod?: string; noTuitionDue?: boolean;
}, items: readonly ParentCalendarItem[], today: string) {
  if (family.paymentChoice !== "cash" || family.enrollmentState === "withdrawn" || family.noTuitionDue ||
      !["cash_due", "past_due"].includes(family.paymentState) || !Number.isSafeInteger(family.amountCents) ||
      Number(family.amountCents) <= 0 || !calendarDate(`${family.billingPeriod}-01`)) return null;
  const amount = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(family.amountCents) / 100);
  const month = academyCalendarMonthLabel(family.billingPeriod);
  const from = today > `${family.billingPeriod}-01` ? today : `${family.billingPeriod}-01`;
  const next = academyParentCalendar(items, from, family.enrollmentStartPeriod).nextClass;
  const collection = next?.date.startsWith(`${family.billingPeriod}-`) ? next : undefined;
  const when = collection ? `to class on ${academyCalendarDateLabel(collection.date)} · ${collection.type === "time_changed" ? collection.note || "See the updated class time in your calendar" : academyClassTimeLabel}` : "in person at HBIC; check your Academy calendar for your next class";
  return { title: `${month} cash tuition`, text: `Please bring ${amount} cash tuition for ${month} ${when.replace(/[.!?]+\s*$/, "")}. Tuition is required to continue attending. Staff will record your payment and issue a receipt.` };
}
