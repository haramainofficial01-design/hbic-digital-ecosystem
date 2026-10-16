/** Quran-Lab NPL-1.2; retain LICENSE. Frozen acoustic-score diagnostic only.
 * Distinct model likelihoods are never averaged or called independent votes.
 * No reference, words, phonetic repair, gold, labels or tuned thresholds.
 */
export type EventKind = "unchanged" | "omission" | "repetition" | "substitution";
export type AcousticEventScore = { kind: EventKind; index: number | null; logLikelihood: number };
export const ORIGINAL_BASELINE_MARGIN = Math.log(100);
export const ORIGINAL_LOCATION_MARGIN = Math.log(10);

export function acousticEventWinner(scores: readonly AcousticEventScore[]) {
  if (!Array.isArray(scores) || scores.length < 3 || scores.length > 257
    || scores.filter(row => row?.kind === "unchanged").length !== 1
    || scores.some(row => !row || !["unchanged", "omission", "repetition", "substitution"].includes(row.kind)
      || !Number.isFinite(row.logLikelihood) || row.logLikelihood > .0001
      || (row.kind === "unchanged" ? row.index !== null : !Number.isSafeInteger(row.index) || row.index! < 1 || row.index! > 31)))
    throw Error("Complete bounded finite original acoustic event scores required");
  const originalScores = scores.map(row => ({ ...row }));
  const events = new Map<string, AcousticEventScore & { scoreRowIndices: number[] }>();
  const scoreRows = new Set<string>(); let duplicateScoreRows = 0;
  for (const [at, row] of originalScores.entries()) {
    const rowKey = JSON.stringify([row.kind, row.index, row.logLikelihood]);
    if (scoreRows.has(rowKey)) duplicateScoreRows++; scoreRows.add(rowKey);
    const key = `${row.kind}:${row.index}`, old = events.get(key);
    if (!old) events.set(key, { ...row, scoreRowIndices: [at] });
    else {
      old.scoreRowIndices.push(at);
      if (row.logLikelihood > old.logLikelihood) old.logLikelihood = row.logLikelihood;
    }
  }
  if (events.size < 2) throw Error("Distinct unchanged and competing acoustic events required");
  const ranked = [...events.values()].sort((a, b) => b.logLikelihood - a.logLikelihood);
  const best = ranked[0], unchanged = originalScores.find(row => row.kind === "unchanged")!;
  const baselineMargin = best.logLikelihood - unchanged.logLikelihood, locationMargin = best.logLikelihood - ranked[1].logLikelihood;
  const tied = best.logLikelihood === ranked[1].logLikelihood;
  const passesOriginalMargins = !tied && best.kind !== "unchanged"
    && baselineMargin >= ORIGINAL_BASELINE_MARGIN && locationMargin >= ORIGINAL_LOCATION_MARGIN;
  const winner = tied ? null : { kind: best.kind, index: best.index };
  return { winner, tied, baselineMargin, locationMargin, passesOriginalMargins,
    originalPredicted: passesOriginalMargins ? { kind: best.kind, index: best.index } : null,
    originalScores, groupedEvents: ranked, duplicateScoreRows,
    // Identical numeric rows need not be identical phonetic target paths.
    // Original immutable reports do not retain those target IDs per score.
    pathIdentityQualified: false as const, confidenceQualified: false as const };
}

export function corroborateAcousticEvents(first: readonly AcousticEventScore[], second: readonly AcousticEventScore[]) {
  const a = acousticEventWinner(first), b = acousticEventWinner(second);
  const sameWinner = a.winner !== null && b.winner !== null && a.winner.kind !== "unchanged" && b.winner.kind !== "unchanged"
    && a.winner.kind === b.winner.kind && a.winner.index === b.winner.index;
  const predicted = sameWinner && (a.passesOriginalMargins || b.passesOriginalMargins) ? { ...a.winner! } : null;
  const reason = a.tied || b.tied ? "tied-event" : a.winner?.kind === "unchanged" || b.winner?.kind === "unchanged"
    ? "unchanged-winner" : !sameWinner ? "different-event" : !a.passesOriginalMargins && !b.passesOriginalMargins
      ? "both-below-original-margins" : "corroborated-event";
  return { predicted, reason, models: [a, b], referenceReceived: false as const, goldReceived: false as const,
    crossModelLikelihoodsCombined: false as const, independenceQualified: false as const,
    confidenceQualified: false as const, wordRecognitionQualified: false as const,
    mistakeDetectionQualified: false as const, liveFollowingQualified: false as const, nativeQualified: false as const };
}
