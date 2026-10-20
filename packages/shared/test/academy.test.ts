import assert from "node:assert/strict";
import test from "node:test";
import { academyCardEnrollmentConfirmed } from "../src/academy";
import { ACADEMY_FIRST_FUN_CLASS_DATE, ACADEMY_TUITION_POLICY_VERSION, academyCheckoutLineItemPlan, academyCheckoutTiming, academyCheckoutTuitionAmounts, academyEnrollmentStartPeriod, academyNextMonthEnrollmentOpen, academyCashReminderStage, academyRecurringClasses, academyRegistrationOpen, academyTuitionPeriod, academyTuitionTotalCents, calgaryBillingPeriod, isCalgaryFirstOfMonth, nextCalgaryFirstBillingAnchor, parseAcademyRegistration } from "../src/academy";

const valid = {
  guardianName: "Sahl Shafiq",
  phone: "+1 (403) 555-0100",
  email: "Parent@example.com",
  whatsappConsent: false,
  paymentChoice: "cash",
  policyVersion: ACADEMY_TUITION_POLICY_VERSION,
  policyAccepted: true,
  recurringAuthorized: false,
  children: [{ name: "Ahmed Shafiq", age: 8, level: "qaida" }, { name: "Maryam Shafiq", age: 11, level: "not_sure" }]
};

test("card enrollment waits for Checkout or a paid invoice, never a scan or subscription update", () => {
  assert.equal(academyCardEnrollmentConfirmed("awaiting_checkout", "checkout.session.completed"), true);
  assert.equal(academyCardEnrollmentConfirmed("awaiting_checkout", "invoice.paid", 5000), true);
  for (const event of ["invoice.payment_failed", "customer.subscription.updated", "qr_scanned", "staff_check_in"]) {
    assert.equal(academyCardEnrollmentConfirmed("awaiting_checkout", event, 5000), false);
  }
  assert.equal(academyCardEnrollmentConfirmed("awaiting_checkout", "invoice.paid", 0), false);
  assert.equal(academyCardEnrollmentConfirmed("withdrawn", "checkout.session.completed"), false);
  assert.equal(academyCardEnrollmentConfirmed("active", "checkout.session.completed"), false);
});

test("Academy accepts one parent with multiple children and normalizes the email", () => {
  const registration = parseAcademyRegistration(valid);
  assert.equal(registration.email, "parent@example.com");
  assert.equal(registration.children.length, 2);
  assert.equal(registration.children[1].level, "not_sure");
});

test("Academy email update consent is explicit and legacy registrations remain valid", () => {
  assert.equal(parseAcademyRegistration(valid).emailUpdates, false);
  assert.equal(parseAcademyRegistration({ ...valid, emailUpdates: true }).emailUpdates, true);
  assert.equal(parseAcademyRegistration({ ...valid, emailUpdates: false }).emailUpdates, false);
  assert.throws(() => parseAcademyRegistration({ ...valid, emailUpdates: "yes" }), /email updates/);
});

test("Academy rejects missing consent choice, invalid ages and excess children", () => {
  assert.throws(() => parseAcademyRegistration({ ...valid, whatsappConsent: undefined }), /WhatsApp/);
  assert.throws(() => parseAcademyRegistration({ ...valid, children: [{ ...valid.children[0], age: 2 }] }), /age/);
  assert.throws(() => parseAcademyRegistration({ ...valid, children: Array(9).fill(valid.children[0]) }), /eight/);
});

test("Academy requires current policy acceptance and distinct recurring card authorization", () => {
  assert.throws(() => parseAcademyRegistration({ ...valid, policyAccepted: false }), /policy/);
  assert.throws(() => parseAcademyRegistration({ ...valid, policyVersion: "outdated" }), /policy/);
  assert.throws(() => parseAcademyRegistration({ ...valid, paymentChoice: "card" }), /Authorize/);
  assert.equal(parseAcademyRegistration({ ...valid, paymentChoice: "card", recurringAuthorized: true }).recurringAuthorized, true);
  assert.equal(parseAcademyRegistration(valid).recurringAuthorized, false);
});

test("installed apps retain their accepted current-month terms without gaining the new next-month option", () => {
  const legacy = parseAcademyRegistration({ ...valid, policyVersion: "academy-payment-policy-v2" });
  assert.equal(legacy.startChoice, "current");
  assert.equal(legacy.policyVersion, "academy-payment-policy-v2");
  assert.throws(() => parseAcademyRegistration({ ...valid, policyVersion: "academy-payment-policy-v2", startChoice: "next" }), /policy/);
  assert.throws(() => parseAcademyRegistration({ ...valid, policyVersion: "academy-payment-policy-v2", policyAccepted: false }), /policy/);
});

test("older card terms cannot authorize the new full current-month charge", () => {
  assert.throws(() => parseAcademyRegistration({
    ...valid, paymentChoice: "card", recurringAuthorized: true, policyVersion: "academy-payment-policy-v3", startChoice: "current"
  }), /terms changed/);
  assert.throws(() => parseAcademyRegistration({
    ...valid, paymentChoice: "card", recurringAuthorized: true, policyVersion: "academy-payment-policy-v3", startChoice: "next"
  }), /current policy/);
  assert.equal(parseAcademyRegistration({
    ...valid, paymentChoice: "card", recurringAuthorized: true, policyVersion: ACADEMY_TUITION_POLICY_VERSION, startChoice: "current"
  }).policyVersion, ACADEMY_TUITION_POLICY_VERSION);
});

test("Billing periods follow Calgary, including UTC month rollover and DST", () => {
  assert.equal(calgaryBillingPeriod(new Date("2026-10-01T04:30:00Z")), "2026-09");
  assert.equal(calgaryBillingPeriod(new Date("2026-10-01T06:30:00Z")), "2026-10");
  assert.equal(calgaryBillingPeriod(new Date("2026-03-01T04:30:00Z")), "2026-02");
  assert.equal(calgaryBillingPeriod(new Date("2026-03-01T08:30:00Z")), "2026-03");
  assert.equal(academyTuitionPeriod(new Date("2026-09-27T18:00:00Z")), "2026-10");
  assert.equal(academyTuitionPeriod(new Date("2026-10-01T05:59:59Z")), "2026-10");
  assert.equal(academyTuitionPeriod(new Date("2026-11-01T06:30:00Z")), "2026-11");
});

test("parents select this month or next month, with server-derived term limits", () => {
  const now = new Date("2026-10-02T18:00:00Z");
  assert.equal(academyEnrollmentStartPeriod("current", now), "2026-10");
  assert.equal(academyNextMonthEnrollmentOpen(now), false);
  assert.throws(() => academyEnrollmentStartPeriod("next", now), /final three days/);
  const finalThreeDays = new Date("2026-10-29T18:00:00Z");
  assert.equal(academyNextMonthEnrollmentOpen(finalThreeDays), true);
  assert.equal(academyEnrollmentStartPeriod("next", finalThreeDays), "2026-11");
  assert.equal(academyEnrollmentStartPeriod("next", new Date("2026-12-29T18:00:00Z")), "2027-01");
  assert.throws(() => academyEnrollmentStartPeriod("next", new Date("2027-01-29T18:00:00Z")), /February/);
  assert.equal(parseAcademyRegistration({ ...valid, startChoice: "next" }).startChoice, "next");
  assert.throws(() => parseAcademyRegistration({ ...valid, startChoice: "free" }), /this month/);
});

test("current-month card Checkout charges one full month now and defers renewal to the 1st", () => {
  const now = new Date("2026-10-02T18:00:00Z");
  const current = academyCheckoutTiming("2026-10", false, now);
  const next = academyCheckoutTiming("2026-11", false, now);
  const nextFirst = Math.floor(Date.UTC(2026, 10, 1, 12) / 1000);
  assert.deepEqual(current, { trial_end: nextFirst });
  assert.deepEqual(next, { trial_end: nextFirst });
  assert.equal("proration_behavior" in current, false);
  assert.equal("proration_behavior" in next, false);
  assert.deepEqual(academyCheckoutTiming("2026-10", false, new Date("2026-10-01T18:00:00Z")), {});
  const firstOfMonth = academyCheckoutTiming("2026-10", false, new Date("2026-10-01T18:00:00Z"));
  assert.equal("proration_behavior" in firstOfMonth, false);
  const paidCurrentMonth = academyCheckoutTiming("2026-10", true, now);
  assert.deepEqual(paidCurrentMonth, { trial_end: nextFirst });
  const paidNextMonth = academyCheckoutTiming("2026-11", true, now);
  assert.deepEqual(paidNextMonth, { trial_end: Math.floor(Date.UTC(2026, 11, 1, 12) / 1000) });
  assert.throws(() => academyCheckoutTiming("2027-01", true, new Date("2027-01-02T18:00:00Z")), /No February charge/);
  assert.deepEqual([1, 2, 3].map((children) => academyTuitionTotalCents(5_000, children)), [5_000, 10_000, 15_000]);
  assert.deepEqual([1, 2, 3].map((children) => academyCheckoutTuitionAmounts(5_000, children, true)), [
    { currentMonthCents: 5_000, recurringMonthlyCents: 5_000 },
    { currentMonthCents: 10_000, recurringMonthlyCents: 10_000 },
    { currentMonthCents: 15_000, recurringMonthlyCents: 15_000 }
  ]);
  assert.equal(academyCheckoutTuitionAmounts(5_000, 2, false).currentMonthCents, 0);
  assert.equal(academyCheckoutTuitionAmounts(5_000, 2, false).recurringMonthlyCents, 10_000);
  assert.deepEqual([1, 2, 3].map((children) => academyCheckoutLineItemPlan(5_000, children, true)), [
    [{ kind: "recurring", unitAmountCents: 5_000, quantity: 1 }, { kind: "current_month", unitAmountCents: 5_000, quantity: 1 }],
    [{ kind: "recurring", unitAmountCents: 5_000, quantity: 2 }, { kind: "current_month", unitAmountCents: 10_000, quantity: 1 }],
    [{ kind: "recurring", unitAmountCents: 5_000, quantity: 3 }, { kind: "current_month", unitAmountCents: 15_000, quantity: 1 }]
  ]);
  assert.deepEqual(academyCheckoutLineItemPlan(5_000, 2, false), [
    { kind: "recurring", unitAmountCents: 5_000, quantity: 2 }
  ]);
  assert.ok(academyCheckoutLineItemPlan(5_000, 1, true).every((line) => line.unitAmountCents === 5_000 || line.unitAmountCents === 0));
  assert.throws(() => academyTuitionTotalCents(5_000, 0), /Invalid Academy tuition/);
});

test("monthly card anchor is the next first within Calgary in both DST seasons", () => {
  assert.equal(new Date(nextCalgaryFirstBillingAnchor(new Date("2026-09-26T12:00:00Z")) * 1000).toISOString(), "2026-10-01T12:00:00.000Z");
  assert.equal(new Date(nextCalgaryFirstBillingAnchor(new Date("2026-02-26T12:00:00Z")) * 1000).toISOString(), "2026-03-01T12:00:00.000Z");
});

test("registration and full first-day billing follow Calgary, not UTC", () => {
  assert.equal(academyRegistrationOpen(new Date("2026-09-27T05:59:59Z")), false);
  assert.equal(academyRegistrationOpen(new Date("2026-09-27T06:00:00Z")), true);
  assert.equal(academyRegistrationOpen(new Date("2027-02-01T05:59:59Z")), true);
  assert.equal(academyRegistrationOpen(new Date("2027-02-01T06:00:00Z")), false);
  assert.equal(calgaryBillingPeriod(new Date("2027-02-01T06:00:00Z")), "2027-02");
  assert.equal(isCalgaryFirstOfMonth(new Date("2026-10-01T05:59:59Z")), false);
  assert.equal(isCalgaryFirstOfMonth(new Date("2026-10-01T06:00:00Z")), true);
  assert.equal(isCalgaryFirstOfMonth(new Date("2026-10-02T06:00:00Z")), false);
});

test("cash reminders appear three Calgary days before the first and on unpaid due day", () => {
  assert.equal(academyCashReminderStage(new Date("2026-09-28T16:00:00Z"), true, "cash_due"), "upcoming");
  assert.equal(academyCashReminderStage(new Date("2026-10-01T16:00:00Z"), true, "cash_due"), "due");
  assert.equal(academyCashReminderStage(new Date("2026-10-01T16:00:00Z"), true, "paid"), null);
  assert.equal(academyCashReminderStage(new Date("2026-09-28T16:00:00Z"), false, "paid"), null);
  assert.equal(academyCashReminderStage(new Date("2026-02-26T16:00:00Z"), true, "cash_due"), "upcoming");
  assert.equal(academyCashReminderStage(new Date("2026-02-25T16:00:00Z"), true, "cash_due"), null);
});

test("Academy classes start October 5 and Fun Class falls on the last Thursday", () => {
  const classes = academyRecurringClasses("2026-10-01", 32);
  assert.equal(classes[0]?.date, "2026-10-05");
  assert.equal(classes[1]?.date, "2026-10-08");
  assert.equal(classes.find((entry) => entry.fun)?.date, "2026-10-29");
  assert.equal(classes.find((entry) => entry.fun)?.date, ACADEMY_FIRST_FUN_CLASS_DATE);
  assert.equal(classes.find((entry) => entry.fun)?.title, "Fun Class");
  assert.equal(classes.filter((entry) => entry.fun).length, 1);
  assert.equal(academyRecurringClasses("2026-10-01", 32, ["2026-10-22"]).find((entry) => entry.fun)?.date, "2026-10-22");
  assert.equal(classes.some((entry) => entry.date === "2026-10-12"), true);
  assert.equal(classes[0]?.note.includes("5:30–7:00 p.m."), true);
  const term = academyRecurringClasses("2027-01-30", 20);
  assert.equal(term.at(-1)?.date, "2027-02-01");
  assert.equal(term.some((entry) => entry.date === "2027-02-04"), false);
});

test("Fun Class handles four/five Thursdays, year rollover and the term boundary", () => {
  const term = academyRecurringClasses("2026-10-01", 180);
  assert.deepEqual(term.filter(entry => entry.fun).map(entry => entry.date), [
    "2026-10-29", "2026-11-26", "2026-12-31", "2027-01-28"
  ]);
  assert.equal(term.at(-1)?.date, "2027-02-01");
  assert.ok(term.every(entry => entry.date <= "2027-02-01"));
  assert.ok(term.filter(entry => entry.fun).every(entry => entry.title === "Fun Class"));
  assert.equal(academyRecurringClasses("2026-10-20", 15).find(entry => entry.fun)?.date, "2026-10-29");
  assert.deepEqual(academyRecurringClasses("2027-02-02"), []);
});

test("staff Fun Class overrides replace the monthly default without duplicating it", () => {
  const classes = academyRecurringClasses("2026-10-01", 180, ["2026-10-22", "2026-11-12"]);
  assert.deepEqual(classes.filter(entry => entry.fun).map(entry => entry.date), [
    "2026-10-22", "2026-11-12", "2026-12-31", "2027-01-28"
  ]);
  assert.equal(classes.find(entry => entry.date === "2026-10-29")?.fun, false);
  assert.equal(classes.find(entry => entry.date === "2026-11-26")?.fun, false);
  assert.equal(academyRecurringClasses("2026-10-23", 9, ["2026-10-22"]).some(entry => entry.fun), false);
});
