import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { normalizeContent, toPublicContent, normalizeRatingCampaign, isRatingCampaignOnlyChange, translateUi } from "@hbic/shared";
import { RatingCampaignLedger, ratingIsEligible, type RatingEligibility } from "../src/rating/campaignState";
import { appReviewLinks, openAppReview } from "../src/rating/storeLinks";

const now = Date.parse("2026-10-13T16:00:00Z");
const safe: RatingEligibility = { platform: "android", campaign: { id: "hbic-rating-2026-10", enabled: true },
  homeReady: true, homeFocused: true, foreground: true, onboarding: false, contentFresh: true,
  notificationCheckComplete: true, nativeReviewAvailable: false, deferredUntil: now - 1,
  prayerTimes: [now + 60 * 60_000], now };
function disk(initial: string | null = null) {
  let value = initial;
  return { read: async () => value, write: async (next: string) => { value = next; }, value: () => value };
}

test("old/default/malformed configuration is disabled; only explicit true with a valid ID activates", () => {
  for (const input of [null, {}, { enabled: true }, { id: "bad id", enabled: true }, { id: "safe", enabled: "true" }, { id: "x".repeat(65), enabled: true }])
    assert.equal(normalizeRatingCampaign(input).enabled, false);
  assert.deepEqual(normalizeRatingCampaign(safe.campaign), safe.campaign);
});
test("campaign survives authenticated-content normalization and public projection without changing existing features", () => {
  const previous = normalizeContent();
  const content = normalizeContent({ settings: { ...previous.settings, ratingCampaign: safe.campaign } });
  assert.deepEqual(toPublicContent(content).settings.ratingCampaign, safe.campaign);
  for (const key of ["prayerTime", "iqamahTime", "featureFlags", "events", "donationCategories"] as const) assert.deepEqual(content[key], previous[key]);
  assert.equal(normalizeContent().settings.ratingCampaign?.enabled, false);
});
test("rating-only CMS activation is silent; any other content or prayer change keeps ordinary propagation", () => {
  const before = normalizeContent(normalizeContent());
  const after = normalizeContent({ ...before, settings: { ...before.settings, ratingCampaign: safe.campaign }, version: 2, status: "draft", updatedAt: "2026-10-13T17:00:00Z" });
  assert.equal(isRatingCampaignOnlyChange(before, after), true);
  assert.equal(isRatingCampaignOnlyChange(before, before), false);
  assert.equal(isRatingCampaignOnlyChange(before, { ...after, settings: { ...after.settings, phone: "new" } }), false);
  assert.equal(isRatingCampaignOnlyChange(before, { ...after, iqamahTime: { ...after.iqamahTime, maghribIqamah: "7:11 PM" } }), false);
  assert.equal(isRatingCampaignOnlyChange(before, { ...after, announcements: [] }), false);
  const projected = toPublicContent(before);
  const withRefreshMetadata = { ...after, prayerTime: { ...after.prayerTime, updatedAt: "2026-10-13T17:00:00Z" } };
  assert.equal(isRatingCampaignOnlyChange(projected, toPublicContent(withRefreshMetadata)), true);
  assert.equal(isRatingCampaignOnlyChange(projected, toPublicContent({ ...after, iqamahTime: { ...after.iqamahTime, maghribIqamah: "7:11 PM" } })), false);
});
test("fully loaded, idle existing-user home is eligible without requiring a new installation", () => {
  assert.equal(ratingIsEligible(safe), true);
  assert.equal(ratingIsEligible({ ...safe, platform: "ios", nativeReviewAvailable: true }), true);
});
test("onboarding, Quran/Academy focus, background, unread launch alert and stale/offline config suppress invitations", () => {
  for (const patch of [{ homeReady: false }, { homeFocused: false }, { foreground: false }, { onboarding: true },
    { contentFresh: false }, { notificationCheckComplete: false }, { deferredUntil: now + 1 }, { prayerTimes: [] },
    { prayerTimes: [NaN] }, { campaign: { ...safe.campaign, enabled: false } }, { platform: "web" }, { platform: "ios" }])
    assert.equal(ratingIsEligible({ ...safe, ...patch }), false, JSON.stringify(patch));
});
test("canonical adhan/iqamah/Jumuah quiet windows include two minutes before and ten minutes after", () => {
  for (const offset of [-2 * 60_000, -1, 0, 10 * 60_000]) assert.equal(ratingIsEligible({ ...safe, prayerTimes: [now - offset] }), false);
  for (const offset of [-2 * 60_000 - 1, 10 * 60_000 + 1]) assert.equal(ratingIsEligible({ ...safe, prayerTimes: [now - offset] }), true);
});
test("persist-before-show is one-time across Not Now, rating, remount and installation restart", async () => {
  const storage = disk();
  const ledger = new RatingCampaignLedger(storage);
  assert.equal(await ledger.claim(safe.campaign.id, () => true), true);
  assert.ok(storage.value()?.includes(safe.campaign.id));
  assert.equal(await ledger.claim(safe.campaign.id, () => true), false);
  assert.equal(await new RatingCampaignLedger(storage).claim(safe.campaign.id, () => true), false);
  assert.equal(await new RatingCampaignLedger(storage).claim("next-approved-campaign", () => true), true);
  assert.equal(await ledger.claim(safe.campaign.id, () => true), false);
});
test("concurrent claims cannot present the same campaign twice", async () => {
  const ledger = new RatingCampaignLedger(disk());
  assert.deepEqual(await Promise.all(Array.from({ length: 10 }, () => ledger.claim("same", () => true))), [true, ...Array(9).fill(false)]);
});
test("storage failure or corruption suppresses an invitation rather than nagging or overwriting history", async () => {
  for (const storage of [disk("bad JSON"), disk('{"version":2,"attempted":[]}'), disk('{"version":1,"attempted":["../x"]}'),
    { read: async () => null, write: async () => { throw new Error("Disk full"); } }])
    assert.equal(await new RatingCampaignLedger(storage).claim("safe", () => true), false);
});
test("remote disable/route change during persistence releases only the unpresented claim", async () => {
  let eligible = true;
  const storage = disk();
  const ledger = new RatingCampaignLedger({ read: storage.read, write: async value => { await storage.write(value); eligible = false; } });
  assert.equal(await ledger.claim("safe", () => eligible), false);
  assert.deepEqual(JSON.parse(storage.value()!).attempted, []);
  assert.equal(await new RatingCampaignLedger(storage).claim("safe", () => true), true);
});
test("native decline can release its unrequested claim without erasing other campaign history", async () => {
  const storage = disk(); const ledger = new RatingCampaignLedger(storage);
  await ledger.claim("previous", () => true); await ledger.claim("current", () => true);
  await ledger.release("current");
  assert.deepEqual(JSON.parse(storage.value()!).attempted, ["previous"]);
});
test("iOS direct write-review targets verified Apple ID; Android targets verified listing reviews", async () => {
  const urls: string[] = [];
  await openAppReview("ios", async url => { urls.push(url); });
  await openAppReview("android", async url => { urls.push(url); });
  assert.deepEqual(urls, [appReviewLinks.ios, appReviewLinks.androidNative]);
  assert.match(urls[0], /id6790937097\?action=write-review$/);
  assert.match(urls[1], /id=ca\.hbic\.calgary\.app&showAllReviews=true$/);
});
test("Android without Play uses HTTPS fallback; offline failure is reported, not marked as a review", async () => {
  const urls: string[] = [];
  await openAppReview("android", async url => { urls.push(url); if (url.startsWith("market:")) throw new Error("No Play app"); });
  assert.deepEqual(urls, [appReviewLinks.androidNative, appReviewLinks.android]);
  await assert.rejects(openAppReview("ios", async () => { throw new Error("Offline"); }));
  await assert.rejects(openAppReview("web", async () => {}));
});
test("permanent review links exist in both More and Settings independently of the campaign", () => {
  for (const path of ["../app/(tabs)/more.tsx", "../app/settings.tsx"]) assert.match(readFileSync(new URL(path, import.meta.url), "utf8"), /<RateAppButton\s*\/>/);
});
test("invitation is voluntary, has the requested copy and preserves all four app languages", () => {
  const source = readFileSync(new URL("../src/rating/RatingInvitation.tsx", import.meta.url), "utf8");
  for (const copy of ["Enjoying the Masjid Bilal App? ⭐", "Your review helps more people discover our app and stay connected with the masjid. JazakAllahu Khairan for your support!", "Rate Our App ⭐", "Not Now"])
    assert.ok(source.includes(copy));
  assert.doesNotMatch(source, /five.star|5.star|reward/i);
  for (const lang of ["ur", "fa-AF", "ar"] as const) for (const copy of ["Enjoying the Masjid Bilal App? ⭐", "Rate Our App ⭐", "Rate Our App", "Not Now"])
    assert.notEqual(translateUi(lang, copy), copy);
});
