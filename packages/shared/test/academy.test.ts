import assert from "node:assert/strict";
import test from "node:test";
import { academyCashReminderStage, academyRecurringClasses, academyRegistrationOpen, calgaryBillingPeriod, isCalgaryFirstOfMonth, nextCalgaryFirstBillingAnchor, parseAcademyRegistration } from "../src/academy";

const valid = {
  guardianName: "Sahl Shafiq",
  phone: "+1 (403) 555-0100",
  email: "Parent@example.com",
  whatsappConsent: false,
  paymentChoice: "cash",
  children: [{ name: "Ahmed Shafiq", age: 8, level: "qaida" }, { name: "Maryam Shafiq", age: 11, level: "not_sure" }]
};

test("Academy accepts one parent with multiple children and normalizes the email", () => {
  const registration = parseAcademyRegistration(valid);
  assert.equal(registration.email, "parent@example.com");
  assert.equal(registration.children.length, 2);
  assert.equal(registration.children[1].level, "not_sure");
});

test("Academy rejects missing consent choice, invalid ages and excess children", () => {
  assert.throws(() => parseAcademyRegistration({ ...valid, whatsappConsent: undefined }), /WhatsApp/);
  assert.throws(() => parseAcademyRegistration({ ...valid, children: [{ ...valid.children[0], age: 2 }] }), /age/);
  assert.throws(() => parseAcademyRegistration({ ...valid, children: Array(9).fill(valid.children[0]) }), /eight/);
});

test("Billing periods follow Calgary, including UTC month rollover and DST", () => {
  assert.equal(calgaryBillingPeriod(new Date("2026-10-01T04:30:00Z")), "2026-09");
  assert.equal(calgaryBillingPeriod(new Date("2026-10-01T06:30:00Z")), "2026-10");
  assert.equal(calgaryBillingPeriod(new Date("2026-03-01T04:30:00Z")), "2026-02");
  assert.equal(calgaryBillingPeriod(new Date("2026-03-01T08:30:00Z")), "2026-03");
});

test("monthly card anchor is the next first within Calgary in both DST seasons", () => {
  assert.equal(new Date(nextCalgaryFirstBillingAnchor(new Date("2026-09-26T12:00:00Z")) * 1000).toISOString(), "2026-10-01T12:00:00.000Z");
  assert.equal(new Date(nextCalgaryFirstBillingAnchor(new Date("2026-02-26T12:00:00Z")) * 1000).toISOString(), "2026-03-01T12:00:00.000Z");
});

test("registration and full first-day billing follow Calgary, not UTC", () => {
  assert.equal(academyRegistrationOpen(new Date("2026-10-01T05:59:59Z")), false);
  assert.equal(academyRegistrationOpen(new Date("2026-10-01T06:00:00Z")), true);
  assert.equal(isCalgaryFirstOfMonth(new Date("2026-10-01T05:59:59Z")), false);
  assert.equal(isCalgaryFirstOfMonth(new Date("2026-10-01T06:00:00Z")), true);
  assert.equal(isCalgaryFirstOfMonth(new Date("2026-10-02T06:00:00Z")), false);
});

test("cash reminders appear three Calgary days before the first and on unpaid due day", () => {
  assert.equal(academyCashReminderStage(new Date("2026-09-28T16:00:00Z"), true, "paid"), "upcoming");
  assert.equal(academyCashReminderStage(new Date("2026-10-01T16:00:00Z"), true, "cash_due"), "due");
  assert.equal(academyCashReminderStage(new Date("2026-10-01T16:00:00Z"), true, "paid"), null);
  assert.equal(academyCashReminderStage(new Date("2026-09-28T16:00:00Z"), false, "paid"), null);
  assert.equal(academyCashReminderStage(new Date("2026-02-26T16:00:00Z"), true, "paid"), "upcoming");
  assert.equal(academyCashReminderStage(new Date("2026-02-25T16:00:00Z"), true, "paid"), null);
});

test("Academy classes start October 5 and first alternate fun Thursday is October 15", () => {
  const classes = academyRecurringClasses("2026-10-01", 32);
  assert.equal(classes[0]?.date, "2026-10-05");
  assert.equal(classes[1]?.date, "2026-10-08");
  assert.equal(classes.find((entry) => entry.fun)?.date, "2026-10-15");
  assert.equal(classes.filter((entry) => entry.fun)[1]?.date, "2026-10-29");
});
