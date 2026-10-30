import test from "node:test";
import assert from "node:assert/strict";
import { getAcademyStarMonths, academyStarMonthLabel } from "../src/academyStars";
import { defaultContent, normalizeContent, toPublicContent } from "../src/content";

const october = { month: "2026-10", winners: [
  { side: "brothers" as const, name: "Test learner A", photoEnabled: true }, { side: "sisters" as const, name: "Test learner B", photoEnabled: true }
] };
test("photos stay through the next month until new winners are published", () => {
  for (const at of ["2026-10-30T12:00:00Z", "2026-11-01T06:00:00Z", "2026-11-25T12:00:00Z"]) {
    const rows = getAcademyStarMonths([october], new Date(at));
    assert.equal(rows[0].winners[1].photoUrl, "/api/academy/stars/2026-10/sisters");
  }
});
test("an optional explicit privacy cutoff can still remove photos without removing names", () => {
  const rows = getAcademyStarMonths([{ ...october, photosUntil: "2026-11-01T06:00:00Z" }], new Date("2026-11-02T12:00:00Z"));
  assert.equal(rows[0].winners[0].photoUrl, undefined);
  assert.equal(rows[0].winners[0].name, "Test learner A");
});
test("prior months are names-only above the current month, even if an old cutoff was extended", () => {
  const november = { ...october, month: "2026-11", photosUntil: "2026-12-01T07:00:00Z" };
  const rows = getAcademyStarMonths([november, { ...october, photosUntil: "2099-01-01" }], new Date("2026-11-02T12:00:00Z"));
  assert.deepEqual(rows.map(r => r.month), ["2026-10", "2026-11"]);
  assert.equal(rows[0].winners[0].photoUrl, undefined); assert.ok(rows[1].winners[0].photoUrl);
});
test("future, malformed and duplicate months and winners are excluded; invalid cutoffs hide photos", () => {
  const rows = getAcademyStarMonths([null, { ...october, month: "2026-13" }, { ...october, month: "2026-12" }, { ...october, photosUntil: "bad", winners: [...october.winners, october.winners[0], { side: "other", name: "Bad" }] }, october], new Date("2026-10-29T20:00:00Z"));
  assert.equal(rows.length, 1); assert.equal(rows[0].winners.length, 2); assert.equal(rows[0].winners[0].photoUrl, undefined);
});
test("only real approved Instagram reel links display; absent links produce no placeholder", () => {
  const now = new Date("2026-10-29T20:00:00Z");
  for (const highlightUrl of ["javascript:alert(1)", "https://instagram.com.attacker.test/reel/abc", "https://example.test/reel/abc"]) assert.equal(getAcademyStarMonths([{ ...october, highlightUrl }], now)[0].highlightUrl, undefined);
  assert.equal(getAcademyStarMonths([{ ...october, highlightUrl: "https://www.instagram.com/reel/Example123/" }], now)[0].highlightUrl, "https://www.instagram.com/reel/Example123/");
  assert.equal(getAcademyStarMonths([october], now)[0].highlightUrl, undefined);
});
test("the public content contract strips superseded image routes while preserving names and unrelated features", () => {
  const content = normalizeContent({ ...defaultContent, academyStars: [october, { ...october, month: "2026-11" }] });
  const view = toPublicContent(content, new Date("2026-11-02T12:00:00Z"));
  assert.equal(view.academyStars?.[0].winners[0].photoEnabled, false);
  assert.equal(view.academyStars?.[0].winners[0].name, "Test learner A");
  assert.deepEqual(view.settings, toPublicContent(normalizeContent(defaultContent), new Date("2026-11-02T12:00:00Z")).settings);
  assert.equal(academyStarMonthLabel("2026-10"), "October 2026");
});
