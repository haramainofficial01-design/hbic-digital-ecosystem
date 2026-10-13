/** Brute-force CTC math checks, not manufactured audio/recognition evidence. */
import assert from "node:assert/strict";
import test from "node:test";
import { phoneticPrefixBeam } from "../scripts/recitationPhoneticBeam";
const logs = (rows: number[][]) => Float32Array.from(rows.flat().map(value => Math.log(value)));

test("prefix search sums acoustic paths without receiving an expected answer", () => {
  const result = phoneticPrefixBeam(logs([[.4, .35, .25], [.4, .35, .25]]), 3, 0);
  assert.deepEqual(result.ids, [1]); // Greedy chooses empty; summed CTC paths choose token 1.
  assert.equal(result.referenceConditioned, false);
  assert.ok(Math.abs(Math.exp(result.retainedPathLogScore) - (.35 * .35 + 2 * .35 * .4)) < 1e-6);
});
test("adjacent emissions collapse, but a blank preserves actual repeated tokens and terminal sounds", () => {
  assert.deepEqual(phoneticPrefixBeam(logs([[0, 1], [0, 1]]), 2, 0).ids, [1]);
  assert.deepEqual(phoneticPrefixBeam(logs([[0, 1], [1, 0], [0, 1]]), 2, 0).ids, [1, 1]);
  assert.deepEqual(phoneticPrefixBeam(logs([[1, 0], [0, 1]]), 2, 0).ids, [1]);
  assert.deepEqual(phoneticPrefixBeam(logs([[1, 0], [1, 0]]), 2, 0).ids, []);
});
test("full tiny CTC enumeration agrees with prefix search rather than a memorized transcript", () => {
  const rows = [[.33, .25, .42], [.3, .5, .2], [.3, .25, .45]], paths = new Map<string, number>();
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) {
    const sequence = [a, b, c], tokens = sequence.filter((id, index) => id !== 0 && (index === 0 || id !== sequence[index - 1]));
    const key = tokens.join(",");
    paths.set(key, (paths.get(key) ?? 0) + rows[0][a] * rows[1][b] * rows[2][c]);
  }
  const best = [...paths].sort((a, b) => b[1] - a[1])[0], actual = phoneticPrefixBeam(logs(rows), 3, 0, 32);
  assert.equal(actual.ids.join(","), best[0]);
  assert.ok(Math.abs(Math.exp(actual.retainedPathLogScore) - best[1]) < 1e-6);
});
test("invalid, unnormalized or oversized acoustic evidence cannot produce trusted results", () => {
  assert.throws(() => phoneticPrefixBeam(new Float32Array([NaN, 0]), 2, 0), /Invalid/);
  assert.throws(() => phoneticPrefixBeam(new Float32Array([0, 0]), 2, 0), /Normalized/);
  assert.throws(() => phoneticPrefixBeam(new Float32Array(), 2, 0), /Bounded/);
  assert.throws(() => phoneticPrefixBeam(logs([[1, 0]]), 2, 2), /Bounded/);
  assert.throws(() => phoneticPrefixBeam(logs([[1, 0]]), 2, 0, 33), /Bounded/);
  assert.throws(() => phoneticPrefixBeam(new Float32Array(651 * 2), 2, 0), /Bounded/);
});
