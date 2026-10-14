/** Quran-Lab NPL-1.2; see LICENSE. Fixed new selection pipeline evaluated on
 * frozen actual outputs, not fresh inference/gold, training or qualification.
 * Scripts enter scoring AFTER selection. No voices are accessed or stored. */
import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {createHash,randomUUID} from "node:crypto";
import {lexicalRnntFallback} from "./lexicalRnntFallback";
import {wordEdits} from "../recitationQualification";
import {controlRecognitionFidelity} from "../recitationControlFidelity";
const sha=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const load=(path:string,pin:string)=>{const bytes=readFileSync(path);
  if(bytes.length>8_000_000||sha(bytes)!==pin)throw Error("Pinned bounded complete real-output evidence required");
  return {data:JSON.parse(bytes.toString()),sha256:pin};};
const phone=load("output/quran-development/zipformer-comparison/lexical-nbest-calibration-1791988724075-499c571d-b894-45f9-aaa9-38844fdc9bdb.json",
  "5b1407cabae9c266b79471828569d05c23fb7295d01da094946a16c8a2d7d531");
const rnnt=load("output/quran-development/sherpa-comparison/nvidia-whole-rnnt-calibration.json",
  "cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310");
if(phone.data.complete!==true||phone.data.summary?.expectedCases!==48||phone.data.summary?.analyzed!==48
  ||phone.data.results?.length!==48||phone.data.failures?.length!==0||phone.data.predeclared?.split!=="calibration"
  ||phone.data.predeclared?.width!==8||phone.data.predeclared?.tokensPerFrame!==12||phone.data.predeclared?.compactQuiet!==true
  ||phone.data.modelSha256!=="6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb"
  ||rnnt.data.complete!==true||rnnt.data.mode!=="rnnt"||rnnt.data.scope!=="whole"||rnnt.data.split!=="calibration"
  ||rnnt.data.canonicalPrompt!==false||rnnt.data.results?.length!==48||rnnt.data.failures?.length!==0
  ||rnnt.data.assets?.official!=="d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31"
  ||rnnt.data.assets?.encoder!=="a74e77489a9e48d689bac080a30c5e54b35e5f54171273771dba9c72752eade3")
  throw Error("Complete exact historical calibration and distinct waveform-only model identities required");
const seen=new Set<number>();
const rows=phone.data.results.map((p:any)=>{
  const r=rnnt.data.results.find((row:any)=>row.index===p.index);
  if(!r||!Number.isSafeInteger(p.index)||seen.has(p.index)||p.audioSha256!==r.audioSha256
    ||p.originalSamples!==r.originalSamples||p.category!==r.category||p.positive!==r.positive
    ||!Array.isArray(r.spokenGold)||r.spokenGold.some((word:unknown)=>typeof word!=="string")
    ||typeof r.scopedExpected!=="string"||typeof r.finalTranscript!=="string")throw Error("All original waveform/sample/category/script pairs required");
  seen.add(p.index);const exp=p.experiments?.[1];
  if(exp?.duration!==true||exp.referenceConditioned!==false||!Array.isArray(exp.candidates)||exp.candidates.length>8
    ||exp.firstUnique&&exp.firstUnique.proposal.status!=="unique")throw Error("Fixed duration-mode independent lexical proposals required");
  const proposal=exp.firstUnique?.proposal??{status:"uncovered",proposedWords:null};
  const selected=lexicalRnntFallback(proposal,r.finalTranscript); // NO script or expected answer
  const script=r.spokenGold.join(" "),lexical=proposal.proposedWords?.join(" ")??"";
  const rnntScore=wordEdits(script,r.finalTranscript),lexicalScore=wordEdits(script,lexical),selectedScore=wordEdits(script,selected.transcript);
  if(rnntScore.words!==r.goldEdits.words||rnntScore.errors!==r.goldEdits.errors
    ||lexicalScore.words!==exp.firstUniqueScore.words||lexicalScore.errors!==exp.firstUniqueScore.errors)
    throw Error("Prior complete unchanged denominators/metrics required");
  const fidelity=controlRecognitionFidelity(r.scopedExpected,script,selected.transcript);
  if(fidelity.scriptedPositive!==r.positive)throw Error("Exact scripted alteration metadata required");
  // Agreement/complementarity are comparison-side diagnostics, NEVER selector inputs.
  const lexicalAvailable=proposal.status==="unique",agreement=lexicalAvailable&&wordEdits(lexical,r.finalTranscript).errors===0;
  return {index:p.index,category:p.category,positive:p.positive,audioSha256:p.audioSha256,originalSamples:p.originalSamples,
    selected,selectedScore,rnntScore,lexicalScore,fidelity,lexicalAvailable,normalizedOutputAgreement:agreement,
    oracleExactInEither:rnntScore.errors===0||lexicalAvailable&&lexicalScore.errors===0,
    oracleMinimumEdits:Math.min(rnntScore.errors,lexicalAvailable?lexicalScore.errors:Infinity),
    lexicalRank:exp.firstUnique?.rank??null};
});
if(rows.length!==48||seen.size!==48)throw Error("Every fixed case required");
type Row=typeof rows[number];
const count=(selected:Row[])=>({cases:selected.length,scriptWords:selected.reduce((n:number,r:Row)=>n+r.selectedScore.words,0),
  rnntScriptWordEdits:selected.reduce((n:number,r:Row)=>n+r.rnntScore.errors,0),
  lexicalScriptWordEditsIncludingAbstentions:selected.reduce((n:number,r:Row)=>n+r.lexicalScore.errors,0),
  fixedFallbackScriptWordEdits:selected.reduce((n:number,r:Row)=>n+r.selectedScore.errors,0),
  selectedLexical:selected.filter((r:Row)=>r.selected.source==="phonetic-global-unique").length,
  selectedRawRnnt:selected.filter((r:Row)=>r.selected.source==="rnnt-raw").length,
  exactScripted:selected.filter((r:Row)=>r.fidelity.exactScriptedSpeech).length,
  canonicalInsteadOfAltered:selected.filter((r:Row)=>r.fidelity.canonicalInsteadOfScriptedSpeech).length,
  neitherExact:selected.filter((r:Row)=>r.fidelity.neitherExact).length,
  improvedVsRnnt:selected.filter((r:Row)=>r.selectedScore.errors<r.rnntScore.errors).length,
  regressedVsRnnt:selected.filter((r:Row)=>r.selectedScore.errors>r.rnntScore.errors).length,
  unchangedVsRnnt:selected.filter((r:Row)=>r.selectedScore.errors===r.rnntScore.errors).length,
  normalizedOutputAgreements:selected.filter((r:Row)=>r.normalizedOutputAgreement).length,
  agreeingButNotScriptExact:selected.filter((r:Row)=>r.normalizedOutputAgreement&&!r.fidelity.exactScriptedSpeech).length,
  oracleExactInEither:selected.filter((r:Row)=>r.oracleExactInEither).length,
  oracleMinimumEdits:selected.reduce((n:number,r:Row)=>n+r.oracleMinimumEdits,0),oracleNotSelectable:true});
const output=resolve("output/quran-development/zipformer-comparison",`lexical-rnnt-fallback-${Date.now()}-${randomUUID()}.json`);
const report={complete:true,analysisFailures:0,matchedOriginalWaveforms:48,expectedCases:48,newInference:false,freshHeldout:false,
  predeclared:{policy:"duration-mode first complete unique independently ranked lexical proposal, otherwise unchanged raw RNNT",width:8,
    agreementUsedForSelection:false,canonicalReferenceUsedForSelection:false,goldUsedForSelection:false},
  inputsSha256:{phoneticCandidates:phone.sha256,rnntTranscripts:rnnt.sha256},
  codeSha256:Object.fromEntries(["apps/mobile/scripts/zipformer/lexicalRnntFallback.ts",
    "apps/mobile/scripts/zipformer/audit-lexical-rnnt-fallback.mts","apps/mobile/scripts/recitationQualification.ts",
    "apps/mobile/scripts/recitationControlFidelity.ts"].map(path=>[path,sha(readFileSync(path))])),
  summary:count(rows),altered:count(rows.filter((r:Row)=>r.positive)),unaltered:count(rows.filter((r:Row)=>!r.positive)),
  categories:["correct","pause","low_noise","speed_0.8","speed_1.2","omission","repetition","substitution"]
    .map(category=>({category,...count(rows.filter((r:Row)=>r.category===category))})),
  wordRecognitionQualified:false,mistakeDetectionQualified:false,liveFollowingQualified:false,nativeQualified:false,
  liveEventPrecision:null,liveEventRecall:null,liveLatency:null,
  limits:["Same 48 reused approximate, prior-success-biased historical calibration controls; no fresh natural or teacher-reviewed gold.",
    "Both are separately decoded models but shared training/error independence is not established. Output agreement is NOT certified correctness.",
    "Original PCM hashes match; phonetic frontend uses quiet compaction and RNNT original full PCM. No new waveform inference in this replay.",
    "Complete unique global-lexicon output may be wrong or biased; fallback RNNT may restore canonical text instead of actual altered words.",
    "All 192 script words are scored; no partial words/gaps, unavailable transcripts or per-case gold choices improve a denominator.",
    "Oracle union/minimum is post-selection diagnostic only, never achievable-decoder accuracy or selector input.",
    "No timestamps, natural word/error qualification, live following, native performance, app integration, deployment or store release."],rows};
writeFileSync(output,JSON.stringify(report,null,2));
const {rows:_rows,...aggregate}=report;
console.log(JSON.stringify({output,sha256:sha(readFileSync(output)),...aggregate},null,2));
