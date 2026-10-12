import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const component = (name: string) => readFileSync(new URL(`../components/${name}.tsx`, import.meta.url), "utf8");

test("dashboard removes generic introductions while keeping labels and publishing controls", () => {
  const source = component("AdminDashboard");
  for (const removed of ["<p>{subtitle}</p>", "Go straight to the work you do most often.", "Use Diagnostics for live database", "This sends through the protected server endpoint", "Role label reserved for Firebase Auth"]) assert.equal(source.includes(removed), false);
  for (const label of ["Save Draft", "Publish Changes", "Refresh status", "Check delivery", "Manual iqamah overrides", "Overrides expire Sunday at midnight (Calgary).", "Editing sets a manual override."]) assert.ok(source.includes(label), label);
  assert.ok(source.includes('<summary>Details</summary>'), "Optional feature explanations stay collapsed");
});

test("Academy remains label-led without removing essential features or confirmations", () => {
  const source = component("AcademyPanel");
  for (const removed of ["Without a camera, type the entire", "Every confirmed ACTIVE student appears here", "Card registrations await Stripe Checkout confirmation", "Confirmed students, including tuition-exempt students, are listed below"]) assert.equal(source.includes(removed), false);
  for (const label of ["Tuition exemptions", "Tuition exempt", '"Boys"', '"Girls"', "Actual cash and card receipts", "Monthly payment breakdown", "Mark cash received", "Confirm enrollment / check in", "Class date", "Payment status"]) assert.ok(source.includes(label), label);
  for (const safety of ["Confirm that", "cash was received", "parent's payment-method request", "Charges only the remaining agreed tuition", "Saved closures notify opted-in parents.", "Card setup requires parent authorization."]) assert.ok(source.includes(safety), safety);
  assert.ok(source.includes('window.confirm(exempt ?'), "Exemption impact is still confirmed before any write");
});

test("sign-in keeps verification and failure feedback; challenge disclosures remain accurate", () => {
  const auth = component("FirebaseAdminAuth"), challenges = component("QuranChallengesPanel");
  for (const label of ["Personal administrator email", "Private password", "Six-digit authenticator code", "Verify & sign in", "Resend verification", 'role="status"']) assert.ok(auth.includes(label), label);
  assert.ok(challenges.includes("practice time, not recitation accuracy"));
  assert.ok(challenges.includes("Prize awards require staff review."));
  assert.ok(challenges.includes("Check Calgary dates before publishing."));
  assert.ok(challenges.includes("window.confirm"));
});
