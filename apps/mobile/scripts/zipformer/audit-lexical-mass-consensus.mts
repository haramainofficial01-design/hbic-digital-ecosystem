/** Quran-Lab NPL-1.2; see LICENSE. New fixed grouped-mass selection replay on
 * pinned actual model outputs only. No inference/voices/training/fresh gold.
 * Reference scripts enter scoring AFTER the independent decision returns. */
import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {createHash,randomUUID} from "node:crypto";
import {lexicalMassConsensus} from "./lexicalMassConsensus";
import {lexicalRnntFallback} from "./lexicalRnntFallback";
import {wordEdits} from "../recitationQualification";
import {controlRecognitionFidelity} from "../recitationControlFidelity";
const sha=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const load=(path:string,pin:string)=>{const bytes=readFileSync(path);
  if(bytes.length>8_000_000||sha(bytes)!==pin)throw Error("Exact bounded historical model output required");
  return {data:JSON.parse(bytes.toString()),sha256:pin};};
const phone=load("output/quran-development/zipformer-comparison/lexical-nbest-calibration-1791998237198-81e00510-4582-4632-abba-ea18d3a750be.json",
  "c7ef5272e7206c9d47ff5b2ff75a00d8f162b31e8a89121cb83078c7294b73a6");
const old=load("output/quran-development/zipformer-comparison/lexical-rnnt-fallback-1791998301452-28ce073c-9806-4349-85c3-b0d4213fc7ad.json",
  "9cd62bfac02d638bc8d045f72563ded4c6bd8863e493bf4acbadfaa7febd2cca");
const rnnt=load("output/quran-development/sherpa-comparison/nvidia-whole-rnnt-calibration.json",
  "cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310");
if(phone.data.complete!==true||phone.data.summary?.analyzed!==48||phone.data.results?.length!==48||phone.data.failures?.length!==0
  ||phone.data.predeclared?.width!==32||phone.data.predeclared?.split!=="calibration"||phone.data.predeclared?.tokensPerFrame!==12
  ||phone.data.modelSha256!=="6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb"
  ||old.data.complete!==true||old.data.rows?.length!==48||old.data.analysisFailures!==0||old.data.predeclared?.width!==32
  ||old.data.inputsSha256?.phoneticCandidates!==phone.sha256||old.data.inputsSha256?.rnntTranscripts!==rnnt.sha256
  ||rnnt.data.complete!==true||rnnt.data.mode!=="rnnt"||rnnt.data.scope!=="whole"||rnnt.data.split!=="calibration"
  ||rnnt.data.results?.length!==48||rnnt.data.failures?.length!==0||rnnt.data.canonicalPrompt!==false)
  throw Error("All 48 complete matched historical outputs and independent decoding required");
const seen=new Set<number>();
const rows:any[]=phone.data.results.map((p:any)=>{
  const r=rnnt.data.results.find((row:any)=>row.index===p.index),before=old.data.rows.find((row:any)=>row.index===p.index);
  if(!r||!before||!Number.isSafeInteger(p.index)||seen.has(p.index)||p.audioSha256!==r.audioSha256||p.audioSha256!==before.audioSha256
    ||p.originalSamples!==r.originalSamples||p.originalSamples!==before.originalSamples
    ||p.category!==r.category||p.category!==before.category||p.positive!==r.positive||p.positive!==before.positive
    ||typeof r.finalTranscript!=="string"||!Array.isArray(r.spokenGold)||r.spokenGold.some((word:unknown)=>typeof word!=="string"))
    throw Error("Exact frozen original waveform/category/script pairs required");
  seen.add(p.index);const experiment=p.experiments?.[1],search=p.search;
  if(experiment?.duration!==true||experiment.referenceConditioned!==false||search?.referenceConditioned!==false
    ||search.width!==32||!Array.isArray(search.candidates)||!Array.isArray(experiment.candidates)
    ||search.candidates.length!==experiment.candidates.length)throw Error("Full independent retained-prefix inventory required");
  const mass=lexicalMassConsensus(search.candidates.map((c:any,i:number)=>{
    const proposal=experiment.candidates[i];
    if(proposal.rank!==i+1||proposal.retainedPathLogScore!==c.retainedPathLogScore)
      throw Error("Actual acoustic prefix/rank/score pairing required");
    return {ids:c.ids,retainedPathLogScore:c.retainedPathLogScore,proposal:proposal.proposal};
  })); // No reference, script or gold enters grouping/ranking.
  const selected=lexicalRnntFallback(mass.proposedWords?{status:"unique",proposedWords:mass.proposedWords}:
    {status:"uncovered",proposedWords:null},r.finalTranscript);
  const script=r.spokenGold.join(" "),rnntScore=wordEdits(script,r.finalTranscript),score=wordEdits(script,selected.transcript);
  if(rnntScore.words!==r.goldEdits.words||rnntScore.errors!==r.goldEdits.errors||score.words!==before.selectedScore.words)
    throw Error("Original complete word denominators required");
  const fidelity=controlRecognitionFidelity(r.scopedExpected,script,selected.transcript);
  if(fidelity.scriptedPositive!==r.positive)throw Error("Unchanged planted-scope classification required");
  return {index:p.index,category:p.category,positive:p.positive,audioSha256:p.audioSha256,originalSamples:p.originalSamples,
    mass,selected,score,rnntScore,previousWideScore:before.selectedScore,previousWideFidelity:before.fidelity,fidelity};
});
if(seen.size!==48||rows.reduce((n,r)=>n+r.score.words,0)!==192)throw Error("Every original case and scripted word required");
const count=(selected:any[])=>({cases:selected.length,scriptWords:selected.reduce((n,r)=>n+r.score.words,0),
  groupedMassScriptEdits:selected.reduce((n,r)=>n+r.score.errors,0),rnntScriptEdits:selected.reduce((n,r)=>n+r.rnntScore.errors,0),
  previousWideScriptEdits:selected.reduce((n,r)=>n+r.previousWideScore.errors,0),
  wordGroupSelected:selected.filter(r=>r.mass.decision==="word-group").length,
  unknownRetainedWithRawRnnt:selected.filter(r=>r.mass.decision==="retain-unknown").length,
  exactScripts:selected.filter(r=>r.fidelity.exactScriptedSpeech).length,
  canonicalInsteadOfAlteration:selected.filter(r=>r.fidelity.canonicalInsteadOfScriptedSpeech).length,
  neitherExact:selected.filter(r=>r.fidelity.neitherExact).length,
  improvedVsPreviousWide:selected.filter(r=>r.score.errors<r.previousWideScore.errors).length,
  regressedVsPreviousWide:selected.filter(r=>r.score.errors>r.previousWideScore.errors).length,
  unchangedVsPreviousWide:selected.filter(r=>r.score.errors===r.previousWideScore.errors).length});
const output=resolve("output/quran-development/zipformer-comparison",`lexical-mass-consensus-${Date.now()}-${randomUUID()}.json`);
const report={complete:true,analysisFailures:0,expectedCases:48,matchedOriginalWaveforms:48,newInference:false,freshHeldout:false,
  predeclared:{width:32,durationLexicon:true,policy:"largest summed unique word group must strictly beat unknown and all other word groups; otherwise unchanged raw RNNT",
    numericalTieTolerance:1e-9,goldUsedForSelection:false,referenceUsedForSelection:false,thresholdSweep:false},
  inputsSha256:{prefixes:phone.sha256,previousWideSelection:old.sha256,rnnt:rnnt.sha256},
  codeSha256:Object.fromEntries(["apps/mobile/scripts/zipformer/lexicalMassConsensus.ts",
    "apps/mobile/scripts/zipformer/audit-lexical-mass-consensus.mts","apps/mobile/scripts/zipformer/lexicalRnntFallback.ts",
    "apps/mobile/scripts/recitationQualification.ts","apps/mobile/scripts/recitationControlFidelity.ts"].map(path=>[path,sha(readFileSync(path))])),
  summary:count(rows),altered:count(rows.filter(r=>r.positive)),unaltered:count(rows.filter(r=>!r.positive)),
  categories:["correct","pause","low_noise","speed_0.8","speed_1.2","omission","repetition","substitution"]
    .map(category=>({category,...count(rows.filter(r=>r.category===category))})),
  remainingNonExact:rows.filter(r=>!r.fidelity.exactScriptedSpeech).map(r=>({index:r.index,category:r.category,edits:r.score.errors,
    source:r.selected.source,canonicalInstead:r.fidelity.canonicalInsteadOfScriptedSpeech})),
  wordRecognitionQualified:false,mistakeDetectionQualified:false,liveFollowingQualified:false,nativeQualified:false,
  limits:["Same old approximate, prior-success-biased controls; no new voices/inference, fresh held-out or independent natural-error gold.",
    "Distinct CTC prefixes have mutually exclusive path sets, not independent speaker votes. Grouped pruned path mass is NOT correctness probability.",
    "Unknown/ambiguous prefixes retain all their mass. Only fixed strict dominance/tie logic selects lexical output; no reference or gold repair.",
    "Raw RNNT fallback remains an unqualified recognizer and may return canonical text instead of scripted altered speech.",
    "Every script word is scored, including fallback failures. No live event precision/recall, timestamps, native/device qualification or release.",
    "A JSON null for an infinite log-mass represents zero retained bucket mass; it is not calibrated certainty or a missing-case exclusion."],rows};
writeFileSync(output,JSON.stringify(report,null,2));
const {rows:_rows,...aggregate}=report;console.log(JSON.stringify({output,sha256:sha(readFileSync(output)),...aggregate},null,2));
