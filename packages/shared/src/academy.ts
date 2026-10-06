import { resolvedMasjidTimeZone } from "./prayer";

/** Academy records are private. Only server routes may read/write them. */
export type AcademyLevel = "qaida" | "quran" | "not_sure";
export type AcademyPaymentChoice = "cash" | "card";
export type AcademyEnrollmentState = "awaiting_checkout" | "conditional" | "submitted" | "approved" | "waitlisted" | "active" | "paused" | "withdrawn";
export type AcademyPaymentState = "awaiting_tuition" | "cash_due" | "paid" | "card_attention" | "past_due" | "scheduled" | "not_due";

/** HBIC's approved starting tuition; administrators can change future pricing. */
export const ACADEMY_DEFAULT_MONTHLY_CENTS_PER_CHILD = 5_000;
/** Server-side total for the approved per-child monthly price. */
export function academyTuitionTotalCents(monthlyCents: number, childCount: number): number {
  if (!Number.isSafeInteger(monthlyCents) || monthlyCents <= 0 || !Number.isSafeInteger(childCount) || childCount < 1 || childCount > 8) {
    throw new Error("Invalid Academy tuition quantity or amount.");
  }
  const total = monthlyCents * childCount;
  if (!Number.isSafeInteger(total)) throw new Error("Academy tuition amount is out of range.");
  return total;
}
export function academyCheckoutTuitionAmounts(monthlyCents: number, childCount: number, chargeCurrentMonth: boolean) {
  const monthlyTotalCents = academyTuitionTotalCents(monthlyCents, childCount);
  return { currentMonthCents: chargeCurrentMonth ? monthlyTotalCents : 0, recurringMonthlyCents: monthlyTotalCents };
}
export const ACADEMY_REGISTRATION_OPEN_DATE = "2026-09-27";
export const ACADEMY_FIRST_CLASS_DATE = "2026-10-05";
/** The initial special activity is October 15. One Thursday is special each month; staff can override it in the Academy calendar. */
export const ACADEMY_FIRST_FUN_CLASS_DATE = "2026-10-15";
export const ACADEMY_FIRST_BILLING_MONTH = "2026-10";
export const ACADEMY_LAST_BILLING_MONTH = "2027-01";
export const ACADEMY_TERM_END_DATE = "2027-02-01";
/** Alberta general holidays during this term. Informational only: they do not automatically cancel Quran Academy classes. */
export const ACADEMY_ALBERTA_GENERAL_HOLIDAYS = [
  { date: "2026-10-12", title: "Thanksgiving Day" },
  { date: "2026-11-11", title: "Remembrance Day" },
  { date: "2026-12-25", title: "Christmas Day" },
  { date: "2027-01-01", title: "New Year’s Day" }
] as const;
/** Immutable copy: increment the version and retain this text if terms change. */
export const ACADEMY_TUITION_POLICY_VERSION = "academy-payment-policy-v5";
export const ACADEMY_TUITION_POLICY_V2 = [
  { title: "Monthly tuition", body: "Tuition is CAD $50 total per enrolled child each month. HBIC does not add GST or another tax on top. The amount due is shown before card checkout or cash payment." },
  { title: "Card payments", body: "Registering before October 2026 collects your card without a September tuition charge. The first full monthly charge is October 1. From October onward, a current-month signup charges the full $50-per-child monthly tuition immediately and renews on the 1st. The final charge for this term is January 1, 2027; the February 1 class is included without February tuition. Billing stops for the Ramadan and Eid al-Fitr break and will resume only after HBIC announces a new term and approved billing start. You authorize recurring monthly charges during the active term until that child's enrollment is cancelled. Stripe processes card details; HBIC does not store full card numbers or CVV." },
  { title: "Cash payments", body: "September registrations owe no September tuition. October cash tuition is due in person at HBIC on October 1, even though there is no class that day; tuition is monthly, not per class. The final cash tuition due for this term is January 1, 2027; the February 1 class is included without February tuition. No cash tuition is due during the Ramadan and Eid al-Fitr break. Bring your Academy pass. Payment is recorded only after authorized staff receive and confirm the cash; a receipt follows confirmation." },
  { title: "Payment standing", body: "Each child's tuition is tracked separately. If a card charge fails or cash is overdue, HBIC will contact you to resolve it. A payment-success screen or pass screenshot is not proof of payment; the current Academy record is authoritative." },
  { title: "Cancellation and refunds", body: "You can stop an individual child's future enrollment anytime from your Academy account: tap “Cancel this child's enrollment” and confirm once. No staff approval is needed. Future renewals for that child stop; access already paid for continues through the current period. Refund requests require HBIC administrative review; no automatic refund is promised." },
  { title: "Classes and changes", body: "This term begins October 5, 2026 and ends February 1, 2027. Classes meet Mondays and Thursdays, 5:30–7:00 p.m. Public/statutory holidays do not automatically cancel class; class runs as normal unless HBIC explicitly publishes a closure. There is no class October 1. One Thursday each month is a special activity with games and an Islamic presentation; HBIC publishes the exact date and may change it. There are no classes after February 1 through the Ramadan and Eid al-Fitr break; resumption after Eid is to be announced. Tuition is monthly, not per class. Participation depends on placement, availability and payment standing. HBIC will communicate material schedule changes. Any new terms require a new policy version and acceptance." }
] as const;

export const ACADEMY_TUITION_POLICY = [
  { title: "Enrollment start", body: "By default, enrollment starts this month: the full $50-per-child monthly tuition is due now, with no proration; card tuition renews on the 1st if you do not cancel. Only during the final three calendar days of a month may you choose next month instead. That choice skips this month's tuition and classes; the first full $50-per-child charge or cash payment is due on the 1st of the selected month. Card registration becomes Conditional only after Stripe confirms Checkout; staff separately confirm enrollment/check-in. No February tuition or automatic restart after the term break." },
  ...ACADEMY_TUITION_POLICY_V2.map((section) => section.title === "Card payments" ? {
    ...section, body: "For a current-month start, the full $50-per-child monthly tuition is charged now, without proration, then renews on the 1st if not cancelled. Only during the final three calendar days of a month may you choose a next-month start; Stripe collects the card securely now and the first full $50-per-child charge is on the 1st of the selected month, with no current-month tuition. There is no September tuition. The final charge for this term is January 1, 2027; the February 1 class is included without February tuition. Billing stops for the Ramadan and Eid al-Fitr break and resumes only after HBIC announces a new term and approved billing start. You authorize recurring monthly charges during the active term until that child's enrollment is cancelled. Stripe processes card details; HBIC does not store full card numbers or CVV."
  } : section.title === "Cash payments" ? {
    ...section, body: "For a current-month start, the full $50-per-child monthly tuition for this month is due in person at HBIC; no partial-month discount applies. Cash for each continuing month is due on the 1st. Only during the final three calendar days of a month may you choose a next-month start instead; no current-month tuition is due, and the full amount is due on the 1st of the selected month. The final cash tuition due for this term is January 1, 2027; the February 1 class is included without February tuition. No cash tuition is due during the Ramadan and Eid al-Fitr break. Bring your Academy pass. Payment is recorded only after authorized staff receive and confirm the cash; a receipt follows confirmation."
  } : section.title === "Classes and changes" ? {
    ...section, body: "This term begins October 5, 2026 and ends February 1, 2027. Classes meet Mondays and Thursdays, 5:30–7:00 p.m. There is no class October 1. One Thursday each month is a special activity with games and an Islamic presentation; HBIC publishes the exact date and may change it. There are no classes after February 1 through the Ramadan and Eid al-Fitr break; resumption after Eid is to be announced. Tuition is monthly, not per class. Participation depends on placement, availability and payment standing. HBIC will communicate material schedule changes. Any new terms require a new policy version and acceptance."
  } : section)
] as const;

/** The next-month choice opens only for the final three Calgary calendar days. */
export function academyNextMonthEnrollmentOpen(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: resolvedMasjidTimeZone(now), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (kind: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === kind)?.value);
  const year = value("year"), month = value("month"), day = value("day");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= lastDay - 2;
}

/** Stripe confirmation changes enrollment readiness, never marks the ledger paid. */
export function academyCardEnrollmentConfirmed(state: AcademyEnrollmentState, eventType: string, amountPaid = 0): boolean {
  return state === "awaiting_checkout" && (eventType === "checkout.session.completed" || eventType === "invoice.paid" && amountPaid > 0);
}

export function academyRegistrationOpen(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: resolvedMasjidTimeZone(now), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (kind: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === kind)?.value;
  const date = `${value("year")}-${value("month")}-${value("day")}`;
  return date >= ACADEMY_REGISTRATION_OPEN_DATE && date <= "2027-01-31";
}

/** Default monthly special Thursday: third Thursday. An explicit `special_class` calendar entry replaces it. */
export function academyRecurringClasses(fromDate: string, days = 150, specialDates: readonly string[] = []) {
  const start = Math.max(Date.parse(`${fromDate}T12:00:00Z`), Date.parse(`${ACADEMY_FIRST_CLASS_DATE}T12:00:00Z`));
  if (!Number.isFinite(start)) return [];
  const configuredSpecialDates = new Set(specialDates);
  const configuredSpecialMonths = new Set(specialDates.map((date) => date.slice(0, 7)));
  const result: { date: string; type: "class"; title: string; note: string; fun: boolean }[] = [];
  for (let index = 0; index < days; index += 1) {
    const day = new Date(start + index * 86_400_000);
    if (day.toISOString().slice(0, 10) > ACADEMY_TERM_END_DATE) break;
    const weekday = day.getUTCDay();
    if (weekday !== 1 && weekday !== 4) continue;
    const date = day.toISOString().slice(0, 10);
    const thursdayInMonth = Math.floor((day.getUTCDate() - 1) / 7) + 1;
    const fun = weekday === 4 && (configuredSpecialDates.has(date) || (thursdayInMonth === 3 && !configuredSpecialMonths.has(date.slice(0, 7))));
    result.push({ date: day.toISOString().slice(0, 10), type: "class", title: fun ? "Fun Thursday class" : "Quran Academy class",
      note: fun ? "5:30–7:00 p.m. · monthly special activity with games and an Islamic presentation; food or prizes may be offered occasionally" : "5:30–7:00 p.m.", fun });
  }
  return result;
}

export interface AcademyChildInput {
  name: string;
  age: number;
  level: AcademyLevel;
}

export interface AcademyRegistrationInput {
  startChoice?: "current" | "next";
  guardianName: string;
  phone: string;
  email: string;
  whatsappConsent: boolean;
  /** Optional Academy schedule/announcement emails; not payment receipts. */
  emailUpdates?: boolean;
  children: AcademyChildInput[];
  paymentChoice: AcademyPaymentChoice;
  policyVersion: typeof ACADEMY_TUITION_POLICY_VERSION | "academy-payment-policy-v4" | "academy-payment-policy-v3" | "academy-payment-policy-v2";
  policyAccepted: boolean;
  recurringAuthorized: boolean;
}

export interface AcademyPublicFamily {
  enrollmentStartPeriod?: string;
  id: string;
  reference: string;
  guardianName: string;
  phone: string;
  email: string;
  whatsappConsent: boolean;
  emailUpdates?: boolean;
  children: (AcademyChildInput & { id: string; classId: string | null; cancelEffectiveAt?: string | null })[];
  paymentChoice: AcademyPaymentChoice;
  /** How the displayed tuition month was actually paid/marked due. */
  billingMethod?: AcademyPaymentChoice;
  pendingPaymentChoice?: AcademyPaymentChoice | null;
  paymentChangeEffectivePeriod?: string | null;
  policyVersion?: string;
  policyAcceptedAt?: string;
  recurringAuthorizedAt?: string | null;
  staffCardSetupRequestedAt?: string | null;
  enrollmentState: AcademyEnrollmentState;
  billingPeriod: string;
  amountCents: number | null;
  paymentState: AcademyPaymentState;
  cardSetupComplete?: boolean;
  passToken: string;
  cashReminderEligible: boolean;
  createdAt: string;
}

export function calgaryBillingPeriod(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: resolvedMasjidTimeZone(now), year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

/** Pre-October enrollment is for October classes, never September tuition. */
export function academyTuitionPeriod(now = new Date()): string {
  const period = calgaryBillingPeriod(now);
  return period < ACADEMY_FIRST_BILLING_MONTH ? ACADEMY_FIRST_BILLING_MONTH : period;
}

/** The server derives the month; clients cannot supply a price or billing date. */
export function academyEnrollmentStartPeriod(choice: "current" | "next" = "current", now = new Date()): string {
  const current = calgaryBillingPeriod(now);
  if (choice === "next" && !academyNextMonthEnrollmentOpen(now)) throw new Error("Next-month enrollment opens only during the final three days of the month. Choose this month to start now.");
  const [year, month] = current.split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1, 12)).toISOString().slice(0, 7);
  const selected = choice === "next" ? next : current;
  const start = selected < ACADEMY_FIRST_BILLING_MONTH ? ACADEMY_FIRST_BILLING_MONTH : selected;
  if (start > ACADEMY_LAST_BILLING_MONTH) throw new Error("Next-term enrollment will open after HBIC announces it. There is no February tuition for this term.");
  return start;
}

/** Secure Checkout timing for a selected, server-resolved enrollment month. */
export function academyCheckoutTiming(startPeriod: string | undefined, monthPaid: boolean, now = new Date()) {
  const current = calgaryBillingPeriod(now);
  let period = startPeriod && startPeriod > current ? startPeriod : academyTuitionPeriod(now);
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("Invalid enrollment start month.");
  if (monthPaid) {
    const [year, month] = period.split("-").map(Number);
    period = new Date(Date.UTC(year, month, 1, 12)).toISOString().slice(0, 7);
  }
  if (period > ACADEMY_LAST_BILLING_MONTH) throw new Error("No further tuition is due this term. No February charge will be created.");
  if (period > current) {
    const [year, month] = period.split("-").map(Number);
    return { trial_end: Math.floor(Date.UTC(year, month - 1, 1, 12) / 1000), proration_behavior: "none" as const };
  }
  // A trial through next month's 1st collects/attaches the payment method now,
  // while an explicit one-time Checkout line item below charges this month's
  // full tuition. This avoids Stripe invoicing the recurring item early too.
  return isCalgaryFirstOfMonth(now) ? {} : { trial_end: nextCalgaryFirstBillingAnchor(now), proration_behavior: "none" as const };
}

export function isCalgaryFirstOfMonth(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: resolvedMasjidTimeZone(now), day: "numeric" }).formatToParts(now);
  return Number(parts.find((part) => part.type === "day")?.value) === 1;
}

/** Noon UTC always falls on the 1st in Calgary, including across DST changes. */
export function nextCalgaryFirstBillingAnchor(now: Date): number {
  const [year, month] = calgaryBillingPeriod(now).split("-").map(Number);
  return Math.floor(Date.UTC(year, month, 1, 12, 0, 0) / 1000);
}

export function academyCashReminderStage(now: Date, eligible: boolean, paymentState: AcademyPaymentState): "upcoming" | "due" | null {
  if (!eligible || paymentState === "not_due" || paymentState === "paid") return null;
  const local = new Intl.DateTimeFormat("en-CA", { timeZone: resolvedMasjidTimeZone(now), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (kind: Intl.DateTimeFormatPartTypes) => Number(local.find((part) => part.type === kind)?.value);
  const year = value("year"), month = value("month"), day = value("day");
  if (day === 1) return "due";
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
  if (value.emailUpdates !== undefined && typeof value.emailUpdates !== "boolean") throw new Error("Choose whether to receive Academy email updates.");
  if (value.paymentChoice !== "cash" && value.paymentChoice !== "card") throw new Error("Choose card or cash.");
  if (value.startChoice !== undefined && value.startChoice !== "current" && value.startChoice !== "next") throw new Error("Choose this month or next month.");
  // Older accepted policies remain valid only where their billing terms are unchanged.
  // Current-month card billing changed from proration to the full monthly amount in v4.
  const legacyV2Current = value.policyVersion === "academy-payment-policy-v2" && value.startChoice === undefined;
  const legacyV3 = value.policyVersion === "academy-payment-policy-v3";
  const legacyV4 = value.policyVersion === "academy-payment-policy-v4";
  const currentPolicy = value.policyVersion === ACADEMY_TUITION_POLICY_VERSION;
  if ((!legacyV2Current && !legacyV3 && !legacyV4 && !currentPolicy) || value.policyAccepted !== true) throw new Error("Read and accept the current Academy tuition policy.");
  const selectedStart = value.startChoice === "next" ? "next" : "current";
  if (selectedStart === "next" && !currentPolicy) throw new Error("Accept the current policy to select a next-month start.");
  if (value.paymentChoice === "card" && selectedStart === "current" && !currentPolicy) {
    throw new Error("The Academy card tuition terms changed. Refresh or update the app and accept the current $50 monthly terms.");
  }
  if (value.paymentChoice === "card" && value.recurringAuthorized !== true) throw new Error("Authorize recurring card tuition before continuing.");
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
  return { guardianName, phone, email, whatsappConsent: value.whatsappConsent, emailUpdates: value.emailUpdates === true, children, paymentChoice: value.paymentChoice,
    startChoice: selectedStart,
    policyVersion: legacyV2Current ? "academy-payment-policy-v2" : legacyV3 ? "academy-payment-policy-v3" : legacyV4 ? "academy-payment-policy-v4" : ACADEMY_TUITION_POLICY_VERSION,
    policyAccepted: true, recurringAuthorized: value.paymentChoice === "card" };
}
