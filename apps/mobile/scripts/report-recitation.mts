/** Offline report for saved real-audio evaluations. It never fetches audio,
 * reads HBIC accounts, or changes production. Baseline replay is deliberately
 * frozen to the old judge: changing the current app must not rewrite history. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { judgeAttempt, lcsRatio, normalizeArabicForJudge, overlapMerge, phoneticNormalize } from "@tilawi/quran-asr";

type Difference = { kind: "omission" | "substitution" | "repetition" | "extra_word"; index: number | null };
type Feedback = { status: "uncertain" | "following" | "possible_difference"; words: { text: string; state: string }[]; differences: Difference[]; attempted: number };
type Observation = { text: string; quality: number; latencyMs: number; differences?: Difference[] };
type Row = { id: string; group: string; split: string; key: string; text: string; reference: string; durationSeconds: number;
  labels: { word: string; labels: string[] }[]; clean: boolean; lexicalPositive: boolean; observations: Observation[];
  rawTranscript: string; acceptedTranscript: string; wordEdits: { errors: number; words: number }; inferenceMs: number[]; feedback: Feedback };
type Verse = { verseKey: string; textUthmani: string };
const input = resolve(process.argv[2] ?? "output/quran-development/qualification/baseline.json");
if (!input.includes("/output/quran-development/")) throw Error("Use the ignored development evaluation folder.");
const bytes = readFileSync(input), data = JSON.parse(bytes.toString()) as { source: Record<string, unknown>; pipeline?: {name: string}; limits: string[]; runtime: unknown; results: Row[]; failures: string[] };
if (!Array.isArray(data.results) || data.results.length > 2000) throw Error("Invalid/bounded evaluation report required.");
const quranBytes = readFileSync("apps/mobile/assets/quran/tanzil-uthmani.json");
const quran = JSON.parse(quranBytes.toString()) as { source: string; version: string; chapters: { verses: Verse[] }[] };
const verses = quran.chapters.flatMap(c => c.verses), canonical = new Map(verses.map(v => [v.verseKey, v.textUthmani]));
const normalized = (text: string) => normalizeArabicForJudge(text).split(/\s+/).filter(Boolean);
const spokenWords = (text: string) => text.split(/\s+/).filter(w => normalizeArabicForJudge(w).trim());
const sha = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");

function frozenBaseline(expected: string, heard: string, quality: number): Feedback {
  const words = spokenWords(expected), spoken = heard.trim().split(/\s+/).filter(Boolean);
  const empty: Feedback = { status: "uncertain", attempted: 0, differences: [], words: words.map(text => ({ text, state: "not_heard" })) };
  if (words.length > 200 || spoken.length > 240 || !Number.isFinite(quality) || quality < .7 || spoken.length < 2
    || normalizeArabicForJudge(heard).replace(/\s/g, "").length < 8) return empty;
  const judged = judgeAttempt(words, spoken);
  const anchors = judged.words.filter(w => w.judgment === "correct" && w.operation !== "insertion" && w.expectedIndex !== null && w.recognizedIndex !== null
    && lcsRatio(phoneticNormalize(words[w.expectedIndex]), phoneticNormalize(spoken[w.recognizedIndex])) >= .8).length;
  if (anchors < 2) return empty;
  const differences: Difference[] = [], states = words.map(text => ({ text, state: "not_heard" }));
  for (const word of judged.words) {
    if (word.expectedIndex !== null) states[word.expectedIndex].state = word.judgment === "correct" ? "matched" : word.judgment === "apparent-error" ? "possible_difference" : word.judgment === "uncertain" ? "uncertain" : "not_heard";
    if (word.judgment !== "apparent-error") continue;
    if (word.operation === "omission" || word.operation === "substitution") differences.push({ kind: word.operation, index: word.expectedIndex });
    else if (word.operation === "insertion") {
      const i = word.recognizedIndex;
      const resembles = (a: string, b: string) => { const x = normalizeArabicForJudge(a), y = normalizeArabicForJudge(b); return x === y || (Math.min(x.length, y.length) >= 2 && Math.abs(x.length - y.length) === 1 && (x.startsWith(y) || y.startsWith(x))); };
      const repeated = i !== null && ((i > 0 && resembles(spoken[i], spoken[i - 1])) || (i + 1 < spoken.length && resembles(spoken[i], spoken[i + 1])));
      differences.push({ kind: repeated ? "repetition" : "extra_word", index: null });
    }
  }
  return { status: differences.length ? "possible_difference" : "following", words: states, differences, attempted: judged.attempted };
}
const temporal = data.pipeline?.name === "temporal-ctc";
const replay = temporal ? data.results : data.results.map(row => {
  const expected = canonical.get(row.key); if (!expected) throw Error(`Missing canonical ayah ${row.key}`);
  let accepted: string[] = [], quality = 0;
  for (const observation of row.observations) {
    if (frozenBaseline(expected, observation.text, observation.quality).status !== "uncertain") {
      accepted = overlapMerge(accepted, observation.text.trim().split(/\s+/).filter(Boolean)); quality = observation.quality;
    }
  }
  return { ...row, text: spokenWords(expected).join(" "), acceptedTranscript: accepted.join(" "), feedback: frozenBaseline(expected, accepted.join(" "), quality) };
});
const completed = (r: Row) => r.feedback.status === "following" && r.feedback.words.length >= 2 && r.feedback.words.every(w => w.state === "matched");
function percentile(values: number[], p: number) { const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b); return sorted.length ? sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] : null; }
const selected = (rows: Row[], split: string, category: string) => rows.filter(r => (split === "all" || r.split === split)
  && (category === "all" || category === "clean" && r.clean || category === "wording" && r.lexicalPositive || category === "pronunciationOnly" && !r.clean && !r.lexicalPositive));
function stats(rows: Row[]) {
  const windows = rows.flatMap(r => r.inferenceMs), clean = rows.filter(r => r.clean), edits = clean.reduce((n, r) => n + r.wordEdits.errors, 0), words = clean.reduce((n, r) => n + r.wordEdits.words, 0);
  return { clips: rows.length, recordingGroups: new Set(rows.map(r => r.group)).size, differenceClips: rows.filter(r => r.feedback.differences.length).length,
    differenceEverClips: rows.filter(r => r.observations.some(o => o.differences?.length)).length,
    differenceClipRate: rows.length ? rows.filter(r => r.feedback.differences.length).length / rows.length : null,
    abstentionClips: rows.filter(r => r.feedback.status === "uncertain").length, completeFollowingClips: rows.filter(completed).length,
    completeFollowingCoverage: rows.length ? rows.filter(completed).length / rows.length : null,
    cleanReferenceScopeEdits: edits, cleanReferenceScopeWords: words, cleanReferenceScopeWer: words ? edits / words : null,
    inferenceWindows: windows.length, inferenceLatencyMs: { p50: percentile(windows, .5), p90: percentile(windows, .9), p95: percentile(windows, .95), maximum: windows.length ? Math.max(...windows) : null } };
}
function metrics(rows: Row[]) { return Object.fromEntries(["all", "calibration", "heldout"].map(split => [split,
  Object.fromEntries(["all", "clean", "wording", "pronunciationOnly"].map(category => [category, stats(selected(rows, split, category))]))])); }
function labelAgreement(rows: Row[], split: string) {
  const clean = selected(rows, split, "clean"), positive = selected(rows, split, "wording"), predictedPositive = positive.filter(r => r.feedback.differences.length);
  const cleanAlerts = clean.filter(r => r.feedback.differences.length).length;
  const localized = positive.filter(r => r.feedback.differences.some(diff => diff.index !== null && r.labels.some(label => label.labels.includes("Wording")
    && normalizeArabicForJudge(label.word) === normalizeArabicForJudge(r.feedback.words[diff.index!]?.text ?? ""))));
  return { cleanNegativeClips: clean.length, reviewerWordingPositiveClips: positive.length, pronunciationOnlyExcluded: selected(rows, split, "pronunciationOnly").length,
    anyAlertOnWordingClips: predictedPositive.length, cleanFalseAlertClips: cleanAlerts,
    clipPresencePrecision: predictedPositive.length + cleanAlerts ? predictedPositive.length / (predictedPositive.length + cleanAlerts) : null,
    clipPresenceRecall: positive.length ? predictedPositive.length / positive.length : null,
    reviewerWordLocalizedClips: localized.length, reviewerWordLocalizedRecall: positive.length ? localized.length / positive.length : null,
    reviewerWordLocalizedPrecision: predictedPositive.length + cleanAlerts ? localized.length / (predictedPositive.length + cleanAlerts) : null };
}
/** Evidence-only scope heuristic, never a criterion to silently exclude bad ASR.
 * An exact 2-word neighboring-ayah phrase not present in the target suggests
 * the file contains more than the metadata target. It is NOT a human transcript. */
function neighborScope(row: Row) {
  const target = normalized(row.reference).join(" "), heard = ` ${normalized(row.rawTranscript).join(" ")} `, surah = row.key.split(":")[0];
  return verses.some(v => v.verseKey !== row.key && v.verseKey.startsWith(`${surah}:`) && normalized(v.textUthmani).some((word, i, words) => {
    if (i + 1 >= words.length) return false; const pair = `${word} ${words[i + 1]}`;
    return pair.replace(/\s/g, "").length >= 8 && !target.includes(pair) && heard.includes(` ${pair} `);
  }));
}
const clean = replay.filter(r => r.clean), cleanFlags = clean.filter(r => r.feedback.differences.length);
const report = { provenance: { inputSha256: sha(bytes), source: data.source, runtime: data.runtime, canonicalSource: quran.source, canonicalVersion: quran.version, canonicalSha256: sha(quranBytes), failures: data.failures },
  limitations: [...data.limits,
    temporal ? "Temporal feedback comes from the actual recorded/replayed app tracker; no frozen legacy judge substituted." : "Saved baseline expected text includes model-added Basmala; frozen Tanzil replay corrects this without rerunning or changing acoustic recognition.",
    "Some files contain neighboring ayahs while metadata.text names only one ayah. Whole-file reference-scope WER is diagnostic, NOT true ASR WER or recognition accuracy.",
    "Scope heuristic is transcript-dependent, may miss/misclassify boundaries, and does not justify selecting an unbiased accuracy subset.",
    "Wording labels provide an expected erroneous word, not a verbatim spoken transcript; no WER is calculated for them.",
    "Clip-presence precision/recall can be accidental boundary alerts. Word-localized agreement is separately required; two positives cannot qualify general mistake detection.",
    "Latency is desktop onnxruntime-node inference time, not phone-native latency or end-to-end microphone feedback latency.",
    "Completion coverage is a saved transcript result, not validated real-time auto-advance or stable-observation success."],
  ...(temporal ? {temporalActualFeedback: metrics(replay)} : {originalSavedBaselineConfounded: metrics(data.results), tanzilFrozenBaselineReplay: metrics(replay)}),
  reviewerLabelAgreement: Object.fromEntries(["all", "calibration", "heldout"].map(split => [split, labelAgreement(replay, split)])),
  scopeDiagnostics: { cleanClips: clean.length, cleanNeighborScopeIndications: clean.filter(neighborScope).length, cleanDifferenceClips: cleanFlags.length,
    cleanDifferenceWithNeighborScopeIndication: cleanFlags.filter(neighborScope).length,
    singleWindowAtMostSixSeconds: stats(clean.filter(r => r.observations.length === 1 && r.durationSeconds <= 6)),
    singleWindowNoNeighborScopeIndicationBiasedProxyOnly: stats(clean.filter(r => r.observations.length === 1 && r.durationSeconds <= 6 && !neighborScope(r))),
    cleanDifferenceKinds: cleanFlags.flatMap(r => r.feedback.differences).reduce((counts, diff) => ({ ...counts, [diff.kind]: (counts[diff.kind] ?? 0) + 1 }), {} as Record<string, number>) },
  wordingCases: replay.filter(r => r.lexicalPositive).map(r => ({ key: r.key, expected: r.reference, recognized: r.rawTranscript, labels: r.labels,
    alerts: r.feedback.differences.map(diff => ({ kind: diff.kind, expectedWord: diff.index === null ? null : r.feedback.words[diff.index]?.text })) })) };
console.log(JSON.stringify(report, null, 2));
