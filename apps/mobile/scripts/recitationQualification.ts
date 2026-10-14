/** Offline release qualification, never a user recitation score. No audio,
 * accounts or credentials are read here. Counts alone cannot prove consent or
 * accurate human gold; those evidence declarations must be independently audited. */
import {recitationLexeme} from "../src/quran/recitationTracking";

export const MISTAKE_CATEGORIES = ["omission", "substitution", "repetition"] as const;
type Kind = typeof MISTAKE_CATEGORIES[number];
type Difference = {kind: Kind | "extra_word"; index: number | null};
export interface QualificationCase {
  id: string; speaker: string; recording: string; split: "calibration" | "heldout";
  origin: "natural" | "waveform-control" | "unit-fixture";
  /** Hash of the exact evaluated mono PCM scope, computed privately by the
   * input adapter, not a renamed file/participant ID. Required to qualify
   * natural evidence; absent legacy evidence remains an explicit FAIL. */
  pcmSha256?: string;
  /** An independently checked VERBATIM transcript of the audible scope, not
   * merely the canonical ayah that the learner intended to recite. */
  /** Selected canonical reference, for annotation coordinates only. It must
   * never be given to the recognizer as a prompt or forced-alignment target. */
  reference: string;
  spokenGold: string; recognized: string; gold: Difference[]; predicted: Difference[];
  analyzed: boolean; recognitionFailed: boolean;
}
export interface QualificationEvidence {
  modelSha256: string; pipelineSha256: string;
  consentDocumented: boolean; usageRightsVerified: boolean;
  doubleReviewedNaturalGold: boolean; spokenScopeVerified: boolean;
  modelTrainingSpeakerOverlapExcluded: boolean;
  testSetFrozenBeforeTuning: boolean; heldoutUsedForTuning: boolean;
  cases: QualificationCase[];
}

/** Exact one-sided binomial lower confidence limit (Clopper–Pearson).
 * Independent units below are speakers, not correlated words/windows/clips.
 * Familywise alpha is divided across the six qualification metrics. */
export function binomialLower(successes: number, trials: number, alpha = .05) {
  if (!Number.isSafeInteger(trials) || trials < 1 || trials > 25000 || !Number.isSafeInteger(successes)
    || successes < 0 || successes > trials || !(alpha > 0 && alpha < 1)) throw Error("Invalid bounded binomial evidence.");
  if (!successes) return 0;
  if (successes === trials) return Math.exp(Math.log(alpha) / trials);
  const logCombinations = new Float64Array(trials + 1);
  for (let i = 1; i <= trials; i++) logCombinations[i] = logCombinations[i-1] + Math.log(trials-i+1) - Math.log(i);
  const tail = (p: number) => {
    let max = -Infinity;
    for (let i = successes; i <= trials; i++) max = Math.max(max,logCombinations[i] + i*Math.log(p) + (trials-i)*Math.log1p(-p));
    let sum = 0;
    for (let i = successes; i <= trials; i++) sum += Math.exp(logCombinations[i] + i*Math.log(p) + (trials-i)*Math.log1p(-p) - max);
    return Math.exp(max)*sum;
  };
  let low = 0, high = successes/trials;
  for (let i = 0; i < 60; i++) {const mid = (low+high)/2; if (tail(mid) < alpha) low=mid; else high=mid;}
  return (low+high)/2;
}
function words(text: string) {return text.trim().split(/\s+/).map(recitationLexeme).filter(Boolean);}
export function wordEdits(gold: string, recognized: string) {
  const a=words(gold),b=words(recognized); if(a.length>1000||b.length>2000)throw Error("Transcript exceeds qualification bound.");
  let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(prev[j]+1,next[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=next;}
  return {errors:prev[b.length],words:a.length};
}
const same = (a: Difference,b: Difference) => a.kind===b.kind && a.index===b.index;

/** The CLI reads JSON; TypeScript types alone cannot validate that evidence.
 * Reject malformed declarations rather than treating truthy strings as consent
 * or quietly omitting an invalid split from the evaluated denominator. */
function validateEvidence(evidence: QualificationEvidence) {
  if(!evidence||typeof evidence!=="object"||!Array.isArray(evidence.cases)
    || typeof evidence.modelSha256!=="string"||typeof evidence.pipelineSha256!=="string")throw Error("Invalid qualification evidence.");
  for(const field of ["consentDocumented","usageRightsVerified","doubleReviewedNaturalGold","spokenScopeVerified",
    "modelTrainingSpeakerOverlapExcluded","testSetFrozenBeforeTuning","heldoutUsedForTuning"] as const)
    if(typeof evidence[field]!=="boolean")throw Error(`Invalid evidence declaration: ${field}.`);
  for(const c of evidence.cases){
    if(!c||typeof c!=="object"||[c.id,c.speaker,c.recording,c.reference,c.spokenGold,c.recognized].some(value=>typeof value!=="string")
      || !["calibration","heldout"].includes(c.split)||!["natural","waveform-control","unit-fixture"].includes(c.origin)
      || typeof c.analyzed!=="boolean"||typeof c.recognitionFailed!=="boolean"||!Array.isArray(c.gold)||!Array.isArray(c.predicted))throw Error("Invalid corpus case.");
    if(c.pcmSha256!==undefined&&(typeof c.pcmSha256!=="string"||!/^[a-f0-9]{64}$/.test(c.pcmSha256)))
      throw Error("Invalid evaluated PCM scope hash.");
    for(const annotations of [c.gold,c.predicted]){
      const seen=new Set<string>();
      for(const difference of annotations){
        if(!difference||typeof difference!=="object"||![...MISTAKE_CATEGORIES,"extra_word"].includes(difference.kind)
          || difference.index!==null&&!Number.isSafeInteger(difference.index))throw Error("Invalid error annotation.");
        const key=`${difference.kind}:${difference.index}`;if(seen.has(key))throw Error("Duplicate error annotation.");seen.add(key);
      }
    }
  }
}

export function qualifyRecitation(evidence: QualificationEvidence) {
  validateEvidence(evidence);
  if(evidence.cases.length>25000)throw Error("Qualification corpus exceeds bound.");
  const reasons:string[]=[], heldout=evidence.cases.filter(c=>c.split==="heldout");
  const calibrationSpeakers=new Set(evidence.cases.filter(c=>c.split==="calibration").map(c=>c.speaker));
  const calibrationRecordings=new Set(evidence.cases.filter(c=>c.split==="calibration").map(c=>c.recording));
  if(!/^[a-f0-9]{64}$/.test(evidence.modelSha256)||!/^[a-f0-9]{64}$/.test(evidence.pipelineSha256))reasons.push("Pinned model and pipeline hashes required.");
  if(!evidence.consentDocumented||!evidence.usageRightsVerified)reasons.push("Documented voice consent and verified usage rights required.");
  if(!evidence.doubleReviewedNaturalGold||!evidence.spokenScopeVerified)reasons.push("Two independent reviews of verbatim natural speech and exact audible scope required.");
  if(!evidence.modelTrainingSpeakerOverlapExcluded)reasons.push("Training/evaluation speaker overlap has not been excluded.");
  if(!evidence.testSetFrozenBeforeTuning||evidence.heldoutUsedForTuning)reasons.push("A fresh, frozen held-out test set is required; tuning on it invalidates qualification.");
  if(!heldout.length||heldout.some(c=>c.origin!=="natural"))reasons.push("Qualification requires natural recitations, not fabricated transcripts or spliced controls.");
  if(heldout.some(c=>calibrationSpeakers.has(c.speaker)||calibrationRecordings.has(c.recording)))reasons.push("Held-out speakers/recordings overlap calibration.");
  const identities=new Set<string>(), recordingSpeakers=new Map<string,string>(), pcmScopes=new Set<string>();
  let conflictingRecordingSpeakers=0, duplicatePcmScopes=0, missingNaturalPcmHashes=0;
  for(const c of evidence.cases){
    if(identities.has(c.id)||!c.id||!c.speaker||!c.recording)reasons.push("Missing or duplicate corpus identities.");identities.add(c.id);
    const priorSpeaker=recordingSpeakers.get(c.recording);
    if(priorSpeaker!==undefined&&priorSpeaker!==c.speaker)conflictingRecordingSpeakers++;
    else recordingSpeakers.set(c.recording,c.speaker);
    if(c.origin==="natural"&&!c.pcmSha256)missingNaturalPcmHashes++;
    if(c.pcmSha256){if(pcmScopes.has(c.pcmSha256))duplicatePcmScopes++;pcmScopes.add(c.pcmSha256);}
    const referenceWords=words(c.reference).length;
    if(!referenceWords||!words(c.spokenGold).length||c.gold.length>100||c.predicted.length>100
      || [...c.gold,...c.predicted].some(d=>d.index===null||!Number.isSafeInteger(d.index)||d.index<0
        ||(d.kind==="extra_word"?d.index>referenceWords:d.index>=referenceWords)))reasons.push("Independent spoken gold and word-localized error annotations required.");
  }
  if(conflictingRecordingSpeakers)reasons.push("One recording is assigned conflicting speakers; independent speaker counts cannot be established.");
  if(duplicatePcmScopes)reasons.push("Duplicate evaluated PCM scopes cannot increase qualification denominators or cross calibration/held-out splits.");
  if(missingNaturalPcmHashes)reasons.push("Exact evaluated PCM scope hashes required for natural evidence; filename identities cannot exclude duplicated audio.");
  const corpusIdentityChecksPassed=!conflictingRecordingSpeakers&&!duplicatePcmScopes&&!missingNaturalPcmHashes;
  const bySpeaker=new Map<string,QualificationCase[]>();for(const c of heldout)bySpeaker.set(c.speaker,[...(bySpeaker.get(c.speaker)??[]),c]);
  const metric=(name:string, relevant:(c:QualificationCase)=>boolean, correct:(c:QualificationCase)=>boolean)=>{
    const groups=[...bySpeaker.values()].map(g=>g.filter(relevant)).filter(g=>g.length);
    const successes=groups.filter(g=>g.every(c=>c.analyzed&&!c.recognitionFailed&&correct(c))).length, trials=groups.length;
    // Conflicting/duplicated/missing scope identities cannot support an
    // independent-speaker confidence interval, even with perfect declarations.
    const lower=corpusIdentityChecksPassed&&trials?binomialLower(successes,trials,.05/6):null;
    if(lower===null||lower<.99)reasons.push(`${name}: 99% target is not established at familywise 95% confidence.`);
    return {name,independentSpeakers:corpusIdentityChecksPassed?trials:null,
      successfulSpeakers:corpusIdentityChecksPassed?successes:null,
      declaredSpeakerGroups:trials,successfulDeclaredGroups:successes,
      observed:corpusIdentityChecksPassed&&trials?successes/trials:null,lowerConfidenceBound:lower};
  };
  const metrics=MISTAKE_CATEGORIES.map(kind=>metric(`${kind} recall`,c=>c.gold.some(g=>g.kind===kind),c=>c.gold.filter(g=>g.kind===kind).every(g=>c.predicted.some(p=>same(g,p)))));
  metrics.push(metric("correction precision",c=>c.predicted.length>0,c=>c.predicted.every(p=>c.gold.some(g=>same(g,p)))));
  metrics.push(metric("clean-recitation specificity",c=>!c.gold.length,c=>!c.predicted.length));
  // Exact spoken-scope agreement per speaker is an additional conservative
  // safety gate; WER below remains the actual word-recognition point estimate.
  metrics.push(metric("spoken-transcript agreement",()=>true,c=>wordEdits(c.spokenGold,c.recognized).errors===0));
  const counts=heldout.reduce((all,c)=>{const e=wordEdits(c.spokenGold,c.analyzed&&!c.recognitionFailed?c.recognized:"");return {errors:all.errors+e.errors,words:all.words+e.words};},{errors:0,words:0});
  const wer=counts.words?counts.errors/counts.words:null;
  if(wer===null||wer>.01)reasons.push("Word recognition is below 99% (verbatim WER must be at most 1%).");
  if(heldout.some(c=>!c.analyzed||c.recognitionFailed))reasons.push("Missing/failed analyses count as failures; they cannot be dropped from the corpus.");
  return {status:reasons.length?"FAIL" as const:"PASS" as const, target:.99, confidence:.95,
    units:"Independent speakers; every relevant utterance per speaker must pass", metrics,
    corpusIdentity:{checksPassed:corpusIdentityChecksPassed,conflictingRecordingSpeakers,duplicatePcmScopes,missingNaturalPcmHashes,
      scope:"Metadata consistency only; hashes/consent/speaker separation still require independent audit. Counts are diagnostic, not qualified independence, when checks fail."},
    wordRecognition:{...counts,wer,accuracy:wer===null?null:Math.max(0,1-wer)},
    evaluatedCases:heldout.length,uniqueSpeakers:corpusIdentityChecksPassed?bySpeaker.size:null,
    declaredSpeakerGroups:bySpeaker.size,reasons:[...new Set(reasons)]};
}
