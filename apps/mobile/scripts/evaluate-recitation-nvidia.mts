/** Actual local NVIDIA candidate inference on the existing licensed RAM controls.
 * Uses the production pause compactor, CTC evidence decoder and live tracker.
 * No grammar, forced alignment, private audio, online ASR or app release changes.
 * Experimental community encoder + original CTC head is NOT an official export.
 */
import {createHash,randomUUID} from "node:crypto";
import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {spawn} from "node:child_process";
import {createInterface} from "node:readline";
import {detectSpeech} from "@tilawi/quran-asr";
import {compactQuietPausesWithTimeline} from "../src/quran/reciteAssistFeedback";
import {decodeRecitationEvidence,RecitationTracker,recitationLexeme,type RecitationObservation} from "../src/quran/recitationTracking";
import {wordEdits} from "./recitationQualification";
import {decodeNvidiaRnntEvidence} from "./nvidiaRecitationEvidence";

const split=process.argv[2];if(split!=="calibration"&&split!=="heldout")throw Error("Explicit calibration or heldout split required.");
const mode=process.argv[3]??"ctc";if(mode!=="ctc"&&mode!=="rnnt")throw Error("Explicit supported decoder required.");
const scope=process.argv[4]??"rolling";if(scope!=="rolling"&&scope!=="whole")throw Error("Explicit supported evaluation scope required.");
const root=resolve("output/quran-development/sherpa-comparison");
const python=resolve(process.env.RECITE_NVIDIA_PYTHON??"output/quran-development/nvidia-evaluation-runtime/bin/python");
if(!python.includes("/output/quran-development/"))throw Error("Use the isolated ignored development Python runtime.");
const worker=resolve("apps/mobile/scripts/nvidia-recitation-worker.py"), output=resolve(root,`nvidia-${scope}-${mode}-${split}-${Date.now()}-${randomUUID()}.json`);
const sha=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const codeSha256=Object.fromEntries([worker,"apps/mobile/scripts/evaluate-recitation-nvidia.mts","apps/mobile/scripts/nvidiaRecitationEvidence.ts","apps/mobile/src/quran/recitationTracking.ts","apps/mobile/src/quran/reciteAssistFeedback.ts"].map(path=>[path.split("/").at(-1)!,sha(readFileSync(path))]));
const processWorker=spawn(python,[worker,root,mode,scope],{stdio:["pipe","pipe","pipe"]});
let stderr="";processWorker.stderr.on("data",data=>{stderr=(stderr+String(data)).slice(-3000);});
const lines=createInterface({input:processWorker.stdout});
let pending:{resolve:(value:any)=>void;reject:(error:Error)=>void}|null=null, ready:any;
const startup=new Promise<any>((resolve,reject)=>{pending={resolve,reject};});
lines.on("line",line=>{
  try {if(line.length>2_000_000)throw Error("Worker response exceeds bound.");const message=JSON.parse(line);const request=pending;pending=null;
    if(!request)throw Error("Unexpected worker response.");request.resolve(message);
  }catch(error){pending?.reject(error instanceof Error?error:Error("Invalid worker evidence."));processWorker.kill("SIGTERM");}
});
processWorker.on("error",error=>{pending?.reject(error);pending=null;});
processWorker.on("exit",code=>{pending?.reject(Error(`Local inference worker exited ${code}: ${stderr}`));pending=null;});
async function bounded<T>(operation:Promise<T>,milliseconds=60000):Promise<T>{let timeout:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timeout=setTimeout(()=>{processWorker.kill("SIGTERM");reject(Error("Local inference timeout."));},milliseconds);})]);}finally{clearTimeout(timeout);}}
async function recognize(pcm:Float32Array,startSample:number):Promise<RecitationObservation>{
  const empty={text:"",quality:0,words:[],startSample,endSample:startSample+pcm.length};
  if(pcm.length<16000||!detectSpeech(pcm))return empty;
  const compact=scope==="whole"?{pcm:pcm.slice(),spans:[{compactStart:0,originalStart:0,length:pcm.length}]}:compactQuietPausesWithTimeline(pcm);
  try{
    if(compact.pcm.length<16000)return empty;
    const response=await bounded(new Promise<any>((resolve,reject)=>{pending={resolve,reject};processWorker.stdin.write(JSON.stringify({pcm:Buffer.from(compact.pcm.buffer).toString("base64")})+"\n",error=>{if(error){pending?.reject(error);pending=null;}});}));
    if(response.mode!==mode||typeof response.text!=="string"||response.vocabSize!==1025||response.blankId!==1024||!Number.isInteger(response.timeSteps)||response.timeSteps<1||response.timeSteps>(scope==="whole"?200:100))throw Error("Invalid acoustic evidence.");
    if(mode==="rnnt"){
      if(response.symbolLimitReached!==false)throw Error("RNNT symbol limit truncation cannot count as a valid analysis.");
      const evidence=decodeNvidiaRnntEvidence(response.emissions,response.timeSteps,compact.pcm.length,compact.spans,startSample,pcm.length);
      return {...empty,text:response.text,...evidence};
    }
    if(typeof response.logprobs!=="string")throw Error("Missing CTC evidence.");
    const bytes=Buffer.from(response.logprobs,"base64");if(bytes.length!==response.timeSteps*1025*4)throw Error("Wrong CTC evidence shape.");
    const acoustic=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    try{
      const result={text:response.text,acoustic:{logprobs:acoustic,timeSteps:response.timeSteps,vocabSize:1025,blankId:1024}};
      const evidence=decodeRecitationEvidence(result as Parameters<typeof decodeRecitationEvidence>[0],ready.vocab,compact.pcm.length,compact.spans,startSample,pcm.length);
      return {...empty,text:response.text,quality:evidence.quality,words:evidence.words};
    }finally{acoustic.fill(0);bytes.fill(0);}
  }finally{compact.pcm.fill(0);}
}
const results:any[]=[],failures:{index:number;reason:string}[]=[];let complete=false;
const percentile=(a:number[],fraction:number)=>[...a].sort((a,b)=>a-b)[Math.max(0,Math.ceil(a.length*fraction)-1)]??null;
function save(){
  const positive=results.filter(r=>r.positive),negative=results.filter(r=>!r.positive),tp=positive.filter(r=>r.detected).length;
  const fp=negative.filter(r=>r.anyAlert).length,wrong=positive.filter(r=>!r.detected&&r.anyAlert).length;
  const edits=results.reduce((sum,r)=>sum+r.goldEdits.errors,0),words=results.reduce((sum,r)=>sum+r.goldEdits.words,0),ms=results.flatMap(r=>r.inferenceMs);
  writeFileSync(output,JSON.stringify({model:`Experimental NVIDIA original ${mode.toUpperCase()} head + pinned community encoder`,split,mode,scope,complete,newInference:true,canonicalPrompt:false,codeSha256,
    assets:{official:"d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31",encoder:"a74e77489a9e48d689bac080a30c5e54b35e5f54171273771dba9c72752eade3"},versions:ready?.versions,
    limits:["Only actual licensed public RAM waveform controls; no personal audio.","Approximate splices and baseline-success selection, NOT natural spoken-error gold.","Recording-disjoint but NOT proven speaker-disjoint or training-disjoint.","Three controlled quiet-tail windows are not independent recitations.","Confidence is uncalibrated; desktop CPU timing is not mobile accuracy, latency or battery qualification.","No production/store substitution; 99% accuracy has NOT been established."],
    summary:{expectedCases:48,cases:results.length,failures:failures.length,positiveCases:positive.length,negativeCases:negative.length,liveOperationMetricsApplicable:scope==="rolling",trueOperations:scope==="rolling"?tp:null,wrongOperationAlerts:scope==="rolling"?wrong:null,falsePositiveControls:scope==="rolling"?fp:null,precision:scope==="rolling"&&complete&&!failures.length&&tp+fp+wrong?tp/(tp+fp+wrong):null,recall:scope==="rolling"&&complete&&!failures.length&&positive.length?tp/positive.length:null,
      categories:scope==="rolling"?Object.fromEntries(["omission","repetition","substitution"].map(kind=>[kind,{total:positive.filter(r=>r.category===kind).length,detected:positive.filter(r=>r.category===kind&&r.detected).length}])):null,
      controlledScriptWords:words,controlledScriptEdits:edits,controlledScriptReferenceWer:complete&&!failures.length&&words?edits/words:null,windows:ms.length,desktopInferenceMs:{p50:percentile(ms,.5),p95:percentile(ms,.95)}},failures,results},null,2));
}
try{
  ready=await bounded(startup);if(!ready.ready||ready.mode!==mode||ready.blankId!==1024||Object.keys(ready.vocab??{}).length!==1024)throw Error("Invalid local decoder startup.");
  const response=await fetch("http://127.0.0.1:3011/cases",{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error("Existing licensed RAM corpus unavailable.");
  const cases=await response.json();if(!Array.isArray(cases)||cases.length!==96)throw Error("Expected the pinned 96 waveform controls.");
  const selected=cases.filter(row=>row.split===split);if(selected.length!==48)throw Error("Missing cases cannot disappear from the denominator.");
  const identities=new Set<number>();for(const row of selected){
    if(!Number.isSafeInteger(row.index)||row.index<0||identities.has(row.index)||!Number.isSafeInteger(row.originalSamples)
      ||row.originalSamples<16000||row.originalSamples>192000||typeof row.text!=="string"||!Array.isArray(row.spokenGold)
      ||row.spokenGold.some((word:unknown)=>typeof word!=="string")||!/^[a-f0-9]{64}$/.test(row.audioSha256))throw Error("Invalid bounded RAM corpus identity.");
    identities.add(row.index);
  }
  for(const row of selected){
    let padded:Float32Array|undefined;
    try{
      const audio=await fetch(`http://127.0.0.1:3011/audio/${row.index}`,{signal:AbortSignal.timeout(10000)});if(!audio.ok)throw Error("RAM control unavailable.");
      const bytes=new Uint8Array(await audio.arrayBuffer());if(bytes.byteLength>12_000_000||sha(bytes)!==row.audioSha256||bytes.byteLength!==row.originalSamples*4)throw Error("Unverified public waveform.");
      const original=new Float32Array(bytes.buffer);padded=new Float32Array(row.originalSamples+48000);padded.set(original);original.fill(0);
      if(scope==="whole"&&row.originalSamples>192000)throw Error("Whole-scope diagnostic exceeds twelve-second bound.");
      const ends:number[]=[];if(scope==="whole")ends.push(row.originalSamples);
      else{for(let end=40000;end<=row.originalSamples;end+=40000)ends.push(end);for(let extra=16000;extra<=48000;extra+=16000)ends.push(row.originalSamples+extra);}
      const tracker=new RecitationTracker(),observations:any[]=[],ms:number[]=[];let detected=false,anyAlert=false;
      for(const end of ends){
        const start=scope==="whole"?0:Math.max(0,end-96000),begin=performance.now(),observation=await recognize(padded.subarray(start,end),start),latencyMs=performance.now()-begin;
        const feedback=tracker.observe(row.text,observation),tracked=tracker.snapshot();anyAlert ||= feedback.differences.length>0;
        const target=recitationLexeme(String(row.edit?.repeatedWord??""));
        const repeatedTarget=!!target&&tracked.some((word,i)=>i>0&&recitationLexeme(word.text)===target&&recitationLexeme(tracked[i-1].text)===target);
        detected ||= row.expected!==null&&feedback.differences.some(d=>d.kind===row.category&&(row.category==="repetition"?repeatedTarget&&d.index===row.expectedIndex:d.index===row.expectedIndex));
        ms.push(latencyMs);observations.push({...observation,latencyMs,feedback});
      }
      const finalTranscript=scope==="whole"?observations.at(-1)?.text??"":tracker.snapshot().map(word=>word.text).join(" ");
      results.push({...row,positive:row.expected!==null,scopedExpected:row.text,detected,anyAlert,finalTranscript,goldEdits:wordEdits(row.spokenGold.join(" "),finalTranscript),inferenceMs:ms,observations});
      save();console.log(JSON.stringify({complete:results.length,split,category:row.category,detected,anyAlert}));
    }catch(error){failures.push({index:row.index,reason:error instanceof Error?error.message:"Actual recognition failed."});save();}
    finally{padded?.fill(0);}
  }
  complete=results.length+failures.length===48;save();console.log(JSON.stringify({finished:complete,split,output,failures:failures.length}));
  if(failures.length)process.exitCode=1;
}catch(error){failures.push({index:-1,reason:error instanceof Error?error.message:"Evaluation startup failed."});save();throw error;}
finally{processWorker.stdin.end();lines.close();processWorker.kill("SIGTERM");}
