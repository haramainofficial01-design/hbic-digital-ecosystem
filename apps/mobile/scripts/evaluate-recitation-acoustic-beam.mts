/** Actual local inference comparison, not app integration or release approval.
 * Public licensed waveforms remain in RAM. Both decoders see the same actual
 * emissions, without canonical prompting; comparison/tracking happens later. */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { TextCTCDecoder, detectSpeech } from "@tilawi/quran-asr";
import { compactQuietPausesWithTimeline, type ReciteFeedback } from "../src/quran/reciteAssistFeedback";
import { decodeRecitationEvidence, RecitationTracker, recitationLexeme, recitationDisplayWords, type RecitationObservation } from "../src/quran/recitationTracking";
import { acousticWordpieceBeam, acousticBeamEvidence } from "./recitationAcousticBeam";
import { controlledEventMetrics } from "./recitationEventMetrics";

const scope = process.argv[2];
if (scope !== "controls" && scope !== "natural") throw Error("Explicit controls or natural development scope required");
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const root = resolve("output/quran-development/recognition/assets"), reportDir = resolve("output/quran-development/qualification");
mkdirSync(reportDir, { recursive: true });
const output = resolve(reportDir, `acoustic-beam-${scope}-${Date.now()}-${randomUUID()}.json`);
const hashes = {
  "fastconformer_full_mixed.onnx": "4767182cd92975869f81a7e32700b14ca2b04e8dc97a15ff220a8697f4639488",
  "vocab.json": "c55877f3bff8bc3aaefc160e8c2fb88cb349088d092513d40210ccfe535e671b"
};
for (const [name, hash] of Object.entries(hashes)) if (sha(readFileSync(resolve(root, name))) !== hash) throw Error("Verified current recognizer assets required");
const runtime = createRequire(resolve("output/quran-development/recognition/package.json")), ort = runtime("onnxruntime-node");
const native = await ort.InferenceSession.create(resolve(root, "fastconformer_full_mixed.onnx"), {graphOptimizationLevel: "all", intraOpNumThreads: 2, interOpNumThreads: 1});
const vocab: Record<string, string> = JSON.parse(readFileSync(resolve(root, "vocab.json"), "utf8")), decoder = new TextCTCDecoder(vocab, 1024);
const canonicalBytes = readFileSync("apps/mobile/assets/quran/tanzil-uthmani.json");
if (sha(canonicalBytes) !== "19453574fcf89b4611d27456a9f10673e63635f7f124ec80815d3392e0ef6a67") throw Error("Unchanged licensed canonical reference required");
const canonical = new Map<string, string>(JSON.parse(canonicalBytes.toString()).chapters.flatMap((c: {verses: {verseKey: string; textUthmani: string}[]}) => c.verses.map(v => [v.verseKey, v.textUthmani])));
const source = {dataset: "sobolev210/quran-recitation-errors", revision: "d196cd3132c69cd361d28cf6a8b442ae4e0bf0b4"};
const base = `https://huggingface.co/datasets/${source.dataset}/resolve/${source.revision}/`;
async function publicBytes(path: string) {
  const url = new URL(path, base), pinned = new URL(base);
  if (url.origin !== pinned.origin || !url.pathname.startsWith(pinned.pathname)) throw Error("Pinned public source required");
  const response = await fetch(url, {signal: AbortSignal.timeout(30_000)});
  if (!response.ok) throw Error(`Public evaluation source HTTP ${response.status}`);
  if (Number(response.headers.get("content-length") ?? 0) > 12_000_000) throw Error("Bounded public source required");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > 12_000_000) { bytes.fill(0); throw Error("Bounded public source required"); }
  return bytes;
}
type Clip = {id: string; group: string; split: string; index: number; text: string; key?: string; pcmSha256?: string; originalSamples?: number;
  clean: boolean; lexicalPositive: boolean; lexicalLocations: number[]; category?: string; expectedIndex?: number | null; spokenGold?: string[]; file?: string; labels?: unknown};
const results: any[] = [], failures: {id: string; reason: string}[] = [];
let provenance: any, clips: Clip[] = [], complete = false;
const codeSha256 = Object.fromEntries(["apps/mobile/scripts/evaluate-recitation-acoustic-beam.mts", "apps/mobile/scripts/recitationAcousticBeam.ts",
  "apps/mobile/scripts/recitationEventMetrics.ts", "apps/mobile/src/quran/recitationTracking.ts", "apps/mobile/src/quran/reciteAssistFeedback.ts"].map(path => [path.split("/").at(-1), sha(readFileSync(path))]));
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)] ?? null;
function summarize(rows: any[], method: "greedy" | "beam") {
  const negative = rows.filter(row => row.clean), positive = rows.filter(row => row.lexicalPositive), actual = rows.map(row => row[method]);
  const detected = positive.filter(row => row[method].detected).length, predictions = rows.filter(row => row[method].anyAlert).length;
  const events = scope === "controls" ? controlledEventMetrics(rows.map(row => ({
    expected: row.lexicalPositive ? {kind: row.category, index: row.expectedIndex} : null,
    observations: row[method].observations.map((observation: any) => ({differences: observation.feedback.differences}))}))) : null;
  return {cases: rows.length, positiveCases: positive.length, exactControlledOrLabeledLocationsDetected: detected,
    negativeCases: negative.length, negativeAlerts: negative.filter(row => row[method].anyAlert).length, predictedCases: predictions,
    controlledCasePrecision: scope === "controls" && complete && !failures.length && predictions ? detected / predictions : null,
    controlledRecall: scope === "controls" && complete && !failures.length && positive.length ? detected / positive.length : null,
    eventMetrics: events ? {...events, controlledPrecision: complete && !failures.length ? events.controlledPrecision : null,
      controlledRecall: complete && !failures.length ? events.controlledRecall : null} : null,
    completeFollowing: rows.filter(row => row[method].feedback.stableComplete && !row[method].feedback.differences.length).length,
    wholeClipScriptReferenceEdits: actual.reduce((n, row) => n + row.whole.wordEdits.edits, 0),
    wholeClipScriptReferenceWords: actual.reduce((n, row) => n + row.whole.wordEdits.words, 0),
    wholeClipScriptReferenceWer: scope === "controls" && complete && !failures.length
      ? actual.reduce((n, row) => n + row.whole.wordEdits.edits, 0) / actual.reduce((n, row) => n + row.whole.wordEdits.words, 0) : null,
    desktopDecodeMs: {p50: percentile(actual.flatMap(row => row.observations.map((o: any) => o.decodeMs)), .5),
      p95: percentile(actual.flatMap(row => row.observations.map((o: any) => o.decodeMs)), .95)}};
}
function save() {
  writeFileSync(output, JSON.stringify({ scope, newInference: true, complete, source: provenance, modelSha256: hashes["fastconformer_full_mixed.onnx"],
    codeSha256, runtime: ort.env.versions, canonicalSha256: sha(canonicalBytes), decoder: {width: 8, tokensPerFrame: 12, referenceConditioned: false,
      vocabulary: "original model wordpieces only", confidenceQualified: false, speechTimings: "maximum path of independently decoded tokens; not human boundaries"},
    liveTrackerThresholdsChanged: false, windowSeconds: 6, cadenceSeconds: 2.5, finalQuietTailSeconds: [1, 2, 3],
    limits: ["Historical controlled/natural development sources, not fresh speaker-disjoint qualification.",
      "Whole-clip decoding is an additional diagnostic, not the bounded live window or its correction feedback.",
      "Approximate waveform edits/pitch-altered speeds are not human-verbatim natural-error gold.",
      "Natural sources have only two reviewed Wording labels; no natural recall/precision or 99% claim.",
      "Script-reference edits are not human-verified audible-transcript WER; natural recordings can include neighboring ayahs.",
      "Actual model receives PCM only. No canonical prompting or expected-reference acoustic alignment; decoded-hypothesis CTC timing is disclosed.",
      "Beam scores/posteriors are uncalibrated. The unchanged tracker can abstain even when a raw transcript looks plausible.",
      "No personal recording uploaded/saved, native battery/latency claim, app engine replacement, production deploy or store change."],
    summaries: Object.fromEntries(["all", "calibration", "heldout"].map(split => [split,
      Object.fromEntries((["greedy", "beam"] as const).map(method => [method, summarize(results.filter(row => split === "all" || row.split === split), method)]))])),
    results, failures }, null, 2));
}
function wordEdits(reference: string[], text: string) {
  const a = reference.map(recitationLexeme), b = text.split(/\s+/).map(recitationLexeme).filter(Boolean);
  let previous = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const next = [i]; for (let j = 1; j <= b.length; j++)
    next[j] = Math.min(previous[j] + 1, next[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = next; }
  return {edits: previous[b.length], words: a.length};
}
async function recognize(pcm: Float32Array, startSample: number) {
  const empty: RecitationObservation = {text: "", quality: 0, words: [], startSample, endSample: startSample + pcm.length};
  if (pcm.length < 16000 || !detectSpeech(pcm)) return {greedy: {...empty, decodeMs: 0}, beam: {...empty, decodeMs: 0}, inferenceMs: 0};
  if (pcm.length > 16_000 * 90) throw Error("Bounded development waveform required");
  const compact = compactQuietPausesWithTimeline(pcm);
  try {
    const start = performance.now(), output = await native.run({audio_signal: new ort.Tensor("float32", compact.pcm, [1, compact.pcm.length]),
      length: new ort.Tensor("int64", BigInt64Array.from([BigInt(compact.pcm.length)]), [1])});
    const inferenceMs = performance.now() - start, tensor = output[native.outputNames[0]];
    if (tensor.type !== "float32" || tensor.dims.length !== 3 || tensor.dims[0] !== 1 || tensor.dims[2] !== 1025)
      throw Error("Verified actual recognizer emission shape required");
    const acoustic = {logprobs: tensor.data as Float32Array, timeSteps: tensor.dims[1], vocabSize: tensor.dims[2], blankId: 1024};
    const greedyStart = performance.now(), greedy = decoder.decode(acoustic.logprobs, acoustic.timeSteps, acoustic.vocabSize);
    const greedyEvidence = decodeRecitationEvidence({...greedy, acoustic}, vocab, compact.pcm.length, compact.spans, startSample, pcm.length);
    const greedyMs = performance.now() - greedyStart, beamStart = performance.now();
    const beam = acousticWordpieceBeam(acoustic.logprobs, acoustic.vocabSize, acoustic.blankId);
    const beamEvidence = acousticBeamEvidence(acoustic.logprobs, acoustic.vocabSize, acoustic.blankId, beam.ids, vocab,
      compact.pcm.length, compact.spans, startSample, pcm.length);
    return {greedy: {...greedyEvidence, text: greedy.text, startSample, endSample: startSample + pcm.length, decodeMs: greedyMs},
      beam: {...beamEvidence, text: decoder.tokenIdsToText(beam.ids), startSample, endSample: startSample + pcm.length,
        decodeMs: performance.now() - beamStart, retainedPathLogScore: beam.retainedPathLogScore, runnerUpMargin: beam.runnerUpMargin}, inferenceMs};
  } finally {compact.pcm.fill(0);}
}
try {
  if (scope === "controls") {
    const response = await fetch("http://127.0.0.1:3011/cases", {signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw Error("Licensed RAM-only controls required");
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length !== 96 || new Set(rows.map(row => row.index)).size !== 96) throw Error("All unchanged waveform controls required");
    provenance = { ...source, fixtureMetadataSha256: sha(JSON.stringify(rows)), license: "MIT publisher dataset card; RAM-only derivatives", priorSuccessSelectionBias: true };
    clips = rows.map(row => ({id: `${row.sourceHash}:${row.category}`, group: row.groupHash, split: row.split, index: row.index, text: row.text,
      pcmSha256: row.audioSha256, originalSamples: row.originalSamples, category: row.category, expectedIndex: row.expectedIndex,
      clean: row.expected === null, lexicalPositive: row.expected !== null, lexicalLocations: [], spokenGold: row.spokenGold}));
  } else {
    const card = await publicBytes("README.md"); if (!/^license: mit$/m.test(new TextDecoder().decode(card))) throw Error("Publisher license mismatch");
    const bytes = await publicBytes("metadata.jsonl"), rows = new TextDecoder().decode(bytes).trim().split("\n").map(line => JSON.parse(line))
      .filter(row => row.riwayah === "Hafs" && row.reviewer_id !== "not reviewed" && Number(row.ayah) > 0);
    if (rows.length !== 172) throw Error("All unchanged reviewed Hafs cases required");
    const wordingGroups = new Set(rows.filter(row => Object.values(row.errors).some((labels: any) => labels?.includes("Wording"))).map(row => row.recording_id));
    provenance = {...source, license: "MIT publisher dataset card", readmeSha256: sha(card), metadataSha256: sha(bytes)};
    clips = rows.map((row, index) => {
      const key = `${row.surah}:${row.ayah}`, text = canonical.get(key);
      if (!text || !/^[a-zA-Z0-9_\-/]+\.wav$/.test(row.file_name)) throw Error("Pinned natural source and canonical scope required");
      const labels = Object.entries(row.errors).filter(([, label]: [string, any]) => label?.length), lexical = labels.filter(([, label]: [string, any]) => label?.includes("Wording"));
      return {id: sha(row.file_name).slice(0, 16), group: sha(row.recording_id).slice(0, 12), index, key, text, file: row.file_name,
        split: wordingGroups.has(row.recording_id) || parseInt(sha(row.recording_id).slice(0, 8), 16) % 3 === 0 ? "heldout" : "calibration",
        clean: labels.length === 0, lexicalPositive: lexical.length > 0, lexicalLocations: recitationDisplayWords(text)
          .flatMap((word, i) => lexical.some(([label]) => recitationLexeme(label) === recitationLexeme(word)) ? [i] : []), labels};
    });
  }
  for (const clip of clips) {
    let bytes: Uint8Array | undefined, pcm: Float32Array | undefined, padded: Float32Array | undefined, decodedBytes: Buffer | undefined;
    try {
      let audioSha256: string;
      if (scope === "controls") {
        const response = await fetch(`http://127.0.0.1:3011/audio/${clip.index}`, {signal: AbortSignal.timeout(10000)});
        if (!response.ok) throw Error("RAM control unavailable"); bytes = new Uint8Array(await response.arrayBuffer());
        audioSha256 = sha(bytes); if (audioSha256 !== clip.pcmSha256 || bytes.length !== clip.originalSamples! * 4) throw Error("Original control identity mismatch");
        pcm = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
      } else {
        bytes = await publicBytes(clip.file!); audioSha256 = sha(bytes);
        const decoded = spawnSync("/opt/homebrew/bin/ffmpeg", ["-v", "error", "-i", "pipe:0", "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"],
          {input: bytes, timeout: 15000, maxBuffer: 16000 * 4 * 100});
        decodedBytes = decoded.stdout;
        if (decoded.status !== 0 || decodedBytes.length % 4) throw Error("Public audio decode failed");
        pcm = new Float32Array(decodedBytes.buffer, decodedBytes.byteOffset, decodedBytes.length / 4);
      }
      if (pcm.length < 16000 || pcm.length > 16000 * 90 || pcm.some(value => !Number.isFinite(value))) throw Error("Bounded actual PCM required");
      // Whole-clip script diagnostic is separate from the live-window tracker.
      const whole = await recognize(pcm, 0);
      padded = new Float32Array(pcm.length + 48000); padded.set(pcm);
      const trackers = {greedy: new RecitationTracker(), beam: new RecitationTracker()}, methods: any = {};
      for (const method of ["greedy", "beam"] as const) methods[method] = {anyAlert: false, detected: false, observations: [],
        whole: {text: whole[method].text, decodeMs: whole[method].decodeMs, wordEdits: wordEdits(clip.spokenGold ?? recitationDisplayWords(clip.text), whole[method].text)}};
      const ends: number[] = []; for (let end = 40000; end <= pcm.length; end += 40000) ends.push(end);
      for (const extra of [16000, 32000, 48000]) ends.push(pcm.length + extra);
      const times: number[] = [];
      for (const end of ends) {
        const start = Math.max(0, end - 96000), observation = await recognize(padded.subarray(start, end), start); times.push(observation.inferenceMs);
        for (const method of ["greedy", "beam"] as const) {
          const observed = observation[method], feedback: ReciteFeedback = trackers[method].observe(clip.text, observed), tracked = trackers[method].snapshot();
          const repeatedWord = clip.spokenGold?.[clip.expectedIndex ?? -1];
          const targetRepeated = clip.category === "repetition" && tracked.some((word, i) => i > 0 && recitationLexeme(word.text) === recitationLexeme(repeatedWord ?? "")
            && recitationLexeme(tracked[i - 1].text) === recitationLexeme(word.text));
          const detected = scope === "controls" ? feedback.differences.some(diff => diff.kind === clip.category && diff.index === clip.expectedIndex && (clip.category !== "repetition" || targetRepeated))
            : feedback.differences.some(diff => diff.index !== null && clip.lexicalLocations.includes(diff.index));
          methods[method].anyAlert ||= feedback.differences.length > 0; methods[method].detected ||= detected;
          methods[method].feedback = feedback; methods[method].observations.push({...observed, feedback, tracked});
        }
      }
      results.push({id: clip.id, group: clip.group, split: clip.split, category: clip.category, key: clip.key, expectedIndex: clip.expectedIndex,
        clean: clip.clean, lexicalPositive: clip.lexicalPositive, lexicalLocations: clip.lexicalLocations, labels: clip.labels, reference: clip.text,
        spokenGold: clip.spokenGold, durationSeconds: pcm.length / 16000, audioSha256, greedy: methods.greedy, beam: methods.beam,
        desktopInferenceMs: {p50: percentile(times, .5), p95: percentile(times, .95)}, wholeInferenceMs: whole.inferenceMs});
      if (results.length % 8 === 0 || results.length === clips.length) console.log(JSON.stringify({complete: results.length, total: clips.length, failures: failures.length,
        greedyDetected: results.filter(row => row.lexicalPositive && row.greedy.detected).length, beamDetected: results.filter(row => row.lexicalPositive && row.beam.detected).length,
        greedyNegativeAlerts: results.filter(row => row.clean && row.greedy.anyAlert).length, beamNegativeAlerts: results.filter(row => row.clean && row.beam.anyAlert).length}));
    } catch (error) {failures.push({id: clip.id, reason: error instanceof Error ? error.message : "Actual acoustic comparison failed"});}
    finally {bytes?.fill(0); pcm?.fill(0); padded?.fill(0); decodedBytes?.fill(0); save();}
    if (failures.length) throw Error("Stopped at failure; incomplete evidence cannot qualify");
  }
  complete = results.length === clips.length; save(); console.log(JSON.stringify({complete, output, failures: failures.length}));
} catch (error) { if (!failures.length) failures.push({id: "startup", reason: error instanceof Error ? error.message : "Startup failed"}); save(); throw error; }
finally {await native.release();}
