/** New local phoneme evidence, not a live lexical error detector or 99% result.
 * The reference converter and audio recognizer are separate processes: only PCM
 * enters recognition. No personal recordings, online inference or release writes. */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { phoneticComparison } from "./recitationPhoneticComparison";
import { withRecitationAcousticTail } from "./recitationAcousticTail";
import { phoneticPrefixBeam } from "./recitationPhoneticBeam";
import { comparePhoneticEventHypotheses, uniquePhoneticEventHypotheses, type PhoneticEventHypothesis } from "./recitationCtcHypotheses";
import { recitationLexeme, recitationDisplayWords } from "../src/quran/recitationTracking";

const mode = process.argv[2] ?? "cpu";
if (!["cpu", "mps"].includes(mode)) throw Error("Supported development phoneme runtime required");
const quietTailMs = Number(process.argv[3] ?? 0);
if (![0, 600].includes(quietTailMs)) throw Error("Explicit zero or 600 ms acoustic-tail experiment required");
const supplementaryProposals = process.argv[4] === "--events-rnnt-whisper-duration";
const durationNuisance = process.argv[4] === "--events-rnnt-duration" || supplementaryProposals;
const lexicalProposals = process.argv[4] === "--events-rnnt" || durationNuisance;
const eventHypotheses = process.argv[4] === "--events" || lexicalProposals;
if (process.argv[4] && !eventHypotheses) throw Error("Explicit comparison-side event experiment required");
const split = process.argv[5] ?? "calibration";
if (!["calibration", "heldout"].includes(split)) throw Error("Explicit development corpus split required");
const root = resolve("output/quran-development/muaalem-comparison"), python = resolve("output/quran-development/nvidia-evaluation-runtime/bin/python");
const output = resolve(root, `muaalem-phoneme-${split}-${Date.now()}-${randomUUID()}.json`);
const worker = resolve("apps/mobile/scripts/muaalem-recitation-worker.py"), referenceWorker = resolve("apps/mobile/scripts/recitation-phonetic-reference.py");
const manifest = JSON.parse(readFileSync(resolve(root, "assets/verified-manifest.json"), "utf8"));
const sha = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const codeSha256 = Object.fromEntries([worker, referenceWorker, "apps/mobile/scripts/evaluate-recitation-muaalem.mts", "apps/mobile/scripts/recitationPhoneticComparison.ts", "apps/mobile/scripts/recitationAcousticTail.ts", "apps/mobile/scripts/recitationPhoneticBeam.ts", "apps/mobile/scripts/recitationCtcHypotheses.ts"].map(file => [file.split("/").at(-1), sha(readFileSync(file))]));
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
let runtime: any, referenceProvenance: any, proposalProvenance: any, supplementaryProposalProvenance: any, complete = false;
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)] ?? null;
function save() {
  const negative = results.filter(row => row.expected === null), positive = results.filter(row => row.expected !== null);
  const matches = (row: any) => row.event?.predicted?.kind === row.category && row.event?.predicted?.index === row.expectedIndex;
  const trueEvents = positive.filter(matches).length, predictedEvents = results.filter(row => row.event?.predicted).length;
  writeFileSync(output, JSON.stringify({ model: manifest.repository, revision: manifest.revision, modelSha256: manifest.verifiedSha256["model.safetensors"], codeSha256,
    runtime, referenceProvenance, proposalProvenance, supplementaryProposalProvenance, complete, quietTailMs, eventHypotheses, durationNuisance, newInference: true, canonicalPrompt: false, forcedAlignment: false,
    scope: "raw whole-clip phonetic diagnostics", split, wordRecognitionQualified: false,
    acousticDecoders: ["greedy", "CTC prefix beam 16, no reference or language model"],
    limits: ["Actual greedy CTC phonemes, not simulated or reference-forced output.", "Approximate licensed waveform controls, not natural learner error gold.",
      "Reference-side phonetics represent one explicit Hafs configuration, not independently reviewed audible phones or all accepted durations.",
      "Raw phonetic differences are NOT proven lexical mistakes, Tajweed errors, correction precision/recall or WER.",
      "Any disclosed quiet tail is a fixed offline settling experiment, not extra speech, native microphone timing or an independent recitation.",
      "Optional competing reference/error likelihoods are a comparison experiment, NEVER an independently recognized or verified-correct transcript.",
      "Substitutions require optional independent RNNT lexical proposals; absent/out-of-lexicon proposals count as misses, not exclusions.",
      "RNNT proposal observations are saved actual-model replay, not fresh RNNT inference; phoneme inference in this run is fresh.",
      "Optional independently recognized Whisper proposals are saved whole-clip acoustic observations, not validated corrections or speech timings.",
      "Optional phone-run duration nuisance is for lexical event comparison ONLY; it cannot certify Tajweed, gemination or pronunciation.",
      "This historical heldout waveform-control split was inspected during earlier work: it is not a fresh natural qualification cohort.",
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
      competingEvents: eventHypotheses ? { trueEvents, predictedEvents, falseAlertNegatives: negative.filter(row => row.event?.predicted).length,
        wrongPositiveAlerts: positive.filter(row => row.event?.predicted && !matches(row)).length,
        controlledPrecision: complete && !failures.length && predictedEvents ? trueEvents / predictedEvents : null,
        controlledRecall: complete && !failures.length ? trueEvents / 18 : null,
        categories: Object.fromEntries(["omission", "repetition", "substitution"].map(kind => [kind, {
          total: 6, detected: positive.filter(row => row.category === kind && matches(row)).length }])),
        confidenceQualified: false } : null,
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
  const cases = all.filter(row => row.split === split);
  if (cases.length !== 48 || new Set(cases.map(row => row.index)).size !== 48) throw Error("Every case in the selected development split is required");
  let proposalRows = new Map<number, any>(), supplementaryRows = new Map<number, any>(), forms = new Map<string, string[]>();
  if (lexicalProposals) {
    const proposalPath = resolve(process.argv[6] ?? `output/quran-development/sherpa-comparison/nvidia-whole-rnnt-${split}.json`);
    if (resolve(proposalPath, "..") !== resolve("output/quran-development/sherpa-comparison")
      || !new RegExp(`^nvidia-whole-rnnt-${split}(?:-[0-9]+(?:-[a-f0-9-]{36})?)?\\.json$`).test(proposalPath.split("/").at(-1)!)) throw Error("Explicit ignored RNNT proposal evidence path required");
    const proposalBytes = readFileSync(proposalPath);
    const old = JSON.parse(proposalBytes.toString());
    if (old.mode !== "rnnt" || old.scope !== "whole" || old.split !== split || old.complete !== true || old.newInference !== true
      || old.canonicalPrompt !== false || old.failures.length || old.results.length !== 48
      || old.assets.official !== "d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31"
      || old.assets.encoder !== "a74e77489a9e48d689bac080a30c5e54b35e5f54171273771dba9c72752eade3") throw Error("Verified actual RNNT proposal observations required");
    proposalRows = new Map(old.results.map((row: any) => [row.index, row]));
    const canonicalBytes = readFileSync("apps/mobile/assets/quran/tanzil-uthmani.json"), canonical = JSON.parse(canonicalBytes.toString());
    for (const chapter of canonical.chapters) for (const verse of chapter.verses) for (const word of recitationDisplayWords(verse.textUthmani)) {
      const key = recitationLexeme(word), previous = forms.get(key) ?? [];
      if (!previous.includes(word)) forms.set(key, [...previous, word].sort().slice(0, 3));
    }
    proposalProvenance = { scope: "saved actual RNNT whole-clip observations", newInference: false, evidencePath: proposalPath, evidenceSha256: sha(proposalBytes),
      assets: old.assets, codeSha256: old.codeSha256, lexiconSha256: sha(canonicalBytes), lexicon: "unchanged licensed Tanzil reference-side forms",
      missingCoverageCountsAsMiss: true, maxFormsPerClip: 8 };
  }
  if (supplementaryProposals) {
    const evidencePath = resolve(process.argv[7] ?? "");
    if (resolve(evidencePath, "..") !== resolve("output/quran-development/whisper-turbo-comparison")
      || !new RegExp(`^whisper-turbo-whole-${split}-(?:cpu-f32|mps-f32)-[0-9]+-[a-f0-9-]{36}\\.json$`).test(evidencePath.split("/").at(-1)!))
      throw Error("Explicit isolated complete Whisper evidence path required");
    const bytes = readFileSync(evidencePath), old = JSON.parse(bytes.toString());
    if (old.model !== "openai/whisper-large-v3-turbo" || old.revision !== "41f01f3fe87f28c78e2fbf8b568835947dd65ed9"
      || old.modelSha256 !== "542566a422ae4f3fd23f1ba11add198fca01bbf82e66e6a2857b3f608b1eb9d1"
      || old.runtime?.dtype !== "torch.float32" || old.scope !== "offline whole-clip diagnostic" || old.split !== split
      || old.complete !== true || old.newInference !== true || old.canonicalPrompt !== false || old.forcedAlignment !== false
      || old.failures.length || old.results.length !== 48 || new Set(old.results.map((row: any) => row.index)).size !== 48)
      throw Error("Verified actual full-precision Whisper proposal observations required");
    supplementaryRows = new Map(old.results.map((row: any) => [row.index, row]));
    supplementaryProposalProvenance = { evidencePath, evidenceSha256: sha(bytes), model: old.model, revision: old.revision,
      modelSha256: old.modelSha256, runtime: old.runtime, codeSha256: old.codeSha256, newInference: false,
      scope: "saved independent actual Whisper transcript proposals only; no confidence/timestamps invented" };
  }
  const referenceRequests = cases.map(row => {
    const substitutions: string[] = [];
    if (lexicalProposals) {
      const old = proposalRows.get(row.index);
      if (!old || old.audioSha256 !== row.audioSha256 || typeof old.finalTranscript !== "string") throw Error("Proposal waveform identity mismatch");
      const original = new Set(recitationDisplayWords(row.text).map(recitationLexeme));
      const supplementary = supplementaryRows.get(row.index);
      if (supplementaryProposals && (!supplementary || supplementary.audioSha256 !== row.audioSha256 || typeof supplementary.transcript !== "string"))
        throw Error("Independent proposal waveform identity mismatch");
      const proposalTranscripts = [old.finalTranscript, ...(supplementaryProposals ? [supplementary.transcript] : [])];
      for (const word of proposalTranscripts.flatMap(transcript => recitationDisplayWords(transcript))) {
        const key = recitationLexeme(word);
        const possible = [...(forms.get(key) ?? [])];
        // Transparent exact clitic composition covers observed words outside
        // the finite Quran word list. No stemming/fuzzy match replaces heard
        // speech; every proposal must preserve the full independently heard lexeme.
        if (!possible.length) for (const [prefix, vocalized] of [["ك", "كَ"], ["ب", "بِ"], ["ل", "لِ"], ["و", "وَ"], ["ف", "فَ"]]) {
          if (key.startsWith(prefix) && key.length > 3) for (const form of forms.get(key.slice(1)) ?? []) {
            const compound = vocalized + form;
            if (recitationLexeme(compound) === key) possible.push(compound);
          }
        }
        if (!original.has(key)) for (const form of possible) if (!substitutions.includes(form) && substitutions.length < 8) substitutions.push(form);
      }
    }
    return { index: row.index, text: row.text, substitutions };
  });
  const converted = spawnSync(python, [referenceWorker, ...(eventHypotheses ? ["--events"] : [])], { input: JSON.stringify(referenceRequests), encoding: "utf8", timeout: 30_000, maxBuffer: 1_000_000 });
  if (converted.status !== 0) throw Error(`Comparison-side reference conversion failed: ${converted.stderr.slice(-1500)}`);
  const references = JSON.parse(converted.stdout);
  if (references.referenceOnly !== true || references.version !== "0.6.4" || references.results.length !== 48) throw Error("Invalid reference comparison provenance");
  referenceProvenance = { version: references.version, attributes: references.attributes, referenceOnly: true,
    eventWrittenMarkNormalization: references.eventWrittenMarkNormalization };
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
      let event: ReturnType<typeof comparePhoneticEventHypotheses> | undefined, duplicateReferencePathsIgnored = 0;
      if (eventHypotheses) {
        const tokenIds = new Map<string, number>(Object.entries(runtime.vocab).map(([id, phone]) => [String(phone), Number(id)]));
        const hypotheses: PhoneticEventHypothesis[] = reference.hypotheses.map((h: any) => ({ kind: h.kind, index: h.index,
          ids: [...h.phonemes].map(phone => { const id = tokenIds.get(String(phone)); if (id === undefined || id === 0) throw Error("Hypothesis contains a non-model phoneme"); return id; }) }));
        const unique = uniquePhoneticEventHypotheses(hypotheses);
        duplicateReferencePathsIgnored = unique.duplicatePathsIgnored;
        event = comparePhoneticEventHypotheses(acoustic, 43, 0, unique.hypotheses, true, durationNuisance);
      }
      results.push({ index: row.index, category: row.category, expected: row.expected, expectedIndex: row.expectedIndex, audioSha256: row.audioSha256,
        inferenceAudioSha256: sha(pcm), originalSamples: row.originalSamples, inferenceSamples: pcm.byteLength / 4,
        reference: row.text, referenceWordPhones: reference.wordPhones, independentLexicalProposals: referenceRequests.find(r => r.index === row.index)?.substitutions,
        phonemes: decoded, timeSteps: recognized.timeSteps,
        acousticSha256: sha(acousticBytes), comparison, elapsedMs, event, duplicateReferencePathsIgnored,
        beam: { phonemes: beamPhones, retainedPathLogScore: beamResult.retainedPathLogScore, elapsedMs: beamElapsedMs,
          comparison: phoneticComparison(reference.wordPhones, beamPhones), confidenceQualified: false } });
      console.log(JSON.stringify({ completed: results.length, category: row.category, rawPhoneEdits: comparison.edits,
        beamPhoneEdits: results.at(-1).beam.comparison.edits, predictedEvent: event?.predicted }));
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
