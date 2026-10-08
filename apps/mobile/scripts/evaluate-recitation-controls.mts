/** Offline actual-waveform controls; no mock recognition, credentials, or HBIC
 * accounts. Public MIT source audio and every derivative remain only in RAM.
 * Approximate model-emission splice boundaries are NOT human mistake gold. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { TextCTCDecoder, detectSpeech, normalizeArabicForJudge, type AsrTranscribeResult } from "@tilawi/quran-asr";
import { acousticQuality, compactQuietPausesWithTimeline, type ReciteFeedback } from "../src/quran/reciteAssistFeedback";
import { decodeRecitationWords, RecitationTracker, recitationDisplayWords, recitationLexeme, type RecitationObservation, type RecitationWord } from "../src/quran/recitationTracking";

const dataset = "sobolev210/quran-recitation-errors", revision = "d196cd3132c69cd361d28cf6a8b442ae4e0bf0b4";
const base = `https://huggingface.co/datasets/${dataset}/resolve/${revision}/`;
const modelRevision = "e9448a0e84f3adb64c28b7a8db501dd8e0e59a84";
const root = resolve(process.env.RECITE_MODEL_ASSETS ?? "output/quran-development/recognition/assets");
const output = resolve(process.env.RECITE_CONTROLS_OUTPUT ?? "output/quran-development/qualification/waveform-controls.json");
const baselinePath = resolve(process.env.RECITE_BASELINE ?? "output/quran-development/qualification/baseline.json");
if (!output.includes("/output/quran-development/") || !baselinePath.includes("/output/quran-development/")) throw Error("Use ignored development output only.");
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const normalize = (text: string) => normalizeArabicForJudge(text).split(/\s+/).filter(Boolean).join(" ");
const hashes: Record<string, string> = {
  "fastconformer_full_mixed.onnx": "4767182cd92975869f81a7e32700b14ca2b04e8dc97a15ff220a8697f4639488",
  "vocab.json": "c55877f3bff8bc3aaefc160e8c2fb88cb349088d092513d40210ccfe535e671b",
  "quran_ctc_tokens.json": "96aa32d188d075598536fcbb936dc793466fce2a8da331e48f15932022f4dce8",
  "quran.json": "6e6f31f642c701b49a1ba090311ca4c7a97c6a5b79a302712dff815a9d7b3d03"
};
for (const [name, expected] of Object.entries(hashes)) if (sha(readFileSync(resolve(root, name))) !== expected) throw Error(`Unverified model asset: ${name}`);
const runtime = createRequire(resolve(process.env.RECITE_RUNTIME ?? "output/quran-development/recognition", "package.json"));
const ort = runtime("onnxruntime-node");
const vocab: Record<string, string> = JSON.parse(readFileSync(resolve(root, "vocab.json"), "utf8"));
const decoder = new TextCTCDecoder(vocab, 1024);
// Capture implementation hashes once; another development edit during a long
// run must not relabel already-loaded recognition code in checkpoint output.
const codeSha256 = {tracker: sha(readFileSync("apps/mobile/src/quran/recitationTracking.ts")), feedback: sha(readFileSync("apps/mobile/src/quran/reciteAssistFeedback.ts"))};
type Baseline = { id: string; group: string; split: string; key: string; reference: string; clean: boolean; rawTranscript: string; durationSeconds: number; audioSha256: string };
type Metadata = { file_name: string; recording_id: string; riwayah: string; reviewer_id: string; surah: string; ayah: string; text: string; errors: Record<string, string[] | null> };
type Source = { baseline: Baseline; pcm: Float32Array; emissions: RecitationWord[]; expected: string; index: number; boundaries: number[] };
type Category = "correct" | "pause" | "low_noise" | "speed_0.8" | "speed_1.2" | "omission" | "repetition" | "substitution";
type Variant = { category: Category; pcm: Float32Array; spokenGold: string[]; positive: boolean; expectedIndex: number | null; insertedWord: string | null; edit: Record<string, unknown> };
type CaseResult = { sourceId: string; group: string; split: string; key: string; category: Category; positive: boolean; expectedIndex: number | null;
  detected: boolean; anyAlert: boolean; finalAlert: boolean; scopedExpected: string; spokenGold: string[]; goldEdits: { errors: number; words: number };
  finalTranscript: string; originalSamples: number; paddedSamples: number; inferenceMs: number[]; observations: Record<string, unknown>[]; edit: Record<string, unknown>; feedback: ReciteFeedback };
async function fetchBytes(path: string) {
  const url = new URL(path, base), pinned = new URL(base);
  if (url.origin !== pinned.origin || !url.pathname.startsWith(pinned.pathname)) throw Error("Evaluation source escaped the pinned public dataset.");
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`Public evaluation source HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 12_000_000) throw Error("Public evaluation source exceeds bound.");
  return bytes;
}
const card = new TextDecoder().decode(await fetchBytes("README.md"));
if (!/^license: mit$/m.test(card)) throw Error("Pinned public source license does not match.");
const metadataBytes = await fetchBytes("metadata.jsonl");
const metadata = new TextDecoder().decode(metadataBytes).trim().split("\n").map(line => JSON.parse(line) as Metadata);
const metadataById = new Map(metadata.map(row => [sha(row.file_name).slice(0, 16), row]));
const baselineBytes = readFileSync(baselinePath), baseline = (JSON.parse(baselineBytes.toString()) as {results: Baseline[]}).results;
const quranBytes = readFileSync("apps/mobile/assets/quran/tanzil-uthmani.json");
const quran = JSON.parse(quranBytes.toString()) as {chapters: {verses: {verseKey: string; textUthmani: string}[]}[]};
const canonical = new Map(quran.chapters.flatMap(c => c.verses.map(v => [v.verseKey, v.textUthmani] as const)));
// Selection is fixed from the PRIOR detector's raw acoustic success, never from
// revised feedback. One smallest-hash clip per group, six groups per split.
const eligible = baseline.filter(row => row.clean && row.durationSeconds <= 6 && normalize(row.reference).split(" ").length >= 3
  && normalize(row.reference).split(" ").length <= 6 && normalize(row.reference) === normalize(row.rawTranscript));
const chosen = ["calibration", "heldout"].flatMap(split => {
  const groups = [...new Set(eligible.filter(r => r.split === split).map(r => r.group))].sort().slice(0, 6);
  return groups.map(group => eligible.filter(r => r.group === group).sort((a, b) => a.id.localeCompare(b.id))[0]);
});
const selectedIds = chosen.map(row => row.id), sources: Source[] = [], exclusions: {id: string; reason: string}[] = [], failures: {id: string; category?: string; reason: string}[] = [], results: CaseResult[] = [];
const serveOnly = process.env.RECITE_SERVE_ONLY === "1", serve = process.env.RECITE_SERVE === "1" || serveOnly;
const servedCases: {name: string; category: Category; expected: Category | null; expectedIndex: number | null; index: number; text: string; sourceReference: string;
  sourceHash: string; groupHash: string; split: string; originalSamples: number; paddedTotalSamples: number; spokenGold: string[]; audioSha256: string; edit: Record<string, unknown>; pcm: Float32Array}[] = [];
function retainCase(source: Source, variant: Variant, total: number) {
  servedCases.push({name: `${variant.category} ${source.baseline.key} ${source.baseline.id.slice(0, 8)}`, category: variant.category,
    expected: variant.positive ? variant.category : null, expectedIndex: variant.expectedIndex, index: servedCases.length, text: source.expected,
    sourceReference: source.baseline.reference, sourceHash: source.baseline.id, groupHash: source.baseline.group, split: source.baseline.split,
    originalSamples: variant.pcm.length, paddedTotalSamples: total, spokenGold: variant.spokenGold,
    audioSha256: sha(new Uint8Array(variant.pcm.buffer, variant.pcm.byteOffset, variant.pcm.byteLength)), edit: variant.edit, pcm: variant.pcm.slice()});
}
const native = await ort.InferenceSession.create(resolve(root, "fastconformer_full_mixed.onnx"), {graphOptimizationLevel: "all", intraOpNumThreads: 2, interOpNumThreads: 1});
async function recognize(pcm: Float32Array, startSample: number): Promise<RecitationObservation> {
  const empty = {text: "", quality: 0, words: [], startSample, endSample: startSample + pcm.length};
  if (pcm.length < 16000 || !detectSpeech(pcm)) return empty;
  if (pcm.length > 96000) throw Error("Recognition window exceeds production bound.");
  const compact = compactQuietPausesWithTimeline(pcm);
  try {
    const output = await native.run({audio_signal: new ort.Tensor("float32", compact.pcm, [1, compact.pcm.length]), length: new ort.Tensor("int64", BigInt64Array.from([BigInt(compact.pcm.length)]), [1])});
    const tensor = output[native.outputNames[0]], acoustic = {logprobs: tensor.data as Float32Array, timeSteps: tensor.dims[1], vocabSize: tensor.dims[2], blankId: 1024};
    const result: AsrTranscribeResult = {...decoder.decode(acoustic.logprobs, acoustic.timeSteps, acoustic.vocabSize), acoustic};
    return {text: result.text, quality: acousticQuality(result), startSample, endSample: startSample + pcm.length,
      words: decodeRecitationWords(result, vocab, compact.pcm.length, compact.spans, startSample, pcm.length)};
  } finally {compact.pcm.fill(0);}
}
function concat(parts: Float32Array[]) { const result = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0)); let at = 0; for (const part of parts) {result.set(part, at); at += part.length;} return result; }
function speed(pcm: Float32Array, factor: number) { const result = new Float32Array(Math.floor(pcm.length / factor)); for (let i = 0; i < result.length; i++) {const at = i * factor, left = Math.floor(at), right = Math.min(pcm.length - 1, left + 1), f = at - left; result[i] = pcm[left] * (1 - f) + pcm[right] * f;} return result; }
function noise(pcm: Float32Array, id: string) { let state = parseInt(sha(id).slice(0, 8), 16) >>> 0; return pcm.map(value => {state = (Math.imul(1664525, state) + 1013904223) >>> 0; return Math.max(-1, Math.min(1, value + (state / 4294967296 * 2 - 1) * .002));}); }
function wordEdits(reference: string[], transcript: string) {
  const a = reference.map(recitationLexeme), b = transcript.split(/\s+/).map(recitationLexeme).filter(Boolean); let previous = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {const next = [i]; for (let j = 1; j <= b.length; j++) next[j] = Math.min(previous[j] + 1, next[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = next;}
  return {errors: previous[b.length], words: a.length};
}
function variants(source: Source): Variant[] {
  const words = normalize(source.baseline.reference).split(" "), i = source.index, a = source.boundaries[i], b = source.boundaries[i + 1], prefix = source.pcm.subarray(0, a), selected = source.pcm.subarray(a, b), suffix = source.pcm.subarray(b);
  const control = (category: Category, pcm: Float32Array, edit: Record<string, unknown>): Variant => ({category, pcm, positive: false, expectedIndex: null, insertedWord: null, spokenGold: words, edit});
  const cases = [control("correct", source.pcm.slice(), {}), control("pause", concat([prefix, new Float32Array(16000), selected, suffix]), {insertedSilenceSamples: 16000, atSample: a}),
    control("low_noise", noise(source.pcm, source.baseline.id), {deterministicUniformAmplitude: .002}),
    control("speed_0.8", speed(source.pcm, .8), {resamplingFactor: .8, pitchAltered: true}), control("speed_1.2", speed(source.pcm, 1.2), {resamplingFactor: 1.2, pitchAltered: true}),
    {category: "omission" as const, pcm: concat([prefix, suffix]), positive: true, expectedIndex: i, insertedWord: null, spokenGold: words.filter((_, index) => index !== i), edit: {removedStartSample: a, removedEndSample: b, removedWord: words[i]}},
    {category: "repetition" as const, pcm: concat([prefix, selected, new Float32Array(1600), selected, suffix]), positive: true, expectedIndex: i, insertedWord: words[i], spokenGold: [...words.slice(0, i + 1), words[i], ...words.slice(i + 1)], edit: {repeatedStartSample: a, repeatedEndSample: b, gapSamples: 1600, repeatedWord: words[i]}}];
  // Donors stay inside the same split and come from a different recording.
  // Thus no donor waveform crosses calibration/held-out recording boundaries.
  const donor = sources.filter(other => other.baseline.split === source.baseline.split && other.baseline.group !== source.baseline.group)
    .flatMap(other => other.emissions.slice(1, -1).map((word, localIndex) => ({source: other, word, index: localIndex + 1})))
    .find(candidate => !words.some(word => recitationLexeme(word) === recitationLexeme(candidate.word.text)));
  if (donor) {
    const x = donor.source.boundaries[donor.index], y = donor.source.boundaries[donor.index + 1];
    cases.push({category: "substitution", pcm: concat([prefix, donor.source.pcm.subarray(x, y), suffix]), positive: true, expectedIndex: i, insertedWord: donor.word.text,
      spokenGold: [...words.slice(0, i), donor.word.text, ...words.slice(i + 1)], edit: {replacedStartSample: a, replacedEndSample: b, removedWord: words[i], donorSourceId: donor.source.baseline.id, donorStartSample: x, donorEndSample: y, insertedWord: donor.word.text}});
  } else failures.push({id: source.baseline.id, category: "substitution", reason: "No different-word donor in the same split; no fabricated control."});
  return cases;
}
function percentile(values: number[], fraction: number) { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] : null; }
function summary(rows: CaseResult[]) {
  const positives = rows.filter(r => r.positive), negatives = rows.filter(r => !r.positive), tp = positives.filter(r => r.detected).length;
  const wrongPositiveAlerts = positives.filter(r => !r.detected && r.anyAlert).length, falsePositiveControls = negatives.filter(r => r.anyAlert).length;
  const latency = rows.flatMap(r => r.inferenceMs), edits = rows.reduce((n, r) => n + r.goldEdits.errors, 0), words = rows.reduce((n, r) => n + r.goldEdits.words, 0);
  return {cases: rows.length, sourceGroups: new Set(rows.map(r => r.group)).size, positiveCases: positives.length, negativeCases: negatives.length,
    trueOperationCases: tp, missedOperationCases: positives.length - tp, wrongOperationAlertCases: wrongPositiveAlerts,
    falsePositiveControlCases: falsePositiveControls, falsePositiveControlRate: negatives.length ? falsePositiveControls / negatives.length : null,
    operationCasePrecision: tp + wrongPositiveAlerts + falsePositiveControls ? tp / (tp + wrongPositiveAlerts + falsePositiveControls) : null,
    operationCaseRecall: positives.length ? tp / positives.length : null,
    categoryRecall: Object.fromEntries(["omission", "repetition", "substitution"].map(category => {const selected = positives.filter(r => r.category === category); return [category, {cases: selected.length, detected: selected.filter(r => r.detected).length, recall: selected.length ? selected.filter(r => r.detected).length / selected.length : null}];})),
    controlledScriptReferenceWer: words ? edits / words : null, controlledScriptWordEdits: edits, controlledScriptWords: words,
    inferenceWindows: latency.length, desktopInferenceLatencyMs: {p50: percentile(latency, .5), p95: percentile(latency, .95), maximum: latency.length ? Math.max(...latency) : null}};
}
mkdirSync(resolve(output, ".."), {recursive: true});
function save() {
  writeFileSync(output, JSON.stringify({source: {dataset, revision, license: "MIT (publisher card)", readmeSha256: sha(card), metadataSha256: sha(metadataBytes), priorBaselineSha256: sha(baselineBytes), canonicalSha256: sha(quranBytes), modelRevision, modelAssets: hashes},
    codeSha256,
    limits: ["Public publisher MIT license permits this offline evaluation; speaker consent protocol/demographics are NOT documented.", "No audio or derivatives are persisted/redistributed.",
      "Controls use reviewed-clean sources where the PRIOR baseline raw transcript already exactly matched metadata; this selection bias overestimates general ASR coverage.",
      "One fixed source per recording group; six per split where available. Recording-disjoint is NOT proven speaker-disjoint.",
      "CTC emission-midpoint cuts approximate acoustic word segments, not human phoneme boundaries. Known waveform interventions are controlled-edit gold, NOT natural learner mistake labels.",
      "Substitution donors are different recording groups in the same split; no calibration/held-out waveform sharing.",
      "0.8x/1.2x linear resampling changes pitch and timing; it does not prove robustness to natural recitation speed or microphone acoustics.",
      "Strict production 2.5-second observation cadence, six-second windows; quiet padding supplies at least 0.8-second settling and a following real cadence tick. Different capture boundaries are not independent recitations.",
      "Precision/recall is controlled operation-case agreement; repeated-word location is not exposed by feedback and must be supported by consecutive matching tracked words.",
      "Script-reference WER uses known edited source words but approximate cuts can affect pronunciation. Not a human-verified natural speech WER.",
      "Latency is desktop native ONNX runtime, not phone microphone-to-feedback latency. No Tajweed/phoneme qualification or production release claim."],
    runtime: ort.env.versions, sourceOnly: serveOnly, servedControlCases: servedCases.length,
    selection: {eligibleClips: eligible.length, eligibleGroups: new Set(eligible.map(r => r.group)).size, selectedIds, selectedBeforeNewDetector: chosen.length, reliableSpliceSources: sources.length, exclusions},
    sourceEmissions: sources.map(source => ({id: source.baseline.id, group: source.baseline.group, split: source.baseline.split, key: source.baseline.key, audioSha256: source.baseline.audioSha256, emissions: source.emissions, boundaries: source.boundaries, editedInternalIndex: source.index})),
    summaries: Object.fromEntries(["all", "calibration", "heldout"].map(split => [split, summary(results.filter(r => split === "all" || r.split === split))])), results, failures}, null, 2));
}
try {
  for (const row of chosen) {
    const meta = metadataById.get(row.id);
    try {
      if (!meta || meta.riwayah !== "Hafs" || meta.reviewer_id === "not reviewed" || Object.values(meta.errors).some(label => label?.length)
        || !/^[a-zA-Z0-9_\-/]+\.wav$/.test(meta.file_name) || sha(meta.recording_id).slice(0, 12) !== row.group
        || `${meta.surah}:${meta.ayah}` !== row.key || normalize(meta.text) !== normalize(row.reference)) throw Error("Selected source metadata did not independently validate.");
      const bytes = await fetchBytes(meta.file_name);
      if (sha(bytes) !== row.audioSha256) throw Error("Public audio changed from the pinned baseline.");
      const decoded = spawnSync(process.env.RECITE_FFMPEG ?? "/opt/homebrew/bin/ffmpeg", ["-v", "error", "-i", "pipe:0", "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"], {input: bytes, maxBuffer: 16000 * 4 * 10});
      if (decoded.status !== 0) throw Error("Public waveform decode failed.");
      const pcm = new Float32Array(decoded.stdout.buffer, decoded.stdout.byteOffset, decoded.stdout.byteLength / 4).slice(); bytes.fill(0); decoded.stdout.fill(0);
      if (pcm.length > 96000) {pcm.fill(0); throw Error("Source exceeds six-second selection limit.");}
      const observation = await recognize(pcm, 0), words = normalize(row.reference).split(" "), emissions = observation.words;
      if (emissions.length !== words.length || emissions.some((word, i) => recitationLexeme(word.text) !== recitationLexeme(words[i]))) {
        pcm.fill(0); throw Error("Greedy CTC word segmentation does not exactly agree with prior reference; no reliable splice gold.");
      }
      const boundaries = [0, ...emissions.slice(1).map((word, i) => Math.round((emissions[i].endSample + word.startSample) / 2)), pcm.length];
      if (boundaries.some((at, i) => i > 0 && at - boundaries[i - 1] < 1600)) {pcm.fill(0); throw Error("Approximate word segment shorter than 100ms; reject unreliable splice.");}
      const expected = canonical.get(row.key); if (!expected || recitationDisplayWords(expected).length < 3) {pcm.fill(0); throw Error("Canonical display alignment lacks enough words.");}
      const index = Math.max(1, Math.min(words.length - 2, Math.floor(words.length / 2)));
      sources.push({baseline: row, pcm, emissions, expected, index, boundaries});
    } catch (error) {exclusions.push({id: row.id, reason: error instanceof Error ? error.message : "Invalid source"});}
    save();
  }
  for (const source of sources) for (const variant of variants(source)) {
    try {
      const total = Math.max(80000, Math.ceil((variant.pcm.length + 12800) / 40000) * 40000);
      if (serveOnly) {retainCase(source, variant, total); variant.pcm.fill(0); save(); continue;}
      const tracker = new RecitationTracker(), padded = new Float32Array(total); padded.set(variant.pcm);
      const observations: Record<string, unknown>[] = [], inferenceMs: number[] = []; let detected = false, anyAlert = false, feedback: ReciteFeedback | null = null;
      for (let end = 40000; end <= total; end += 40000) {
        const start = Math.max(0, end - 96000), window = padded.subarray(start, end), begin = performance.now(), observation = await recognize(window, start);
        const latencyMs = performance.now() - begin; inferenceMs.push(latencyMs); feedback = tracker.observe(source.expected, observation);
        anyAlert ||= feedback.differences.length > 0;
        const tracked = tracker.snapshot();
        const repeatedTarget = variant.category === "repetition" && tracked.some((word, i) => i > 0 && recitationLexeme(word.text) === recitationLexeme(variant.insertedWord ?? "") && recitationLexeme(tracked[i - 1].text) === recitationLexeme(word.text));
        detected ||= feedback.differences.some(diff => diff.kind === variant.category && (variant.category === "repetition" ? repeatedTarget : diff.index === variant.expectedIndex));
        observations.push({startSample: start, endSample: end, text: observation.text, quality: observation.quality, words: observation.words, latencyMs, feedback, tracked});
      }
      if (!feedback) throw Error("No actual recognition observations.");
      const finalTranscript = tracker.snapshot().map(word => word.text).join(" ");
      results.push({sourceId: source.baseline.id, group: source.baseline.group, split: source.baseline.split, key: source.baseline.key, category: variant.category, positive: variant.positive,
        expectedIndex: variant.expectedIndex, detected, anyAlert, finalAlert: feedback.differences.length > 0, scopedExpected: source.expected, spokenGold: variant.spokenGold,
        goldEdits: wordEdits(variant.spokenGold, finalTranscript), finalTranscript, originalSamples: variant.pcm.length, paddedSamples: padded.length - variant.pcm.length, inferenceMs, observations, edit: variant.edit, feedback});
      if (serve) retainCase(source, variant, total);
      padded.fill(0); variant.pcm.fill(0); save();
      console.log(JSON.stringify({complete: results.length, source: source.baseline.id, category: variant.category, detected, anyAlert}));
    } catch (error) {variant.pcm.fill(0); failures.push({id: source.baseline.id, category: variant.category, reason: error instanceof Error ? error.message : "Actual inference failed"}); save();}
  }
} finally {for (const source of sources) source.pcm.fill(0); await native.release(); save();}
console.log(JSON.stringify({finished: true, selected: chosen.length, sources: sources.length, exclusions: exclusions.length, sourceOnly: serveOnly, evaluatedCases: results.length, servedCases: servedCases.length, failures: failures.length, output}));
if (serve) {
  const server = createServer((request, response) => {
    const origin = request.headers.origin;
    if (origin && !/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin)) {response.writeHead(403); response.end(); return;}
    if (origin) {response.setHeader("Access-Control-Allow-Origin", origin); response.setHeader("Vary", "Origin");}
    response.setHeader("Cache-Control", "no-store");
    if (request.method === "OPTIONS") {response.setHeader("Access-Control-Allow-Methods", "GET"); response.writeHead(204); response.end(); return;}
    if (request.method !== "GET") {response.writeHead(405); response.end(); return;}
    if (request.url === "/cases") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(servedCases.map(({pcm: _pcm, ...meta}) => ({...meta, sampleRate: 16000})))); return;
    }
    const match = request.url?.match(/^\/audio\/(\d+)$/), index = match ? Number(match[1]) : -1;
    if (Number.isSafeInteger(index) && servedCases[index]) {
      response.setHeader("Content-Type", "application/octet-stream"); response.end(Buffer.from(servedCases[index].pcm.buffer)); return;
    }
    response.writeHead(404); response.end();
  });
  server.requestTimeout = 10000;
  const clear = () => {for (const item of servedCases) item.pcm.fill(0); servedCases.length = 0;};
  server.on("error", error => {clear(); throw error;});
  server.listen(3011, "127.0.0.1", () => console.log(JSON.stringify({nativeTestServer: "127.0.0.1:3011", cases: servedCases.length, audioInRamOnly: true})));
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => {clear(); server.close(() => process.exit(0)); server.closeAllConnections();});
}
