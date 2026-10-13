/** Quran-Lab No-Profit License 1.2; see LICENSE.
 * Compare acoustic support for phonetic strings across ALL inventory-unit
 * segmentations. This produces no recognized transcript or correctness claim. */
const add = (a: number, b: number) => a === -Infinity ? b : b === -Infinity ? a : Math.max(a, b) + Math.log1p(Math.exp(-Math.abs(a - b)));
export function phoneticStringLikelihood(logprobs: Float32Array, units: string[], blank: number, target: string, phoneRunNuisance = false) {
  if (!(logprobs instanceof Float32Array) || !Array.isArray(units) || units.length < 2 || units.length > 256
    || !Number.isInteger(blank) || blank < 0 || blank >= units.length || logprobs.length % units.length
    || !logprobs.length || logprobs.length / units.length > 650 || typeof target !== "string" || target.length > 1000
    || units.some((unit, id) => typeof unit !== "string" || id !== blank && (!unit || unit.length > 30))) throw Error("Bounded phonetic string evidence required");
  if (new Set(units.filter((_, id) => id !== blank)).size !== units.length - 1) throw Error("Unique authoritative inventory units required");
  if (phoneRunNuisance) {
    // Lexical comparison ONLY: this deliberately cannot grade gemination,
    // elongation or pronunciation. Multi-phone repeated words stay distinct.
    const collapse = (text: string) => [...text].filter((c,i,chars)=>!i||c!==chars[i-1]).join("");
    units = units.map((unit,id)=>id===blank?unit:collapse(unit)); target = collapse(target);
  }
  const width = units.length, length = target.length;
  const ends = Array.from({length: length + 1}, () => [] as {id: number; start: number}[]);
  for (let start = 0; start < length; start++) for (let id = 0; id < width; id++) {
    if (id !== blank && target.startsWith(units[id], start)) ends[start + units[id].length].push({id, start});
  }
  let previousBlank = new Float64Array(length + 1).fill(-Infinity), previous = new Float64Array((length + 1) * width).fill(-Infinity);
  previousBlank[0] = 0;
  for (let frame = 0; frame < logprobs.length / width; frame++) {
    const offset = frame * width;
    let total = -Infinity;
    for (let id = 0; id < width; id++) {
      const p = logprobs[offset + id]; if (Number.isNaN(p) || p > .0001) throw Error("Invalid actual log probability"); total = add(total, p);
    }
    if (Math.abs(total) > .002) throw Error("Normalized actual acoustic probabilities required");
    const nextBlank = new Float64Array(length + 1).fill(-Infinity), next = new Float64Array(previous.length).fill(-Infinity);
    for (let end = 0; end <= length; end++) {
      let mass = previousBlank[end];
      for (const {id} of ends[end]) mass = add(mass, previous[end * width + id]);
      nextBlank[end] = mass + logprobs[offset + blank];
      for (const {id, start} of ends[end]) {
        let advance = previousBlank[start];
        for (const old of ends[start]) if (old.id !== id) advance = add(advance, previous[start * width + old.id]);
        let repeated = previous[end * width + id];
        if (phoneRunNuisance && units[id].length === 1 && target[end-1] === units[id]) {
          repeated = add(repeated, previousBlank[end]);
          for (const old of ends[end]) if (old.id !== id) repeated = add(repeated, previous[end * width + old.id]);
        }
        next[end * width + id] = add(repeated, advance) + logprobs[offset + id];
      }
    }
    previousBlank.fill(0); previous.fill(0); previousBlank = nextBlank; previous = next;
  }
  let likelihood = previousBlank[length];
  for (const {id} of ends[length]) likelihood = add(likelihood, previous[length * width + id]);
  previousBlank.fill(0); previous.fill(0);
  return likelihood;
}

export function compareStringHypotheses(logprobs: Float32Array, units: string[], blank: number,
  hypotheses: {kind: "unchanged" | "omission" | "repetition" | "substitution"; index: number | null; phones: string}[], phoneRunNuisance = false) {
  if (!Array.isArray(hypotheses) || hypotheses.length < 2 || hypotheses.length > 257 || hypotheses.filter(h => h.kind === "unchanged").length !== 1)
    throw Error("Explicit unchanged and competing event hypotheses required");
  if (hypotheses.some(h => !h || !["unchanged", "omission", "repetition", "substitution"].includes(h.kind)
    || typeof h.phones !== "string" || !h.phones.length || (h.kind === "unchanged" ? h.index !== null
      : typeof h.index !== "number" || !Number.isSafeInteger(h.index) || h.index < 0 || h.index >= 200)))
    throw Error("Valid word event coordinates required");
  if (new Set(hypotheses.map(h => `${h.kind}:${h.index}:${h.phones}`)).size !== hypotheses.length)
    throw Error("Duplicate event hypotheses cannot add acoustic mass");
  const scores = hypotheses.map(h => ({kind: h.kind, index: h.index, logLikelihood: phoneticStringLikelihood(logprobs, units, blank, h.phones, phoneRunNuisance)}));
  // Alternative vocalizations/proposed words at the SAME operation/location
  // are not competing locations. Never sum duplicate hypothesis mass.
  const events = new Map<string, typeof scores[number]>();
  for (const score of scores) {
    const key = `${score.kind}:${score.index}`, old = events.get(key);
    if (!old || score.logLikelihood > old.logLikelihood) events.set(key, score);
  }
  const ranked = [...events.values()].sort((a, b) => b.logLikelihood - a.logLikelihood), correct = scores.find(h => h.kind === "unchanged")!, best = ranked[0];
  const baselineMargin = best.logLikelihood - correct.logLikelihood, locationMargin = best.logLikelihood - ranked[1].logLikelihood;
  const predicted = best.kind !== "unchanged" && Number.isFinite(baselineMargin) && Number.isFinite(locationMargin)
    && baselineMargin >= Math.log(100) && locationMargin >= Math.log(10) ? {kind: best.kind, index: best.index} : null;
  return {predicted, scores, baselineMargin: Number.isFinite(baselineMargin) ? baselineMargin : null,
    locationMargin: Number.isFinite(locationMargin) ? locationMargin : null, phoneRunNuisance, confidenceQualified: false, recognitionTranscriptProduced: false};
}
