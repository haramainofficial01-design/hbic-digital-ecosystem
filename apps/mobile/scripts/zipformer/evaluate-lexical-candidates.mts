/** Quran-Lab NPL-1.2; see LICENSE. Actual changed-decoder experiment ONLY.
 * Same historical calibration waveforms, local RAM/private pipes, no training,
 * intentional audio files, fresh gold, production integration or qualification.
 * No selected reference enters acoustic search or global lexical parsing. */
import {createHash,randomUUID} from "node:crypto";
import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {spawn} from "node:child_process";
import {createInterface} from "node:readline";
import {acousticWordpieceCandidates} from "../recitationAcousticBeam";
import {compactQuietPausesWithTimeline} from "../../src/quran/reciteAssistFeedback";
import {wordEdits} from "../recitationQualification";
import {lexicalSegmenter} from "./lexicalSegmentation";
import {lexicalAcousticCandidates,lexicalSearchWidth} from "./lexicalAcousticCandidates";

const width=lexicalSearchWidth(process.argv.slice(2));

const sha=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const frozen=(path:string,pin:string)=>{const bytes=readFileSync(path);
  if(bytes.length>8_000_000||sha(bytes)!==pin)throw Error("Pinned bounded historical artifact required");
  return {data:JSON.parse(bytes.toString()),sha256:pin};};
const lex=frozen("output/quran-development/muaalem-comparison/phonetic-lexicon-1791922011429-32dabcb6-d51d-483e-bba0-03427f0aa11c.json",
  "262736fca4c16f924fbccb1b66ec133b23a735c9ddb3d139657461f84d5057c4");
const old=frozen("output/quran-development/zipformer-comparison/zipformer-raw-calibration-1-1791926000854-c086bd67-c92e-4a48-8c95-81953f113355.json",
  "00906711e6bc7dcba73529ca99cfeb900b80878728d5a823066f4794d654be89");
const scripts=frozen("output/quran-development/sherpa-comparison/nvidia-whole-rnnt-calibration.json",
  "cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310");
if(!lex.data.complete||lex.data.entries?.length!==9980||lex.data.referenceCoverageComplete!==false
  ||lex.data.convertedVerses!==3364||lex.data.exclusions?.length!==2872
  ||!old.data.complete||old.data.results?.length!==48||old.data.failures?.length!==0
  ||old.data.split!=="calibration"||!old.data.compactQuiet||old.data.canonicalPrompt!==false||old.data.forcedAlignment!==false
  ||old.data.modelSha256!=="6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb"
  ||!scripts.data.complete||scripts.data.results?.length!==48||scripts.data.failures?.length!==0
  ||scripts.data.split!=="calibration"||scripts.data.scope!=="whole")throw Error("Complete unchanged provenance required");
const parsers=[false,true].map(duration=>({duration,parse:lexicalSegmenter(lex.data.entries,duration)}));
const root=resolve("output/quran-development/zipformer-comparison"),worker="apps/mobile/scripts/zipformer/worker.py";
const manifest=JSON.parse(readFileSync(resolve(root,"assets/verified-manifest.json"),"utf8"));
const codeSha256=Object.fromEntries([worker,"apps/mobile/scripts/recitationAcousticBeam.ts",
  "apps/mobile/scripts/zipformer/lexicalSegmentation.ts","apps/mobile/scripts/zipformer/lexicalAcousticCandidates.ts",
  "apps/mobile/scripts/zipformer/evaluate-lexical-candidates.mts","apps/mobile/scripts/recitationQualification.ts",
  "apps/mobile/src/quran/reciteAssistFeedback.ts"].map(path=>[path,sha(readFileSync(path))]));
const output=resolve(root,`lexical-nbest-calibration-${Date.now()}-${randomUUID()}.json`);
const results:any[]=[],failures:{index:number;reason:string}[]=[];
let runtime:any,complete=false;
function count(rows:any[],mode:number){
  const at=rows.map(row=>row.experiments[mode]);
  const proposalCount=(which:"top"|"firstUnique")=>({
    unique:at.filter(row=>row[which]?.proposal.status==="unique").length,
    abstentions:at.filter(row=>row[which]?.proposal.status!=="unique").length,
    exactScripts:at.filter(row=>row[`${which}Score`].errors===0&&row[which]?.proposal.status==="unique").length,
    canonicalInsteadOfAltered:at.filter((row,i)=>rows[i].positive&&row[`${which}CanonicalExact`]
      &&row[`${which}Score`].errors!==0).length,
    scriptWords:at.reduce((n,row)=>n+row[`${which}Score`].words,0),
    wordEditsIncludingAbstentions:at.reduce((n,row)=>n+row[`${which}Score`].errors,0)});
  return {cases:rows.length,top:proposalCount("top"),firstUnique:proposalCount("firstUnique"),
    oracleExactPresent:at.filter(row=>row.oracleExactRank!==null).length,
    oracleDiagnosticOnly:true,oracleNotASelectableDecoder:true};
}
function save(){writeFileSync(output,JSON.stringify({complete,newInference:true,freshHeldout:false,
  modelSha256:old.data.modelSha256,model:manifest.repository,revision:manifest.revision,license:manifest.license,runtime,
  codeSha256,inputsSha256:{lexicon:lex.sha256,oldPhonetics:old.sha256,scriptedScopes:scripts.sha256},
  predeclared:{split:"calibration",expectedCases:48,width,tokensPerFrame:12,inputScale:1,compactQuiet:true,
    selection:"first complete unique lexical parse in independent acoustic rank, or abstain",
    lexicalDurationModes:[false,true],newReferencePrompt:false,canonicalRestoration:false},
  summary:{expectedCases:48,analyzed:results.length,failures:failures.length,
    posteriorHashesUnchanged:results.filter(row=>row.posteriorUnchanged).length,
    greedyPhonesUnchanged:results.filter(row=>row.greedyUnchanged).length,
    experiments:complete?parsers.map((p,i)=>({duration:p.duration,...count(results,i),
      altered:count(results.filter(r=>r.positive),i),unaltered:count(results.filter(r=>!r.positive),i),
      categories:["correct","pause","low_noise","speed_0.8","speed_1.2","omission","repetition","substitution"]
        .map(category=>({category,...count(results.filter(r=>r.category===category),i)}))})):null},
  wordRecognitionQualified:false,mistakeDetectionQualified:false,liveFollowingQualified:false,nativeQualified:false,
  limits:["Same 48 historical biased approximate-splice controls, not fresh natural or independently reviewed gold.",
    "All words and abstentions retained. Corpus coverage and pruned candidate mass are not calibrated correctness.",
    "Oracle presence inspects scripts only AFTER proposals; cannot be used to select or claim recognition accuracy.",
    "A partial global vocabulary can bias restoration. No selected ayah, frequency, grammar, expected-word prompt or fuzzy repair enters selection.",
    "No live mistake precision/recall, Tajweed, phone battery/thermal, production or store qualification."],results,failures},null,2));}
let pending:{resolve:(value:any)=>void;reject:(error:Error)=>void}|null=null,stderr="";
const child=spawn(resolve("output/quran-development/nvidia-evaluation-runtime/bin/python"),[worker,root,"1","v3"],
  {stdio:["pipe","pipe","pipe"],env:{...process.env,PYTHONDONTWRITEBYTECODE:"1"}});
const lines=createInterface({input:child.stdout});
lines.on("line",line=>{const current=pending;pending=null;
  try{if(!current||line.length>1_000_000)throw Error("Bounded requested actual acoustic response required");current.resolve(JSON.parse(line));}
  catch(error){current?.reject(error instanceof Error?error:Error("Invalid local response"));child.kill("SIGTERM");}});
child.stderr.on("data",bytes=>{stderr=(stderr+String(bytes)).slice(-2000);});
child.on("error",error=>{pending?.reject(error);pending=null;});
child.on("exit",code=>{pending?.reject(Error(`Local model exited ${code}: ${stderr}`));pending=null;});
function bounded<T>(promise:Promise<T>){return new Promise<T>((resolve,reject)=>{
  const timer=setTimeout(()=>{child.kill("SIGTERM");reject(Error("Bounded local inference timed out"));},90_000);
  promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});}
try{
  runtime=await bounded(new Promise<any>((resolve,reject)=>{pending={resolve,reject};}));
  if(!runtime.ready||runtime.blankId!==250||runtime.canonicalPrompt!==false||runtime.forcedAlignment!==false)
    throw Error("Exact independent waveform-only recognizer required");
  const all=await(await fetch("http://127.0.0.1:3011/cases",{signal:AbortSignal.timeout(10000)})).json();
  if(!Array.isArray(all)||all.length!==96)throw Error("Unchanged RAM controls required");
  const cases=all.filter(row=>row.split==="calibration");
  if(cases.length!==48||new Set(cases.map(row=>row.index)).size!==48)throw Error("All 48 historical calibration cases required");
  // Verify every source/script pair before running the changed candidate.
  for(const row of cases){const previous=old.data.results.find((r:any)=>r.index===row.index),gold=scripts.data.results.find((r:any)=>r.index===row.index);
    if(!previous||!gold||previous.audioSha256!==row.audioSha256||gold.audioSha256!==row.audioSha256
      ||previous.originalSamples!==row.originalSamples||gold.originalSamples!==row.originalSamples
      ||previous.category!==row.category||gold.category!==row.category
      ||![null,"omission","repetition","substitution"].includes(row.expected)||gold.positive!==(row.expected!==null)
      ||JSON.stringify(gold.spokenGold)!==JSON.stringify(row.spokenGold))throw Error("Exact frozen waveform/script/category pair mismatch");}
  const inventory=Array<string>(251);
  for(const line of readFileSync(resolve(root,"assets/tokens.txt"),"utf8").trim().split("\n")){
    const at=line.lastIndexOf(" "),id=Number(line.slice(at+1));if(!Number.isInteger(id)||id<0||id>250||inventory[id])throw Error("Verified complete inventory required");
    inventory[id]=line.slice(0,at);}
  if(inventory.some(unit=>!unit)||inventory.filter(Boolean).length!==251||inventory[250]!=="<blank>")throw Error("Verified blank/inventory required");
  for(const row of cases){let pcm:Buffer|undefined,acoustic:Buffer|undefined,compact:ReturnType<typeof compactQuietPausesWithTimeline>|undefined;
    try{
      const response=await fetch(`http://127.0.0.1:3011/audio/${row.index}`,{signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error("RAM waveform unavailable");pcm=Buffer.from(await response.arrayBuffer());
      if(pcm.length!==row.originalSamples*4||sha(pcm)!==row.audioSha256)throw Error("Waveform hash/sample mismatch");
      compact=compactQuietPausesWithTimeline(new Float32Array(pcm.buffer,pcm.byteOffset,pcm.length/4));
      const inference=Buffer.from(compact.pcm.buffer,compact.pcm.byteOffset,compact.pcm.byteLength),previous=old.data.results.find((r:any)=>r.index===row.index);
      if(sha(inference)!==previous.inferenceAudioSha256||inference.length/4!==previous.inferenceSamples)throw Error("Exact previous compact waveform required");
      const begin=performance.now(),recognized=await bounded(new Promise<any>((resolve,reject)=>{pending={resolve,reject};
        child.stdin.write(JSON.stringify({pcm:inference.toString("base64")})+"\n",error=>{if(error){pending?.reject(error);pending=null;}});}));
      const inferenceMs=performance.now()-begin;
      if(recognized.vocabSize!==251||recognized.blankId!==250||recognized.referenceConditioned!==false||recognized.addedQuietSamples!==9600
        ||!Number.isInteger(recognized.timeSteps)||recognized.timeSteps<1||recognized.timeSteps>650||typeof recognized.phonemes!=="string")throw Error("Actual bounded posterior required");
      acoustic=Buffer.from(recognized.logprobs,"base64");
      if(acoustic.length!==recognized.timeSteps*251*4)throw Error("Invalid actual acoustic dimensions");
      const decoderBegin=performance.now(),search=acousticWordpieceCandidates(new Float32Array(acoustic.buffer,acoustic.byteOffset,acoustic.length/4),251,250,width,12);
      const phoneCandidates=search.candidates.map(candidate=>({phones:candidate.ids.map(id=>inventory[id]).join(""),retainedPathLogScore:candidate.retainedPathLogScore}));
      const proposals=parsers.map(p=>lexicalAcousticCandidates(phoneCandidates,p.parse));
      const decoderMs=performance.now()-decoderBegin;
      // Script/gold is used ONLY after independent proposals have been returned.
      const experiments=proposals.map((proposal,i)=>{
        const score=(candidate:typeof proposal.firstUnique)=>wordEdits(row.spokenGold.join(" "),candidate?.proposal.proposedWords?.join(" ")??"");
        const canonicalExact=(candidate:typeof proposal.firstUnique)=>candidate?.proposal.status==="unique"
          &&wordEdits(row.text,candidate.proposal.proposedWords!.join(" ")).errors===0;
        return {duration:parsers[i].duration,...proposal,topScore:score(proposal.top),firstUniqueScore:score(proposal.firstUnique),
          topCanonicalExact:canonicalExact(proposal.top),firstUniqueCanonicalExact:canonicalExact(proposal.firstUnique),
          oracleExactRank:proposal.candidates.find(c=>c.proposal.status==="unique"&&score(c).errors===0)?.rank??null};});
      results.push({index:row.index,category:row.category,positive:row.expected!==null,audioSha256:row.audioSha256,originalSamples:row.originalSamples,
        inferenceAudioSha256:sha(inference),inferenceSamples:compact.pcm.length,timeline:compact.spans,timeSteps:recognized.timeSteps,
        acousticSha256:sha(acoustic),posteriorUnchanged:sha(acoustic)===previous.acousticSha256,
        greedyPhones:recognized.phonemes,greedyUnchanged:recognized.phonemes===previous.phonemes,search,inferenceMs,decoderMs,experiments});
      console.log(JSON.stringify({analyzed:results.length,failures:failures.length}));
    }catch(error){failures.push({index:row.index,reason:error instanceof Error?error.message:"Inference/analysis failed"});}
    finally{pcm?.fill(0);compact?.pcm.fill(0);acoustic?.fill(0);save();}
    if(failures.length)throw Error("Failed actual comparison retained; no dropped denominators");
  }
  complete=results.length===48;save();console.log(JSON.stringify({complete,output,summary:JSON.parse(readFileSync(output,"utf8")).summary}));
}catch(error){if(!failures.length)failures.push({index:-1,reason:error instanceof Error?error.message:"Startup failed"});save();throw error;}
finally{child.stdin.end();lines.close();child.kill("SIGTERM");}
