/** Quran-Lab NPL-1.2; see LICENSE. Offline candidate experiment only.
 * The first uniquely covered retained acoustic prefix is chosen by its ORIGINAL
 * acoustic rank. No reference, expected words, gold, frequency or phrase model.
 * Skipping an uncovered prefix can bias toward canonical vocabulary: proposals
 * are unqualified and may restore mistakes. Coverage is not confidence. */
import type {lexicalSegmenter} from "./lexicalSegmentation";

export function lexicalAcousticCandidates(
  acoustic: {phones:string;retainedPathLogScore:number}[], parse:ReturnType<typeof lexicalSegmenter>) {
  if(!Array.isArray(acoustic)||!acoustic.length||acoustic.length>32
    ||acoustic.some((row,i)=>!row||typeof row.phones!=="string"||row.phones.length>1000
      ||!Number.isFinite(row.retainedPathLogScore)||row.retainedPathLogScore>.0001
      ||i>0&&row.retainedPathLogScore>acoustic[i-1].retainedPathLogScore))
    throw Error("Bounded independently ranked acoustic candidates required");
  const candidates=acoustic.map((row,i)=>({rank:i+1,...row,proposal:parse(row.phones)}));
  const firstUnique=candidates.find(row=>row.proposal.status==="unique")??null;
  return {candidates,firstUnique,top:candidates[0],
    acousticRankDrop:firstUnique?acoustic[0].retainedPathLogScore-firstUnique.retainedPathLogScore:null,
    referenceConditioned:false as const,confidenceQualified:false as const,wordRecognitionQualified:false as const};
}
