/** Offline competing acoustic hypotheses, NEVER a reference-forced transcript.
 * Canonical and error hypotheses use identical actual CTC emissions. Margins
 * are uncalibrated model scores, not probabilities that a learner is wrong. */
export interface PhoneticEventHypothesis {
  kind: "unchanged" | "omission" | "repetition" | "substitution";
  index: number | null;
  ids: number[];
}
/** Reference spelling variants can yield the identical acoustic path. Count
 * that path once, never add duplicate likelihood mass. Preserve different
 * events/locations even when their phones coincide: ambiguity must remain. */
export function uniquePhoneticEventHypotheses(hypotheses: PhoneticEventHypothesis[]) {
  if (!Array.isArray(hypotheses) || !hypotheses.length || hypotheses.length > 257
    || hypotheses.some(h => !h || !Array.isArray(h.ids) || h.ids.length > 1000
      || h.ids.some(id => !Number.isSafeInteger(id) || id < 0))) throw Error("Bounded explicit reference paths required");
  const paths = new Map<string, PhoneticEventHypothesis>();
  for (const h of hypotheses) {
    const key = `${h.kind}:${h.index}:${h.ids.join(",")}`;
    if (!paths.has(key)) paths.set(key, { ...h, ids: [...h.ids] });
  }
  return { hypotheses: [...paths.values()], duplicatePathsIgnored: hypotheses.length - paths.size };
}
function logAdd(a: number, b: number) {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const max = Math.max(a, b);
  return max + Math.log1p(Math.exp(Math.min(a, b) - max));
}
function validateAcoustics(logprobs: Float32Array, vocabSize: number, blank: number) {
  if (!(logprobs instanceof Float32Array) || !Number.isInteger(vocabSize) || vocabSize < 2 || vocabSize > 64
    || !Number.isInteger(blank) || blank < 0 || blank >= vocabSize || !logprobs.length
    || logprobs.length % vocabSize || logprobs.length / vocabSize > 650) throw Error("Bounded phonetic CTC emissions required");
  for (let t = 0; t < logprobs.length / vocabSize; t++) {
    let sum = -Infinity;
    for (let v = 0; v < vocabSize; v++) {
      const score = logprobs[t * vocabSize + v];
      if (Number.isNaN(score) || score > .0001) throw Error("Invalid actual CTC log probability");
      sum = logAdd(sum, score);
    }
    if (Math.abs(sum) > .002) throw Error("Normalized actual CTC log probabilities required");
  }
}
function forward(logprobs: Float32Array, vocabSize: number, blank: number, ids: number[]) {
  if (!Array.isArray(ids) || ids.length > 1000 || ids.some(id => !Number.isInteger(id) || id < 0 || id >= vocabSize || id === blank))
    throw Error("Explicit nonblank phonetic hypothesis required");
  const frames = logprobs.length / vocabSize;
  if (ids.length + ids.filter((id, i) => i > 0 && id === ids[i - 1]).length > frames) return -Infinity;
  const symbols = [blank, ...ids.flatMap(id => [id, blank])];
  let previous = new Float64Array(symbols.length).fill(-Infinity); previous[0] = 0;
  for (let t = 0; t < frames; t++) {
    const next = new Float64Array(symbols.length).fill(-Infinity);
    for (let s = 0; s < symbols.length; s++) {
      let score = previous[s];
      if (s) score = logAdd(score, previous[s - 1]);
      if (s > 1 && symbols[s] !== blank && symbols[s] !== symbols[s - 2]) score = logAdd(score, previous[s - 2]);
      next[s] = score + logprobs[t * vocabSize + symbols[s]];
    }
    previous = next;
  }
  return symbols.length === 1 ? previous[0] : logAdd(previous.at(-1)!, previous.at(-2)!);
}
export function phoneticCtcLogLikelihood(logprobs: Float32Array, vocabSize: number, blank: number, ids: number[]) {
  validateAcoustics(logprobs, vocabSize, blank);
  return forward(logprobs, vocabSize, blank, ids);
}
/** Separate lexical-event experiment: duration is a nuisance, NOT correctness.
 * Sum paths whose nonblank phone RUNS match. Repeated length/gemination symbols
 * remain visible in the raw report but cannot alone become a wrong WORD.
 * Distinct vowels/consonants and repeated multi-phone words are not folded. */
export function phoneticRunLogLikelihood(logprobs: Float32Array, vocabSize: number, blank: number, ids: number[]) {
  validateAcoustics(logprobs, vocabSize, blank);
  if (!Array.isArray(ids) || ids.length > 1000 || ids.some(id => !Number.isInteger(id) || id < 0 || id >= vocabSize || id === blank))
    throw Error("Explicit nonblank phonetic hypothesis required");
  const runs = ids.filter((id, i) => !i || id !== ids[i - 1]);
  let previous = new Float64Array(runs.length + 1).fill(-Infinity); previous[0] = 0;
  for (let t = 0; t < logprobs.length / vocabSize; t++) {
    const next = new Float64Array(runs.length + 1).fill(-Infinity);
    next[0] = previous[0] + logprobs[t * vocabSize + blank];
    for (let s = 1; s <= runs.length; s++) next[s] = logAdd(previous[s] + logprobs[t * vocabSize + blank],
      logAdd(previous[s], previous[s - 1]) + logprobs[t * vocabSize + runs[s - 1]]);
    previous = next;
  }
  return previous[runs.length];
}
/** Prespecified diagnostic margins. No gold category/index enters selection.
 * A winning unchanged path is NOT returned as proof of correct recitation.
 * Missing lexical proposal coverage must count as a miss, never be discarded. */
export function comparePhoneticEventHypotheses(logprobs: Float32Array, vocabSize: number, blank: number,
  hypotheses: PhoneticEventHypothesis[], completeUtterance: boolean, durationNuisance = false) {
  validateAcoustics(logprobs, vocabSize, blank);
  if (!Array.isArray(hypotheses) || hypotheses.length < 3 || hypotheses.length > 257
    || hypotheses.filter(h => h.kind === "unchanged" && h.index === null).length !== 1
    || hypotheses.some(h => !h || !["unchanged", "omission", "repetition", "substitution"].includes(h.kind)
      || h.kind !== "unchanged" && (!Number.isSafeInteger(h.index) || h.index! < 1 || h.index! > 31)
      || h.kind === "unchanged" && h.index !== null)) throw Error("Bounded canonical and counterfactual hypotheses required");
  const keys = hypotheses.map(h => `${h.kind}:${h.index}:${h.ids.join(",")}`);
  if (new Set(keys).size !== keys.length) throw Error("Duplicate event hypothesis cannot inflate acoustic support");
  const scores = hypotheses.map(h => ({ kind: h.kind, index: h.index, logLikelihood: durationNuisance
    ? phoneticRunLogLikelihood(logprobs, vocabSize, blank, h.ids) : forward(logprobs, vocabSize, blank, h.ids) }));
  // Multiple vocalized variants of the SAME lexical event are not competing
  // locations. Keep their best path but require a distinct event to lose the
  // location margin. This is nuisance-variant maximization, not calibrated odds.
  const events = new Map<string, typeof scores[number]>();
  for (const score of scores) {
    const key = `${score.kind}:${score.index}`, old = events.get(key);
    if (!old || score.logLikelihood > old.logLikelihood) events.set(key, score);
  }
  const ranked = [...events.values()].sort((a, b) => b.logLikelihood - a.logLikelihood);
  const correct = scores.find(h => h.kind === "unchanged")!, best = ranked[0];
  const baselineMargin = best.logLikelihood - correct.logLikelihood;
  const locationMargin = best.logLikelihood - ranked[1].logLikelihood;
  const predicted = completeUtterance === true && best.kind !== "unchanged" && Number.isFinite(correct.logLikelihood)
    && Number.isFinite(baselineMargin) && baselineMargin >= Math.log(100) && locationMargin >= Math.log(10)
    ? { kind: best.kind, index: best.index } : null;
  return { predicted, scores, baselineMargin: Number.isFinite(baselineMargin) ? baselineMargin : null,
    locationMargin: Number.isFinite(locationMargin) ? locationMargin : null,
    durationNuisance, confidenceQualified: false as const, recognitionTranscriptProduced: false as const };
}
