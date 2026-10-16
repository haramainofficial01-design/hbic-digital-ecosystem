/** Quran-Lab NPL-1.2; retain LICENSE. One fixed offline coverage preflight.
 * Frozen Tadabur CC BY-NC 4.0 outputs are local noncommercial research only;
 * Tanzil forms retain CC BY 3.0 and quran-transcript 0.6.4 retains MIT terms.
 * No PCM, model inference, download, account, expected event or spoken gold.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { recitationDisplayWords, recitationLexeme } from "../../src/quran/recitationTracking";
import { uniquePhoneticEventHypotheses, type PhoneticEventHypothesis } from "../recitationCtcHypotheses";
import { unionIndependentLexicalProposals } from "./supplementaryProposalUnion";

if (process.argv.length !== 2) throw Error("One fixed pinned preflight; no alternative sources or tuning arguments");
const sha = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
function pinned(path: string, hash: string) {
  const bytes = readFileSync(path);
  if (bytes.length > 8_000_000 || sha(bytes) !== hash) throw Error(`Exact unchanged research artifact required: ${path}`);
  return bytes;
}
const sources = {
  baseline: { path: "output/quran-development/zipformer-comparison/zipformer-raw-calibration-1-1791926000854-c086bd67-c92e-4a48-8c95-81953f113355.json",
    sha256: "00906711e6bc7dcba73529ca99cfeb900b80878728d5a823066f4794d654be89" },
  proposals: { path: "output/quran-development/muaalem-comparison/muaalem-phoneme-calibration-1791925182497-be079cae-e191-422f-8d62-2330a447a279.json",
    sha256: "ffc65bd0796e9a0067f311c317be41f788c4ad9e168588d14dc06ed407223f60" },
  supplementary: { path: "output/quran-development/tadabur-medium-comparison/tadabur-medium-whole-calibration-mps-f32-1792100925732-1ae2b236-dfdb-42b5-a1ce-ce763fcadc26.json",
    sha256: "a19635ab87e73dcc3994a152e52a1459c89428edd12d56766ffef9c5d242c7be" },
  canonicalForms: { path: "apps/mobile/assets/quran/tanzil-uthmani.json",
    sha256: "19453574fcf89b4611d27456a9f10673e63635f7f124ec80815d3392e0ef6a67" },
  referenceWorker: { path: "apps/mobile/scripts/recitation-phonetic-reference.py",
    sha256: "092510ccc021511e773b2dfb55c89cc2de728a68b6a673897b5340e4a8a07302" },
  inventory: { path: "output/quran-development/zipformer-comparison/assets/tokens.txt",
    sha256: "252c10687e442aa9291973065fae19fa39bcd681c4f5612ec496a647e20b43a1" },
  localLicense: { path: "apps/mobile/scripts/zipformer/LICENSE",
    sha256: "77526bdbfac94132e5114c3a34492c33f915e4b7f310f00b9995500d3610cab5" },
};
const verified = Object.fromEntries(Object.entries(sources).map(([key, entry]) => [key, pinned(entry.path, entry.sha256)]));
const baseline = JSON.parse(verified.baseline.toString()), proposals = JSON.parse(verified.proposals.toString());
const supplementary = JSON.parse(verified.supplementary.toString()), canonical = JSON.parse(verified.canonicalForms.toString());
for (const report of [baseline, proposals, supplementary]) {
  if (report.complete !== true || report.split !== "calibration" || report.canonicalPrompt !== false || report.forcedAlignment !== false
    || !Array.isArray(report.results) || report.results.length !== 48 || report.failures?.length !== 0
    || new Set(report.results.map((row: any) => row.index)).size !== 48)
    throw Error("All 48 complete original unprompted historical cases required");
}
if (baseline.modelSha256 !== "6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb"
  || baseline.compactQuiet !== true || baseline.eventMode !== true || baseline.allSegments === true || baseline.phoneRunNuisance === true
  || baseline.proposalProvenance?.sha256 !== sources.proposals.sha256
  || resolve(baseline.proposalProvenance.evidencePath) !== resolve(sources.proposals.path)
  || proposals.modelSha256 !== "6b6a2e85303d17ff0f3af5e1fc79ac83daecee409c756ddf27f0ced59393bb41"
  || supplementary.model !== "rakansuliman/tadabur-whisper-medium"
  || supplementary.revision !== "e82c2d827ad0df27e31042f7fb87c73df1da2c8b"
  || supplementary.modelSha256 !== "9e3e7472373fa6570350e0c67c624307b18a35b2efee62cb00d6f46b944b6f27"
  || supplementary.runtime?.dtype !== "torch.float32" || supplementary.runtime?.device !== "mps"
  || supplementary.license !== "CC-BY-NC-4.0" || supplementary.summary?.plannedCases?.length !== 48)
  throw Error("Unchanged simple compact-v3 comparison and pinned full-precision Tadabur outputs required");

const canonicalForms = new Map<string, string[]>();
for (const chapter of canonical.chapters) for (const verse of chapter.verses) for (const word of recitationDisplayWords(verse.textUthmani)) {
  const key = recitationLexeme(word), previous = canonicalForms.get(key) ?? [];
  // Same fixed reference-side max-three/sorted form map as the original runner.
  if (!previous.includes(word)) canonicalForms.set(key, [...previous, word].sort().slice(0, 3));
}
const rows: any[] = baseline.results.map((row: any) => {
  const old = proposals.results.find((r: any) => r.index === row.index), added = supplementary.results.find((r: any) => r.index === row.index);
  const planned = supplementary.summary.plannedCases.filter((r: any) => r.index === row.index && r.audioSha256 === row.audioSha256);
  if (!Number.isSafeInteger(row.index) || !/^[a-f0-9]{64}$/.test(row.audioSha256)
    || !Number.isSafeInteger(row.originalSamples) || row.originalSamples < 16000 || row.originalSamples > 192000
    || !old || !added || planned.length !== 1 || old.audioSha256 !== row.audioSha256 || added.audioSha256 !== row.audioSha256
    || old.originalSamples !== row.originalSamples || old.reference !== row.reference || added.reference !== row.reference
    || typeof added.transcript !== "string" || !Array.isArray(old.independentLexicalProposals)
    || !Array.isArray(row.referenceWordPhones) || !row.referenceWordPhones.length)
    throw Error("Exact original source hash/scope/reference pairing required before adding proposals");
  const unionEvidence = unionIndependentLexicalProposals({ reference: row.reference, oldForms: old.independentLexicalProposals,
    supplementaryTranscript: added.transcript, canonicalForms });
  return { index: row.index, audioSha256: row.audioSha256, originalSamples: row.originalSamples, reference: row.reference,
    oldForms: [...unionEvidence.oldForms], substitutions: [...unionEvidence.substitutions], unionEvidence,
    originalReferenceWordPhones: [...row.referenceWordPhones], baselinePosteriorSha256: row.acousticSha256 };
});

// Pure reference conversion only. Both unchanged and union requests are fully
// converted; no model is opened and no waveform is fetched or passed anywhere.
const requests = rows.flatMap((row, slot) => [
  { index: slot * 2, text: row.reference, substitutions: row.oldForms },
  { index: slot * 2 + 1, text: row.reference, substitutions: row.substitutions },
]);
const converted = spawnSync(resolve("output/quran-development/nvidia-evaluation-runtime/bin/python"), [sources.referenceWorker.path, "--events"],
  { input: JSON.stringify(requests), encoding: "utf8", timeout: 30000, maxBuffer: 8_000_000,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
if (converted.status !== 0 || converted.error) throw Error(`Pure comparison conversion failed: ${converted.error?.message ?? converted.stderr.slice(-1500)}`);
const phonetics = JSON.parse(converted.stdout);
if (phonetics.referenceOnly !== true || phonetics.version !== "0.6.4" || phonetics.results?.length !== 96
  || new Set(phonetics.results.map((row: any) => row.index)).size !== 96)
  throw Error("All 96 baseline/union pure-reference conversions required");
const inventory = verified.inventory.toString().trim().split("\n").map(line => {
  const at = line.lastIndexOf(" "); return { unit: line.slice(0, at), id: Number(line.slice(at + 1)) };
});
if (inventory.length !== 251 || new Set(inventory.map(row => row.id)).size !== 251
  || inventory.some(row => !row.unit || !Number.isSafeInteger(row.id) || row.id < 0 || row.id > 250)
  || inventory.find(row => row.id === 250)?.unit !== "<blank>") throw Error("Complete authoritative inventory required");
const units = inventory.filter(row => row.id !== 250).sort((a, b) => b.unit.length - a.unit.length || a.id - b.id);
function encode(phones: string) {
  if (typeof phones !== "string" || !phones.length || phones.length > 1000) throw Error("Bounded explicit original comparison phones required");
  const ids: number[] = [];
  // Deliberately retain the original simple comparison's greedy-longest unit
  // segmentation. No simultaneous switch to the all-unit/duration method.
  for (let offset = 0; offset < phones.length;) {
    const found = units.find(entry => phones.startsWith(entry.unit, offset));
    if (!found) throw Error("New comparison path has an unsupported phone; do not guess or exclude it");
    ids.push(found.id); offset += found.unit.length;
  }
  return ids;
}
const key = (h: PhoneticEventHypothesis) => `${h.kind}:${h.index}:${h.ids.join(",")}`;
for (const [slot, row] of rows.entries()) {
  const base = phonetics.results.find((r: any) => r.index === slot * 2), union = phonetics.results.find((r: any) => r.index === slot * 2 + 1);
  if (!base || !union || JSON.stringify(base.wordPhones) !== JSON.stringify(row.originalReferenceWordPhones)
    || JSON.stringify(union.wordPhones) !== JSON.stringify(row.originalReferenceWordPhones))
    throw Error("Baseline and union reference phones must equal frozen compact-v3 reference phones");
  const pack = (convertedRow: any) => {
    if (!Array.isArray(convertedRow.hypotheses) || convertedRow.hypotheses.length > 257) throw Error("Bounded complete hypothesis list required");
    const raw: PhoneticEventHypothesis[] = convertedRow.hypotheses.map((h: any) => {
      if (!h || !["unchanged", "omission", "repetition", "substitution"].includes(h.kind)
        || (h.kind === "unchanged" ? h.index !== null : !Number.isSafeInteger(h.index) || h.index < 1 || h.index >= row.originalReferenceWordPhones.length - 1))
        throw Error("Valid comparison-only operation coordinates required");
      return { kind: h.kind, index: h.index, ids: encode(h.phonemes) };
    });
    if (raw.filter(h => h.kind === "unchanged").length !== 1) throw Error("Exactly one unchanged comparison hypothesis required");
    return { rawCount: raw.length, ...uniquePhoneticEventHypotheses(raw) };
  };
  const before = pack(base), after = pack(union), beforeKeys = new Set(before.hypotheses.map(key)), afterKeys = new Set(after.hypotheses.map(key));
  if ([...beforeKeys].some(path => !afterKeys.has(path))) throw Error("Every original hypothesis must survive supplementary union");
  Object.assign(row, { referenceWordPhones: [...base.wordPhones], baselineReferenceWordPhones: [...base.wordPhones], unionReferenceWordPhones: [...union.wordPhones],
    baselineHypotheses: before.hypotheses, unionHypotheses: after.hypotheses,
    baselineRawHypothesisCount: before.rawCount, unionRawHypothesisCount: after.rawCount,
    baselineDuplicatePathsIgnored: before.duplicatePathsIgnored, unionDuplicatePathsIgnored: after.duplicatePathsIgnored,
    genuinelyNewEncodedPaths: [...afterKeys].filter(path => !beforeKeys.has(path)).length });
}
const sum = (fn: (row: any) => number) => rows.reduce((n, row) => n + fn(row), 0);
const newWords = rows.flatMap(row => row.unionEvidence.observedWords.filter((word: any) => !word.existingProposalLexeme));
const summary = {
  expectedCases: 48, analyzedCases: rows.length, pairingFailures: 0, conversionFailures: 0, excludedCases: 0,
  newObservedWordScopePairs: newWords.length, distinctNewObservedWords: new Set(newWords.map((word: any) => word.lexeme)).size,
  mappedNewWordScopePairs: newWords.filter((word: any) => word.mapping !== "unavailable").length,
  unmappedNewWordScopePairs: newWords.filter((word: any) => word.mapping === "unavailable").length,
  addedFormScopePairs: sum(row => row.unionEvidence.addedForms.length),
  scopesWithAddedForms: rows.filter(row => row.unionEvidence.addedForms.length).length,
  maxOldForms: Math.max(...rows.map(row => row.oldForms.length)), maxUnionForms: Math.max(...rows.map(row => row.substitutions.length)),
  baselineRawHypotheses: sum(row => row.baselineRawHypothesisCount), unionRawHypotheses: sum(row => row.unionRawHypothesisCount),
  baselineUniqueEncodedPaths: sum(row => row.baselineHypotheses.length), unionUniqueEncodedPaths: sum(row => row.unionHypotheses.length),
  genuinelyNewEncodedPaths: sum(row => row.genuinelyNewEncodedPaths), scopesWithNewEncodedPaths: rows.filter(row => row.genuinelyNewEncodedPaths).length,
  baselineDuplicatePathsIgnored: sum(row => row.baselineDuplicatePathsIgnored), unionDuplicatePathsIgnored: sum(row => row.unionDuplicatePathsIgnored),
};
if (rows.length !== 48 || !summary.genuinelyNewEncodedPaths) throw Error("Complete new hypothesis coverage is required before any changed comparison inference");
const codeFiles = ["apps/mobile/scripts/zipformer/preflight-supplementary-proposals.mts", "apps/mobile/scripts/zipformer/supplementaryProposalUnion.ts",
  "apps/mobile/scripts/recitationCtcHypotheses.ts", "apps/mobile/src/quran/recitationTracking.ts"];
const report = { complete: true, newInference: false, freshHeldout: false, audioAccessed: false, expectedOrGoldFieldsRead: false,
  split: "calibration", sources, codeSha256: Object.fromEntries(codeFiles.map(path => [path, sha(readFileSync(path))])),
  predeclared: { selection: "Preserve every old form, append exact supplementary decoded-word forms in transcript order; explicit failure above 16, never truncate",
    inventorySegmentation: "unchanged greedy-longest", comparison: "original simple compact-v3 event comparison",
    baselineMargin: Math.log(100), locationMargin: Math.log(10), allUnitSegmentations: false, allUnitDurationNuisance: false,
    inputScale: 1, compactQuiet: true, settlingSamples: 9600, maximumForms: 16, maximumHypotheses: 257 },
  attribution: { supplementary: "Rakan Suliman, Abdulrahman Mamdoh, Hussam Aldosari and Mohammed Khalid; Tadabur Whisper Medium; CC BY-NC 4.0",
    supplementaryTrainingDataset: "Faisal Alherran, Tadabur (arXiv:2604.18932)",
    canonicalForms: "Tanzil unchanged source CC BY 3.0", referencePhonetics: "quran-transcript 0.6.4 MIT",
    comparison: "Quran-Lab No-Profit License 1.2; retain apps/mobile/scripts/zipformer/LICENSE; local research only" },
  referenceProvenance: { version: phonetics.version, referenceOnly: true, attributes: phonetics.attributes,
    eventWrittenMarkNormalization: phonetics.eventWrittenMarkNormalization },
  confidenceQualified: false, wordRecognitionQualified: false, mistakeDetectionQualified: false, liveFollowingQualified: false, nativeQualified: false,
  limits: ["This reports candidate coverage only, not correct recognition or learner mistakes.",
    "Historical inspected calibration sources, not fresh independent speakers or double-reviewed natural-error gold.",
    "Ten unavailable observed lexeme mappings remain explicit; no fuzzy correction or invented vocalization.",
    "Decoded Tadabur words may be hallucinated/canonical-restored. Extra candidates can create false alerts or reduce event margins.",
    "No waveform or model inference, audio files/uploads, new rights/gates, training, native test, release or deployment."],
  summary, rows, failures: [] };
const output = resolve("output/quran-development/zipformer-comparison", `supplementary-proposal-union-${Date.now()}-${randomUUID()}.json`);
// Nothing is saved unless every paired scope and both complete conversions pass.
const bytes = JSON.stringify(report, null, 2); writeFileSync(output, bytes, { flag: "wx" });
console.log(JSON.stringify({ complete: true, output, sha256: sha(bytes), summary }));
