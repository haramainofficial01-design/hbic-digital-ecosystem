/** Exhaustive fictional CTC math only, never natural-speech accuracy evidence. */
import assert from "node:assert/strict";
import test from "node:test";
import { acousticWordpieceCandidates } from "../scripts/recitationAcousticBeam";
import { rerankAcousticPhoneStrings } from "../scripts/zipformer/exactPhoneReranking";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} versus ${expected}`);

function enumerate(rows: number[][], units: string[], blank: number) {
  const exact = new Map<string, number>();
  function visit(ids: number[], mass: number) {
    if (ids.length === rows.length) {
      const text = ids.filter((id, i) => id !== blank && (!i || id !== ids[i - 1])).map(id => units[id]).join("");
      exact.set(text, (exact.get(text) ?? 0) + mass);
      return;
    }
    for (let id = 0; id < units.length; id++) visit([...ids, id], mass * rows[ids.length][id]);
  }
  visit([], 1);
  return exact;
}

test("exact reranking matches every tiny compound-token CTC path, not pruned prefix rank", () => {
  const units = ["a", "aa", "b", ""], choices = [
    [.1, .2, .3, .4], [.4, .3, .2, .1], [.05, .4, .5, .05],
  ];
  let checkedStrings = 0, rankChanges = 0;
  for (const first of choices) for (const second of choices) for (const third of choices) {
    const rows = [first, second, third], evidence = Float32Array.from(rows.flat().map(Math.log));
    const paths = acousticWordpieceCandidates(evidence, 4, 3, 32, 3).candidates;
    const candidates = paths.map(row => ({ phones: row.ids.map(id => units[id]).join(""),
      retainedPathLogScore: row.retainedPathLogScore }));
    const before = JSON.stringify(candidates), result = rerankAcousticPhoneStrings(evidence, units, 3, candidates);
    assert.equal(JSON.stringify(candidates), before);
    const exact = enumerate(rows, units, 3);
    assert.equal(result.distinctPhoneStrings, new Set(candidates.map(row => row.phones)).size);
    for (const row of result.ranked) {
      close(Math.exp(row.exactLogLikelihood), exact.get(row.phones)!);
      assert.deepEqual(row.originalRanks, candidates.flatMap((old, i) => old.phones === row.phones ? [i + 1] : []));
      assert.deepEqual(row.originalPrunedLogScores, row.originalRanks.map(rank => candidates[rank - 1].retainedPathLogScore));
      checkedStrings++;
    }
    rankChanges += result.ranked.filter(row => row.rank !== row.originalRanks[0]).length;
    for (let i = 1; i < result.ranked.length; i++)
      assert.ok(result.ranked[i - 1].exactLogLikelihood >= result.ranked[i].exactLogLikelihood);
  }
  assert.ok(checkedStrings >= 500);
  assert.ok(rankChanges > 0, "compound-segmentation mass must demonstrate a genuinely changed ranking");
});

test("duplicate original strings retain all provenance but do not double-vote their exact mass", () => {
  const evidence = Float32Array.from([.2, .3, .5].map(Math.log));
  const result = rerankAcousticPhoneStrings(evidence, ["a", "aa", ""], 2, [
    { phones: "a", retainedPathLogScore: Math.log(.1) },
    { phones: "aa", retainedPathLogScore: Math.log(.09) },
    { phones: "a", retainedPathLogScore: Math.log(.08) },
  ]);
  assert.equal(result.candidateCount, 3); assert.equal(result.distinctPhoneStrings, 2);
  assert.equal(result.duplicatePhoneStrings, 1);
  assert.equal(result.ranked[0].phones, "aa");
  close(Math.exp(result.ranked[1].exactLogLikelihood), .2);
  assert.deepEqual(result.ranked[1].originalRanks, [1, 3]);
  assert.deepEqual(result.ranked[1].originalPrunedLogScores, [Math.log(.1), Math.log(.08)]);
});

test("exact ties preserve earliest original rank and an empty decoded string remains silence", () => {
  const evidence = Float32Array.from([.25, .25, .5].map(Math.log));
  const candidates = Object.freeze([
    Object.freeze({ phones: "b", retainedPathLogScore: Math.log(.2) }),
    Object.freeze({ phones: "a", retainedPathLogScore: Math.log(.2) }),
    Object.freeze({ phones: "", retainedPathLogScore: Math.log(.1) }),
  ]);
  const result = rerankAcousticPhoneStrings(evidence, ["a", "b", ""], 2, candidates);
  assert.deepEqual(result.ranked.map(row => row.phones), ["", "b", "a"]);
  close(Math.exp(result.ranked[0].exactLogLikelihood), .5);
  assert.equal(result.phoneRunNuisance, false); assert.equal(result.referenceReceived, false);
  for (const key of ["confidenceQualified", "wordRecognitionQualified", "safeForMistakeTracking",
    "liveFollowingQualified", "nativeQualified"] as const) assert.equal(result[key], false);
});

test("raw repeated sounds remain distinct and arbitrary expected phone strings cannot add acoustic mass", () => {
  const units = ["a", "b", ""], rows = [[.8, .1, .1], [.1, .1, .8], [.8, .1, .1]];
  const evidence = Float32Array.from(rows.flat().map(Math.log));
  const result = rerankAcousticPhoneStrings(evidence, units, 2, [
    { phones: "aa", retainedPathLogScore: Math.log(.4) },
    { phones: "a", retainedPathLogScore: Math.log(.1) },
  ]);
  const exact = enumerate(rows, units, 2);
  for (const row of result.ranked) close(Math.exp(row.exactLogLikelihood), exact.get(row.phones)!);
  assert.notEqual(result.ranked.find(row => row.phones === "aa")!.exactLogLikelihood,
    result.ranked.find(row => row.phones === "a")!.exactLogLikelihood);
  assert.throws(() => rerankAcousticPhoneStrings(evidence, units, 2,
    [{ phones: "c", retainedPathLogScore: -10 }]), /mass/);
});

test("malformed, reordered, excessive, or impossible retained evidence fails closed", () => {
  const evidence = Float32Array.from([.4, .6].map(Math.log)), units = ["a", ""];
  const good = { phones: "a", retainedPathLogScore: Math.log(.3) };
  assert.throws(() => rerankAcousticPhoneStrings(evidence, units, 1, []), /Bounded/);
  assert.throws(() => rerankAcousticPhoneStrings(evidence, units, 1, Array(33).fill(good)), /Bounded/);
  assert.throws(() => rerankAcousticPhoneStrings(evidence, units, 1,
    [good, { phones: "a", retainedPathLogScore: NaN }]), /Bounded/);
  assert.throws(() => rerankAcousticPhoneStrings(evidence, units, 1,
    [good, { phones: "a", retainedPathLogScore: Math.log(.35) }]), /Bounded/);
  assert.throws(() => rerankAcousticPhoneStrings(evidence, units, 1,
    [{ phones: "a", retainedPathLogScore: 1 }]), /Bounded/);
  assert.throws(() => rerankAcousticPhoneStrings(evidence, units, 1,
    [{ phones: "a".repeat(1001), retainedPathLogScore: -100 }]), /Bounded/);
  assert.throws(() => rerankAcousticPhoneStrings(evidence, units, 1,
    [{ phones: "a", retainedPathLogScore: Math.log(.5) }]), /mass/);
  assert.throws(() => rerankAcousticPhoneStrings(Float32Array.from([NaN, 0]), units, 1, [good]), /Invalid/);
  assert.throws(() => rerankAcousticPhoneStrings(new Float32Array([0, 0]), units, 1, [good]), /Normalized/);
  assert.throws(() => rerankAcousticPhoneStrings(evidence, units, 2, [good]), /Bounded/);
  assert.throws(() => rerankAcousticPhoneStrings(Float32Array.from([.2, .2, .6].map(Math.log)),
    ["a", "a", ""], 2, [good]), /Unique/);
});
