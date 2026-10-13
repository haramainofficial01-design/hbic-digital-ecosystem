/** Probability-math / capture-timeline fixtures only, never speech accuracy. */
import test from "node:test";
import assert from "node:assert/strict";
import { acousticWordpieceBeam, acousticTokenPath, acousticBeamEvidence } from "../scripts/recitationAcousticBeam";
const logs = (rows: number[][]) => Float32Array.from(rows.flat().map(Math.log));
test("wordpiece search sums actual paths, preserving blank-separated repetitions", () => {
  const result = acousticWordpieceBeam(logs([[.4, .35, .25], [.4, .35, .25]]), 3, 0);
  assert.deepEqual(result.ids, [1]); assert.equal(result.referenceConditioned, false); assert.equal(result.confidenceQualified, false);
  assert.ok(Math.abs(Math.exp(result.retainedPathLogScore) - (.35 ** 2 + 2 * .35 * .4)) < 1e-6);
  assert.deepEqual(acousticWordpieceBeam(logs([[0, 1], [1, 0], [0, 1]]), 2, 0).ids, [1, 1]);
  assert.deepEqual(acousticWordpieceBeam(logs([[0, 1], [0, 1]]), 2, 0).ids, [1]);
});
test("tiny exhaustive CTC agrees with search and maximum-path emission timings", () => {
  const rows = [[.33, .25, .42], [.3, .5, .2], [.3, .25, .45]], paths = new Map<string, { sum: number; maximum: number }>();
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) {
    const sequence = [a, b, c], key = sequence.filter((id, i) => id !== 0 && (!i || id !== sequence[i - 1])).join(",");
    const p = rows[0][a] * rows[1][b] * rows[2][c], old = paths.get(key) ?? { sum: 0, maximum: 0 };
    paths.set(key, { sum: old.sum + p, maximum: Math.max(old.maximum, p) });
  }
  const best = [...paths].sort((a, b) => b[1].sum - a[1].sum)[0], evidence = logs(rows), actual = acousticWordpieceBeam(evidence, 3, 0, 32);
  assert.equal(actual.ids.join(","), best[0]); assert.ok(Math.abs(Math.exp(actual.retainedPathLogScore) - best[1].sum) < 1e-6);
  for (const [key, p] of paths) {
    const ids = key ? key.split(",").map(Number) : [], timing = acousticTokenPath(evidence, 3, 0, ids)!;
    assert.ok(Math.abs(Math.exp(timing.logScore) - p.maximum) < 1e-6);
    assert.deepEqual([...timing.frameIds].filter((id, i) => id !== 0 && (!i || id !== timing.frameIds[i - 1])), ids);
    assert.equal(timing.expectedReferenceAligned, false);
  }
});
test("sparse high-vocabulary search supports last blank ID and low-ranked prefix continuations", () => {
  const rows = [[0, .7, 0, 0, .3], [0, .1, .3, 0, .6], [0, .7, 0, 0, .3]];
  const sparse = acousticWordpieceBeam(logs(rows), 5, 4, 8, 1);
  assert.equal(sparse.tokensPruned, true); assert.ok(sparse.ids.every(id => id > 0 && id < 4));
  assert.ok(acousticTokenPath(logs(rows), 5, 4, sparse.ids));
  assert.deepEqual(acousticWordpieceBeam(logs([[0, 0, 0, 0, 1]]), 5, 4).ids, []);
});
test("word evidence retains original posteriors, removed-pause boundaries and uncertainty", () => {
  const evidence = logs([[.02, .96, .02], [.96, .02, .02], [.02, .02, .96], [.96, .02, .02]]), before = evidence.slice();
  const words = acousticBeamEvidence(evidence, 3, 0, [1, 2], {"1": "▁الحمد", "2": "▁لله"}, 12800,
    [{ compactStart: 0, originalStart: 0, length: 6400 }, { compactStart: 6400, originalStart: 19200, length: 6400 }], 10000, 25600);
  assert.deepEqual(words.words.map(w => w.text), ["الحمد", "لله"]);
  assert.equal(words.words[0].endSample, 13200); assert.equal(words.words[1].startSample, 29200);
  assert.ok(words.words[0].edge); assert.ok(Math.abs(words.quality - .96) < 1e-6); assert.deepEqual(evidence, before);
  const uncertain = acousticBeamEvidence(logs([[.7, .3]]), 2, 0, [1], {"1": "▁الحمد"}, 16000,
    [{compactStart: 0, originalStart: 0, length: 16000}]);
  assert.ok(uncertain.quality < .7); assert.ok(uncertain.words[0].confidence < .7);
});
test("unknown pieces, impossible paths and silence cannot fabricate a heard word", () => {
  const evidence = logs([[1, 0], [1, 0]]);
  assert.equal(acousticTokenPath(evidence, 2, 0, [1]), null);
  assert.deepEqual(acousticBeamEvidence(evidence, 2, 0, [], {}, 16000, [{compactStart: 0, originalStart: 0, length: 16000}]).words, []);
  assert.deepEqual(acousticBeamEvidence(logs([[0, 1]]), 2, 0, [1], {"1": "<unk>"}, 16000,
    [{compactStart: 0, originalStart: 0, length: 16000}]).words, []);
});
test("invalid emissions, bounds, decoded tokens and timelines fail closed", () => {
  assert.throws(() => acousticWordpieceBeam(logs([[.5, .5]]), 2, 0, 33), /Bounded/);
  assert.throws(() => acousticWordpieceBeam(logs([[.5, .5]]), 2, 0, 8, 33), /Bounded/);
  assert.throws(() => acousticWordpieceBeam(new Float32Array([NaN, 0]), 2, 0), /Invalid/);
  assert.throws(() => acousticWordpieceBeam(new Float32Array([0, 0]), 2, 0), /Normalized/);
  assert.throws(() => acousticWordpieceBeam(new Float32Array(2049), 2049, 0), /Bounded/);
  assert.throws(() => acousticTokenPath(logs([[.5, .5]]), 2, 0, [0]), /nonblank/);
  assert.throws(() => acousticTokenPath(logs([[.5, .5]]), 2, 0, [1, 1]), /Bounded/);
  assert.throws(() => acousticBeamEvidence(logs([[.5, .5]]), 2, 0, [1], {"1": "▁الحمد"}, 16000,
    [{compactStart: 10, originalStart: 0, length: 16000}]), /timeline/);
});
