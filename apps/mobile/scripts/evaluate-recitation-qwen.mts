/** Actual local waveform comparison on calibration controls only. No fixture
 * recognition, private microphone, canonical prompt, paid API or release flag. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { transcriptDifferences } from "./recitationTranscriptDifferences";
import { wordEdits } from "./recitationQualification";

const variant = process.argv[2] ?? "0.6B", mode = process.argv[3] ?? "auto";
if (!["0.6B", "1.7B"].includes(variant) || !["auto", "cpu-f32", "mps-f32"].includes(mode)) throw Error("Pinned model and supported runtime required");
const root = resolve(`output/quran-development/${variant === "0.6B" ? "qwen-comparison" : "qwen-1.7b-comparison"}`);
const manifest = JSON.parse(readFileSync(resolve(root, "assets/verified-manifest.json"), "utf8"));
const output = resolve(root, `qwen-whole-calibration-${Date.now()}.json`);
const workerPath = resolve("apps/mobile/scripts/qwen-recitation-worker.py");
const python = resolve("output/quran-development/nvidia-evaluation-runtime/bin/python");
const sha = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
const codeSha256 = Object.fromEntries([workerPath, "apps/mobile/scripts/evaluate-recitation-qwen.mts", "apps/mobile/scripts/recitationTranscriptDifferences.ts", "apps/mobile/src/quran/recitationTracking.ts"].map(file => [file.split("/").at(-1), sha(readFileSync(file))]));
const child = spawn(python, [workerPath, root, mode], { stdio: ["pipe", "pipe", "pipe"] });
let stderr = "", pending: { resolve: (value: any) => void; reject: (error: Error) => void } | null = null;
child.stderr.on("data", data => { stderr = (stderr + String(data)).slice(-2000); });
const lines = createInterface({ input: child.stdout });
lines.on("line", line => {
  const request = pending; pending = null;
  try {
    if (!request || line.length > 32_000) throw Error("Recognizer emitted unexpected or oversized evidence");
    const value = JSON.parse(line);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Recognizer emitted invalid evidence");
    request.resolve(value);
  } catch (error) { request?.reject(error instanceof Error ? error : Error("Recognizer emitted invalid evidence")); child.kill("SIGTERM"); }
});
child.on("exit", code => { pending?.reject(Error(`Local recognizer exited ${code}: ${stderr}`)); pending = null; });
child.on("error", error => { pending?.reject(error); pending = null; });
const bounded = <T,>(promise: Promise<T>) => new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => { child.kill("SIGTERM"); reject(Error("Local recognition timed out")); }, 90_000);
  promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});
const startup = bounded(new Promise<any>((resolve, reject) => { pending = { resolve, reject }; }));
const results: any[] = [], failures: { index: number; reason: string; words: number }[] = [];
let complete = false, runtime: unknown;
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)] ?? null;
function save() {
  const tp = results.filter(row => row.detected).length, predictions = results.flatMap(row => row.differences).length;
  const negatives = results.filter(row => row.expected === null), positive = results.filter(row => row.expected !== null);
  const words = results.reduce((n, row) => n + row.edits.words, 0) + failures.reduce((n, row) => n + row.words, 0);
  const edits = results.reduce((n, row) => n + row.edits.errors, 0) + failures.reduce((n, row) => n + row.words, 0);
  const ms = results.map(row => row.elapsedMs);
  writeFileSync(output, JSON.stringify({ model: manifest.repository, revision: manifest.revision,
    modelSha256: manifest.verifiedSha256["model.safetensors"], codeSha256, runtime, complete, newInference: true,
    canonicalPrompt: false, forcedAlignment: false, scope: "offline whole-clip diagnostic", split: "calibration",
    limits: ["Approximate licensed waveform splices selected by prior baseline success, NOT naturally recited mistake gold.",
      "No fresh held-out qualification: these calibration recordings have already been inspected during development.",
      "Raw lexical diff is NOT the live conservative tracker, acoustic word timing or validated user correction.",
      "Missing inference is counted as deleted words, not silently excluded. No 99% qualification claim.",
      "Local desktop latency is NOT phone-native battery/performance or microphone-to-feedback timing.",
      "No private audio, online voice upload, app/model substitution, production deployment or store release."],
    summary: { expectedCases: 48, analyzedCases: results.length, failures: failures.length, positiveCases: 18, negativeCases: 30,
      transcriptOperationDetections: tp, predictedDifferences: predictions, rawDifferencePrecision: predictions ? tp / predictions : null,
      controlledOperationRecall: tp / 18, negativeControlsWithAnyDifference: negatives.filter(row => row.differences.length).length,
      positiveControlsWithWrongDifferences: positive.filter(row => row.differences.some((d: any) => d.kind !== row.expected || d.index !== row.expectedIndex)).length,
      categories: Object.fromEntries(["omission", "repetition", "substitution"].map(kind => [kind, { total: 6, detected: positive.filter(row => row.expected === kind && row.detected).length }])),
      controlledScriptWords: words, controlledScriptEdits: edits, controlledScriptReferenceWer: complete && words ? edits / words : null,
      desktopInferenceMs: { p50: percentile(ms, .5), p95: percentile(ms, .95) } }, failures, results }, null, 2));
}
try {
  runtime = await startup;
  if (!(runtime as any).ready || (runtime as any).canonicalPrompt !== false || (runtime as any).forcedAlignment !== false) throw Error("Invalid recognition startup");
  const response = await fetch("http://127.0.0.1:3011/cases", { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw Error("Licensed local RAM controls unavailable");
  const cases = await response.json();
  if (!Array.isArray(cases) || cases.length !== 96) throw Error("Expected the unchanged 96 controls");
  const selected = cases.filter(row => row.split === "calibration");
  if (selected.length !== 48 || new Set(selected.map(row => row.index)).size !== 48) throw Error("Expected all 48 calibration cases");
  for (const row of selected) {
    let bytes: Uint8Array | undefined, pcm: Buffer | undefined;
    try {
      if (!Number.isSafeInteger(row.index) || row.sampleRate !== 16000 || row.originalSamples < 16000 || row.originalSamples > 192000
        || !Array.isArray(row.spokenGold) || !row.spokenGold.length || row.spokenGold.some((word: unknown) => typeof word !== "string")) throw Error("Invalid bounded controls");
      const audio = await fetch(`http://127.0.0.1:3011/audio/${row.index}`, { signal: AbortSignal.timeout(10_000) });
      if (!audio.ok) throw Error("RAM waveform unavailable");
      bytes = new Uint8Array(await audio.arrayBuffer());
      if (bytes.length !== row.originalSamples * 4 || sha(bytes) !== row.audioSha256) throw Error("Waveform integrity mismatch");
      pcm = Buffer.from(bytes);
      const begin = performance.now();
      const recognized = await bounded(new Promise<any>((resolve, reject) => {
        pending = { resolve, reject };
        child.stdin.write(JSON.stringify({ pcm: pcm!.toString("base64") }) + "\n", error => { if (error) { pending?.reject(error); pending = null; } });
      }));
      const elapsedMs = performance.now() - begin;
      if (typeof recognized.text !== "string" || recognized.text.length > 8000 || recognized.truncated !== false
        || recognized.wordTimestamps !== null || recognized.acousticConfidence !== null) throw Error("Missing/truncated or fabricated recognition evidence");
      const differences = transcriptDifferences(row.text, recognized.text);
      const detected = row.expected !== null && differences.some(d => d.kind === row.expected && d.index === row.expectedIndex);
      results.push({ index: row.index, group: row.groupHash, category: row.category, expected: row.expected, expectedIndex: row.expectedIndex,
        audioSha256: row.audioSha256, reference: row.text, spokenGold: row.spokenGold, transcript: recognized.text, generatedTokens: recognized.generatedTokens,
        detected, differences, edits: wordEdits(row.spokenGold.join(" "), recognized.text), elapsedMs });
      console.log(JSON.stringify({ completed: results.length, category: row.category, detected, differences: differences.length }));
    } catch (error) { failures.push({ index: row.index, words: Array.isArray(row.spokenGold) ? row.spokenGold.length : 0, reason: error instanceof Error ? error.message : "Actual inference failed" }); }
    finally { bytes?.fill(0); pcm?.fill(0); save(); }
    if (failures.length) throw Error("Calibration stopped at actual inference failure; missing cases cannot qualify");
  }
  complete = results.length === 48; save();
  console.log(JSON.stringify({ finished: complete, output, failures: failures.length }));
} catch (error) {
  if (!failures.length) failures.push({ index: -1, words: 0, reason: error instanceof Error ? error.message : "Actual evaluation startup failed" });
  save(); throw error;
}
finally { child.stdin.end(); lines.close(); child.kill("SIGTERM"); }
