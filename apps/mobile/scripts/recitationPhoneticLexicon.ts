/** Offline candidate retrieval from ACTUALLY decoded phones, never an ASR
 * prompt or a correctness decision. Canonical word coordinates are a later
 * comparison only; every candidate must resemble an observed phone fragment.
 * Duration runs are collapsed for lexical retrieval, not Tajweed assessment. */
import { recitationLexeme } from "../src/quran/recitationTracking";
export interface PhoneticLexiconEntry { word: string; phones: string }
const runs = (text: string) => [...text].filter((phone, i, all) => !i || phone !== all[i - 1]);
function distance(a: string[], b: string[]) {
  let previous = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {const next = [i]; for (let j = 1; j <= b.length; j++)
    next[j] = Math.min(previous[j] + 1, next[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = next;}
  return previous[b.length];
}
export function phoneticLexiconProposals(wordPhones: string[], referenceWords: string[], independentlyHeardPhones: string, lexicon: PhoneticLexiconEntry[]) {
  if (!Array.isArray(wordPhones) || wordPhones.length < 3 || wordPhones.length > 32 || wordPhones.length !== referenceWords.length
    || wordPhones.some(phone => typeof phone !== "string" || !phone.length || phone.length > 100)
    || referenceWords.some(word => typeof word !== "string" || !recitationLexeme(word))
    || typeof independentlyHeardPhones !== "string" || independentlyHeardPhones.length > 1000
    || !Array.isArray(lexicon) || !lexicon.length || lexicon.length > 100_000
    || lexicon.some(entry => !entry || typeof entry.word !== "string" || !recitationLexeme(entry.word)
      || entry.word.length > 100 || typeof entry.phones !== "string" || !entry.phones.length || entry.phones.length > 100))
    throw Error("Bounded explicit phonetic candidate retrieval required");
  const reference = wordPhones.flatMap(word => runs(word)), locations = wordPhones.flatMap((word, index) => runs(word).map(() => index));
  const heard = runs(independentlyHeardPhones), width = heard.length + 1;
  const costs = new Uint16Array((reference.length + 1) * width);
  for (let i = 0; i <= reference.length; i++) costs[i * width] = i;
  for (let j = 0; j <= heard.length; j++) costs[j] = j;
  for (let i = 1; i <= reference.length; i++) for (let j = 1; j <= heard.length; j++) costs[i * width + j] = Math.min(
    costs[(i - 1) * width + j] + 1, costs[i * width + j - 1] + 1, costs[(i - 1) * width + j - 1] + (reference[i - 1] === heard[j - 1] ? 0 : 1));
  const observed = wordPhones.map(() => [] as number[]), changed = new Set<number>();
  let i = reference.length, j = heard.length;
  while (i || j) {
    if (i && j && costs[i * width + j] === costs[(i - 1) * width + j - 1] + (reference[i - 1] === heard[j - 1] ? 0 : 1)) {
      if (reference[i - 1] !== heard[j - 1]) changed.add(locations[i - 1]);
      observed[locations[--i]].push(--j);
    } else if (i && costs[i * width + j] === costs[(i - 1) * width + j] + 1) changed.add(locations[--i]);
    else {
      --j;
      for (const at of [i - 1, i]) if (at >= 0 && at < reference.length) {observed[locations[at]].push(j); changed.add(locations[at]);}
    }
  }
  const entries = lexicon.map(entry => ({...entry, ids: runs(entry.phones)}));
  const candidates: {word: string; index: number; heardFragment: string; phoneEdits: number; retrievalDistance: number}[] = [];
  for (const index of [...changed].sort((a, b) => a - b)) {
    if (index === 0 || index === wordPhones.length - 1 || !observed[index].length) continue;
    const first = Math.min(...observed[index]), last = Math.max(...observed[index]) + 1;
    // Explicit neighboring-boundary uncertainty only, never blank words filled
    // from a reference. All fragments below are slices of independent output.
    const queries: string[][] = [];
    for (const left of [-1, 0, 1]) for (const right of [-1, 0, 1]) {
      const a = Math.max(0, first + left), b = Math.min(heard.length, last + right);
      if (b - a >= 3 && b - a <= 40) queries.push(heard.slice(a, b));
    }
    const expectedKey = recitationLexeme(referenceWords[index]), local = new Map<string, typeof candidates[number]>();
    for (const entry of entries) {
      if (recitationLexeme(entry.word) === expectedKey) continue;
      for (const query of queries) {
        if (Math.abs(entry.ids.length - query.length) > Math.max(2, Math.floor(query.length * .35))) continue;
        const phoneEdits = distance(entry.ids, query), retrievalDistance = phoneEdits / Math.max(entry.ids.length, query.length);
        if (retrievalDistance > .35) continue;
        const old = local.get(entry.word);
        if (!old || retrievalDistance < old.retrievalDistance || retrievalDistance === old.retrievalDistance && phoneEdits < old.phoneEdits)
          local.set(entry.word, {word: entry.word, index, heardFragment: query.join(""), phoneEdits, retrievalDistance});
      }
    }
    candidates.push(...[...local.values()].sort((a, b) => a.retrievalDistance - b.retrievalDistance || a.phoneEdits - b.phoneEdits
      || a.word.localeCompare(b.word)).slice(0, 3));
  }
  const best = new Map<string, typeof candidates[number]>();
  for (const candidate of candidates.sort((a, b) => a.retrievalDistance - b.retrievalDistance || a.phoneEdits - b.phoneEdits || a.index - b.index || a.word.localeCompare(b.word)))
    if (!best.has(candidate.word)) best.set(candidate.word, candidate);
  return {candidates: [...best.values()].slice(0, 8), confidenceQualified: false as const, transcriptProduced: false as const,
    referenceConditionedRecognition: false as const, coordinateAlignmentQualified: false as const};
}
