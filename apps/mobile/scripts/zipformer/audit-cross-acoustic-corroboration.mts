/** Quran-Lab NPL-1.2; retain LICENSE. Fixed frozen-score audit only.
 * No waveform access, inference, download, training, expected-answer repair,
 * new native feature or production action. All 96 historical scopes retained.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { corroborateAcousticEvents } from "./crossAcousticCorroboration";

if (process.argv.length !== 2) throw Error("One fixed frozen-score experiment; no tuning or source arguments");
const sha = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const sources = [
  { model: "muaalem", split: "calibration", path: "output/quran-development/muaalem-comparison/muaalem-phoneme-calibration-1791917975849.json",
    sha256: "122806595810ab734f52d945f8339bb98e8ae01ea57669bdade93ce4570126df" },
  { model: "muaalem", split: "heldout", path: "output/quran-development/muaalem-comparison/muaalem-phoneme-heldout-1791918096934.json",
    sha256: "3ad8d8ef0d17cc3f418e0dc40fac7136f7050d12e606ebeefad2703e4bf295bb" },
  { model: "compact-v3", split: "calibration", path: "output/quran-development/zipformer-comparison/zipformer-raw-calibration-1-1791926000854-c086bd67-c92e-4a48-8c95-81953f113355.json",
    sha256: "00906711e6bc7dcba73529ca99cfeb900b80878728d5a823066f4794d654be89" },
  { model: "compact-v3", split: "heldout", path: "output/quran-development/zipformer-comparison/zipformer-raw-heldout-1-1791926006432-0d4d35d8-2acf-49b8-9ee6-b433d90a9e06.json",
    sha256: "7fa5867c92f791eb0bd5d24c98ec289f52922003300f8347affd149d59e96531" },
];
const codeFiles = ["apps/mobile/scripts/zipformer/audit-cross-acoustic-corroboration.mts",
  "apps/mobile/scripts/zipformer/crossAcousticCorroboration.ts", "apps/mobile/scripts/recitationCtcHypotheses.ts"];
const codeSha256 = Object.fromEntries(codeFiles.map(path => [path, sha(readFileSync(path))]));
if (codeSha256["apps/mobile/scripts/recitationCtcHypotheses.ts"] !== "6141abba3f28e5551a2da507607c9fe46bb3ab5acad5503b58bb71d3318dbdc3")
  throw Error("Original current comparator/margin implementation must remain unchanged");
const predeclarationPath = "docs/quran-cross-acoustic-corroboration-2026-10-15.md";
const predeclarationSha256 = sha(readFileSync(predeclarationPath));
const output = resolve("output/quran-development/zipformer-comparison", `cross-acoustic-corroboration-${Date.now()}-${randomUUID()}.json`);
let complete = false;
const rows: any[] = [], failures: { split: string; index: number; reason: string }[] = [], provenance: any[] = [];
const expectedBySplit = { calibration: { cases: 48, positives: 18, negatives: 30 }, heldout: { cases: 48, positives: 18, negatives: 30 } };
function summarize(group: any[], field: "muaalemPredicted" | "v3Predicted" | "predicted") {
  const matching = (row: any) => row.expected !== null && row[field]?.kind === row.expected && row[field]?.index === row.expectedIndex;
  const positives = group.filter(row => row.expected !== null), negatives = group.filter(row => row.expected === null);
  const trueEvents = positives.filter(matching).length, predictions = group.filter(row => row[field] !== null).length;
  return { cases: group.length, positives: positives.length, negatives: negatives.length, trueEvents, predictions,
    wrongPositiveAlerts: positives.filter(row => row[field] !== null && !matching(row)).length,
    negativeAlerts: negatives.filter(row => row[field] !== null).length,
    precision: complete && !failures.length && predictions ? trueEvents / predictions : null,
    recall: complete && !failures.length && positives.length ? trueEvents / positives.length : null,
    categories: Object.fromEntries(["omission", "repetition", "substitution"].map(kind => {
      const relevant = positives.filter(row => row.expected === kind);
      return [kind, { total: relevant.length, detected: relevant.filter(matching).length }];
    })) };
}
function save() {
  const report = { complete, newInference: false, freshHeldout: false, audioAccessed: false, sources, codeSha256,
    predeclarationPath, predeclarationSha256, originalComparatorSha256: codeSha256["apps/mobile/scripts/recitationCtcHypotheses.ts"],
    predeclared: { expectedCases: 96, expectedBySplit, baselineMargin: Math.log(100), locationMargin: Math.log(10),
      rule: "same unique non-unchanged winning kind/index in both; at least one passes its unchanged original margins; otherwise uncertain",
      scoreGrouping: "maximum per existing kind/index within each model", labelsReceivedBySelector: false,
      crossModelScoresCombined: false, likelihoodsOrFrontendsEquivalent: false },
    summary: { expectedCases: 96, analyzedCases: rows.length, missingCases: 96 - rows.length, failures: failures.length,
      baselinePredictionsExactlyReplayed: rows.reduce((n, row) => n + Number(row.muaalemReplayExact) + Number(row.v3ReplayExact), 0),
      sameReferencePhones: rows.filter(row => row.referencePhonesEqual).length,
      reasons: Object.fromEntries([...new Set(rows.map(row => row.decision.reason))].map(reason => [reason, rows.filter(row => row.decision.reason === reason).length])),
      all: { muaalem: summarize(rows, "muaalemPredicted"), v3: summarize(rows, "v3Predicted"), corroborated: summarize(rows, "predicted") },
      splits: Object.fromEntries(["calibration", "heldout"].map(split => {
        const group = rows.filter(row => row.split === split);
        return [split, { muaalem: summarize(group, "muaalemPredicted"), v3: summarize(group, "v3Predicted"), corroborated: summarize(group, "predicted") }];
      })) },
    sourceProvenance: provenance, wordWer: null, liveFollowingAccuracy: null, nativeLatency: null,
    confidenceQualified: false, wordRecognitionQualified: false, mistakeDetectionQualified: false, nativeQualified: false,
    limits: ["Same previously inspected approximate-splice/pitch controls, not natural independently reviewed speaker-disjoint gold.",
      "Only source-recorded waveform hashes/sample counts are paired; no audio was fetched or freshly hashed.",
      "Muaalem duration-nuisance/full-PCM and compact-v3 plain longest-unit/quiet-compacted likelihoods remain distinct and are not averaged.",
      "Saved score rows omit original target phone/token IDs. Duplicate numeric rows cannot establish duplicate phonetic paths; max grouping prevents extra votes.",
      "Agreement is not statistical independence, calibrated confidence, verified correction, new word recognition or a 99% result.",
      "Missing/failed scopes stay in planned denominators; no threshold sweeps, model changes, training, native tests, deployment or release."], rows, failures };
  writeFileSync(output, JSON.stringify(report, null, 2));
}
let activeSplit = "startup", activeIndex = -1;
try {
  const loaded = sources.map(source => {
    const bytes = readFileSync(source.path);
    if (bytes.length > 8_000_000 || sha(bytes) !== source.sha256) throw Error("Pinned bounded immutable score report required");
    const data = JSON.parse(bytes.toString());
    if (data.complete !== true || data.split !== source.split || data.results?.length !== 48 || data.failures?.length !== 0
      || new Set(data.results.map((row: any) => row.index)).size !== 48 || data.canonicalPrompt !== false || data.forcedAlignment !== false)
      throw Error("All complete unprompted original score scopes required");
    if (source.model === "muaalem" ? data.modelSha256 !== "6b6a2e85303d17ff0f3af5e1fc79ac83daecee409c756ddf27f0ced59393bb41"
      || data.durationNuisance !== true || data.quietTailMs !== 600 || data.eventHypotheses !== true
      : data.modelSha256 !== "6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb"
        || data.compactQuiet !== true || data.eventMode !== true || data.allSegments === true || data.phoneRunNuisance === true)
      throw Error("Exact unchanged model and explicitly distinct frontend/comparison policies required");
    provenance.push({ ...source, modelSha256: data.modelSha256, revision: data.revision, generationCodeSha256: data.codeSha256,
      durationNuisance: source.model === "muaalem", compactQuiet: source.model !== "muaalem", quietTailMs: 600,
      proposalProvenance: data.proposalProvenance, supplementaryProposalProvenance: data.supplementaryProposalProvenance });
    return { ...source, data };
  });
  for (const split of ["calibration", "heldout"] as const) {
    activeSplit = split;
    const first = loaded.find(source => source.model === "muaalem" && source.split === split)!.data;
    const second = loaded.find(source => source.model === "compact-v3" && source.split === split)!.data;
    for (const a of first.results) {
      activeIndex = a.index;
      const b = second.results.find((row: any) => row.index === a.index);
      if (!b || !Number.isSafeInteger(a.index) || !/^[a-f0-9]{64}$/.test(a.audioSha256)
        || a.audioSha256 !== b.audioSha256 || a.originalSamples !== b.originalSamples || a.reference !== b.reference
        || a.category !== b.category || a.expected !== b.expected || a.expectedIndex !== b.expectedIndex
        || !Number.isSafeInteger(a.originalSamples) || a.originalSamples < 16000 || a.originalSamples > 192000
        || !Array.isArray(a.referenceWordPhones) || !Array.isArray(b.referenceWordPhones)
        || a.event?.durationNuisance !== true || b.event?.durationNuisance !== false)
        throw Error("Every original PCM/sample/reference/category/index pair and scoring policy must match");
      // The selector receives ONLY each model's original score rows.
      const decision = corroborateAcousticEvents(a.event.scores, b.event.scores);
      for (const [at, old] of [a.event, b.event].entries()) {
        const fresh = decision.models[at];
        if (JSON.stringify(fresh.originalPredicted) !== JSON.stringify(old.predicted)
          || fresh.baselineMargin !== old.baselineMargin || fresh.locationMargin !== old.locationMargin)
          throw Error("Each model's exact original margins/prediction must replay before corroboration");
      }
      // Scripted operation labels enter only AFTER the fixed decision returns.
      if (![null, "omission", "repetition", "substitution"].includes(a.expected)
        || (a.expected === null ? a.expectedIndex !== null : !Number.isSafeInteger(a.expectedIndex)
          || a.expectedIndex < 1 || a.expectedIndex >= a.referenceWordPhones.length - 1))
        throw Error("Valid original scripted operation coordinates required for post-selection scoring");
      rows.push({ split, index: a.index, audioSha256: a.audioSha256, originalSamples: a.originalSamples,
        referenceSha256: sha(a.reference), referencePhonesEqual: JSON.stringify(a.referenceWordPhones) === JSON.stringify(b.referenceWordPhones),
        referencePhonesSha256: { muaalem: sha(JSON.stringify(a.referenceWordPhones)), v3: sha(JSON.stringify(b.referenceWordPhones)) },
        sourceAcousticSha256: { muaalem: a.acousticSha256, v3: b.acousticSha256 },
        inferenceScope: { muaalem: { samples: a.inferenceSamples, sha256: a.inferenceAudioSha256, addedTailMs: 600 },
          v3: { samples: b.inferenceSamples, sha256: b.inferenceAudioSha256, addedTailMs: 600, timeline: b.timeline } },
        category: a.category, expected: a.expected, expectedIndex: a.expectedIndex,
        muaalemPredicted: a.event.predicted, v3Predicted: b.event.predicted, predicted: decision.predicted,
        muaalemReplayExact: true, v3ReplayExact: true, decision });
    }
    const group = rows.filter(row => row.split === split), plan = expectedBySplit[split];
    if (group.length !== plan.cases || group.filter(row => row.expected !== null).length !== plan.positives
      || group.filter(row => row.expected === null).length !== plan.negatives
      || ["omission", "repetition", "substitution"].some(kind => group.filter(row => row.expected === kind).length !== 6))
      throw Error("Full original split/category denominators must remain intact");
  }
  complete = rows.length === 96;
  if (!complete) throw Error("All 96 original paired scopes are required");
  save();
  const bytes = readFileSync(output); console.log(JSON.stringify({ complete, output, sha256: sha(bytes), summary: JSON.parse(bytes.toString()).summary }));
} catch (error) {
  failures.push({ split: activeSplit, index: activeIndex, reason: error instanceof Error ? error.message : "Frozen-score analysis failed" });
  save(); console.error(JSON.stringify({ complete: false, output, failures })); throw error;
}
