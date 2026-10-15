/** Fictional report-arithmetic fixtures, NOT inference or accuracy evidence. */
import assert from "node:assert/strict";
import test from "node:test";
import { comparisonScope } from "../scripts/recitationComparisonScope";
const planned = [3, 4, 5].map((words, index) => ({ index, words, audioSha256: "a".repeat(64) }));
test("unattempted cases keep their entire word budget after an interrupted comparison", () => {
  assert.deepEqual(comparisonScope(planned, [{index: 0, edits: {words: 3, errors: 0}}]),
    { words: 12, errors: 9, missingCases: 2, complete: false, wer: null });
  assert.equal(comparisonScope(planned, []).errors, 12);
});
test("unknown scope is unavailable, not a perfect empty evaluation", () => {
  assert.deepEqual(comparisonScope([], []), {words: null, errors: null, missingCases: 0, complete: false, wer: null});
});
test("complete diagnostic arithmetic retains every edit, including insertion counts exceeding reference length", () => {
  const result = comparisonScope(planned, planned.map(row => ({index: row.index, edits: {words: row.words, errors: 6}})));
  assert.deepEqual(result, {words: 12, errors: 18, missingCases: 0, complete: true, wer: 1.5});
});
test("duplicates, excluded cases, malformed hashes and changed word denominators fail closed", () => {
  assert.throws(() => comparisonScope([...planned, planned[0]], []), /scope/);
  assert.throws(() => comparisonScope([{...planned[0], audioSha256: "invalid"}], []), /scope/);
  for (const results of [
    [{index: 5, edits: {words: 3, errors: 0}}],
    [{index: 0, edits: {words: 2, errors: 0}}],
    [{index: 0, edits: {words: 3, errors: -1}}],
    Array(2).fill({index: 0, edits: {words: 3, errors: 0}})
  ]) assert.throws(() => comparisonScope(planned, results), /counts/);
});
