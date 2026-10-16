/** Quran-Lab NPL-1.2; see LICENSE. One changed proposal experiment only.
 * Recognition input stays PCM-only. Expected/error hypotheses enter separate
 * comparison, never decoding, and never become a certified correction. */
import {createHash,randomUUID} from "node:crypto";
import {readFileSync,writeFileSync} from "node:fs";
import {resolve,dirname,basename} from "node:path";
import {spawn} from "node:child_process";
import {createInterface} from "node:readline";
import {compactQuietPausesWithTimeline} from "../../src/quran/reciteAssistFeedback";
import {comparePhoneticEventHypotheses} from "../recitationCtcHypotheses";

const root=resolve("output/quran-development/zipformer-comparison");
const sha=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const args=process.argv.slice(2),planPath=resolve(args[0]??"");
if(args.length!==2||dirname(planPath)!==root||!/^supplementary-proposal-union-[0-9]+-[a-f0-9-]{36}\.json$/.test(basename(planPath))
  ||!/^[a-f0-9]{64}$/.test(args[1]))throw Error("Explicit bounded completed preflight report and SHA-256 required");
function pinned(path:string,hash:string){const bytes=readFileSync(path);if(bytes.length>8_000_000||sha(bytes)!==hash)throw Error("Pinned unchanged evidence required");return JSON.parse(bytes.toString());}
const plan=pinned(planPath,args[1]);
const baselineHash="00906711e6bc7dcba73529ca99cfeb900b80878728d5a823066f4794d654be89";
const baseline=pinned(resolve(root,"zipformer-raw-calibration-1-1791926000854-c086bd67-c92e-4a48-8c95-81953f113355.json"),baselineHash);
if(plan.complete!==true||plan.newInference!==false||plan.audioAccessed!==false||plan.expectedOrGoldFieldsRead!==false
  ||!(plan.summary?.genuinelyNewEncodedPaths>0)||plan.rows?.length!==48||plan.failures?.length!==0
  ||new Set(plan.rows.map((row:any)=>row.index)).size!==48
  ||baseline.complete!==true||baseline.results?.length!==48||baseline.failures?.length!==0
  ||baseline.compactQuiet!==true||baseline.split!=="calibration"||baseline.canonicalPrompt!==false||baseline.forcedAlignment!==false
  ||baseline.modelSha256!=="6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb")
  throw Error("Every original case and complete unchanged proposal source required");
for(const row of plan.rows){const old=baseline.results.find((entry:any)=>entry.index===row.index);
  if(!old||row.audioSha256!==old.audioSha256||row.originalSamples!==old.originalSamples||row.reference!==old.reference
    ||JSON.stringify(row.referenceWordPhones)!==JSON.stringify(old.referenceWordPhones)
    ||!Array.isArray(row.baselineHypotheses)||!Array.isArray(row.unionHypotheses)||row.unionHypotheses.length>257
    ||row.unionHypotheses.length<row.baselineHypotheses.length)throw Error("Exact original scope and no dropped baseline hypothesis required");
  const keys=new Set(row.unionHypotheses.map((h:any)=>JSON.stringify(h)));
  if(row.baselineHypotheses.some((h:any)=>!keys.has(JSON.stringify(h))))throw Error("Supplementary proposals must preserve all original paths");}
const worker="apps/mobile/scripts/zipformer/worker.py";
const codeSha256=Object.fromEntries([worker,"apps/mobile/scripts/zipformer/evaluate-supplementary-proposals.mts",
  "apps/mobile/scripts/zipformer/supplementaryProposalUnion.ts","apps/mobile/scripts/recitationCtcHypotheses.ts",
  "apps/mobile/src/quran/reciteAssistFeedback.ts"].map(path=>[path,sha(readFileSync(path))]));
const output=resolve(root,`supplementary-proposal-events-${Date.now()}-${randomUUID()}.json`);
const rows:any[]=[],failures:{index:number;reason:string}[]=[];
let runtime:unknown,complete=false,inferenceAttempts=0;
const matching=(row:any,event:any)=>row.expected!==null&&event.predicted?.kind===row.expected&&event.predicted?.index===row.expectedIndex;
function summarize(key:"baselineEvent"|"unionEvent"){
  const positives=rows.filter(row=>row.expected!==null),negatives=rows.filter(row=>row.expected===null);
  const trueEvents=positives.filter(row=>matching(row,row[key])).length,predictions=rows.filter(row=>row[key].predicted!==null).length;
  return {trueEvents,predictions,positiveCases:18,negativeCases:30,negativeAlerts:negatives.filter(row=>row[key].predicted!==null).length,
    wrongPositiveAlerts:positives.filter(row=>row[key].predicted!==null&&!matching(row,row[key])).length,
    precision:complete&&!failures.length&&predictions?trueEvents/predictions:null,recall:complete&&!failures.length?trueEvents/18:null,
    categories:Object.fromEntries(["omission","repetition","substitution"].map(kind=>[kind,{total:6,detected:positives.filter(row=>row.expected===kind&&matching(row,row[key])).length}]))};
}
function save(){writeFileSync(output,JSON.stringify({complete,newInference:inferenceAttempts>0,inferenceAttempts,freshHeldout:false,
  modelSha256:baseline.modelSha256,model:baseline.model,revision:baseline.revision,license:baseline.license,runtime,codeSha256,
  preflightPath:planPath,inputsSha256:{preflight:args[1],baseline:baselineHash},sourceProvenance:plan.sources,
  proposalCodeSha256:plan.codeSha256,
  predeclared:{split:"calibration",expectedCases:48,changed:"append exact independently observed Tadabur substitution proposals",
    scale:1,compactQuiet:true,addedQuietSamples:9600,phoneticEncoding:"unchanged greedy-longest inventory units",
    durationNuisance:false,baselineMargin:Math.log(100),locationMargin:Math.log(10),goldUsedForSelection:false},
  summary:{expectedCases:48,analyzed:rows.length,failures:failures.length,missingCases:48-rows.length,
    unchangedPosteriors:rows.filter(row=>row.posteriorUnchanged).length,exactBaselineReplays:rows.filter(row=>row.baselineUnchanged).length,
    baseline:summarize("baselineEvent"),supplementary:summarize("unionEvent"),
    changed:rows.filter(row=>JSON.stringify(row.baselineEvent.predicted)!==JSON.stringify(row.unionEvent.predicted)).map(row=>({index:row.index,category:row.category,
      before:row.baselineEvent.predicted,after:row.unionEvent.predicted,detectedBefore:matching(row,row.baselineEvent),detectedAfter:matching(row,row.unionEvent)}))},
  wordRecognitionQualified:false,mistakeDetectionQualified:false,liveFollowingQualified:false,nativeQualified:false,
  wordWer:null,nativeLatency:null,
  limits:["Same previously inspected approximate-splice/pitch controls, not fresh natural learner errors or independent speaker gold.",
    "Recognizers receive PCM only; expected text is separate counterfactual comparison, not a recognition transcript or oracle correction.",
    "Extra independent model proposals may share training/prior errors; agreement or likelihood margins are not calibrated correctness.",
    "All scopes, missing analyses and false warnings remain in the report. No threshold sweep or per-label proposal selection.",
    "No app/model replacement, microphone evaluation, phone thermal/native validation, production, OTA or store release."],rows,failures},null,2));}
let pending:{resolve:(value:any)=>void;reject:(error:Error)=>void}|null=null,stderr="";
const child=spawn(resolve("output/quran-development/nvidia-evaluation-runtime/bin/python"),[worker,root,"1","v3"],
  {stdio:["pipe","pipe","pipe"],env:{...process.env,PYTHONDONTWRITEBYTECODE:"1"}});
const lines=createInterface({input:child.stdout});
lines.on("line",line=>{const request=pending;pending=null;try{if(!request||line.length>1_000_000)throw Error("Only bounded requested acoustic evidence accepted");request.resolve(JSON.parse(line));}
  catch(error){request?.reject(error instanceof Error?error:Error("Invalid acoustic output"));child.kill("SIGTERM");}});
child.stderr.on("data",data=>{stderr=(stderr+String(data)).slice(-2000);});
child.on("error",error=>{pending?.reject(error);pending=null;});
child.on("exit",code=>{pending?.reject(Error(`Local model exited ${code}: ${stderr}`));pending=null;});
function bounded<T>(promise:Promise<T>){return new Promise<T>((resolve,reject)=>{const timer=setTimeout(()=>{child.kill("SIGTERM");reject(Error("Bounded local inference timeout"));},90_000);
  promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});}
const ready=bounded(new Promise<any>((resolve,reject)=>{pending={resolve,reject};})).then(value=>({value}),error=>({error}));
try{
  const response=await fetch("http://127.0.0.1:3011/cases",{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error("Historical RAM source unavailable");const all=await response.json();
  if(!Array.isArray(all)||all.length!==96)throw Error("All original RAM scopes required");
  const cases=all.filter(row=>row.split==="calibration");
  if(cases.length!==48||new Set(cases.map(row=>row.index)).size!==48)throw Error("All48cases required");
  for(const row of cases){const old=baseline.results.find((entry:any)=>entry.index===row.index);
    if(!old||row.audioSha256!==old.audioSha256||row.originalSamples!==old.originalSamples||row.text!==old.reference
      ||row.category!==old.category||row.expected!==old.expected||row.expectedIndex!==old.expectedIndex)throw Error("Exact original audio/scope/category identities required");}
  const loaded=await ready;if("error"in loaded)throw loaded.error;runtime=loaded.value;
  if(!loaded.value.ready||loaded.value.blankId!==250||loaded.value.canonicalPrompt!==false||loaded.value.forcedAlignment!==false)throw Error("Original PCM-only recognizer required");
  for(const row of cases){let pcm:Buffer|undefined,posterior:Buffer|undefined,compact:ReturnType<typeof compactQuietPausesWithTimeline>|undefined;
    try{
      const old=baseline.results.find((entry:any)=>entry.index===row.index),proposals=plan.rows.find((entry:any)=>entry.index===row.index);
      const audio=await fetch(`http://127.0.0.1:3011/audio/${row.index}`,{signal:AbortSignal.timeout(10000)});
      if(!audio.ok)throw Error("RAM waveform unavailable");pcm=Buffer.from(await audio.arrayBuffer());
      if(pcm.length!==row.originalSamples*4||sha(pcm)!==row.audioSha256)throw Error("Original PCM identity mismatch");
      compact=compactQuietPausesWithTimeline(new Float32Array(pcm.buffer,pcm.byteOffset,pcm.length/4));
      const inference=Buffer.from(compact.pcm.buffer,compact.pcm.byteOffset,compact.pcm.byteLength);
      if(sha(inference)!==old.inferenceAudioSha256||compact.pcm.length!==old.inferenceSamples)throw Error("Exact compact waveform required");
      inferenceAttempts++;const begin=performance.now();
      const recognized=await bounded(new Promise<any>((resolve,reject)=>{pending={resolve,reject};child.stdin.write(JSON.stringify({pcm:inference.toString("base64")})+"\n",error=>{if(error){pending?.reject(error);pending=null;}});}));
      const elapsedMs=performance.now()-begin;
      if(recognized.vocabSize!==251||recognized.blankId!==250||recognized.referenceConditioned!==false||recognized.addedQuietSamples!==9600
        ||recognized.phonemes!==old.phonemes||recognized.timeSteps!==old.timeSteps)throw Error("Exact unchanged phonetic/model scope required");
      posterior=Buffer.from(recognized.logprobs,"base64");
      if(posterior.length!==recognized.timeSteps*251*4||sha(posterior)!==old.acousticSha256)throw Error("Original posterior hash required");
      const emissions=new Float32Array(posterior.buffer,posterior.byteOffset,posterior.length/4),scoringStart=performance.now();
      const baselineEvent=comparePhoneticEventHypotheses(emissions,251,250,proposals.baselineHypotheses,true,false);
      if(JSON.stringify(baselineEvent)!==JSON.stringify(old.event))throw Error("Original baseline scores/selection must reproduce exactly");
      const unionEvent=comparePhoneticEventHypotheses(emissions,251,250,proposals.unionHypotheses,true,false);
      rows.push({index:row.index,category:row.category,expected:row.expected,expectedIndex:row.expectedIndex,audioSha256:row.audioSha256,
        originalSamples:row.originalSamples,inferenceAudioSha256:sha(inference),inferenceSamples:compact.pcm.length,timeline:compact.spans,
        posteriorSha256:sha(posterior),posteriorUnchanged:true,baselineUnchanged:true,phonemes:recognized.phonemes,
        baselineEvent,unionEvent,proposalEvidence:proposals,elapsedMs,comparisonMs:performance.now()-scoringStart});
      console.log(JSON.stringify({analyzed:rows.length,failures:failures.length}));
    }catch(error){failures.push({index:row.index,reason:error instanceof Error?error.message:"Inference or analysis failed"});}
    finally{pcm?.fill(0);posterior?.fill(0);compact?.pcm.fill(0);save();}
    if(failures.length)throw Error("Failed scope retained; no incomplete comparison can qualify");
  }
  complete=rows.length===48;save();console.log(JSON.stringify({complete,output,summary:JSON.parse(readFileSync(output,"utf8")).summary}));
}catch(error){if(!failures.length)failures.push({index:-1,reason:error instanceof Error?error.message:"Startup failed"});save();throw error;}
finally{child.stdin.end();lines.close();child.kill("SIGTERM");}
