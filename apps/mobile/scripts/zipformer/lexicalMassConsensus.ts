/** Quran-Lab NPL-1.2; see LICENSE. Offline evidence-selection experiment.
 * Sum mutually distinct retained CTC token-prefix path masses by unique global
 * lexical sequence. ALL unparsed/ambiguous mass stays in an unknown bucket.
 * A word group must strictly outrank that bucket and every other word group.
 * These are PRUNED path sums, not calibrated correctness or independent votes.
 * No selected ayah, reference, script or gold is accepted; no transcript repair.
 */
import {recitationLexeme} from "../../src/quran/recitationTracking";
export type LexicalMassCandidate={ids:number[];retainedPathLogScore:number;
  proposal:{status:"unique"|"ambiguous"|"uncovered";proposedWords:string[]|null}};
const add=(a:number,b:number)=>a===-Infinity?b:b===-Infinity?a:Math.max(a,b)+Math.log1p(Math.exp(-Math.abs(a-b)));
export function lexicalMassConsensus(candidates:LexicalMassCandidate[]){
  if(!Array.isArray(candidates)||!candidates.length||candidates.length>32)throw Error("Bounded actual acoustic prefixes required");
  const seen=new Set<string>(),groups=new Map<string,{words:string[];logMass:number;ranks:number[]}>();
  let unknownLogMass=-Infinity,totalRetainedLogMass=-Infinity;
  for(const [i,candidate]of candidates.entries()){
    const p=candidate?.proposal;
    if(!candidate||!Array.isArray(candidate.ids)||candidate.ids.length>650
      ||candidate.ids.some(id=>!Number.isInteger(id)||id<0||id>=250)
      ||!Number.isFinite(candidate.retainedPathLogScore)||candidate.retainedPathLogScore>.0001
      ||!p||!["unique","ambiguous","uncovered"].includes(p.status)
      ||p.status==="unique"&&(!candidate.ids.length||!Array.isArray(p.proposedWords)||!p.proposedWords.length
        ||p.proposedWords.length>200||p.proposedWords.some(word=>typeof word!=="string"||word.length>100
          ||!recitationLexeme(word)||/\s/.test(recitationLexeme(word))))
      ||p.status!=="unique"&&p.proposedWords!==null)throw Error("Valid bounded independent prefix and complete lexical parse/abstention required");
    const identity=candidate.ids.join(',');if(seen.has(identity))throw Error("Duplicate token prefixes cannot add acoustic votes");seen.add(identity);
    totalRetainedLogMass=add(totalRetainedLogMass,candidate.retainedPathLogScore);
    if(p.status!=="unique"){unknownLogMass=add(unknownLogMass,candidate.retainedPathLogScore);continue;}
    const words=p.proposedWords!.map(recitationLexeme),key=words.join(' '),old=groups.get(key);
    if(old){old.logMass=add(old.logMass,candidate.retainedPathLogScore);old.ranks.push(i+1);}
    else groups.set(key,{words,logMass:candidate.retainedPathLogScore,ranks:[i+1]});
  }
  if(totalRetainedLogMass>.002)throw Error("Retained acoustic mass cannot exceed normalized evidence");
  const ranked=[...groups.values()].sort((a,b)=>b.logMass-a.logMass||a.words.join(' ').localeCompare(b.words.join(' ')));
  const best=ranked[0],competition=Math.max(unknownLogMass,ranked[1]?.logMass??-Infinity);
  const margin=best?best.logMass-competition:null;
  // Numerical tie tolerance only; not a tuned confidence/accuracy threshold.
  const selected=best&&margin!==null&&margin>1e-9?best:null;
  return {proposedWords:selected?.words??null,selectedRanks:selected?.ranks??[],
    decision:selected?"word-group":"retain-unknown",wordGroups:ranked,unknownLogMass,totalRetainedLogMass,
    dominanceMargin:margin===null||!Number.isFinite(margin)?null:margin,
    pathSumsPruned:true as const,confidenceQualified:false as const,wordRecognitionQualified:false as const,
    safeForMistakeTracking:false as const,referenceReceived:false as const};
}
