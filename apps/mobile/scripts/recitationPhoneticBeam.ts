/** Reference-free CTC prefix search for OFFLINE acoustic comparison only.
 * Summed retained CTC paths are not calibrated correctness probabilities.
 * No ayah, word list, pronunciation reference or language model is accepted. */
export function phoneticPrefixBeam(logprobs: Float32Array, vocabSize: number, blankId: number, width = 16) {
  if (!(logprobs instanceof Float32Array) || !Number.isInteger(vocabSize) || vocabSize < 2 || vocabSize > 64
    || !Number.isInteger(blankId) || blankId < 0 || blankId >= vocabSize || !Number.isInteger(width) || width < 1 || width > 32
    || !logprobs.length || logprobs.length % vocabSize || logprobs.length / vocabSize > 650) throw Error("Bounded acoustic CTC evidence required");
  const add = (a: number, b: number) => {
    if (a === -Infinity) return b;
    if (b === -Infinity) return a;
    const high = Math.max(a, b);
    return high + Math.log1p(Math.exp(Math.min(a, b) - high));
  };
  type Path = { prefix: string; blank: number; nonblank: number };
  let beam: Path[] = [{ prefix: "", blank: 0, nonblank: -Infinity }];
  for (let t = 0; t < logprobs.length / vocabSize; t++) {
    let normalization = -Infinity;
    for (let v = 0; v < vocabSize; v++) {
      const score = logprobs[t * vocabSize + v];
      if (Number.isNaN(score) || score === Infinity || score > .0001) throw Error("Invalid acoustic CTC probabilities");
      normalization = add(normalization, score);
    }
    if (Math.abs(normalization) > .002) throw Error("Normalized acoustic CTC probabilities required");
    const next = new Map<string, Path>();
    const get = (prefix: string) => {
      let path = next.get(prefix);
      if (!path) { path = { prefix, blank: -Infinity, nonblank: -Infinity }; next.set(prefix, path); }
      return path;
    };
    for (const path of beam) {
      const total = add(path.blank, path.nonblank), unchanged = get(path.prefix);
      unchanged.blank = add(unchanged.blank, total + logprobs[t * vocabSize + blankId]);
      const lastId = path.prefix.length ? path.prefix.charCodeAt(path.prefix.length - 1) : -1;
      for (let v = 0; v < vocabSize; v++) {
        if (v === blankId) continue;
        const score = logprobs[t * vocabSize + v];
        // Adjacent equal emissions stay one token. An intervening blank permits
        // a genuine second copy; repeated phonemes must not vanish silently.
        if (v === lastId) unchanged.nonblank = add(unchanged.nonblank, path.nonblank + score);
        const extension = get(path.prefix + String.fromCharCode(v));
        extension.nonblank = add(extension.nonblank, (v === lastId ? path.blank : total) + score);
      }
    }
    beam = [...next.values()].sort((a, b) => add(b.blank, b.nonblank) - add(a.blank, a.nonblank)
      || a.prefix.localeCompare(b.prefix)).slice(0, width);
  }
  const best = beam[0];
  return { ids: Array.from(best.prefix, token => token.charCodeAt(0)), retainedPathLogScore: add(best.blank, best.nonblank),
    width, referenceConditioned: false as const };
}
