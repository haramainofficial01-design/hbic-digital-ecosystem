/** Experimental OFFLINE comparison, not app integration or release approval.
 * Actual licensed human-waveform controls enter whisper.cpp as stdin float WAV.
 * No microphone, audio files, private accounts, canonical prompt, or paid API. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { normalizeArabicForJudge } from "@tilawi/quran-asr";

const root = resolve("output/quran-development/whisper-comparison");
const output = resolve(process.env.RECITE_WHISPER_OUTPUT ?? "output/quran-development/whisper-comparison/controls-whisper.json");
if (!output.startsWith(`${root}/`)) throw Error("Keep experimental reports in ignored comparison output.");
const upstream = { repository: "tarteel-ai/whisper-base-ar-quran", revision: "5c3c53fdf9272c4f6ee0bee09a1e5a4a615ee25c", license: "Apache-2.0" };
const conversion = { repository: "ram-a-dhan/tarteel-whisper-quran-ggml", revision: "4a96d8bb5535a4b6e6f6abd5655b8711a95ae538",
  filename: "tarteel-ai-whisper-base-ar-quran-ggml-q8_0.bin", license: "Apache-2.0", sha256: "7b22bd61ef18112fe92cb2518f37ef4896b85be90a371d4dd43e74749768730f" };
const runtime = { repository: "https://github.com/ggml-org/whisper.cpp", tag: "v1.9.5", commit: "d1be6fde11ac6e0407606b4e42fe72d34add8037", license: "MIT", cpuOnly: true, accelerate: true, threads: 2 };
const sha = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const normalize = (text: string) => normalizeArabicForJudge(text).split(/\s+/).filter(Boolean);
const cli = resolve(root, "build/bin/whisper-cli");
const actualCommit = spawnSync("git", ["-C", resolve(root, "whisper.cpp"), "rev-parse", "HEAD"], {encoding: "utf8"});
if (actualCommit.status !== 0 || actualCommit.stdout.trim() !== runtime.commit) throw Error("Unverified comparison runtime source.");
const original = readFileSync(resolve(root, "tarteel-quran-base-q8_0.bin"));
if (sha(original) !== conversion.sha256) throw Error("Converted model differs from the pinned LFS SHA256.");
const configResponse = await fetch(`https://huggingface.co/${upstream.repository}/resolve/${upstream.revision}/config.json`, {signal: AbortSignal.timeout(30000)});
if (!configResponse.ok) throw Error("Official pinned model geometry unavailable.");
const configText = await configResponse.text(), config = JSON.parse(configText) as Record<string, number>;
if (config.max_target_positions !== 448 || config.d_model !== 512 || config.vocab_size !== 51865 || config.encoder_layers !== 6 || config.decoder_layers !== 6
  || original.readUInt32LE(0) !== 0x67676d6c || original.readInt32LE(24) !== 1024) throw Error("Model metadata repair assumptions no longer match pinned sources.");
// The community conversion has header n_text_ctx=1024 but an actual 448-position
// decoder tensor. The unmodified verified artifact fails runtime shape checks.
// Preserve it; generate a separately named experimental copy with ONLY this
// 4-byte metadata correction, grounded in the official 448-position config.
// Never silently call this an official conversion or put it in the app.
const derived = Buffer.from(original); derived.writeInt32LE(config.max_target_positions, 24);
if (!original.subarray(0, 24).equals(derived.subarray(0, 24)) || !original.subarray(28).equals(derived.subarray(28))) throw Error("Unexpected weight-byte change.");
const derivedModel = resolve(root, "tarteel-quran-base-q8_0-context448.bin"), derivedSha256 = sha(derived);
writeFileSync(derivedModel, derived); original.fill(0); derived.fill(0);
const args = ["-m", derivedModel, "-f", "-", "-l", "ar", "-t", "2", "-nt", "-np", "-bo", "1", "-bs", "1", "-tp", "0", "-nf", "-ng", "-mc", "0", "-ojf", "-of", "-"];
if (args.includes("--prompt") || args.includes("--grammar")) throw Error("Canonical conditioning is forbidden for error evaluation.");
type Category = "correct" | "pause" | "low_noise" | "speed_0.8" | "speed_1.2" | "omission" | "repetition" | "substitution";
type Fixture = {name: string; category: Category; expected: Category | null; expectedIndex: number | null; index: number; text: string; sourceReference: string;
  sourceHash: string; groupHash: string; split: string; originalSamples: number; paddedTotalSamples: number; spokenGold: string[]; audioSha256: string; edit: Record<string, unknown>; sampleRate: number};
type Difference = {kind: "omission" | "substitution" | "repetition" | "extra_word"; expectedIndex: number | null; expectedWord: string | null; heardWord: string | null};
type Result = {index: number; sourceHash: string; groupHash: string; split: string; category: Category; positive: boolean; detected: boolean; anyAlert: boolean; transcript: string;
  spokenGold: string[]; wordEdits: {errors: number; words: number}; differences: Difference[]; elapsedMs: number; seconds: number; audioSha256: string; stderr: string; segments: unknown[]};
function align(reference: string[], heard: string[]) {
  const table = Array.from({length: reference.length + 1}, () => new Array<number>(heard.length + 1).fill(0));
  for (let i = 0; i <= reference.length; i++) table[i][0] = i;
  for (let j = 0; j <= heard.length; j++) table[0][j] = j;
  for (let i = 1; i <= reference.length; i++) for (let j = 1; j <= heard.length; j++) table[i][j] = Math.min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + (reference[i - 1] === heard[j - 1] ? 0 : 1));
  const differences: Difference[] = []; let i = reference.length, j = heard.length;
  while (i || j) {
    if (i && j && reference[i - 1] === heard[j - 1] && table[i][j] === table[i - 1][j - 1]) {i--; j--;}
    else if (i && j && table[i][j] === table[i - 1][j - 1] + 1) {differences.push({kind: "substitution", expectedIndex: i - 1, expectedWord: reference[--i], heardWord: heard[--j]});}
    else if (i && table[i][j] === table[i - 1][j] + 1) {differences.push({kind: "omission", expectedIndex: i - 1, expectedWord: reference[--i], heardWord: null});}
    else {const word = heard[j - 1], repeated = j > 1 && heard[j - 2] === word || j < heard.length && heard[j] === word;
      differences.push({kind: repeated ? "repetition" : "extra_word", expectedIndex: null, expectedWord: null, heardWord: heard[--j]});}
  }
  return {errors: table[reference.length][heard.length], words: reference.length, differences: differences.reverse()};
}
function floatWav(pcm: Uint8Array) {
  if (pcm.byteLength % 4) throw Error("Control PCM length is invalid.");
  const wav = Buffer.alloc(44 + pcm.byteLength); wav.write("RIFF", 0); wav.writeUInt32LE(pcm.byteLength + 36, 4); wav.write("WAVE", 8); wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(3, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(64000, 28);
  wav.writeUInt16LE(4, 32); wav.writeUInt16LE(32, 34); wav.write("data", 36); wav.writeUInt32LE(pcm.byteLength, 40); wav.set(pcm, 44); return wav;
}
const response = await fetch("http://127.0.0.1:3011/cases", {signal: AbortSignal.timeout(10000)});
if (!response.ok) throw Error("Actual RAM-only waveform control source unavailable.");
const fixtures = await response.json() as Fixture[];
if (fixtures.length !== 96 || fixtures.some(f => f.sampleRate !== 16000 || !f.spokenGold?.length || !/^[a-f\d]{64}$/.test(f.audioSha256))) throw Error("Expected identical 96 hashed waveform controls with known edits.");
const results: Result[] = [], failures: {index: number; reason: string}[] = [];
function percentile(values: number[], p: number) {const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] : null;}
function summary(rows: Result[]) {
  const positive = rows.filter(r => r.positive), negative = rows.filter(r => !r.positive), truePositive = positive.filter(r => r.detected).length,
    wrongOperation = positive.filter(r => r.anyAlert && !r.detected).length, falsePositive = negative.filter(r => r.anyAlert).length;
  const edits = rows.reduce((n, r) => n + r.wordEdits.errors, 0), words = rows.reduce((n, r) => n + r.wordEdits.words, 0), times = rows.map(r => r.elapsedMs);
  return {cases: rows.length, groups: new Set(rows.map(r => r.groupHash)).size, trueOperationCases: truePositive, positiveCases: positive.length, negativeCases: negative.length,
    wrongOperationAlertCases: wrongOperation, falsePositiveControlCases: falsePositive, falsePositiveControlRate: negative.length ? falsePositive / negative.length : null,
    operationCasePrecision: truePositive + wrongOperation + falsePositive ? truePositive / (truePositive + wrongOperation + falsePositive) : null,
    operationCaseRecall: positive.length ? truePositive / positive.length : null,
    categoryRecall: Object.fromEntries(["omission", "repetition", "substitution"].map(category => {const cases = positive.filter(r => r.category === category); return [category, {cases: cases.length, detected: cases.filter(r => r.detected).length, recall: cases.length ? cases.filter(r => r.detected).length / cases.length : null}];})),
    controlledScriptWordEdits: edits, controlledScriptWords: words, controlledScriptReferenceWer: words ? edits / words : null,
    coldOneShotProcessLatencyMs: {p50: percentile(times, .5), p95: percentile(times, .95), maximum: times.length ? Math.max(...times) : null},
    meanRealTimeFactorIncludingReload: rows.length ? rows.reduce((n, r) => n + r.elapsedMs / 1000 / r.seconds, 0) / rows.length : null};
}
mkdirSync(root, {recursive: true});
function save() {
  writeFileSync(output, JSON.stringify({provenance: {upstream, conversion, runtime, cliSha256: sha(readFileSync(cli)), officialConfigSha256: sha(configText), derivedSha256,
    metadataRepair: {offset: 24, originalValue: 1024, derivedValue: 448, reason: "Original converted header contradicts its actual positional tensor and official config.", weightBytesUnchanged: true},
    fixtureMetadataSha256: sha(JSON.stringify(fixtures)), args: args.map(arg => arg === derivedModel ? "derived-experimental-model" : arg)},
    limits: ["EXPERIMENTAL offline comparison only. Community GGML conversion has not been independently proven weight-equivalent to the official checkpoint.",
      "Original verified artifact was preserved; a separately named copy corrects ONLY the four-byte context metadata, with both hashes recorded. Never ship this as an official verified model.",
      "Exactly the same controlled 96 RAM-only waveforms, not real microphone input. Model-derived splice boundaries and prior-ASR-success selection bias still apply.",
      "No canonical Quran prompt, grammar, previous transcript, or expected words are passed to Whisper. Arabic language only; greedy decoding, zero temperature, no fallback, no GPU, no text-context carry.",
      "One-shot raw transcript lexical alignment is NOT the app's conservative live tracker and has no confidence abstention. False-positive comparisons are not equivalent end-to-end products.",
      "Controlled-script WER is not human-verified natural speech WER. Silence, punctuation and diacritics are normalized; no phonetic letter folding.",
      "Reported latency includes loading the model anew for each CLI process; not warm phone-native or microphone-to-feedback latency.",
      "No audio or derivatives are written to disk; float32 WAV exists only in memory and stdin. Public source demographics/consent protocol unknown.",
      "No app/model integration, paid service, production change, native build, or store release qualification."],
    summaries: Object.fromEntries(["all", "calibration", "heldout"].map(split => [split, summary(results.filter(r => split === "all" || r.split === split))])), results, failures}, null, 2));
}
for (const fixture of fixtures) {
  let raw: Uint8Array | null = null, wav: Buffer | null = null;
  try {
    const audio = await fetch(`http://127.0.0.1:3011/audio/${fixture.index}`, {signal: AbortSignal.timeout(10000)});
    if (!audio.ok) throw Error("Actual waveform control unavailable."); raw = new Uint8Array(await audio.arrayBuffer());
    if (sha(raw) !== fixture.audioSha256 || raw.length !== fixture.originalSamples * 4) throw Error("Control waveform differs from the known edit source.");
    wav = floatWav(raw); const begin = performance.now(), executed = spawnSync(cli, args, {input: wav, encoding: "utf8", timeout: 90000, maxBuffer: 8000000});
    const elapsedMs = performance.now() - begin;
    if (executed.status !== 0 || executed.error) throw Error(`CLI status ${executed.status}: ${executed.error?.message ?? ""} ${executed.stderr.slice(-1500)}`);
    const decoded = JSON.parse(executed.stdout) as {transcription: {text: string}[]};
    if (!Array.isArray(decoded.transcription)) throw Error("CLI produced no structured raw transcript.");
    const transcript = decoded.transcription.map(segment => segment.text).join(" ").trim(), heard = normalize(transcript), assessed = align(normalize(fixture.sourceReference), heard);
    const editedReference = align(normalize(fixture.spokenGold.join(" ")), heard);
    const targetWord = fixture.expectedIndex === null ? null : normalize(fixture.sourceReference)[fixture.expectedIndex];
    const detected = assessed.differences.some(diff => diff.kind === fixture.expected && (fixture.expected === "repetition" ? diff.heardWord === targetWord : diff.expectedIndex === fixture.expectedIndex));
    results.push({index: fixture.index, sourceHash: fixture.sourceHash, groupHash: fixture.groupHash, split: fixture.split, category: fixture.category, positive: fixture.expected !== null,
      detected, anyAlert: assessed.differences.length > 0, transcript, spokenGold: fixture.spokenGold, wordEdits: {errors: editedReference.errors, words: editedReference.words},
      differences: assessed.differences, elapsedMs, seconds: fixture.originalSamples / 16000, audioSha256: fixture.audioSha256, stderr: executed.stderr.slice(-1500), segments: decoded.transcription});
    console.log(JSON.stringify({complete: results.length, index: fixture.index, category: fixture.category, detected, anyAlert: assessed.differences.length > 0, elapsedMs}));
  } catch (error) {failures.push({index: fixture.index, reason: error instanceof Error ? error.message : "Actual CLI inference failed"}); console.log(JSON.stringify({failed: fixture.index, reason: failures.at(-1)?.reason}));}
  finally {raw?.fill(0); wav?.fill(0); save();}
}
console.log(JSON.stringify({finished: true, evaluated: results.length, failures: failures.length, output}));
