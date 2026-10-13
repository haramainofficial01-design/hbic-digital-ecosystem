/** Quran-Lab No-Profit License 1.2; see LICENSE. Isolated real streaming
 * acoustics, NOT word-mistake qualification or an app/production integration. */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { phoneticComparison } from "../recitationPhoneticComparison";
import { comparePhoneticEventHypotheses, uniquePhoneticEventHypotheses, type PhoneticEventHypothesis } from "../recitationCtcHypotheses";
import { compactQuietPausesWithTimeline } from "../../src/quran/reciteAssistFeedback";
import { compareStringHypotheses } from "./ctcString";

const scale = process.argv[2] ?? "1", split = process.argv[3] ?? "calibration";
if (!["1", "32768"].includes(scale) || !["calibration", "heldout"].includes(split)) throw Error("Explicit acoustic-scale experiment and development split required");
const eventMode = process.argv[4] === "--events";
if (process.argv[4] && !eventMode) throw Error("Explicit comparison-only event mode required");
const compactQuiet = process.argv[6] === "--compact-quiet";
if (process.argv[6] && !compactQuiet) throw Error("Explicit quiet-pause experiment required");
const variant = process.argv[7] ?? "v3";
if (!["v3", "v3.1"].includes(variant)) throw Error("Explicit approved model variant required");
const phoneRunNuisance = process.argv[8] === "--all-unit-segments-duration";
const allSegments = process.argv[8] === "--all-unit-segments" || phoneRunNuisance;
if (process.argv[8] && !allSegments) throw Error("Explicit inventory segmentation experiment required");
const root = resolve("output/quran-development/zipformer-comparison"), python = resolve("output/quran-development/nvidia-evaluation-runtime/bin/python");
const worker = resolve("apps/mobile/scripts/zipformer/worker.py"), referenceWorker = resolve("apps/mobile/scripts/recitation-phonetic-reference.py");
const manifest = JSON.parse(readFileSync(resolve(root, `assets/${variant === "v3" ? "verified-manifest.json" : "verified-manifest-v31.json"}`), "utf8"));
const modelName = variant === "v3" ? "zipformer_p_arabic_v3.int8.onnx" : "zipformer_p_arabic_v3.1.int8.onnx";
const output = resolve(root, `zipformer-${variant}-raw-${split}-${scale}-${Date.now()}-${randomUUID()}.json`);
const sha = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const codeSha256 = Object.fromEntries([worker, referenceWorker, "apps/mobile/scripts/zipformer/evaluate.mts", "apps/mobile/scripts/zipformer/ctcString.ts", "apps/mobile/scripts/recitationPhoneticComparison.ts", "apps/mobile/scripts/recitationCtcHypotheses.ts", "apps/mobile/src/quran/reciteAssistFeedback.ts"].map(file => [file.split("/").at(-1), sha(readFileSync(file))]));
const child = spawn(python, [worker, root, scale, variant], { stdio: ["pipe", "pipe", "pipe"] });
let stderr = "", pending: { resolve: (value: any) => void; reject: (error: Error) => void } | null = null;
const lines = createInterface({ input: child.stdout });
child.stderr.on("data", bytes => { stderr = (stderr + String(bytes)).slice(-2000); });
lines.on("line", line => {
  const current = pending; pending = null;
  try { if (!current || line.length > 1_000_000) throw Error("Unexpected acoustic evidence"); current.resolve(JSON.parse(line)); }
  catch (error) { current?.reject(error instanceof Error ? error : Error("Invalid acoustic response")); child.kill("SIGTERM"); }
});
child.on("error", error => { pending?.reject(error); pending = null; });
child.on("exit", code => { pending?.reject(Error(`Approved local model exited ${code}: ${stderr}`)); pending = null; });
function bounded<T>(promise: Promise<T>) { return new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => { child.kill("SIGTERM"); reject(Error("Bounded streaming experiment timed out")); }, 90_000);
  promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
}); }
const startup = bounded(new Promise<any>((resolve, reject) => { pending = { resolve, reject }; }));
const results: any[] = [], failures: any[] = [];
let runtime: any, complete = false, proposalProvenance: any;
function save() {
  const clean = results.filter(row => row.expected === null), positives = results.filter(row => row.expected !== null);
  writeFileSync(output, JSON.stringify({ model: manifest.repository, revision: manifest.revision, variant, modelSha256: manifest.verifiedSha256[modelName],
    license: manifest.license, codeSha256, runtime, split, complete, newInference: true, canonicalPrompt: false, forcedAlignment: false, eventMode, compactQuiet, allSegments, phoneRunNuisance, proposalProvenance,
    scope: "raw streaming phonetic diagnostics", wordRecognitionQualified: false, correctRecitationQualified: false, mistakeDetectionQualified: false,
    limits: ["Historical approximate waveform controls, not fresh naturally recited or teacher-reviewed word/phone gold.",
      "Reference phonetics describe one explicit Hafs configuration; raw phoneme edits cannot be called word mistakes or Tajweed errors.",
      "Reference conversion is separate from waveform-only recognition. No language model or expected-answer acoustic decoding.",
      "Input scale is an explicit frontend experiment. No best-case averaging or post-hoc 99% claim.",
      "Optional fixed RMS quiet compaction retains an original/processed timeline. It cannot qualify quiet speech, clinical safety or human word boundaries.",
      "Streaming state resets between clips; fixed 600 ms quiet settling tail is disclosed, not another attempt.",
      "Optional competing lexical events use an explicitly selected inventory-unit segmentation method and fixed uncalibrated margins; no Tajweed or accepted-duration certification.",
      "Desktop CPU timings are not phone-native microphone latency, battery or ANE verification.",
      "No private recording uploaded/saved; no application model, native dependency, production, OTA or store changed."],
    summary: { expectedCases: 48, analyzedCases: results.length, failures: failures.length,
      negativeCases: clean.length, negativesWithRawPhoneDifferences: clean.filter(row => row.comparison.edits).length,
      positiveCases: positives.length, positivesWithRawPhoneDifferences: positives.filter(row => row.comparison.edits).length,
      rawCanonicalPhoneEdits: results.reduce((n, row) => n + row.comparison.edits, 0),
      canonicalPhones: results.reduce((n, row) => n + row.comparison.referencePhones, 0),
      desktopInferenceMs: results.map(row => row.elapsedMs),
      competingEvents: eventMode ? { trueEvents: positives.filter(row => row.event?.predicted?.kind === row.expected && row.event?.predicted?.index === row.expectedIndex).length,
        predictions: results.filter(row => row.event?.predicted).length, negativeAlerts: clean.filter(row => row.event?.predicted).length,
        wrongPositiveAlerts: positives.filter(row => row.event?.predicted && (row.event.predicted.kind !== row.expected || row.event.predicted.index !== row.expectedIndex)).length,
        confidenceQualified: false } : null }, results, failures }, null, 2));
}
try {
  runtime = await startup;
  if (!runtime.ready || runtime.canonicalPrompt !== false || runtime.forcedAlignment !== false || runtime.blankId !== 250 || runtime.wordRecognitionQualified !== false)
    throw Error("Exact independent streaming recognizer required");
  const all = await (await fetch("http://127.0.0.1:3011/cases", { signal: AbortSignal.timeout(10_000) })).json();
  if (!Array.isArray(all) || all.length !== 96) throw Error("Unchanged licensed RAM control corpus required");
  const cases = all.filter(row => row.split === split);
  if (cases.length !== 48 || new Set(cases.map(row => row.index)).size !== 48) throw Error("All 48 selected development controls required");
  let proposals = new Map<number, any>();
  if (eventMode) {
    const path = resolve(process.argv[5] ?? "");
    if (resolve(path, "..") !== resolve("output/quran-development/muaalem-comparison") || !new RegExp(`^muaalem-phoneme-${split}-[0-9]+-[a-f0-9-]{36}\\.json$`).test(path.split("/").at(-1)!))
      throw Error("Explicit complete independent acoustic proposal report required");
    const bytes = readFileSync(path), old = JSON.parse(bytes.toString());
    if (old.model !== "obadx/muaalem-model-v3_2" || old.split !== split || old.complete !== true || old.failures.length || old.results.length !== 48
      || old.canonicalPrompt !== false || old.forcedAlignment !== false || old.modelSha256 !== "6b6a2e85303d17ff0f3af5e1fc79ac83daecee409c756ddf27f0ced59393bb41")
      throw Error("Verified independent proposal provenance required");
    proposals = new Map(old.results.map((row: any) => [row.index, row]));
    proposalProvenance = { evidencePath: path, sha256: sha(bytes), scope: "saved independent RNNT/character-CTC lexical proposals, not recognition truth", newInference: false };
  }
  const requests = cases.map(row => {
    const old = proposals.get(row.index);
    if (eventMode && (!old || old.audioSha256 !== row.audioSha256 || !Array.isArray(old.independentLexicalProposals))) throw Error("Proposal source mismatch");
    return { index: row.index, text: row.text, substitutions: old?.independentLexicalProposals ?? [] };
  });
  const converted = spawnSync(python, [referenceWorker, ...(eventMode ? ["--events"] : [])], { input: JSON.stringify(requests),
    encoding: "utf8", timeout: 30_000, maxBuffer: 1_000_000 });
  if (converted.status !== 0) throw Error(`Pure reference conversion failed: ${converted.stderr.slice(-1000)}`);
  const references = JSON.parse(converted.stdout);
  if (references.referenceOnly !== true || references.version !== "0.6.4" || references.results.length !== 48) throw Error("Pinned comparison-only phonetizer required");
  const byIndex = new Map<number, any>(references.results.map((row: any) => [row.index, row]));
  const units = readFileSync(resolve(root, "assets/tokens.txt"), "utf8").trim().split("\n").map(line => {
    const index = line.lastIndexOf(" "); return { unit: line.slice(0, index), id: Number(line.slice(index + 1)) };
  }).filter(entry => entry.id !== 250).sort((a, b) => b.unit.length - a.unit.length || a.id - b.id);
  const encode = (phones: string) => {
    const ids: number[] = []; let offset = 0;
    while (offset < phones.length) {
      const found = units.find(entry => phones.startsWith(entry.unit, offset));
      if (!found) throw Error("Reference contains an unrepresented phonetic unit; do not guess");
      ids.push(found.id); offset += found.unit.length;
    }
    return ids;
  };
  const inventory = Array.from({length:251},(_,id)=>units.find(entry=>entry.id===id)?.unit??"");
  for (const row of cases) {
    let pcm: Buffer | undefined, acoustic: Buffer | undefined, compact: ReturnType<typeof compactQuietPausesWithTimeline> | undefined;
    try {
      const response = await fetch(`http://127.0.0.1:3011/audio/${row.index}`, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw Error("RAM control waveform unavailable");
      pcm = Buffer.from(await response.arrayBuffer());
      if (pcm.length !== row.originalSamples * 4 || sha(pcm) !== row.audioSha256) throw Error("Exact waveform integrity mismatch");
      if (compactQuiet) compact = compactQuietPausesWithTimeline(new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4));
      const inferencePcm = compact ? Buffer.from(compact.pcm.buffer, compact.pcm.byteOffset, compact.pcm.byteLength) : pcm;
      const begin = performance.now();
      const recognized = await bounded(new Promise<any>((resolve, reject) => { pending = { resolve, reject };
        child.stdin.write(JSON.stringify({ pcm: inferencePcm.toString("base64") }) + "\n", error => { if (error) { pending?.reject(error); pending = null; } }); }));
      const elapsedMs = performance.now() - begin;
      if (recognized.vocabSize !== 251 || recognized.blankId !== 250 || recognized.referenceConditioned !== false || recognized.addedQuietSamples !== 9600
        || !Number.isInteger(recognized.timeSteps) || recognized.timeSteps < 1 || recognized.timeSteps > 650 || typeof recognized.phonemes !== "string")
        throw Error("Invalid actual streaming evidence");
      acoustic = Buffer.from(recognized.logprobs, "base64");
      if (acoustic.length !== recognized.timeSteps * 251 * 4) throw Error("Wrong actual posterior dimensions");
      const reference = byIndex.get(row.index);
      const hypotheses: PhoneticEventHypothesis[] = eventMode && !allSegments ? reference.hypotheses.map((h: any) => ({ kind: h.kind, index: h.index, ids: encode(h.phonemes) })) : [];
      const emission = new Float32Array(acoustic.buffer, acoustic.byteOffset, acoustic.length / 4);
      const strings: {kind: "unchanged" | "omission" | "repetition" | "substitution"; index: number | null; phones: string}[] = eventMode
        ? reference.hypotheses.map((h:any)=>({kind:h.kind,index:h.index,phones:h.phonemes})) : [];
      const uniqueStrings = [...new Map(strings.map(h=>[`${h.kind}:${h.index}:${h.phones}`,h])).values()];
      const event = eventMode ? allSegments ? compareStringHypotheses(emission, inventory, 250,
        uniqueStrings, phoneRunNuisance)
        : comparePhoneticEventHypotheses(emission, 251, 250, uniquePhoneticEventHypotheses(hypotheses).hypotheses, true, false) : undefined;
      results.push({ index: row.index, category: row.category, expected: row.expected, expectedIndex: row.expectedIndex,
        audioSha256: row.audioSha256, originalSamples: row.originalSamples, reference: row.text, referenceWordPhones: reference.wordPhones,
        inferenceAudioSha256: sha(inferencePcm), inferenceSamples: inferencePcm.length / 4, timeline: compact?.spans,
        phonemes: recognized.phonemes, tokenIds: recognized.tokenIds, timeSteps: recognized.timeSteps, acousticSha256: sha(acoustic),
        comparison: phoneticComparison(reference.wordPhones, recognized.phonemes), elapsedMs, event, duplicateStringPathsIgnored: strings.length-uniqueStrings.length });
      console.log(JSON.stringify({ completed: results.length, category: row.category, rawPhoneEdits: results.at(-1).comparison.edits, predicted: event?.predicted }));
    } catch (error) { failures.push({ index: row.index, reason: error instanceof Error ? error.message : "Actual inference failed" }); }
    finally { pcm?.fill(0); acoustic?.fill(0); compact?.pcm.fill(0); save(); }
    if (failures.length) throw Error("Actual inference failed; no omitted denominator or qualification claim");
  }
  complete = results.length === 48; save(); console.log(JSON.stringify({ finished: complete, output }));
} catch (error) { if (!failures.length) failures.push({ index: -1, reason: error instanceof Error ? error.message : "Startup failed" }); save(); throw error; }
finally { child.stdin.end(); lines.close(); child.kill("SIGTERM"); }
