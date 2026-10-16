/** Fictional acoustic-score math/contracts, not recognition measurements. */
import assert from "node:assert/strict";
import test from "node:test";
import { acousticEventWinner, corroborateAcousticEvents, ORIGINAL_BASELINE_MARGIN, ORIGINAL_LOCATION_MARGIN,
  type AcousticEventScore } from "../scripts/zipformer/crossAcousticCorroboration";

const model = (score: number, runner = -10): AcousticEventScore[] => [
  { kind: "unchanged", index: null, logLikelihood: -10 },
  { kind: "repetition", index: 1, logLikelihood: score },
  { kind: "omission", index: 1, logLikelihood: runner },
];
test("same unique event plus one original-margin pass corroborates without averaging model likelihoods", () => {
  const a = model(-1), b = model(-9), before = JSON.stringify([a, b]);
  const result = corroborateAcousticEvents(a, b);
  assert.deepEqual(result.predicted, { kind: "repetition", index: 1 });
  assert.equal(result.models[0].passesOriginalMargins, true); assert.equal(result.models[1].passesOriginalMargins, false);
  assert.equal(result.crossModelLikelihoodsCombined, false); assert.equal(result.independenceQualified, false);
  assert.equal(result.goldReceived, false); assert.equal(result.mistakeDetectionQualified, false);
  assert.equal(JSON.stringify([a, b]), before);
  assert.deepEqual(corroborateAcousticEvents(b, a).predicted, result.predicted);
});
test("unchanged winners, exact ties, different kinds or locations, and two weak winners remain uncertain", () => {
  const good = model(-1);
  assert.equal(corroborateAcousticEvents(good, model(-11, -12)).reason, "unchanged-winner");
  assert.equal(corroborateAcousticEvents(good, model(-1, -1)).reason, "tied-event");
  assert.equal(corroborateAcousticEvents(model(-9), model(-9)).reason, "both-below-original-margins");
  for (const change of [{ kind: "substitution" as const, index: 1 }, { kind: "repetition" as const, index: 2 }]) {
    const other = model(-1); other[1] = { ...other[1], ...change };
    const result = corroborateAcousticEvents(good, other); assert.equal(result.reason, "different-event"); assert.equal(result.predicted, null);
  }
});
test("same-event vocalizations use maximum; duplicate score rows add no vote and path identity stays unknown", () => {
  const original = model(-1), duplicated = [...original, { ...original[1] }, { ...original[1], logLikelihood: -2 }];
  const a = acousticEventWinner(original), b = acousticEventWinner(duplicated);
  assert.deepEqual(b.originalPredicted, a.originalPredicted); assert.equal(b.baselineMargin, a.baselineMargin);
  assert.equal(b.locationMargin, a.locationMargin); assert.equal(b.duplicateScoreRows, 1);
  assert.equal(b.originalScores.length, 5); assert.equal(b.groupedEvents.length, 3);
  assert.equal(b.pathIdentityQualified, false);
});
test("the exact original margins are unchanged and all small discrete score combinations obey the fixed rule", () => {
  assert.equal(ORIGINAL_BASELINE_MARGIN, Math.log(100)); assert.equal(ORIGINAL_LOCATION_MARGIN, Math.log(10));
  let count = 0;
  for (const x of [-15, -10, -9, -5, -1]) for (const y of [-15, -10, -9, -5, -1])
    for (const z of [-15, -10, -9, -5, -1]) for (const w of [-15, -10, -9, -5, -1]) {
      const a = model(x, y), b = model(z, w), result = corroborateAcousticEvents(a, b);
      const brute = (scores: AcousticEventScore[]) => {
        const sorted = scores.slice().sort((a, b) => b.logLikelihood - a.logLikelihood);
        return { best: sorted[0], unique: sorted[0].logLikelihood > sorted[1].logLikelihood,
          pass: sorted[0].kind !== "unchanged" && sorted[0].logLikelihood - scores[0].logLikelihood >= Math.log(100)
            && sorted[0].logLikelihood - sorted[1].logLikelihood >= Math.log(10) };
      };
      const aa = brute(a), bb = brute(b), expected = aa.unique && bb.unique && aa.best.kind !== "unchanged"
        && aa.best.kind === bb.best.kind && aa.best.index === bb.best.index && (aa.pass || bb.pass)
          ? { kind: aa.best.kind, index: aa.best.index } : null;
      assert.deepEqual(result.predicted, expected); count++;
    }
  assert.equal(count, 625);
});
test("malformed complete lists fail closed, including an invalid row after the apparent winner", () => {
  const valid = model(-1);
  for (const invalid of [[], valid.slice(1), [...valid, { ...valid[0] }], Array(258).fill(valid[1]),
    [...valid, { ...valid[1], index: null }], [...valid, { ...valid[1], index: 32 }],
    [...valid, { ...valid[1], logLikelihood: NaN }], [...valid, { ...valid[1], logLikelihood: -Infinity }],
    [...valid, { ...valid[1], logLikelihood: 1 }]])
    assert.throws(() => corroborateAcousticEvents(valid, invalid), /bounded/);
});
