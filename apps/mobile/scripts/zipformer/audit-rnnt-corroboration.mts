/** Quran-Lab NPL-1.2; see LICENSE. New fixed selector on SHA-pinned frozen
 * actual model outputs. No inference, audio, training or fresh held-out labels. */
import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {createHash,randomUUID} from "node:crypto";
import {lexicalRnntCorroboration} from "./lexicalRnntCorroboration";
import {wordEdits} from "../recitationQualification";
import {controlRecognitionFidelity} from "../recitationControlFidelity";
const sha=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const load=(path:string,pin:string)=>{const b=readFileSync(path);if(b.length>8_000_000||sha(b)!==pin)throw Error("Exact bounded frozen output required");
  return{data:JSON.parse(b.toString()),sha256:pin}};
const phone=load("output/quran-development/zipformer-comparison/lexical-nbest-calibration-1791998237198-81e00510-4582-4632-abba-ea18d3a750be.json",
  "c7ef5272e7206c9d47ff5b2ff75a00d8f162b31e8a89121cb83078c7294b73a6");
const prior=load("output/quran-development/zipformer-comparison/lexical-rnnt-fallback-1791998301452-28ce073c-9806-4349-85c3-b0d4213fc7ad.json",
  "9cd62bfac02d638bc8d045f72563ded4c6bd8863e493bf4acbadfaa7febd2cca");
const rnnt=load("output/quran-development/sherpa-comparison/nvidia-whole-rnnt-calibration.json",
  "cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310");
if(phone.data.complete!==true||phone.data.results?.length!==48||phone.data.failures?.length!==0||phone.data.summary?.analyzed!==48
  ||phone.data.predeclared?.width!==32||phone.data.predeclared?.tokensPerFrame!==12||phone.data.predeclared?.split!=="calibration"
  ||phone.data.modelSha256!=="6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb"
  ||prior.data.complete!==true||prior.data.analysisFailures!==0||prior.data.rows?.length!==48||prior.data.predeclared?.width!==32
  ||prior.data.inputsSha256?.phoneticCandidates!==phone.sha256||prior.data.inputsSha256?.rnntTranscripts!==rnnt.sha256
  ||rnnt.data.complete!==true||rnnt.data.results?.length!==48||rnnt.data.failures?.length!==0||rnnt.data.mode!=="rnnt"
  ||rnnt.data.scope!=="whole"||rnnt.data.split!=="calibration"||rnnt.data.canonicalPrompt!==false)
  throw Error("Complete unchanged source/pipeline identities required");
const seen=new Set<number>();
const rows=phone.data.results.map((p:any)=>{
  const r=rnnt.data.results.find((r:any)=>r.index===p.index),old=prior.data.rows.find((r:any)=>r.index===p.index),e=p.experiments?.[1];
  if(!r||!old||!Number.isSafeInteger(p.index)||seen.has(p.index)||p.audioSha256!==r.audioSha256||p.audioSha256!==old.audioSha256
    ||p.originalSamples!==r.originalSamples||p.originalSamples!==old.originalSamples||p.category!==r.category||p.category!==old.category
    ||p.positive!==r.positive||p.positive!==old.positive||!Array.isArray(r.spokenGold)||r.spokenGold.some((v:unknown)=>typeof v!=="string")
    ||e?.duration!==true||e.referenceConditioned!==false||p.search?.referenceConditioned!==false
    ||p.search?.width!==32||!Array.isArray(e.candidates)||e.candidates.length!==p.search.candidates?.length)
    throw Error("All original waveform/sample/category and complete duration-prefix pairs required");
  seen.add(p.index);
  for(const [i,c]of e.candidates.entries())if(c.rank!==i+1||c.retainedPathLogScore!==p.search.candidates[i].retainedPathLogScore)
    throw Error("Exact original prefix rank/score pairing required");
  const selected=lexicalRnntCorroboration(e.candidates,r.finalTranscript); // no reference or gold enters selection
  const score=wordEdits(r.spokenGold.join(" "),selected.transcript),rawScore=wordEdits(r.spokenGold.join(" "),r.finalTranscript);
  if(score.words!==old.selectedScore.words||rawScore.words!==r.goldEdits.words||rawScore.errors!==r.goldEdits.errors)
    throw Error("All original word denominators and raw metrics required");
  const fidelity=controlRecognitionFidelity(r.scopedExpected,r.spokenGold.join(" "),selected.transcript);
  if(fidelity.scriptedPositive!==p.positive)throw Error("Exact unchanged alteration metadata required");
  return{index:p.index,category:p.category,positive:p.positive,audioSha256:p.audioSha256,originalSamples:p.originalSamples,
    selected,score,rawScore,previousScore:old.selectedScore,previousFidelity:old.fidelity,fidelity};
});
if(seen.size!==48||rows.reduce((n:number,r:any)=>n+r.score.words,0)!==192)throw Error("Every original case/word required");
const count=(cases:any[])=>({cases:cases.length,scriptWords:cases.reduce((n,r)=>n+r.score.words,0),
  scriptEdits:cases.reduce((n,r)=>n+r.score.errors,0),previousWideEdits:cases.reduce((n,r)=>n+r.previousScore.errors,0),
  rawRnntEdits:cases.reduce((n,r)=>n+r.rawScore.errors,0),exact:cases.filter(r=>r.fidelity.exactScriptedSpeech).length,
  canonicalInstead:cases.filter(r=>r.fidelity.canonicalInsteadOfScriptedSpeech).length,
  corroboratedRaw:cases.filter(r=>r.selected.source==="rnnt-acoustic-corroborated").length,
  lexical:cases.filter(r=>r.selected.source==="phonetic-global-unique").length,
  rawFallback:cases.filter(r=>r.selected.source==="rnnt-raw").length,
  improved:cases.filter(r=>r.score.errors<r.previousScore.errors).length,
  regressed:cases.filter(r=>r.score.errors>r.previousScore.errors).length,
  unchanged:cases.filter(r=>r.score.errors===r.previousScore.errors).length});
const report={complete:true,analysisFailures:0,matchedCases:48,newInference:false,freshHeldout:false,
  predeclared:{width:32,durationLexicon:true,policy:"unchanged raw RNNT if exactly matched by any unique acoustic candidate; else prior first-unique/raw fallback",
    referenceUsedForSelection:false,goldUsedForSelection:false,fuzzyRepair:false,thresholdSweep:false},
  inputsSha256:{phone:phone.sha256,prior:prior.sha256,rnnt:rnnt.sha256},
  codeSha256:Object.fromEntries(["apps/mobile/scripts/zipformer/lexicalRnntCorroboration.ts","apps/mobile/scripts/zipformer/audit-rnnt-corroboration.mts",
    "apps/mobile/scripts/zipformer/lexicalRnntFallback.ts","apps/mobile/scripts/recitationQualification.ts","apps/mobile/scripts/recitationControlFidelity.ts"]
    .map(p=>[p,sha(readFileSync(p))])),
  summary:count(rows),altered:count(rows.filter((r:any)=>r.positive)),unaltered:count(rows.filter((r:any)=>!r.positive)),
  categories:["correct","pause","low_noise","speed_0.8","speed_1.2","omission","repetition","substitution"]
    .map(category=>({category,...count(rows.filter((r:any)=>r.category===category))})),
  changed:rows.filter((r:any)=>r.score.errors!==r.previousScore.errors).map((r:any)=>({index:r.index,category:r.category,
    old:r.previousScore.errors,new:r.score.errors,ranks:r.selected.matchingAcousticRanks})),
  canonicalRegressions:rows.filter((r:any)=>!r.previousFidelity.canonicalInsteadOfScriptedSpeech&&r.fidelity.canonicalInsteadOfScriptedSpeech).map((r:any)=>r.index),
  remainingNonExact:rows.filter((r:any)=>!r.fidelity.exactScriptedSpeech).map((r:any)=>({index:r.index,category:r.category,
    errors:r.score.errors,canonicalInstead:r.fidelity.canonicalInsteadOfScriptedSpeech,source:r.selected.source})),
  wordRecognitionQualified:false,mistakeDetectionQualified:false,liveFollowingQualified:false,nativeQualified:false,
  limits:["Same historical approximate prior-success-biased controls, no new inference/natural gold or fresh speakers.",
    "Exact output corroboration is not independent errors, truth, pronunciation qualification or acoustic correctness probability.",
    "All cases/words/errors retained; script scoring happens only after independent selection. No native/live/production change."],rows};
const output=resolve("output/quran-development/zipformer-comparison",`rnnt-corroboration-${Date.now()}-${randomUUID()}.json`);
writeFileSync(output,JSON.stringify(report,null,2));const{rows:_rows,...aggregate}=report;
console.log(JSON.stringify({output,sha256:sha(readFileSync(output)),...aggregate},null,2));
