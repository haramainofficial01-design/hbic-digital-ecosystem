/** New local phoneme evidence, not a live lexical error detector or 99% result.
 * The reference converter and audio recognizer are separate processes: only PCM
 * enters recognition. No personal recordings, online inference or release writes. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { phoneticComparison } from "./recitationPhoneticComparison";
import { withRecitationAcousticTail } from "./recitationAcousticTail";
import { phoneticPrefixBeam } from "./recitationPhoneticBeam";

const mode = process.argv[2] ?? "cpu";
if (!["cpu", "mps"].includes(mode)) throw Error("Supported development phoneme runtime required");
const quietTailMs = Number(process.argv[3] ?? 0);
if (![0, 600].includes(quietTailMs)) throw Error("Explicit zero or 600 ms acoustic-tail experiment required");
const root = resolve("output/quran-development/muaalem-comparison"), python = resolve("output/quran-development/nvidia-evaluation-runtime/bin/python");
const output = resolve(root, `muaalem-phoneme-calibration-${Date.now()}.json`);
const worker = resolve("apps/mobile/scripts/muaalem-recitation-worker.py"), referenceWorker = resolve("apps/mobile/scripts/recitation-phonetic-reference.py");
const manifest = JSON.parse(readFileSync(resolve(root, "assets/verified-manifest.json"), "utf8"));
const sha = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const codeSha256 = Object.fromEntries([worker, referenceWorker, "apps/mobile/scripts/evaluate-recitation-muaalem.mts", "apps/mobile/scripts/recitationPhoneticComparison.ts", "apps/mobile/scripts/recitationAcousticTail.ts", "apps/mobile/scripts/recitationPhoneticBeam.ts"].map(file => [file.split("/").at(-1), sha(readFileSync(file))]));
const child = spawn(python, [worker, root, mode], { stdio: ["pipe", "pipe", "pipe"] });
let stderr = "", pending: { resolve: (value: any) => void; reject: (error: Error) => void } | null = null;
child.stderr.on("data", data => { stderr = (stderr + String(data)).slice(-3000); });
const lines = createInterface({ input: child.stdout });
lines.on("line", line => {
  const request = pending; pending = null;
  try {
    if (!request || line.length > 400_000) throw Error("Unexpected or oversized acoustic evidence");
    const message = JSON.parse(line);
    if (!message || typeof message !== "object" || Array.isArray(message)) throw Error("Invalid acoustic evidence");
    request.resolve(message);
  } catch (error) { request?.reject(error instanceof Error ? error : Error("Invalid acoustic evidence")); child.kill("SIGTERM"); }
});
child.on("error", error => { pending?.reject(error); pending = null; });
child.on("exit", code => { pending?.reject(Error(`Actual phoneme recognizer exited ${code}: ${stderr}`)); pending = null; });
function bounded<T>(promise: Promise<T>) { return new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => { child.kill("SIGTERM"); reject(Error("Actual phoneme inference timed out")); }, 90_000);
  promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
}); }
const startup = bounded(new Promise<any>((resolve, reject) => { pending = { resolve, reject }; }));
const results: any[] = [], failures: { index: number; reason: string }[] = [];
let runtime: any, referenceProvenance: any, complete = false;
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)] ?? null;
function save() {
  const negative = results.filter(row => row.expected === null), positive = results.filter(row => row.expected !== null);
  writeFileSync(output, JSON.stringify({ model: manifest.repository, revision: manifest.revision, modelSha256: manifest.verifiedSha256["model.safetensors"], codeSha256,
    runtime, referenceProvenance, complete, quietTailMs, newInference: true, canonicalPrompt: false, forcedAlignment: false,
    scope: "raw whole-clip phonetic diagnostics", split: "calibration", wordRecognitionQualified: false,
    acousticDecoders: ["greedy", "CTC prefix beam 16, no reference or language model"],
    limits: ["Actual greedy CTC phonemes, not simulated or reference-forced output.", "Approximate licensed waveform controls, not natural learner error gold.",
      "Reference-side phonetics represent one explicit Hafs configuration, not independently reviewed audible phones or all accepted durations.",
      "Raw phonetic differences are NOT proven lexical mistakes, Tajweed errors, correction precision/recall or WER.",
      "Any disclosed quiet tail is a fixed offline settling experiment, not extra speech, native microphone timing or an independent recitation.",
      "No phone-native runtime/battery, microphone-to-feedback timing, fresh held-out qualification or 99% claim.",
      "No audio saved/uploaded, private records accessed, app engine substitution, production deploy or store release."],
    summary: { expectedCases: 48, analyzedCases: results.length, failures: failures.length,
      negativeControls: 30, negativesWithRawPhoneticDifferences: negative.filter(row => row.comparison.edits > 0).length,
      positiveControls: 18, positivesWithAnyPhoneticDifference: positive.filter(row => row.comparison.edits > 0).length,
      rawCanonicalReferencePhoneEdits: results.reduce((n, row) => n + row.comparison.edits, 0),
      beam: { negativesWithRawPhoneticDifferences: negative.filter(row => row.beam.comparison.edits > 0).length,
        positivesWithAnyPhoneticDifference: positive.filter(row => row.beam.comparison.edits > 0).length,
        rawCanonicalReferencePhoneEdits: results.reduce((n, row) => n + row.beam.comparison.edits, 0),
        desktopDecodeMs: { p50: percentile(results.map(row => row.beam.elapsedMs), .5), p95: percentile(results.map(row => row.beam.elapsedMs), .95) } },
      canonicalReferencePhones: results.reduce((n, row) => n + row.comparison.referencePhones, 0),
      desktopInferenceMs: { p50: percentile(results.map(row => row.elapsedMs), .5), p95: percentile(results.map(row => row.elapsedMs), .95) } }, failures, results }, null, 2));
}
try {
  runtime = await startup;
  if (!runtime.ready || runtime.weightsStrictlyMatched !== true || runtime.canonicalPrompt !== false || runtime.forcedAlignment !== false || runtime.wordRecognitionQualified !== false
    || Object.keys(runtime.vocab ?? {}).length !== 43) throw Error("Invalid actual phoneme startup");
  const response = await fetch("http://127.0.0.1:3011/cases", { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw Error("Public licensed RAM controls unavailable");
  const all = await response.json();
  if (!Array.isArray(all) || all.length !== 96) throw Error("The unchanged 96 waveform controls are required");
  const cases = all.filter(row => row.split === "calibration");
  if (cases.length !== 48 || new Set(cases.map(row => row.index)).size !== 48) throw Error("Every calibration case is required");
  const converted = spawnSync(python, [referenceWorker], { input: JSON.stringify(cases.map(row => ({ index: row.index, text: row.text }))), encoding: "utf8", timeout: 30_000, maxBuffer: 1_000_000 });
  if (converted.status !== 0) throw Error(`Comparison-side reference conversion failed: ${converted.stderr.slice(-1500)}`);
  const references = JSON.parse(converted.stdout);
  if (references.referenceOnly !== true || references.version !== "0.6.4" || references.results.length !== 48) throw Error("Invalid reference comparison provenance");
  referenceProvenance = { version: references.version, attributes: references.attributes, referenceOnly: true };
  const byIndex = new Map(references.results.map((row: any) => [row.index, row]));
  for (const row of cases) {
    let bytes: Uint8Array | undefined, pcm: Buffer | undefined, acousticBytes: Buffer | undefined;
    try {
      if (!Number.isSafeInteger(row.index) || row.sampleRate !== 16000 || row.originalSamples < 16000 || row.originalSamples > 192000) throw Error("Invalid bounded waveform scope");
      const response = await fetch(`http://127.0.0.1:3011/audio/${row.index}`, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw Error("RAM waveform unavailable");
      bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length !== row.originalSamples * 4 || sha(bytes) !== row.audioSha256) throw Error("Waveform integrity mismatch");
      const padded = withRecitationAcousticTail(bytes, quietTailMs);
      pcm = Buffer.from(padded.buffer, padded.byteOffset, padded.byteLength);
      const start = performance.now();
      const recognized = await bounded(new Promise<any>((resolve, reject) => {
        pending = { resolve, reject };
        child.stdin.write(JSON.stringify({ pcm: pcm!.toString("base64") }) + "\n", error => { if (error) { pending?.reject(error); pending = null; } });
      }));
      const elapsedMs = performance.now() - start;
      if (recognized.vocabSize !== 43 || recognized.blankId !== 0 || !Number.isInteger(recognized.timeSteps) || recognized.timeSteps < 1 || recognized.timeSteps > 650
        || typeof recognized.phonemes !== "string" || recognized.phonemes.length > 2000 || typeof recognized.logprobs !== "string") throw Error("Missing bounded phoneme emissions");
      acousticBytes = Buffer.from(recognized.logprobs, "base64");
      if (acousticBytes.length !== recognized.timeSteps * 43 * 4) throw Error("Wrong phoneme evidence shape");
      const acoustic = new Float32Array(acousticBytes.buffer, acousticBytes.byteOffset, acousticBytes.length / 4);
      let last = -1, decoded = "";
      for (let t = 0; t < recognized.timeSteps; t++) {
        let score = -Infinity, id = 0;
        for (let v = 0; v < 43; v++) { const value = acoustic[t * 43 + v]; if (!Number.isFinite(value) || value > .0001) throw Error("Invalid real phoneme posterior"); if (value > score) { score = value; id = v; } }
        if (id !== 0 && id !== last) decoded += runtime.vocab[id];
        last = id;
      }
      if (decoded !== recognized.phonemes) throw Error("Phonemes do not match actual greedy acoustic emissions");
      const reference: any = byIndex.get(row.index);
      const comparison = phoneticComparison(reference.wordPhones, decoded);
      const beamStart = performance.now(), beamResult = phoneticPrefixBeam(acoustic, 43, 0, 16);
      const beamElapsedMs = performance.now() - beamStart;
      const beamPhones = beamResult.ids.map(id => runtime.vocab[id]).join("");
      results.push({ index: row.index, category: row.category, expected: row.expected, expectedIndex: row.expectedIndex, audioSha256: row.audioSha256,
        inferenceAudioSha256: sha(pcm), originalSamples: row.originalSamples, inferenceSamples: pcm.byteLength / 4,
        reference: row.text, referenceWordPhones: reference.wordPhones, phonemes: decoded, timeSteps: recognized.timeSteps,
        acousticSha256: sha(acousticBytes), comparison, elapsedMs,
        beam: { phonemes: beamPhones, retainedPathLogScore: beamResult.retainedPathLogScore, elapsedMs: beamElapsedMs,
          comparison: phoneticComparison(reference.wordPhones, beamPhones), confidenceQualified: false } });
      console.log(JSON.stringify({ completed: results.length, category: row.category, rawPhoneEdits: comparison.edits,
        beamPhoneEdits: results.at(-1).beam.comparison.edits }));
    } catch (error) { failures.push({ index: row.index, reason: error instanceof Error ? error.message : "Actual phoneme inference failed" }); }
    finally { bytes?.fill(0); pcm?.fill(0); acousticBytes?.fill(0); save(); }
    if (failures.length) throw Error("Stopped at actual failure; missing phoneme cases cannot qualify");
  }
  complete = results.length === 48; save();
  console.log(JSON.stringify({ finished: complete, output, failures: failures.length }));
} catch (error) {
  if (!failures.length) failures.push({ index: -1, reason: error instanceof Error ? error.message : "Actual phoneme evaluation startup failed" });
  save(); throw error;
} finally { child.stdin.end(); lines.close(); child.kill("SIGTERM"); }
