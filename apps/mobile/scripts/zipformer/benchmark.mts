/** Quran-Lab No-Profit License 1.2; see LICENSE. Approved research only.
 * Authenticated browser requests respect the gate; no cookies/tokens are read.
 * Research recordings are processed in RAM, never intentionally saved/bundled/uploaded.
 * Browser/OS-managed buffers are outside the adapter's secure-erasure guarantee. */
import {createHash,randomUUID} from "node:crypto";
import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {spawn,spawnSync} from "node:child_process";
import {createInterface} from "node:readline";
import {phoneticComparison} from "../recitationPhoneticComparison";
import {acousticWordpieceBeam} from "../recitationAcousticBeam";
import {wordEdits} from "../recitationQualification";
import {recitationLevel} from "../recitationLevel";

const source = process.argv[2] ?? "tlog_holdout", variant = process.argv[3] ?? "v3";
if(!["tlog_holdout","everyayah_heldout","qul_alnufais"].includes(source)||!["v3","v3.1","nvidia-rnnt"].includes(variant)) throw Error("Explicit approved research source and model required");
const wordModel=variant==="nvidia-rnnt";
const frontend=process.argv[7]??"original";
if(!["original","rms-0.1"].includes(frontend))throw Error("Explicit disclosed research frontend required");
const windowId=Number(process.argv[4]),tabId=Number(process.argv[5]);
const decoder=process.argv[6]??"greedy";
if(!["greedy","prefix-8"].includes(decoder))throw Error("Explicit independent acoustic decoder required");
if(wordModel&&decoder!=="greedy")throw Error("Explicit waveform-only RNNT decoder required");
if(!Number.isSafeInteger(windowId)||windowId<1||!Number.isSafeInteger(tabId)||tabId<1)throw Error("Authorized open browser session required");
const root=resolve("output/quran-development/zipformer-comparison"),revision="d9fc635276a6a2b770293e6bffbe5b077bfc52b0";
const sha=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const metadata=readFileSync(resolve(root,"benchmark/benchmark.jsonl"));
if(metadata.length!==192388||createHash("sha1").update(`blob ${metadata.length}\0`).update(metadata).digest("hex")!=="12ee7b88b6454687bb857c4c85ca5e5b926a9fc9")throw Error("Pinned approved benchmark metadata required");
const rows=metadata.toString().trim().split("\n").map(line=>JSON.parse(line)).filter(row=>row.source===source);
const uniqueInputIdentities=new Set(rows.map(row=>row.id)).size;
if(rows.length!==200||uniqueInputIdentities<199||rows.some(row=>typeof row.reference_text!=="string"||!new RegExp(`^audio/${source}/[A-Za-z0-9_/-]+\\.wav$`).test(row.audio)))throw Error("All 200 unchanged research cases required");
const api=await(await fetch(`https://huggingface.co/api/datasets/Quran-Lab/quranic-asr-benchmark/revision/${revision}?blobs=true`,{signal:AbortSignal.timeout(30000)})).json();
if(api.sha!==revision||!Array.isArray(api.siblings))throw Error("Pinned immutable audio file identities required");
const pins=new Map<string,any>(api.siblings.map((file:any)=>[file.rfilename,file]));
const python=resolve("output/quran-development/nvidia-evaluation-runtime/bin/python");
const worker=resolve(wordModel?"apps/mobile/scripts/nvidia-recitation-worker.py":"apps/mobile/scripts/zipformer/worker.py");
const model=wordModel?{repository:"nvidia/stt_ar_fastconformer_hybrid_large_pcd_v1.0",revision:"7f32349d952f42a28dce979ba73270aa2bbdfa89",encoderRevision:"9137361f6f29fa5162aa7aa3d730bdda1e703bf2",verifiedSha256:{"nvidia-ar-official.nemo":"d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31",
  "nvidia-ar-ctc-encoder.onnx":"a74e77489a9e48d689bac080a30c5e54b35e5f54171273771dba9c72752eade3"}}
  :JSON.parse(readFileSync(resolve(root,`assets/${variant==="v3"?"verified-manifest.json":"verified-manifest-v31.json"}`),"utf8"));
const units=wordModel?[]:readFileSync(resolve(root,"assets/tokens.txt"),"utf8").trim().split("\n").map(line=>{
  const at=line.lastIndexOf(" ");return {id:Number(line.slice(at+1)),text:line.slice(0,at)};});
const output=resolve(root,`benchmark-${source}-${variant}-${decoder}-${frontend}-${Date.now()}-${randomUUID()}.json`);
const child=spawn(python,wordModel?[worker,resolve("output/quran-development/sherpa-comparison"),"rnnt","research-benchmark"]:[worker,root,"1",variant,"research-benchmark"],{stdio:["pipe","pipe","pipe"]});
let pending:{resolve:(value:any)=>void;reject:(error:Error)=>void}|null=null,stderr="";
const lines=createInterface({input:child.stdout});
lines.on("line",line=>{const p=pending;pending=null;try{if(!p||line.length>9_000_000)throw Error("Invalid bounded research inference");p.resolve(JSON.parse(line));}catch(error){p?.reject(error instanceof Error?error:Error("Invalid inference"));child.kill("SIGTERM");}});
child.stderr.on("data",bytes=>{stderr=(stderr+String(bytes)).slice(-1500)});
child.on("error",error=>{pending?.reject(error);pending=null});
child.on("exit",code=>{pending?.reject(Error(`Research recognizer exited ${code}: ${stderr}`));pending=null});
function bounded<T>(p:Promise<T>){return new Promise<T>((resolve,reject)=>{const timer=setTimeout(()=>{child.kill("SIGTERM");reject(Error("Research inference timed out"))},90000);p.then(v=>{clearTimeout(timer);resolve(v)},e=>{clearTimeout(timer);reject(e)})});}
const startup=bounded(new Promise<any>((resolve,reject)=>{pending={resolve,reject}}));
function browser(js:string){
  const r=spawnSync("/usr/bin/osascript",["-e",'tell application "Google Chrome"',"-e",`return execute tab id ${tabId} of window id ${windowId} javascript ${JSON.stringify(js)}`,"-e","end tell"],{encoding:"utf8",timeout:30000,maxBuffer:20_000_000});
  if(r.status!==0)throw Error("Authorized research browser session unavailable; no credential fallback");
  return r.stdout.trim();
}
const results:any[]=[],failures:any[]=[];let runtime:any,complete=false;
const codeSha256=Object.fromEntries([worker,...(wordModel?["apps/mobile/scripts/rnnt_beam.py","apps/mobile/scripts/nvidia_frontend_contract.py"]:[]),"apps/mobile/scripts/zipformer/benchmark.mts","apps/mobile/scripts/recitation-phonetic-reference.py","apps/mobile/scripts/recitationPhoneticComparison.ts","apps/mobile/scripts/recitationAcousticBeam.ts","apps/mobile/scripts/recitationQualification.ts","apps/mobile/scripts/recitationLevel.ts"].map(file=>[file.split("/").at(-1),sha(readFileSync(file))]));
function save(){
  const ms=results.map(row=>row.elapsedMs).sort((a,b)=>a-b);
  const unique=[...new Map<string,any>(results.map(row=>[row.identity,row])).values()];
  writeFileSync(output,JSON.stringify({dataset:"Quran-Lab/quranic-asr-benchmark",datasetRevision:revision,metadataSha256:sha(metadata),source,variant,decoder,frontend,
    modelRepository:model.repository,modelRevision:model.revision,encoderRevision:wordModel?model.encoderRevision:undefined,modelSha256:wordModel?model.verifiedSha256["nvidia-ar-official.nemo"]:model.verifiedSha256[variant==="v3"?"zipformer_p_arabic_v3.int8.onnx":"zipformer_p_arabic_v3.1.int8.onnx"],encoderSha256:wordModel?model.verifiedSha256["nvidia-ar-ctc-encoder.onnx"]:undefined,codeSha256,runtime,
    complete,newInference:true,canonicalPrompt:false,forcedAlignment:false,wordAccuracyQualified:false,mistakeDetectionQualified:false,scope:wordModel?"approved research independent whole-clip RNNT":"approved research raw streaming phonetics",
    limits:["Research-only/no-redistribution recordings. No training, voice cloning, re-identification, audio storage or third-party inference.",
      "Each model receives only waveform. References enter separate comparison conversion, never ASR.",
      "Optional fixed-width acoustic prefix search is reference-free. Pruned token/path scores are uncalibrated and cannot guarantee correct words.",
      "Optional level comparison uses one .25–4 bounded constant gain, target RMS .1 and peak cap .95. No expected text, generated sound or removed time. Reusing this benchmark for development does not create fresh qualification evidence.",
      "Canonical reference phones describe one Hafs duration configuration, not human-verbatim phoneme gold or accepted pronunciation grading.",
      "Studio Imlaei references use the pinned corpus's exact base-letter full-ayah composition. No audio-assisted/fuzzy lookup or removal of repetitions.",
      "Phonetic edits are not word WER, error-detection precision/recall or proof of 99% accuracy. No lexical correction is issued.",
      "RNNT word edits compare publisher script references, not independently double-reviewed audible verbatim/mistake gold. No word location is invented.",
      "600-clip publisher benchmark does not establish 600 independent speakers, HBIC learner consent, double review or universal training separation.",
      "Desktop latency is not phone-native battery, ANE or microphone-to-feedback timing. No application/production/store changed.",
      "Missing files/conversion/inference remain explicit failures, never silently excluded or converted to perfect scores."],
    summary:{expectedCases:200,uniqueInputIdentities,duplicateRows:rows.length-uniqueInputIdentities,uniqueAnalyzedRecordings:new Set(results.map(row=>row.identity)).size,
      analyzedCases:results.length,failures:failures.length,rawCanonicalPhoneEdits:wordModel?null:results.reduce((n,r)=>n+r.comparison.edits,0),
      canonicalPhones:wordModel?null:results.reduce((n,r)=>n+r.comparison.referencePhones,0),exactCanonicalPhoneStrings:wordModel?null:results.filter(r=>r.comparison.edits===0).length,
      scriptReferenceWords:wordModel?results.reduce((n,r)=>n+r.scriptWordComparison.words,0):null,
      scriptReferenceWordEdits:wordModel?results.reduce((n,r)=>n+r.scriptWordComparison.errors,0):null,
      deduplicated:{recordings:unique.length,rawCanonicalPhoneEdits:wordModel?null:unique.reduce((n,r)=>n+r.comparison.edits,0),
        canonicalPhones:wordModel?null:unique.reduce((n,r)=>n+r.comparison.referencePhones,0),
        scriptReferenceWords:wordModel?unique.reduce((n,r)=>n+r.scriptWordComparison.words,0):null,
        scriptReferenceWordEdits:wordModel?unique.reduce((n,r)=>n+r.scriptWordComparison.errors,0):null},
      desktopInferenceMs:{p50:ms[Math.ceil(ms.length*.5)-1]??null,p95:ms[Math.ceil(ms.length*.95)-1]??null}},results,failures},null,2));
}
try{
  runtime=await startup;if(runtime.canonicalPrompt!==false||runtime.forcedAlignment!==false||runtime.wordRecognitionQualified!==false)throw Error("Independent streaming research recognizer required");
  if(browser('location.origin')!=="https://huggingface.co")throw Error("Existing authorized Hugging Face origin required");
  // Reference conversion is a separate process. No benchmark text reaches ASR.
  const references=new Map<number,any>();
  for(let start=0;!wordModel&&start<rows.length;start+=100){
    const input=rows.slice(start,start+100).map((row,index)=>({index:start+index,text:row.reference_text,scriptFormat:source==="tlog_holdout"?"uthmani":"imlaei"}));
    const converted=spawnSync(python,["apps/mobile/scripts/recitation-phonetic-reference.py","--raw-scope"],{input:JSON.stringify(input),encoding:"utf8",timeout:30000,maxBuffer:1_000_000});
    if(converted.status!==0)throw Error("Reference conversion failed without changing benchmark text");
    const parsed=JSON.parse(converted.stdout);if(parsed.referenceOnly!==true||parsed.version!=="0.6.4"||parsed.results.length!==input.length)throw Error("Pinned comparison reference provenance required");
    for(const row of parsed.results)references.set(row.index,row);
  }
  for(let index=0;index<rows.length;index++){
    const row=rows[index],identity=sha(row.id).slice(0,16);let audio:Buffer|undefined,pcm:Buffer|undefined,acoustic:Buffer|undefined,adjusted:ReturnType<typeof recitationLevel>|undefined;
    try{
      const pin=pins.get(row.audio),ref=references.get(index);
      if(!pin||!Number.isSafeInteger(pin.size)||pin.size>12_000_000)throw Error("Pinned benchmark audio absent or oversized");
      if(!wordModel&&(!ref||ref.error||typeof ref.phonemes!=="string"||!ref.phonemes.length||ref.wordLocationsQualified!==false))throw Error("Full reference phonetics unavailable; do not invent word coordinates");
      const url=`/datasets/Quran-Lab/quranic-asr-benchmark/resolve/${revision}/${row.audio}`;
      browser(`(()=>{window.hbicResearchAudio={state:"loading"};fetch(${JSON.stringify(url)},{cache:"no-store",signal:AbortSignal.timeout(30000)}).then(async r=>{if(r.status!==200)throw Error("Approved audio HTTP "+r.status);if(Number(r.headers.get("content-length"))>${pin.size}||!r.body)throw Error("Pinned body bound exceeded");const b=new Uint8Array(${pin.size}),reader=r.body.getReader();let received=0;try{for(;;){const{done,value}=await reader.read();if(done)break;if(received+value.length>b.length)throw Error("Pinned body bound exceeded");b.set(value,received);received+=value.length;}if(received!==b.length)throw Error("Pinned audio length mismatch");let s="";for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));window.hbicResearchAudio={state:"ready",bytes:btoa(s)};}finally{b.fill(0);reader.cancel();}}).catch(e=>window.hbicResearchAudio={state:"failed",reason:e.message});return "loading"})()`);
      const until=Date.now()+45000;let status:any;
      while(Date.now()<until){status=JSON.parse(browser('JSON.stringify({state:window.hbicResearchAudio?.state,reason:window.hbicResearchAudio?.reason})'));if(status.state!=="loading")break;await new Promise(r=>setTimeout(r,250));}
      if(status?.state!=="ready")throw Error(status?.reason??"Approved research audio retrieval timed out");
      audio=Buffer.from(browser('(()=>{const value=window.hbicResearchAudio.bytes;window.hbicResearchAudio=null;return value})()'),"base64");
      const git=createHash("sha1").update(`blob ${audio.length}\0`).update(audio).digest("hex");
      if(audio.length!==pin.size||(pin.lfs?sha(audio)!==pin.lfs.sha256:git!==pin.blobId))throw Error("Pinned actual audio digest mismatch");
      const decoded=spawnSync("/opt/homebrew/bin/ffmpeg",["-v","error","-i","pipe:0","-ac","1","-ar","16000","-f","f32le","pipe:1"],{input:audio,timeout:15000,maxBuffer:16_000*4*91});
      pcm=decoded.stdout;if(decoded.status!==0||pcm.length%4||pcm.length<16000||pcm.length>16_000*4*90)throw Error("Bounded real research waveform required");
      if(frontend==="rms-0.1")adjusted=recitationLevel(new Float32Array(pcm.buffer,pcm.byteOffset,pcm.length/4));
      const inferencePcm=adjusted?Buffer.from(adjusted.pcm.buffer,adjusted.pcm.byteOffset,adjusted.pcm.byteLength):pcm;
      const level=adjusted?{gain:adjusted.gain,originalRms:adjusted.originalRms,originalPeak:adjusted.originalPeak,referenceConditioned:false}:undefined;
      const begin=performance.now(),recognized=await bounded(new Promise<any>((resolve,reject)=>{pending={resolve,reject};child.stdin.write(JSON.stringify({pcm:inferencePcm.toString("base64")})+"\n",error=>{if(error){pending?.reject(error);pending=null}})}));
      const elapsedMs=performance.now()-begin;
      if(wordModel){
        if(recognized.mode!=="rnnt"||recognized.symbolLimitReached!==false||typeof recognized.text!=="string"||recognized.text.length>8000)throw Error("Independent complete RNNT transcript required");
        results.push({identity,index,source,audioSha256:sha(audio),pcmSha256:sha(pcm),samples:pcm.length/4,
          inferencePcmSha256:sha(inferencePcm),level,transcript:recognized.text,referenceTextSha256:sha(row.reference_text),scriptWordComparison:wordEdits(row.reference_text,recognized.text),
          wordLocationsQualified:false,elapsedMs});
        console.log(JSON.stringify({source,processed:index+1,analyzed:results.length,failures:failures.length}));
        continue;
      }
      if(recognized.referenceConditioned!==false||recognized.vocabSize!==251||recognized.blankId!==250||typeof recognized.phonemes!=="string"||recognized.phonemes.length>2000)throw Error("Valid actual research acoustic output required");
      acoustic=Buffer.from(recognized.logprobs,"base64");if(acoustic.length!==recognized.timeSteps*251*4)throw Error("Wrong acoustic evidence dimensions");
      const decoderStart=performance.now();
      const beam=decoder==="prefix-8"?acousticWordpieceBeam(new Float32Array(acoustic.buffer,acoustic.byteOffset,acoustic.length/4),251,250,8,12,"research-benchmark"):undefined;
      const phonemes=beam?beam.ids.map(id=>{const unit=units.find(unit=>unit.id===id);if(!unit||id===250)throw Error("Valid independent acoustic unit required");return unit.text;}).join(""):recognized.phonemes;
      const rawComparison=phoneticComparison([ref.phonemes],phonemes);
      results.push({identity,index,source,audioSha256:sha(audio),pcmSha256:sha(pcm),samples:pcm.length/4,phonemes,
        inferencePcmSha256:sha(inferencePcm),level,greedyPhonemes:recognized.phonemes,beam,decoderMs:performance.now()-decoderStart,
        acousticSha256:sha(acoustic),timeSteps:recognized.timeSteps,referencePhones:ref.phonemes,
        referenceTextSha256:sha(row.reference_text),referenceProvenance:ref.referenceProvenance??{scriptFormat:"uthmani",method:"unchanged full reference"},wordLocationsQualified:false,
        comparison:{edits:rawComparison.edits,referencePhones:rawComparison.referencePhones,wordLocationsQualified:false},elapsedMs});
    }catch(error){
      const reason=error instanceof Error?error.message:"Actual research inference failed";
      failures.push({identity,index,reason});
      // Lost authorization/session is a run-level interruption, not 200
      // fabricated recording failures. Preserve progress and stop safely.
      if(reason.includes("browser session unavailable")||reason.includes("HTTP 401")||reason.includes("HTTP 403"))throw error;
    }
    finally{audio?.fill(0);pcm?.fill(0);acoustic?.fill(0);adjusted?.pcm.fill(0);save();}
    console.log(JSON.stringify({source,processed:index+1,analyzed:results.length,failures:failures.length}));
  }
  complete=results.length===200&&failures.length===0;save();
  if(!complete)process.exitCode=1;
  console.log(JSON.stringify({finished:complete,output,analyzed:results.length,failures:failures.length}));
}catch(error){failures.push({index:-1,reason:error instanceof Error?error.message:"Research startup failed"});save();throw error;}
finally{try{browser('window.hbicResearchAudio=null;"cleared"')}catch{} child.stdin.end();lines.close();child.kill("SIGTERM");}
