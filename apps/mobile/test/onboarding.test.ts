import assert from "node:assert/strict";
import test from "node:test";
import {
  createOnboardingRecord,
  currentOnboardingVersion,
  normalizeOnboardingRecord,
  shouldPresentOnboarding
} from "../src/onboarding/onboardingState";

test("a clean install starts a resumable first-install introduction", () => {
  const record = createOnboardingRecord({ currentStep: 2, now: new Date("2026-09-17T12:00:00.000Z") });
  assert.equal(record.status, "in-progress");
  assert.equal(record.currentStep, 2);
  assert.equal(record.completedVersion, 0);
  assert.equal(shouldPresentOnboarding(record), true);
});

test("completed onboarding is idempotent for ordinary app updates", () => {
  const record = createOnboardingRecord({ status: "complete", now: new Date("2026-09-17T12:00:00.000Z") });
  assert.equal(record.completedVersion, currentOnboardingVersion);
  assert.equal(shouldPresentOnboarding(record), false);
  assert.deepEqual(normalizeOnboardingRecord(JSON.parse(JSON.stringify(record))), record);
});

test("legacy installs migrate as complete without entering onboarding", () => {
  const migrated = createOnboardingRecord({ status: "complete", source: "legacy-migration" });
  assert.equal(migrated.source, "legacy-migration");
  assert.equal(shouldPresentOnboarding(migrated), false);
});

test("invalid persistence never masquerades as a completion", () => {
  assert.equal(normalizeOnboardingRecord({ status: "complete" }), null);
  assert.equal(shouldPresentOnboarding(null), true);
});

