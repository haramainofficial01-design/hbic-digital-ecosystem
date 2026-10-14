/** Quran-Lab NPL-1.2; see LICENSE. Read-only paired accounting of an actually
 * changed acoustic search, not fresh natural gold or recognition qualification.
 * No source audio, model inference, reference repair or output mutation here. */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const sha=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const root="output/quran-development/zipformer-comparison/";
const pins=[
  {width:8,acoustic:"lexical-nbest-calibration-1791988724075-499c571d-b894-45f9-aaa9-38844fdc9bdb.json",
    acousticHash:"5b1407cabae9c266b79471828569d05c23fb7295d01da094946a16c8a2d7d531",
    combined:"lexical-rnnt-fallback-1791994164481-07977ab0-da16-421d-bc7c-5c691afb6eaa.json",
    combinedHash:"d7dccf073cf569c91fc5ace9da162de88f54f3a238e233dd5ef08e35b37a1888"},
  {width:32,acoustic:"lexical-nbest-calibration-1791998237198-81e00510-4582-4632-abba-ea18d3a750be.json",
    acousticHash:"c7ef5272e7206c9d47ff5b2ff75a00d8f162b31e8a89121cb83078c7294b73a6",
    combined:"lexical-rnnt-fallback-1791998301452-28ce073c-9806-4349-85c3-b0d4213fc7ad.json",
    combinedHash:"9cd62bfac02d638bc8d045f72563ded4c6bd8863e493bf4acbadfaa7febd2cca"}];
const load=(name:string,pin:string)=>{const bytes=readFileSync(root+name);
  if(bytes.length>8_000_000||sha(bytes)!==pin)throw Error("Frozen complete paired output required");return JSON.parse(bytes.toString());};
const evidence=pins.map(pin=>{
  const a=load(pin.acoustic,pin.acousticHash),c=load(pin.combined,pin.combinedHash);
  if(a.complete!==true||a.predeclared?.width!==pin.width||a.predeclared?.tokensPerFrame!==12
    ||a.results?.length!==48||a.failures?.length!==0||a.summary?.analyzed!==48
    ||a.modelSha256!=="6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb"
    ||c.complete!==true||c.predeclared?.width!==pin.width||c.rows?.length!==48||c.analysisFailures!==0
    ||c.inputsSha256?.phoneticCandidates!==pin.acousticHash
    ||c.inputsSha256?.rnntTranscripts!=="cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310")
    throw Error("All 48 actual-source cases and unchanged raw RNNT input required");
  return {pin,acoustic:a,combined:c};
});
let posteriorPairs=0,greedyPairs=0;const changes:any[]=[],seen=new Set<number>();
for(const old of evidence[0].combined.rows){
  const fresh=evidence[1].combined.rows.find((r:any)=>r.index===old.index);
  const a=evidence[0].acoustic.results.find((r:any)=>r.index===old.index),b=evidence[1].acoustic.results.find((r:any)=>r.index===old.index);
  if(!fresh||!a||!b||seen.has(old.index)||old.audioSha256!==fresh.audioSha256||old.originalSamples!==fresh.originalSamples
    ||old.category!==fresh.category||old.positive!==fresh.positive||old.selectedScore.words!==fresh.selectedScore.words
    ||old.rnntScore.errors!==fresh.rnntScore.errors||a.audioSha256!==old.audioSha256||b.audioSha256!==old.audioSha256
    ||a.inferenceAudioSha256!==b.inferenceAudioSha256||a.inferenceSamples!==b.inferenceSamples||a.timeSteps!==b.timeSteps
    ||a.acousticSha256!==b.acousticSha256||a.greedyPhones!==b.greedyPhones)throw Error("Exact waveform/frontend/posterior/denominator pairs required");
  seen.add(old.index);posteriorPairs++;greedyPairs++;
  changes.push({index:old.index,category:old.category,positive:old.positive,scriptWords:old.selectedScore.words,
    oldEdits:old.selectedScore.errors,newEdits:fresh.selectedScore.errors,sourceBefore:old.selected.source,sourceAfter:fresh.selected.source,
    rankBefore:old.lexicalRank,rankAfter:fresh.lexicalRank,canonicalInsteadBefore:old.fidelity.canonicalInsteadOfScriptedSpeech,
    canonicalInsteadAfter:fresh.fidelity.canonicalInsteadOfScriptedSpeech});
}
if(seen.size!==48||changes.reduce((n,r)=>n+r.scriptWords,0)!==192)throw Error("All original cases/words retained");
const percentile=(values:number[],p:number)=>{const sorted=values.slice().sort((a,b)=>a-b);return sorted[Math.ceil(p*sorted.length)-1];};
const times=(rows:any[],key:string)=>{
  const values=rows.map(row=>row[key]);if(values.some(v=>typeof v!=="number"||!Number.isFinite(v)||v<0))throw Error("Actual finite desktop times required");
  return {p50:percentile(values,.5),p95:percentile(values,.95)};
};
console.log(JSON.stringify({newInferenceInThisAudit:false,newWideInferenceInSource:true,freshHeldout:false,analysisFailures:0,
  matchedCases:seen.size,scriptWords:192,matchedCompactPcmAndPosteriors:posteriorPairs,matchedGreedyOutputs:greedyPairs,
  inputs:pins.map(pin=>({width:pin.width,acousticSha256:pin.acousticHash,combinedSha256:pin.combinedHash})),
  auditSha256:sha(readFileSync("apps/mobile/scripts/zipformer/audit-wide-lexical-search.mts")),
  improved:changes.filter(r=>r.newEdits<r.oldEdits),regressed:changes.filter(r=>r.newEdits>r.oldEdits),
  canonicalInsteadRegressions:changes.filter(r=>!r.canonicalInsteadBefore&&r.canonicalInsteadAfter),
  unchanged:changes.filter(r=>r.newEdits===r.oldEdits).length,
  remainingNonExact:changes.filter(r=>r.newEdits>0),
  reports:evidence.map(({pin,acoustic,combined})=>({width:pin.width,summary:combined.summary,altered:combined.altered,
    desktopInferenceMs:times(acoustic.results,"inferenceMs"),desktopSearchAndParsingMs:times(acoustic.results,"decoderMs")})),
  wordRecognitionQualified:false,mistakeDetectionQualified:false,nativeQualified:false,
  limits:["Same old prior-success-biased approximate controls, not fresh natural word-error gold or independent speakers.",
    "All word denominators/failures retained; improved edit budget is not dependable correction/following or 99% qualification.",
    "Canonical-instead regression is scored against scripted alteration after selection, never a decoder input.",
    "Diagnostic Mac timers do not measure native microphone/thermal/battery/ANE performance; no runtime was integrated or deployed."]},null,2));
