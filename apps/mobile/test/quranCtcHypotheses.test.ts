/** Exact probability-math fixtures only, never speech accuracy. */
import assert from "node:assert/strict";
import test from "node:test";
import { comparePhoneticEventHypotheses, phoneticCtcLogLikelihood, phoneticRunLogLikelihood, uniquePhoneticEventHypotheses } from "../scripts/recitationCtcHypotheses";
const logs = (rows: number[][]) => Float32Array.from(rows.flat().map(Math.log));
test("CTC forward sums every tiny waveform-path alternative without reference-forced output", () => {
  const rows = [[.3, .5, .2], [.4, .25, .35], [.25, .5, .25]], sums = new Map<string, number>();
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) {
    const sequence = [a, b, c], key = sequence.filter((id, i) => id !== 0 && (!i || id !== sequence[i - 1])).join(",");
    sums.set(key, (sums.get(key) ?? 0) + rows[0][a] * rows[1][b] * rows[2][c]);
  }
  for (const [key, probability] of sums) {
    const ids = key ? key.split(",").map(Number) : [];
    assert.ok(Math.abs(Math.exp(phoneticCtcLogLikelihood(logs(rows), 3, 0, ids)) - probability) < 1e-6);
  }
  assert.equal(phoneticCtcLogLikelihood(logs(rows), 3, 0, [1, 1, 1]), -Infinity);
});
test("strong counterfactual support stays unqualified and partial speech cannot become an omission", () => {
  const evidence = logs([[.0001, .9998, .0001], [.9998, .0001, .0001], [.0001, .9998, .0001], [.9998, .0001, .0001], [.9998, .0001, .0001]]);
  const hypotheses = [{kind: "unchanged" as const, index: null, ids: [1, 2, 1]},
    {kind: "omission" as const, index: 1, ids: [1, 1]}, {kind: "repetition" as const, index: 1, ids: [1, 2, 2, 1]}];
  const completed = comparePhoneticEventHypotheses(evidence, 3, 0, hypotheses, true);
  assert.deepEqual(completed.predicted, {kind: "omission", index: 1});
  assert.equal(completed.confidenceQualified, false); assert.equal(completed.recognitionTranscriptProduced, false);
  assert.equal(comparePhoneticEventHypotheses(evidence, 3, 0, hypotheses, false).predicted, null);
});
test("ambiguous locations and correct-looking forced paths cannot certify a word error or correctness", () => {
  const evidence = logs([[.01, .98, .01], [.98, .01, .01], [.01, .98, .01], [.98, .01, .01], [.98, .01, .01]]);
  const h = [{kind: "unchanged" as const, index: null, ids: [1, 2, 1]},
    {kind: "omission" as const, index: 1, ids: [1, 1]}, {kind: "omission" as const, index: 2, ids: [1, 1]}];
  assert.equal(comparePhoneticEventHypotheses(evidence, 3, 0, h, true).predicted, null);
  assert.equal(comparePhoneticEventHypotheses(evidence, 3, 0, [h[1], {...h[0], ids: [1, 1]}, {...h[2], ids: [1, 2, 1]}], true).predicted, null);
});
test("invalid CTC emissions and duplicated/malformed hypotheses fail closed", () => {
  assert.throws(() => phoneticCtcLogLikelihood(new Float32Array([NaN, 0]), 2, 0, [1]), /Invalid/);
  assert.throws(() => phoneticCtcLogLikelihood(new Float32Array([0, 0]), 2, 0, [1]), /Normalized/);
  assert.throws(() => phoneticCtcLogLikelihood(logs([[.5, .5]]), 2, 0, [0]), /nonblank/);
  const h = [{kind: "unchanged" as const, index: null, ids: [1]}, {kind: "omission" as const, index: 1, ids: [1]}, {kind: "omission" as const, index: 1, ids: [1]}];
  assert.throws(() => comparePhoneticEventHypotheses(logs([[.5, .5]]), 2, 0, h, true), /Duplicate/);
});
test("identical reference paths count once but competing locations remain ambiguous", () => {
  const h = [{kind: "unchanged" as const, index: null, ids: [1, 2, 1]},
    {kind: "omission" as const, index: 1, ids: [1, 1]}, {kind: "omission" as const, index: 2, ids: [1, 1]}];
  const unique = uniquePhoneticEventHypotheses([...h, {...h[1], ids: [...h[1].ids]}]);
  assert.equal(unique.duplicatePathsIgnored, 1); assert.deepEqual(unique.hypotheses, h);
  const evidence = logs([[.01, .98, .01], [.98, .01, .01], [.01, .98, .01], [.98, .01, .01], [.98, .01, .01]]);
  assert.deepEqual(comparePhoneticEventHypotheses(evidence, 3, 0, unique.hypotheses, true),
    comparePhoneticEventHypotheses(evidence, 3, 0, h, true));
  unique.hypotheses[1].ids.push(2); assert.deepEqual(h[1].ids, [1, 1]);
});
test("lexical phone-run likelihood matches all tiny paths without hiding different consonants or vowels", () => {
  const rows = [[.3, .5, .2], [.4, .25, .35], [.25, .5, .25]], sums = new Map<string, number>();
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) {
    const voiced = [a, b, c].filter(id => id !== 0), key = voiced.filter((id, i) => !i || id !== voiced[i - 1]).join(",");
    sums.set(key, (sums.get(key) ?? 0) + rows[0][a] * rows[1][b] * rows[2][c]);
  }
  for (const [key, probability] of sums) {
    const ids = key ? key.split(",").map(Number) : [];
    assert.ok(Math.abs(Math.exp(phoneticRunLogLikelihood(logs(rows), 3, 0, ids)) - probability) < 1e-6);
  }
  assert.equal(phoneticRunLogLikelihood(logs(rows), 3, 0, [1, 1, 2]), phoneticRunLogLikelihood(logs(rows), 3, 0, [1, 2]));
  assert.notEqual(phoneticRunLogLikelihood(logs(rows), 3, 0, [1, 2]), phoneticRunLogLikelihood(logs(rows), 3, 0, [1]));
  assert.notEqual(phoneticRunLogLikelihood(logs(rows), 3, 0, [1, 2, 1]), phoneticRunLogLikelihood(logs(rows), 3, 0, [1, 2]));
});
