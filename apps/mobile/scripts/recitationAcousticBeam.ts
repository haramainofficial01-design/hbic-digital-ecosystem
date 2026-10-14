/** Development-only, reference-free wordpiece CTC search. No Quran, expected
 * verse, word list or language model enters decoding. Retained path scores and
 * token posteriors are NOT calibrated probabilities of recitation correctness.
 * This experiment is deliberately not imported by the app or website. */
import type { AudioSpan, RecitationWord } from "../src/quran/recitationTracking";
import { recitationLexeme } from "../src/quran/recitationTracking";

function add(a: number, b: number) {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const high = Math.max(a, b);
  return high + Math.log1p(Math.exp(Math.min(a, b) - high));
}
function validate(logprobs: Float32Array, vocabSize: number, blankId: number, researchLongForm = false) {
  if (!(logprobs instanceof Float32Array) || !Number.isInteger(vocabSize) || vocabSize < 2 || vocabSize > 2048
    || !Number.isInteger(blankId) || blankId < 0 || blankId >= vocabSize || !logprobs.length
    || logprobs.length % vocabSize || logprobs.length / vocabSize > (researchLongForm ? 2280 : 650)) throw Error("Bounded wordpiece CTC emissions required");
  for (let t = 0; t < logprobs.length / vocabSize; t++) {
    let normalization = -Infinity;
    for (let id = 0; id < vocabSize; id++) {
      const value = logprobs[t * vocabSize + id];
      if (Number.isNaN(value) || value === Infinity || value > .0001) throw Error("Invalid actual CTC probability");
      normalization = add(normalization, value);
    }
    if (Math.abs(normalization) > .002) throw Error("Normalized actual CTC emissions required");
  }
}
/** Ranked retained hypotheses for offline coverage diagnostics. These are
 * pruned acoustic path sums, NOT probabilities or a gold-directed selector. */
export function acousticWordpieceCandidates(logprobs: Float32Array, vocabSize: number, blankId: number, width = 8, tokensPerFrame = 12,
  scope: "controls" | "research-benchmark" = "controls") {
  if (scope !== "controls" && scope !== "research-benchmark") throw Error("Explicit bounded acoustic scope required");
  validate(logprobs, vocabSize, blankId, scope === "research-benchmark");
  if (!Number.isInteger(width) || width < 1 || width > 32 || !Number.isInteger(tokensPerFrame)
    || tokensPerFrame < 1 || tokensPerFrame > 32) throw Error("Bounded acoustic search required");
  type Path = { key: string; blank: number; nonblank: number };
  let beam: Path[] = [{ key: "", blank: 0, nonblank: -Infinity }], prefixesPruned = false, tokensPruned = false;
  for (let t = 0; t < logprobs.length / vocabSize; t++) {
    const offset = t * vocabSize, selected: number[] = [];
    // Bounded top-k, not a full 1,025-token sort per frame. Blank and every
    // surviving prefix's last token are retained independently of top-k.
    for (let id = 0; id < vocabSize; id++) {
      if (id === blankId || logprobs[offset + id] === -Infinity) continue;
      let at = 0;
      while (at < selected.length && logprobs[offset + selected[at]] >= logprobs[offset + id]) at++;
      if (at < tokensPerFrame) { selected.splice(at, 0, id); if (selected.length > tokensPerFrame) selected.pop(); }
    }
    tokensPruned ||= selected.length < vocabSize - 1;
    const next = new Map<string, Path>();
    const get = (key: string) => {
      let path = next.get(key);
      if (!path) { path = { key, blank: -Infinity, nonblank: -Infinity }; next.set(key, path); }
      return path;
    };
    for (const path of beam) {
      const total = add(path.blank, path.nonblank), unchanged = get(path.key);
      unchanged.blank = add(unchanged.blank, total + logprobs[offset + blankId]);
      const last = path.key.length ? path.key.charCodeAt(path.key.length - 1) : -1;
      const candidates = last >= 0 && !selected.includes(last) ? [...selected, last] : selected;
      for (const id of candidates) {
        const value = logprobs[offset + id];
        if (id === last) unchanged.nonblank = add(unchanged.nonblank, path.nonblank + value);
        const source = id === last ? path.blank : total;
        if (source === -Infinity || value === -Infinity) continue;
        const extension = get(path.key + String.fromCharCode(id));
        extension.nonblank = add(extension.nonblank, source + value);
      }
    }
    const ranked = [...next.values()].filter(path => add(path.blank, path.nonblank) !== -Infinity)
      .sort((a, b) => add(b.blank, b.nonblank) - add(a.blank, a.nonblank) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    prefixesPruned ||= ranked.length > width;
    beam = ranked.slice(0, width);
    if (!beam.length) throw Error("Acoustic search has no finite path");
  }
  const candidates = beam.map(path => ({ ids: Array.from(path.key, id => id.charCodeAt(0)),
    retainedPathLogScore: add(path.blank, path.nonblank) }));
  return { candidates,
    runnerUpMargin: candidates.length > 1 ? candidates[0].retainedPathLogScore - candidates[1].retainedPathLogScore : null,
    width, tokensPerFrame, prefixesPruned, tokensPruned, referenceConditioned: false as const, confidenceQualified: false as const };
}

/** Keep the existing best-only API and decoding choices unchanged. */
export function acousticWordpieceBeam(logprobs: Float32Array, vocabSize: number, blankId: number, width = 8, tokensPerFrame = 12,
  scope: "controls" | "research-benchmark" = "controls") {
  const { candidates, ...search } = acousticWordpieceCandidates(logprobs, vocabSize, blankId, width, tokensPerFrame, scope);
  return { ...candidates[0], ...search };
}

/** Maximum acoustic path for the INDEPENDENTLY DECODED token hypothesis only.
 * This is approximate CTC emission timing, NOT human speech boundaries or a
 * forced alignment of an expected ayah. All posteriors remain the originals. */
export function acousticTokenPath(logprobs: Float32Array, vocabSize: number, blankId: number, ids: number[]) {
  validate(logprobs, vocabSize, blankId);
  const frames = logprobs.length / vocabSize;
  if (!Array.isArray(ids) || ids.length > frames || ids.some(id => !Number.isInteger(id) || id < 0 || id >= vocabSize || id === blankId))
    throw Error("Bounded independently decoded nonblank tokens required");
  const symbols = [blankId, ...ids.flatMap(id => [id, blankId])], states = symbols.length;
  let previous = new Float64Array(states).fill(-Infinity); previous[0] = 0;
  const back = new Int16Array(frames * states).fill(-1);
  for (let t = 0; t < frames; t++) {
    const next = new Float64Array(states).fill(-Infinity);
    for (let s = 0; s < states; s++) {
      let source = s, value = previous[s];
      if (s && previous[s - 1] > value) { source = s - 1; value = previous[source]; }
      if (s > 1 && symbols[s] !== blankId && symbols[s] !== symbols[s - 2] && previous[s - 2] > value) { source = s - 2; value = previous[source]; }
      next[s] = value + logprobs[t * vocabSize + symbols[s]];
      if (next[s] !== -Infinity) back[t * states + s] = source;
    }
    previous = next;
  }
  let state = states > 1 && previous[states - 2] > previous[states - 1] ? states - 2 : states - 1;
  const logScore = previous[state];
  if (!Number.isFinite(logScore)) return null;
  const frameIds = new Int16Array(frames);
  for (let t = frames - 1; t >= 0; t--) {
    frameIds[t] = symbols[state]; state = back[t * states + state];
    if (state < 0) throw Error("Actual acoustic token path is incomplete");
  }
  const collapsed = [...frameIds].filter((id, i) => id !== blankId && (!i || id !== frameIds[i - 1]));
  if (collapsed.length !== ids.length || collapsed.some((id, i) => id !== ids[i])) throw Error("Actual token path disagrees with its decoded hypothesis");
  return { frameIds, logScore, confidenceQualified: false as const, expectedReferenceAligned: false as const };
}

/** Observe decoded words on their own CTC path. No expected text is accepted.
 * An uncertain beam path stays uncertain under the unchanged live tracker. */
export function acousticBeamEvidence(logprobs: Float32Array, vocabSize: number, blankId: number, ids: number[],
  vocab: Record<string, string>, compactSamples: number, spans: AudioSpan[], startSample = 0, originalSamples = compactSamples) {
  if (!Number.isSafeInteger(compactSamples) || compactSamples < 1 || !Number.isSafeInteger(originalSamples) || originalSamples < compactSamples
    || !Number.isSafeInteger(startSample) || startSample < 0 || !Array.isArray(spans) || !spans.length
    || spans.some((span, i) => !Number.isSafeInteger(span.compactStart) || !Number.isSafeInteger(span.originalStart) || !Number.isSafeInteger(span.length)
      || span.length < 1 || span.originalStart < 0 || span.originalStart + span.length > originalSamples
      || span.compactStart !== (i ? spans[i - 1].compactStart + spans[i - 1].length : 0)
      || i > 0 && span.originalStart < spans[i - 1].originalStart + spans[i - 1].length)
    || spans.at(-1)!.compactStart + spans.at(-1)!.length !== compactSamples) throw Error("Bounded original capture timeline required");
  const aligned = acousticTokenPath(logprobs, vocabSize, blankId, ids);
  if (!aligned) return { words: [] as RecitationWord[], quality: 0, approximateAcousticTimings: true as const };
  if (ids.some(id => typeof vocab[String(id)] !== "string" || !vocab[String(id)] || vocab[String(id)].startsWith("<")))
    return { words: [] as RecitationWord[], quality: 0, approximateAcousticTimings: true as const };
  const original = (value: number, side: "start" | "end") => {
    const sample = Math.max(0, Math.min(compactSamples, value));
    const span = spans.find(span => side === "start" ? sample >= span.compactStart && sample < span.compactStart + span.length
      : sample > span.compactStart && sample <= span.compactStart + span.length) ?? (sample === 0 ? spans[0] : spans.at(-1)!);
    return startSample + span.originalStart + Math.min(span.length, Math.max(0, sample - span.compactStart));
  };
  const frames = aligned.frameIds.length, words: RecitationWord[] = [];
  let previous = -1, current: RecitationWord | null = null, explicitBoundary = startSample === 0, voiced = 0, quality = 0;
  for (let t = 0; t < frames; t++) {
    const id = aligned.frameIds[t], confidence = Math.exp(logprobs[t * vocabSize + id]);
    if (id !== blankId) { voiced++; quality += confidence; }
    if (id !== blankId && id !== previous) {
      const piece = vocab[String(id)];
      if (piece.startsWith("▁")) {
        if (current && recitationLexeme(current.text)) words.push(current);
        current = null; explicitBoundary = true;
      }
      const text = piece.replaceAll("▁", "");
      if (text) {
        const a = original(t * compactSamples / frames, "start"), b = original((t + 1) * compactSamples / frames, "end");
        if (!current) current = { text: "", startSample: a, endSample: b, confidence, edge: !explicitBoundary };
        current.text += text; current.endSample = b; current.confidence = Math.min(current.confidence, confidence); explicitBoundary = false;
      }
    } else if (id !== blankId && current) current.endSample = original((t + 1) * compactSamples / frames, "end");
    previous = id;
  }
  if (current && recitationLexeme(current.text)) words.push(current);
  return { quality: voiced ? quality / voiced : 0, words: words.map(word => ({ ...word, text: recitationLexeme(word.text),
    edge: word.edge || (startSample > 0 && word.startSample - startSample < 1600) || startSample + originalSamples - word.endSample < 1600 })),
    approximateAcousticTimings: true as const };
}
