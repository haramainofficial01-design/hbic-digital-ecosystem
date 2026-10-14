/** Quran-Lab NPL-1.2; see LICENSE. OFFLINE fixed selection experiment.
 * Prefer the unchanged raw RNNT words only when a complete independent
 * acoustic candidate matches them exactly after existing orthographic scoring
 * normalization. Otherwise retain the earlier first-unique/fallback policy.
 * NO verse/reference/script/gold input. Agreement is NOT correctness or
 * independence qualification; either/both models can restore canonical words. */
import {recitationLexeme} from "../../src/quran/recitationTracking";
import {lexicalRnntFallback} from "./lexicalRnntFallback";
type Proposal=Parameters<typeof lexicalRnntFallback>[0];
export type CorroboratingCandidate={rank:number;retainedPathLogScore:number;proposal:Proposal};
const normalized=(text:string)=>text.trim().split(/\s+/).map(recitationLexeme).filter(Boolean).join(" ");
export function lexicalRnntCorroboration(candidates:CorroboratingCandidate[],rnntRaw:string){
  const raw=lexicalRnntFallback({status:"uncovered",proposedWords:null},rnntRaw);
  if(!Array.isArray(candidates)||!candidates.length||candidates.length>32)
    throw Error("Full bounded independent acoustic candidate inventory required");
  for(const [i,c]of candidates.entries()){
    if(!c||c.rank!==i+1||!Number.isFinite(c.retainedPathLogScore)||c.retainedPathLogScore>.0001
      ||i>0&&c.retainedPathLogScore>candidates[i-1].retainedPathLogScore)
      throw Error("Original contiguous acoustic rank/score ordering required");
    lexicalRnntFallback(c.proposal,rnntRaw); // Validate ALL proposals, not only the selected one.
  }
  const rnntWords=normalized(rnntRaw);
  const matching=candidates.filter(c=>c.proposal.status==="unique"&&rnntWords
    &&normalized(c.proposal.proposedWords!.join(" "))===rnntWords);
  const first=candidates.find(c=>c.proposal.status==="unique");
  const selected=matching.length?{...raw,source:"rnnt-acoustic-corroborated"}:
    lexicalRnntFallback(first?.proposal??{status:"uncovered",proposedWords:null},rnntRaw);
  return {...selected,matchingAcousticRanks:matching.map(c=>c.rank),
    firstUniqueRank:first?.rank??null,exactWholeSequenceOnly:true as const,
    referenceReceived:false as const,modelErrorIndependenceQualified:false as const};
}
