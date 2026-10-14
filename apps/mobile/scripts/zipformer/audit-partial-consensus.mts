/** Quran-Lab NPL-1.2; see LICENSE. New bounded decoder replay on frozen actual
 * outputs, NOT new inference, fresh natural gold, audio access or qualification.
 * Global phones/vocabulary ONLY enter parsing; scripts enter scoring afterward.
 * Partial word strings omit explicit unresolved phone spans for the diagnostic
 * scorer only. They must NEVER feed omission/completion logic as full speech. */
import {readFileSync,writeFileSync} from "node:fs";
import {createHash,randomUUID} from "node:crypto";
import {resolve} from "node:path";
import {lexicalPartialConsensus} from "./lexicalPartialConsensus";
import {wordEdits} from "../recitationQualification";
const sha=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const load=(path:string,pin:string)=>{const bytes=readFileSync(path);
  if(bytes.length>8_000_000||sha(bytes)!==pin)throw Error("Pinned complete historical output required");
  return {data:JSON.parse(bytes.toString()),sha256:pin};};
const lex=load("output/quran-development/muaalem-comparison/phonetic-lexicon-1791922011429-32dabcb6-d51d-483e-bba0-03427f0aa11c.json",
  "262736fca4c16f924fbccb1b66ec133b23a735c9ddb3d139657461f84d5057c4");
const actual=load("output/quran-development/zipformer-comparison/lexical-nbest-calibration-1791988724075-499c571d-b894-45f9-aaa9-38844fdc9bdb.json",
  "5b1407cabae9c266b79471828569d05c23fb7295d01da094946a16c8a2d7d531");
const scripts=load("output/quran-development/sherpa-comparison/nvidia-whole-rnnt-calibration.json",
  "cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310");
if(!lex.data.complete||lex.data.entries?.length!==9980||lex.data.referenceCoverageComplete!==false
  ||!actual.data.complete||actual.data.summary?.analyzed!==48||actual.data.results?.length!==48||actual.data.failures?.length!==0
  ||actual.data.predeclared?.split!=="calibration"||actual.data.wordRecognitionQualified!==false
  ||actual.data.modelSha256!=="6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb"
  ||!scripts.data.complete||scripts.data.results?.length!==48||scripts.data.failures?.length!==0
  ||scripts.data.split!=="calibration"||scripts.data.scope!=="whole")throw Error("Unchanged full calibration provenance required");
const seen=new Set<number>();
type Pair={row:any;gold:{positive:boolean;spokenGold:string[]}};
const pairs:Pair[]=actual.data.results.map((row:any)=>{
  const gold=scripts.data.results.find((g:any)=>g.index===row.index);
  if(!gold||!Number.isSafeInteger(row.index)||seen.has(row.index)||row.audioSha256!==gold.audioSha256
    ||row.originalSamples!==gold.originalSamples||row.category!==gold.category||row.positive!==gold.positive
    ||!Array.isArray(gold.spokenGold)||gold.spokenGold.some((w:unknown)=>typeof w!=="string")
    ||!Array.isArray(row.experiments)||row.experiments.length!==2)throw Error("Every frozen waveform/script pair required");
  seen.add(row.index);return {row,gold};
});
const results=[false,true].map((duration,mode)=>{
  const parse=lexicalPartialConsensus(lex.data.entries,duration);
  const rows=pairs.map(({row,gold})=>{
    const original=row.experiments[mode];
    if(original.duration!==duration||original.referenceConditioned!==false||original.top.rank!==1
      ||typeof original.top.phones!=="string"||!Array.isArray(original.candidates)||original.candidates.length>8)
      throw Error("Independent actual acoustic rank-one output required");
    const proposal=parse(original.top.phones); // no reference/script/category
    const oldWords:string[]=original.firstUnique?.proposal.proposedWords??[];
    const fallback=original.firstUnique?{status:"complete",words:oldWords,unresolved:false}:
      {status:proposal.status,words:proposal.retainedWords,unresolved:proposal.unresolvedSpans.length>0};
    // Fixed fallback: preserve an existing complete unique proposal; otherwise
    // expose rank-one mandatory anchors plus gaps. NO gold-directed selection.
    const score=(words:string[])=>wordEdits(gold.spokenGold.join(" "),words.join(" "));
    const before=score(oldWords);
    if(before.errors!==original.firstUniqueScore.errors||before.words!==original.firstUniqueScore.words)
      throw Error("All prior script metrics must reproduce unchanged");
    return {index:row.index,category:row.category,positive:gold.positive,audioSha256:row.audioSha256,
      originalSamples:row.originalSamples,proposal,fallback,before,
      topScore:score(proposal.retainedWords),fallbackScore:score(fallback.words)};
  });
  const count=(selected:typeof rows)=>({cases:selected.length,scriptWords:selected.reduce((n,r)=>n+r.before.words,0),
    baselineWordEditsIncludingAbstentions:selected.reduce((n,r)=>n+r.before.errors,0),
    top:{complete:selected.filter(r=>r.proposal.status==="complete").length,
      partial:selected.filter(r=>r.proposal.status==="partial").length,
      noRetainedWords:selected.filter(r=>!r.proposal.retainedWords.length).length,
      unresolvedScopes:selected.filter(r=>r.proposal.unresolvedSpans.length).length,
      minimumUncoveredPhoneCharacters:selected.reduce((n,r)=>n+r.proposal.minimumUncoveredPhoneCharacters,0),
      unresolvedPhoneCharacters:selected.reduce((n,r)=>n+r.proposal.unresolvedPhoneCharacters,0),
      retainedWordStringEditsIncludingMissingWords:selected.reduce((n,r)=>n+r.topScore.errors,0),
      completeExactScripts:selected.filter(r=>r.proposal.status==="complete"&&r.topScore.errors===0).length,
      scriptStringExactDespiteUnresolvedSounds:selected.filter(r=>r.proposal.unresolvedSpans.length&&r.topScore.errors===0).length},
    fallback:{complete:selected.filter(r=>r.fallback.status==="complete").length,
      partial:selected.filter(r=>r.fallback.status==="partial").length,
      noRetainedWords:selected.filter(r=>!r.fallback.words.length).length,
      unresolvedScopes:selected.filter(r=>r.fallback.unresolved).length,
      retainedWordStringEditsIncludingMissingWords:selected.reduce((n,r)=>n+r.fallbackScore.errors,0),
      completeExactScripts:selected.filter(r=>r.fallback.status==="complete"&&r.fallbackScore.errors===0).length,
      scriptStringExactDespiteUnresolvedSounds:selected.filter(r=>r.fallback.unresolved&&r.fallbackScore.errors===0).length,
      improvedScriptEditBudget:selected.filter(r=>r.fallbackScore.errors<r.before.errors).length,
      regressedScriptEditBudget:selected.filter(r=>r.fallbackScore.errors>r.before.errors).length,
      unchangedScriptEditBudget:selected.filter(r=>r.fallbackScore.errors===r.before.errors).length}});
  return {duration,summary:count(rows),altered:count(rows.filter(r=>r.positive)),unaltered:count(rows.filter(r=>!r.positive)),
    categories:["correct","pause","low_noise","speed_0.8","speed_1.2","omission","repetition","substitution"]
      .map(category=>({category,...count(rows.filter(r=>r.category===category))})),rows};
});
const output=resolve("output/quran-development/zipformer-comparison",`partial-consensus-${Date.now()}-${randomUUID()}.json`);
const report={complete:true,analysisFailures:0,expectedCases:48,matchedOriginalWaveforms:48,newInference:false,freshHeldout:false,
  inputsSha256:{lexicon:lex.sha256,actualCandidates:actual.sha256,scriptedScopes:scripts.sha256},
  codeSha256:Object.fromEntries(["apps/mobile/scripts/zipformer/lexicalPartialConsensus.ts",
    "apps/mobile/scripts/zipformer/audit-partial-consensus.mts","apps/mobile/scripts/recitationQualification.ts"]
      .map(path=>[path,sha(readFileSync(path))])),
  fullTranscriptQualified:false,wordRecognitionQualified:false,mistakeDetectionQualified:false,nativeQualified:false,
  limits:["Reused 48 biased approximate historical controls; no fresh natural speech, consent or teacher-reviewed gold inferred.",
    "Global exact-phone coverage is not acoustic correctness; mandatory means all minimum-uncovered dictionary parses only.",
    "Every script word remains in diagnostic denominator. Partial strings are NOT complete transcripts or recognition accuracy.",
    "Unresolved phones retain explicit gaps, not word counts or word/audio coordinates. Do not feed partial strings into omission/completion logic.",
    "Rank-one parsing / fixed complete-proposal fallback selected before script scoring, no expected-text repair or gold selection.",
    "No real error precision/recall, pronunciation, native/live qualification, app integration or deployment."],results};
writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({output,sha256:sha(readFileSync(output)),...report,results:results.map(({rows,...summary})=>summary)},null,2));
