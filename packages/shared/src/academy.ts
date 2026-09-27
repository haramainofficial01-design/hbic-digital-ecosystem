/** Academy records are private. Only server routes may read/write them. */
export type AcademyLevel = "qaida" | "quran" | "not_sure";
export type AcademyPaymentChoice = "cash" | "card";
export type AcademyEnrollmentState = "submitted" | "approved" | "waitlisted" | "active" | "paused" | "withdrawn";
export type AcademyPaymentState = "awaiting_tuition" | "cash_due" | "paid" | "card_attention" | "not_due";

/** HBIC's approved starting tuition; administrators can change future pricing. */
export const ACADEMY_DEFAULT_MONTHLY_CENTS_PER_CHILD = 5_000;
export const ACADEMY_REGISTRATION_OPEN_DATE = "2026-10-01";
export const ACADEMY_FIRST_CLASS_DATE = "2026-10-05";
export const ACADEMY_FIRST_FUN_CLASS_DATE = "2026-10-15";

export function academyRegistrationOpen(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (kind: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === kind)?.value;
  return `${value("year")}-${value("month")}-${value("day")}` >= ACADEMY_REGISTRATION_OPEN_DATE;
}

export function academyRecurringClasses(fromDate: string, days = 150) {
  const start = Math.max(Date.parse(`${fromDate}T12:00:00Z`), Date.parse(`${ACADEMY_FIRST_CLASS_DATE}T12:00:00Z`));
  if (!Number.isFinite(start)) return [];
  const funAnchor = Date.parse(`${ACADEMY_FIRST_FUN_CLASS_DATE}T12:00:00Z`);
  const result: { date: string; type: "class"; title: string; note: string; fun: boolean }[] = [];
  for (let index = 0; index < days; index += 1) {
    const day = new Date(start + index * 86_400_000);
    const weekday = day.getUTCDay();
    if (weekday !== 1 && weekday !== 4) continue;
    const fun = weekday === 4 && day.getTime() >= funAnchor && (day.getTime() - funAnchor) % (14 * 86_400_000) === 0;
    result.push({ date: day.toISOString().slice(0, 10), type: "class", title: fun ? "Fun Thursday class" : "Quran Academy class",
      note: fun ? "6:00–7:30 p.m. · games and Islamic presentation; food or prizes may be offered occasionally" : "6:00–7:30 p.m.", fun });
  }
  return result;
}

export interface AcademyChildInput {
  name: string;
  age: number;
  level: AcademyLevel;
}

export interface AcademyRegistrationInput {
  guardianName: string;
  phone: string;
  email: string;
  whatsappConsent: boolean;
  children: AcademyChildInput[];
  paymentChoice: AcademyPaymentChoice;
}

export interface AcademyPublicFamily {
  id: string;
  reference: string;
  guardianName: string;
  phone: string;
  email: string;
  whatsappConsent: boolean;
  children: (AcademyChildInput & { id: string; classId: string | null; cancelEffectiveAt?: string | null })[];
  paymentChoice: AcademyPaymentChoice;
  enrollmentState: AcademyEnrollmentState;
  billingPeriod: string;
  amountCents: number | null;
  paymentState: AcademyPaymentState;
  passToken: string;
  cashReminderEligible: boolean;
  createdAt: string;
}

export function calgaryBillingPeriod(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

export function isCalgaryFirstOfMonth(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", day: "numeric" }).formatToParts(now);
  return Number(parts.find((part) => part.type === "day")?.value) === 1;
}

/** Noon UTC always falls on the 1st in Calgary, including across DST changes. */
export function nextCalgaryFirstBillingAnchor(now: Date): number {
  const [year, month] = calgaryBillingPeriod(now).split("-").map(Number);
  return Math.floor(Date.UTC(year, month, 1, 12, 0, 0) / 1000);
}

export function academyCashReminderStage(now: Date, eligible: boolean, paymentState: AcademyPaymentState): "upcoming" | "due" | null {
  if (!eligible || paymentState === "not_due") return null;
  const local = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (kind: Intl.DateTimeFormatPartTypes) => Number(local.find((part) => part.type === kind)?.value);
  const year = value("year"), month = value("month"), day = value("day");
  if (day === 1 && paymentState !== "paid") return "due";
  // `month` is one-based, so Date.UTC(year, month, 1) is the *next*
  // month's first. The notice concerns that upcoming payment, not the
  // already-passed first of the current month.
  const threeDaysBefore = new Date(Date.UTC(year, month, 1) - 3 * 86_400_000);
  return year === threeDaysBefore.getUTCFullYear() && month === threeDaysBefore.getUTCMonth() + 1 && day === threeDaysBefore.getUTCDate()
    ? "upcoming" : null;
}

export function parseAcademyRegistration(input: unknown): AcademyRegistrationInput {
  if (!input || typeof input !== "object") throw new Error("Registration details are required.");
  const value = input as Record<string, unknown>;
  const guardianName = String(value.guardianName ?? "").trim().replace(/\s+/g, " ");
  const phone = String(value.phone ?? "").trim();
  const email = String(value.email ?? "").trim().toLowerCase();
  if (guardianName.length < 2 || guardianName.length > 100) throw new Error("Enter the guardian's full name.");
  if (!/^\+?[\d\s().-]{10,22}$/.test(phone)) throw new Error("Enter a valid phone number.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Enter a valid email address.");
  if (typeof value.whatsappConsent !== "boolean") throw new Error("Choose whether to receive WhatsApp updates.");
  if (value.paymentChoice !== "cash" && value.paymentChoice !== "card") throw new Error("Choose card or cash.");
  if (!Array.isArray(value.children) || value.children.length < 1 || value.children.length > 8) {
    throw new Error("Add between one and eight children.");
  }
  const children = value.children.map((raw) => {
    const child = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const name = String(child.name ?? "").trim().replace(/\s+/g, " ");
    const age = Number(child.age);
    const level = child.level;
    if (name.length < 2 || name.length > 100) throw new Error("Enter each child's full name.");
    if (!Number.isInteger(age) || age < 3 || age > 18) throw new Error("Enter each child's age from 3 to 18.");
    if (level !== "qaida" && level !== "quran" && level !== "not_sure") throw new Error("Choose each child's Quran level.");
    return { name, age, level: level as AcademyLevel };
  });
  return { guardianName, phone, email, whatsappConsent: value.whatsappConsent, children, paymentChoice: value.paymentChoice };
}
