/** Report arithmetic only, never speech evidence. Missing cases cannot vanish
 * from a known diagnostic scope or turn a partial run into a passing score. */
export interface ComparisonCase { index: number; words: number; audioSha256: string }
export interface ComparedCase { index: number; edits: { words: number; errors: number } }
export function comparisonScope(planned: ComparisonCase[], results: ComparedCase[]) {
  const scope = new Map<number, ComparisonCase>();
  for (const row of planned) {
    if (!Number.isSafeInteger(row.index) || row.index < 0 || !Number.isSafeInteger(row.words) || row.words < 1
      || typeof row.audioSha256 !== "string" || !/^[a-f0-9]{64}$/.test(row.audioSha256) || scope.has(row.index))
      throw Error("Unique bounded comparison scope required");
    scope.set(row.index, row);
  }
  const analyzed = new Set<number>();
  let errors = 0;
  for (const row of results) {
    const source = scope.get(row.index);
    if (!source || analyzed.has(row.index) || row.edits.words !== source.words
      || !Number.isSafeInteger(row.edits.errors) || row.edits.errors < 0)
      throw Error("Complete, nonduplicated comparison counts required");
    analyzed.add(row.index); errors += row.edits.errors;
  }
  const missing = planned.filter(row => !analyzed.has(row.index));
  errors += missing.reduce((sum, row) => sum + row.words, 0);
  const words = planned.length ? planned.reduce((sum, row) => sum + row.words, 0) : null;
  return { words, errors: words === null ? null : errors, missingCases: missing.length,
    complete: planned.length > 0 && !missing.length,
    wer: words && !missing.length ? errors / words : null };
}
