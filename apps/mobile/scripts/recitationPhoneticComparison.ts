/** Raw comparison-side diagnostics only. Phonetic differences are NOT word
 * mistakes, pronunciation grades or proof that a learner recited incorrectly. */
export function phoneticComparison(wordPhones: string[], heardPhones: string) {
  if (!Array.isArray(wordPhones) || !wordPhones.length || wordPhones.length > 200 || wordPhones.some(word => typeof word !== "string" || !word.length)
    || typeof heardPhones !== "string") throw Error("Invalid phonetic comparison");
  const reference = wordPhones.flatMap(word => [...word]), heard = [...heardPhones];
  if (reference.length > 1000 || heard.length > 2000) throw Error("Bounded phonetic comparison required");
  const locations = wordPhones.flatMap((word, index) => [...word].map(() => index));
  const width = heard.length + 1, costs = new Uint16Array((reference.length + 1) * width);
  for (let i = 0; i <= reference.length; i++) costs[i * width] = i;
  for (let j = 0; j <= heard.length; j++) costs[j] = j;
  for (let i = 1; i <= reference.length; i++) for (let j = 1; j <= heard.length; j++) costs[i * width + j] = Math.min(
    costs[(i - 1) * width + j] + 1, costs[i * width + j - 1] + 1,
    costs[(i - 1) * width + j - 1] + (reference[i - 1] === heard[j - 1] ? 0 : 1));
  const changed = new Set<number>(), deleted = wordPhones.map(() => 0), insertions: { beforePhone: number; phones: string }[] = [];
  let i = reference.length, j = heard.length;
  while (i || j) {
    if (i && j && reference[i - 1] === heard[j - 1] && costs[i * width + j] === costs[(i - 1) * width + j - 1]) { i--; j--; }
    else if (i && j && costs[i * width + j] === costs[(i - 1) * width + j - 1] + 1) { changed.add(locations[--i]); j--; }
    else if (i && costs[i * width + j] === costs[(i - 1) * width + j] + 1) { changed.add(locations[--i]); deleted[locations[i]]++; }
    else {
      const phone = heard[--j], last = insertions.at(-1);
      if (last?.beforePhone === i) last.phones = phone + last.phones;
      else insertions.push({ beforePhone: i, phones: phone });
      if (i < reference.length) changed.add(locations[i]);
      if (i > 0) changed.add(locations[i - 1]);
    }
  }
  return { edits: costs[reference.length * width + heard.length], referencePhones: reference.length,
    wordLocationsQualified: false as const,
    changedWordIndices: [...changed].sort((a, b) => a - b),
    entirelyDeletedWordIndices: deleted.flatMap((count, index) => count === [...wordPhones[index]].length ? [index] : []),
    insertions: insertions.reverse() };
}
