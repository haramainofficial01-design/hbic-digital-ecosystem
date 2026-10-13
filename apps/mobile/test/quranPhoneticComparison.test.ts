/** Pure diagnostic regressions, never simulated speech accuracy. */
import assert from "node:assert/strict";
import test from "node:test";
import { phoneticComparison } from "../scripts/recitationPhoneticComparison";

test("comparison-side phonemes retain exact word positions without inventing a heard word", () => {
  const reference = ["وَرَفَعنَاا", "لَكَ", "ذِكرَك"];
  assert.equal(phoneticComparison(reference, reference.join("")).edits, 0);
  const skipped = phoneticComparison(reference, reference[0] + reference[2]);
  assert.equal(skipped.wordLocationsQualified, false);
  assert.deepEqual(skipped.entirelyDeletedWordIndices, [1]);
  assert.deepEqual(skipped.changedWordIndices, [1]);
  assert.ok(phoneticComparison(reference, "وَرَفَعنَااعَلَااذِكرَك").changedWordIndices.includes(1));
});
test("phonetic duration or articulation differences remain visible, not silently counted as correct", () => {
  assert.ok(phoneticComparison(["مَاالِك"], "مَلِك").edits > 0);
  assert.ok(phoneticComparison(["قَلب"], "كَلب").edits > 0);
  const repeated = phoneticComparison(["وَرَفَعنَاا", "لَكَ", "ذِكرَك"], "وَرَفَعنَاالَكَلَكَذِكرَك");
  assert.ok(repeated.insertions.length > 0);
});
test("empty audio is not treated as correct and large comparisons fail safely", () => {
  assert.deepEqual(phoneticComparison(["اب", "جد"], "").entirelyDeletedWordIndices, [0, 1]);
  assert.throws(() => phoneticComparison([], "اب"));
  assert.throws(() => phoneticComparison(["ا".repeat(1001)], "ا"));
  assert.throws(() => phoneticComparison(["ا"], "ا".repeat(2001)));
});
