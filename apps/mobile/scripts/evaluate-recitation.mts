/** Offline-only qualification. Public licensed audio stays in RAM, never in Git.
 * Run with an existing onnxruntime-node installation and verified model assets.
 * It neither reads HBIC accounts nor calls HBIC/Stripe/Firebase/production APIs.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { TextCTCDecoder, detectSpeech, normalizeArabicForJudge, overlapMerge, type AsrTranscribeResult } from "@tilawi/quran-asr";
import { acousticQuality, compactQuietPausesWithTimeline } from "../src/quran/reciteAssistFeedback";
import { decodeRecitationWords, RecitationTracker } from "../src/quran/recitationTracking";

const dataset = "sobolev210/quran-recitation-errors", revision = "d196cd3132c69cd361d28cf6a8b442ae4e0bf0b4";
const base = `https://huggingface.co/datasets/${dataset}/resolve/${revision}/`;
const root = resolve(process.env.RECITE_MODEL_ASSETS ?? "output/quran-development/recognition/assets");
const output = resolve(process.env.RECITE_EVALUATION_OUTPUT ?? "output/quran-development/qualification/temporal.json");
if (!output.includes("/output/quran-development/")) throw Error("Evaluation output must remain in ignored development output.");
const runtime = createRequire(resolve(process.env.RECITE_RUNTIME ?? "output/quran-development/recognition", "package.json"));
const ort = runtime("onnxruntime-node");
const sha = (s: string | Uint8Array) => createHash("sha256").update(s).digest("hex");
const hashes = {
  "fastconformer_full_mixed.onnx": "4767182cd92975869f81a7e32700b14ca2b04e8dc97a15ff220a8697f4639488",
  "vocab.json": "c55877f3bff8bc3aaefc160e8c2fb88cb349088d092513d40210ccfe535e671b",
  "quran_ctc_tokens.json": "96aa32d188d075598536fcbb936dc793466fce2a8da331e48f15932022f4dce8",
  "quran.json": "6e6f31f642c701b49a1ba090311ca4c7a97c6a5b79a302712dff815a9d7b3d03"
};
for (const [file, hash] of Object.entries(hashes)) if (sha(readFileSync(resolve(root, file))) !== hash) throw Error("Evaluation model integrity mismatch.");
async function fetchBytes(path: string) {
  const url = new URL(path, base), pinned = new URL(base);
  if (url.origin !== pinned.origin || !url.pathname.startsWith(pinned.pathname)) throw Error("Evaluation source escaped the pinned public dataset.");
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`Public evaluation source HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 12_000_000) throw Error("Evaluation clip exceeds size bound.");
  return bytes;
}
const card = new TextDecoder().decode(await fetchBytes("README.md"));
if (!/^license: mit$/m.test(card)) throw Error("Pinned public dataset license no longer matches.");
const metadata = await fetchBytes("metadata.jsonl");
type Row = {file_name: string; recording_id: string; riwayah: string; reviewer_id: string; surah: string; ayah: string; text: string; errors: Record<string, string[] | null>};
const rows = new TextDecoder().decode(metadata).trim().split("\n").map(l => JSON.parse(l) as Row)
  .filter(r => r.riwayah === "Hafs" && r.reviewer_id !== "not reviewed" && Number(r.ayah) > 0);
const wordErrorGroups = new Set(rows.filter(r => Object.values(r.errors).some(e => e?.includes("Wording"))).map(r => r.recording_id));
const split = (r: Row) => wordErrorGroups.has(r.recording_id) || parseInt(sha(r.recording_id).slice(0, 8), 16) % 3 === 0 ? "heldout" : "calibration";
const native = await ort.InferenceSession.create(resolve(root, "fastconformer_full_mixed.onnx"), {graphOptimizationLevel: "all", intraOpNumThreads: 2, interOpNumThreads: 1});
const vocab: Record<string, string> = JSON.parse(readFileSync(resolve(root, "vocab.json"), "utf8"));
const decoder = new TextCTCDecoder(vocab, 1024);
const sourceText = readFileSync("apps/mobile/assets/quran/tanzil-uthmani.json", "utf8");
const canonical = new Map<string, string>(JSON.parse(sourceText).chapters.flatMap((c: {verses: {verseKey: string; textUthmani: string}[]}) => c.verses.map(v => [v.verseKey, v.textUthmani])));
function edits(reference: string, transcript: string) {
  const a = normalizeArabicForJudge(reference).split(/\s+/).filter(Boolean), b = normalizeArabicForJudge(transcript).split(/\s+/).filter(Boolean);
  let prev = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {const next = [i]; for (let j = 1; j <= b.length; j++) next[j] = Math.min(prev[j] + 1, next[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = next;}
  return {errors: prev[b.length], words: a.length};
}
type Observation = {end: number; text: string; quality: number; latencyMs: number; status: string; differences: unknown[]; words: unknown[]};
type ClipResult = {id: string; group: string; split: string; key: string; text: string; reference: string; audioSha256: string; durationSeconds: number;
  labels: {word: string; labels: string[] | null}[]; clean: boolean; lexicalPositive: boolean; observations: Observation[]; rawTranscript: string;
  acceptedTranscript: string; wordEdits: {errors: number; words: number}; latencyMs: number; inferenceMs: number[]; feedback: ReturnType<RecitationTracker["observe"]>};
const results: ClipResult[] = [], failures: string[] = [];
mkdirSync(resolve(output, ".."), {recursive: true});
function save() {
  writeFileSync(output, JSON.stringify({source: {dataset, revision, license: "MIT (publisher dataset card)", metadataSha256: sha(metadata), readmeSha256: sha(card)},
    pipeline: {name: "temporal-ctc", windowSeconds: 6, cadenceSeconds: 2.5, finalQuietContextMinimumSeconds: .8, canonicalSha256: sha(sourceText), modelSha256: hashes["fastconformer_full_mixed.onnx"]},
    limits: ["Recording-disjoint, NOT proven speaker-disjoint", "Only two natural Wording labels; no general recall claim", "No demographics/consent protocol provided by dataset card", "No audio redistribution", "Reference-scope WER is NOT verified spoken-transcript WER; recordings can include neighboring ayahs", "Tajweed/Letters/Tashkeel kept separate from word-error qualification", "Extra final quiet context simulates a live recorder after the last word; NOT a second independent recitation"], runtime: ort.env.versions, results, failures}, null, 2));
}
try {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], id = sha(row.file_name).slice(0, 16), key = `${row.surah}:${row.ayah}`, text = canonical.get(key);
    try {
      if (!text || !/^[a-zA-Z0-9_\-/]+\.wav$/.test(row.file_name)) throw Error("Invalid public evaluation row.");
      const bytes = await fetchBytes(row.file_name);
      const decoded = spawnSync(process.env.RECITE_FFMPEG ?? "/opt/homebrew/bin/ffmpeg", ["-v", "error", "-i", "pipe:0", "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"], {input: bytes, maxBuffer: 16_000 * 4 * 100});
      if (decoded.status !== 0) throw Error("Public audio decode failed.");
      const originalLength = decoded.stdout.byteLength / 4;
      const pcm = new Float32Array(Math.max(80000, Math.ceil((originalLength + 12800) / 40000) * 40000));
      pcm.set(new Float32Array(decoded.stdout.buffer, decoded.stdout.byteOffset, decoded.stdout.byteLength / 4));
      if (pcm.length > 16_000 * 90) throw Error("Public clip exceeds duration bound.");
      const observations: Observation[] = [], times: number[] = []; let raw: string[] = [];
      const tracker = new RecitationTracker();
      let feedback = tracker.observe(text, {text: "", words: [], quality: 0, startSample: 0, endSample: 0});
      const begin = performance.now(), ends: number[] = [];
      for (let end = 40000; end <= pcm.length; end += 40000) ends.push(end);
      for (const end of ends) {
        const startSample = Math.max(0, end - 96000), input = pcm.subarray(startSample, end);
        const window = compactQuietPausesWithTimeline(input), start = performance.now();
        let heard: AsrTranscribeResult | null = null;
        if (input.length >= 16000 && detectSpeech(input)) {
          const value = await native.run({audio_signal: new ort.Tensor("float32", window.pcm, [1, window.pcm.length]), length: new ort.Tensor("int64", BigInt64Array.from([BigInt(window.pcm.length)]), [1])});
          const t = value[native.outputNames[0]], acoustic = {logprobs: t.data as Float32Array, timeSteps: t.dims[1], vocabSize: t.dims[2], blankId: 1024};
          heard = {...decoder.decode(acoustic.logprobs, acoustic.timeSteps, acoustic.vocabSize), acoustic};
        }
        const latencyMs = performance.now() - start, q = heard ? acousticQuality(heard) : 0, transcript = heard?.text ?? "";
        const words = heard ? decodeRecitationWords(heard, vocab, window.pcm.length, window.spans, startSample, input.length) : [];
        const assessment = tracker.observe(text, {text: transcript, words, quality: q, startSample, endSample: end});
        if (assessment.status !== "uncertain") feedback = assessment;
        observations.push({end, text: transcript, quality: q, latencyMs, status: assessment.status, differences: assessment.differences, words}); times.push(latencyMs);
        raw = overlapMerge(raw, transcript.trim().split(/\s+/).filter(Boolean));
        window.pcm.fill(0);
      }
      const accepted = tracker.snapshot().map(word => word.text).join(" ");
      const labels = Object.entries(row.errors).filter(([, e]) => e?.length).map(([word, labels]) => ({word, labels}));
      results.push({id, group: sha(row.recording_id).slice(0, 12), split: split(row), key, text, reference: row.text, audioSha256: sha(bytes), durationSeconds: originalLength / 16_000,
        labels, clean: labels.length === 0, lexicalPositive: labels.some(l => l.labels?.includes("Wording")), observations, rawTranscript: raw.join(" "), acceptedTranscript: accepted,
        wordEdits: edits(row.text, raw.join(" ")), latencyMs: performance.now() - begin, inferenceMs: times, feedback});
      pcm.fill(0); bytes.fill(0); decoded.stdout.fill(0); save();
      if ((i + 1) % 10 === 0 || i + 1 === rows.length) console.log(JSON.stringify({complete: i + 1, total: rows.length, failures: failures.length, cleanFlags: results.filter(r => r.clean && r.feedback.differences.length).length}));
    } catch (e) {failures.push(`${id}: ${e instanceof Error ? e.message : "Failed"}`); save();}
  }
} finally {await native.release(); save();}
console.log(JSON.stringify({finished: true, evaluated: results.length, failures: failures.length, output}));
