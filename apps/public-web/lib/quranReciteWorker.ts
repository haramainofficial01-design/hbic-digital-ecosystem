/// <reference lib="webworker" />
// Dedicated browser worker: no microphone, account or server-side inference.
import * as ort from "onnxruntime-web/wasm";
import { TextCTCDecoder, detectSpeech } from "@tilawi/quran-asr";
import { compactQuietPausesWithTimeline } from "../../mobile/src/quran/reciteAssistFeedback";
import { decodeRecitationEvidence } from "../../mobile/src/quran/recitationTracking";

const revision = "e9448a0e84f3adb64c28b7a8db501dd8e0e59a84";
const source = `https://huggingface.co/muhdur/tilawi-fastconformer-quran/resolve/${revision}/`;
const assets = {
  "fastconformer_full_mixed.onnx": "4767182cd92975869f81a7e32700b14ca2b04e8dc97a15ff220a8697f4639488",
  "vocab.json": "c55877f3bff8bc3aaefc160e8c2fb88cb349088d092513d40210ccfe535e671b"
};
const worker = self as unknown as DedicatedWorkerGlobalScope;
let session: ort.InferenceSession | null = null;
let vocab: Record<string, string> | null = null;
let decoder: TextCTCDecoder | null = null;
let running = false;
async function verifiedAsset(name: keyof typeof assets) {
  const url = source + name;
  let cache: Cache | null = null;
  try { cache = await caches.open(`hbic-recitation-${revision}`); } catch { /* Private browsing may disallow caching. */ }
  let response = await cache?.match(url);
  if (!response) {
    worker.postMessage({type: "progress", message: `Downloading ${name.endsWith(".onnx") ? "recognition model" : "recognition data"}…`});
    response = await fetch(url, {signal: AbortSignal.timeout(180_000), credentials: "omit", referrerPolicy: "no-referrer"});
    if (!response.ok) throw new Error("Recognition data could not download. Please retry.");
  }
  const bytes = await response.arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
  if (digest !== assets[name]) { await cache?.delete(url); throw new Error("Recognition download failed integrity verification."); }
  // Cache only immutable public model bytes, never speech or transcripts.
  await cache?.put(url, new Response(bytes, {headers: {"Content-Type": name.endsWith("json") ? "application/json" : "application/octet-stream"}})).catch(() => {});
  return bytes;
}
worker.onmessage = async ({data}: MessageEvent) => {
  if (data?.type === "prepare" && !session && !running) {
    running = true;
    try {
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = new URL("/quran-runtime/", data.origin).href;
      const model = await verifiedAsset("fastconformer_full_mixed.onnx");
      vocab = JSON.parse(new TextDecoder().decode(await verifiedAsset("vocab.json")));
      worker.postMessage({type: "progress", message: "Preparing on-device recognition…"});
      session = await ort.InferenceSession.create(model, {executionProviders: ["wasm"], graphOptimizationLevel: "all"});
      decoder = new TextCTCDecoder(vocab!, 1024);
      worker.postMessage({type: "ready"});
    } catch (error) { worker.postMessage({type: "error", message: error instanceof Error ? error.message : "Recognition is unavailable in this browser."}); }
    finally { running = false; }
  } else if (data?.type === "recognize" && session && decoder && vocab && !running) {
    running = true;
    const pcm = new Float32Array(data.pcm), startSample = data.startSample;
    let speech: ReturnType<typeof compactQuietPausesWithTimeline> | null = null;
    try {
      if (!Number.isSafeInteger(startSample) || startSample < 0 || pcm.length > 96000) throw new Error("Invalid recognition window.");
      let observation = {text: "", quality: 0, words: [] as ReturnType<typeof decodeRecitationEvidence>["words"], startSample, endSample: startSample + pcm.length};
      if (pcm.length >= 16000 && detectSpeech(pcm)) {
        speech = compactQuietPausesWithTimeline(pcm);
        const output = await session.run({audio_signal: new ort.Tensor("float32", speech.pcm, [1, speech.pcm.length]),
          length: new ort.Tensor("int64", BigInt64Array.from([BigInt(speech.pcm.length)]), [1])});
        const tensor = output[session.outputNames[0]];
        if (tensor.type !== "float32" || tensor.dims.length !== 3 || tensor.dims[0] !== 1) throw new Error("Invalid recognition output.");
        const acoustic = {logprobs: tensor.data as Float32Array, timeSteps: tensor.dims[1], vocabSize: tensor.dims[2], blankId: 1024};
        const result = {...decoder.decode(acoustic.logprobs, acoustic.timeSteps, acoustic.vocabSize), acoustic};
        const evidence = decodeRecitationEvidence(result, vocab, speech.pcm.length, speech.spans, startSample, pcm.length);
        observation = {...observation, text: evidence.evidenceValid === false ? "" : result.text, ...evidence};
      }
      worker.postMessage({type: "observation", observation, request: data.request});
    } catch (error) { worker.postMessage({type: "error", request: data.request, message: error instanceof Error ? error.message : "Recognition could not run."}); }
    finally { pcm.fill(0); speech?.pcm.fill(0); running = false; }
  }
};
