import assert from "node:assert/strict";
import test from "node:test";
import {
  privacyContactEmail,
  privacyDataSummary,
  privacyPolicyEffectiveDate,
  privacyPolicyUrl
} from "../src/privacy";

test("privacy constants point to the canonical public policy", () => {
  assert.equal(privacyPolicyUrl, "https://hbic.ca/privacy");
  assert.equal(privacyContactEmail, "info@hbic.ca");
  assert.match(privacyPolicyEffectiveDate, /^\w+ \d{1,2}, \d{4}$/);
});

test("data summary matches the current user-facing product", () => {
  assert.equal(privacyDataSummary.accountRequired, false);
  assert.equal(privacyDataSummary.analyticsEnabled, false);
  assert.equal(privacyDataSummary.advertisingEnabled, false);
  assert.equal(privacyDataSummary.locationCollected, false);
  assert.ok(privacyDataSummary.notificationData.includes("notification token"));
  assert.ok(privacyDataSummary.localOnlyData.includes("cached published content"));
});
