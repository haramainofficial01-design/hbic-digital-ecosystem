import { Directory, File, Paths } from "expo-file-system";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { requireOptionalNativeModule } from "expo-modules-core";
import { createAsrSession, detectSpeech, type AsrSession } from "@tilawi/quran-asr";
import { acousticQuality, compactQuietPauses } from "./reciteAssistFeedback";

const revision = "e9448a0e84f3adb64c28b7a8db501dd8e0e59a84";
const source = `https://huggingface.co/muhdur/tilawi-fastconformer-quran/resolve/${revision}/`;
const assets = {
  "fastconformer_full_mixed.onnx": "4767182cd92975869f81a7e32700b14ca2b04e8dc97a15ff220a8697f4639488",
  "vocab.json": "c55877f3bff8bc3aaefc160e8c2fb88cb349088d092513d40210ccfe535e671b",
  "quran_ctc_tokens.json": "96aa32d188d075598536fcbb936dc793466fce2a8da331e48f15932022f4dce8",
  "quran.json": "6e6f31f642c701b49a1ba090311ca4c7a97c6a5b79a302712dff815a9d7b3d03"
} as const;
let pending: Promise<AsrSession> | null = null;
let release: (() => Promise<void>) | null = null;
const leases = new Set<symbol>();
let lastInference: Promise<unknown> = Promise.resolve();
let closing: Promise<void> | null = null;
/** Simulator diagnostics only; never reveals microphone content or model data. */
export function reciteAssistDiagnostics() {
  return __DEV__ ? { leases: leases.size, preparing: pending !== null, closing: closing !== null, native: release !== null } : null;
}
async function verified(file: File, expected: string) {
  if (!file.exists) return false;
  const integrity = requireOptionalNativeModule<{ sha256File: (uri: string) => Promise<string> }>("QuranAssetIntegrity");
  if (integrity) return (await integrity.sha256File(file.uri)) === expected;
  const hash = sha256.create(), handle = file.open(), size = file.size;
  let read = 0;
  try {
    while (read < size) {
      const bytes = handle.readBytes(Math.min(65536, size - read));
      if (!bytes.length) throw new Error("Recognition file ended unexpectedly. Please retry.");
      hash.update(bytes); read += bytes.length;
      // Yield during large-file validation; never freeze the native interface.
      if (read % (65536 * 16) === 0) await new Promise<void>((done) => setTimeout(done, 0));
    }
    return bytesToHex(hash.digest()) === expected;
  } finally { handle.close(); }
}
async function prepareReciteAssist(onProgress: (message: string) => void) {
  if (!pending) pending = (async () => {
    const dir = new Directory(Paths.document, "recite-assist", revision); dir.create({ intermediates: true, idempotent: true });
    const files = new Map<string, File>();
    for (const [name, hash] of Object.entries(assets)) {
      onProgress(`Verifying ${name.endsWith(".onnx") ? "recognition model" : "recognition data"}…`);
      const file = new File(dir, name);
      if (!await verified(file, hash)) {
        if (file.exists) file.delete();
        onProgress(`Downloading ${name.endsWith(".onnx") ? "recognition model" : "recognition data"}…`);
        await File.downloadFileAsync(`${source}${name}`, file, { idempotent: true });
        if (!await verified(file, hash)) { file.delete(); throw new Error("Recognition download could not be verified. Please retry."); }
      }
      files.set(name, file);
    }
    onProgress("Preparing on-device recognition…");
    // Lazy native import: the rest of HBIC never initializes an inference session.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ort: typeof import("onnxruntime-react-native") = require("onnxruntime-react-native");
    const native = await ort.InferenceSession.create(files.get("fastconformer_full_mixed.onnx")!.uri.replace(/^file:\/\//, ""),
      { graphOptimizationLevel: "all", intraOpNumThreads: 2, interOpNumThreads: 1 });
    release = () => native.release();
    return createAsrSession({ async run(audio) {
      const output = await native.run({ audio_signal: new ort.Tensor("float32", audio, [1, audio.length]),
        length: new ort.Tensor("int64", BigInt64Array.from([BigInt(audio.length)]), [1]) });
      const tensor = output[native.outputNames[0]];
      if (tensor.type !== "float32" || tensor.dims.length !== 3) throw new Error("Recognition model output is invalid.");
      return { logprobs: tensor.data as Float32Array, timeSteps: tensor.dims[1], vocabSize: tensor.dims[2] };
    } }, { vocab: JSON.parse(await files.get("vocab.json")!.text()), quranCtcTokens: JSON.parse(await files.get("quran_ctc_tokens.json")!.text()),
      quran: JSON.parse(await files.get("quran.json")!.text()) });
  })().catch((error) => { pending = null; throw error; });
  return pending;
}
async function recognizeRecitation(pcm: Float32Array) {
  if (!pending || pcm.length < 16_000 || !detectSpeech(pcm)) return { text: "", quality: 0 };
  if (pcm.length > 16_000 * 6) throw new Error("Recognition window is too long.");
  const speech = compactQuietPauses(pcm);
  try { const result = await (await pending).transcribeRaw(speech); return { text: result.text, quality: acousticQuality(result) }; }
  finally { speech.fill(0); }
}
export async function acquireReciteAssist(onProgress: (message: string) => void) {
  onProgress(closing ? "Finishing the previous recognition session…" : "Preparing recognition…");
  if (closing) await closing;
  const lease = Symbol("recitation"); leases.add(lease);
  try { await prepareReciteAssist(onProgress); }
  catch (error) { leases.delete(lease); throw error; }
  return {
    recognize(pcm: Float32Array) {
      const run = lastInference.catch(() => {}).then(() => leases.has(lease) ? recognizeRecitation(pcm) : { text: "", quality: 0 });
      lastInference = run; return run;
    },
    async dispose() {
      leases.delete(lease);
      if (leases.size || closing) return;
      closing = (async () => {
        await lastInference.catch(() => {});
        if (leases.size) return;
        const done = release; release = null; pending = null;
        if (done) await done();
      })().finally(() => { closing = null; });
      await closing;
    }
  };
}
