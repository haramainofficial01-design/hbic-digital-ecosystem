/** Quran-Lab NPL-1.2; see LICENSE. Offline changed-decoder experiment only.
 * Re-rank ORIGINAL independently emitted phone strings by their complete CTC
 * output-string likelihood, including every inventory segmentation and timing.
 * No words, lexicon, selected ayah, expected text, duration repair or gold enter
 * this helper. A likelihood/rank is not calibrated recitation correctness.
 */
import { phoneticStringLikelihood } from "./ctcString";

export interface RetainedAcousticPhoneString {
  phones: string;
  retainedPathLogScore: number;
}

export function rerankAcousticPhoneStrings(
  logprobs: Float32Array,
  units: string[],
  blank: number,
  candidates: readonly RetainedAcousticPhoneString[],
) {
  // Validate the WHOLE retained list before calculating or selecting anything.
  if (!Array.isArray(candidates) || candidates.length < 1 || candidates.length > 32
    || candidates.some((row, i) => !row || typeof row.phones !== "string" || row.phones.length > 1000
      || !Number.isFinite(row.retainedPathLogScore) || row.retainedPathLogScore > .0001
      || i > 0 && row.retainedPathLogScore > candidates[i - 1].retainedPathLogScore))
    throw Error("Bounded original acoustic phone strings in pruned-score rank order required");

  const originalCandidates = candidates.map((row, i) => ({ rank: i + 1,
    phones: row.phones, retainedPathLogScore: row.retainedPathLogScore }));
  const groups = new Map<string, { phones: string; originalRanks: number[]; originalPrunedLogScores: number[] }>();
  for (const row of originalCandidates) {
    let group = groups.get(row.phones);
    if (!group) {
      group = { phones: row.phones, originalRanks: [], originalPrunedLogScores: [] };
      groups.set(row.phones, group);
    }
    group.originalRanks.push(row.rank);
    group.originalPrunedLogScores.push(row.retainedPathLogScore);
  }
  const ranked = [...groups.values()].map(group => {
    // false is deliberate: score the original string, not a collapsed/repaired
    // duration class. The scorer ALREADY sums alternative unit segmentations;
    // duplicate token prefixes spelling the same string must not add votes.
    const exactLogLikelihood = phoneticStringLikelihood(logprobs, units, blank, group.phones, false);
    if (!Number.isFinite(exactLogLikelihood) || exactLogLikelihood > .0001
      || group.originalPrunedLogScores.some(score => exactLogLikelihood + 1e-6 < score))
      throw Error("Complete original phone-string mass must cover each retained token-prefix mass");
    return { ...group, exactLogLikelihood };
  }).sort((a, b) => b.exactLogLikelihood - a.exactLogLikelihood || a.originalRanks[0] - b.originalRanks[0])
    .map((row, i) => ({ rank: i + 1, ...row }));

  return { ranked, originalCandidates, candidateCount: originalCandidates.length,
    distinctPhoneStrings: ranked.length, duplicatePhoneStrings: originalCandidates.length - ranked.length,
    exactOutputStringMass: true as const, phoneRunNuisance: false as const,
    referenceReceived: false as const, confidenceQualified: false as const,
    wordRecognitionQualified: false as const, safeForMistakeTracking: false as const,
    liveFollowingQualified: false as const, nativeQualified: false as const };
}
