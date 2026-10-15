/** Quran-Lab NPL-1.2; see LICENSE. One predeclared offline decoder comparison.
 * Retained original phone strings only; no canonical answer enters selection.
 * Same historical controls, local RAM/private pipes, no training or release. */
import {createHash, randomUUID} from "node:crypto";
import {readFileSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {spawn} from "node:child_process";
import {createInterface} from "node:readline";
import {compactQuietPausesWithTimeline} from "../../src/quran/reciteAssistFeedback";
import {wordEdits} from "../recitationQualification";
import {controlRecognitionFidelity} from "../recitationControlFidelity";
import {comparisonScope, type ComparisonCase} from "../recitationComparisonScope";
import {transcriptDifferences} from "../recitationTranscriptDifferences";
import {lexicalSegmenter} from "./lexicalSegmentation";
import {rerankAcousticPhoneStrings} from "./exactPhoneReranking";

if (process.argv.length !== 2) throw Error("One fixed exact-phone ranking experiment; no tuning arguments accepted");
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const root = resolve("output/quran-development/zipformer-comparison");
function frozen(path: string, expected: string) {
  const bytes = readFileSync(path);
  if (bytes.length > 8_000_000 || sha(bytes) !== expected) throw Error("Pinned historical evidence required");
  return JSON.parse(bytes.toString());
}
const inputsSha256 = {
  acoustic: "c7ef5272e7206c9d47ff5b2ff75a00d8f162b31e8a89121cb83078c7294b73a6",
  previousCombined: "9cd62bfac02d638bc8d045f72563ded4c6bd8863e493bf4acbadfaa7febd2cca",
  rawRnnt: "cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310",
  lexicon: "262736fca4c16f924fbccb1b66ec133b23a735c9ddb3d139657461f84d5057c4"
};
const acoustic = frozen(resolve(root, "lexical-nbest-calibration-1791998237198-81e00510-4582-4632-abba-ea18d3a750be.json"), inputsSha256.acoustic);
const previous = frozen(resolve(root, "lexical-rnnt-fallback-1791998301452-28ce073c-9806-4349-85c3-b0d4213fc7ad.json"), inputsSha256.previousCombined);
const rnnt = frozen("output/quran-development/sherpa-comparison/nvidia-whole-rnnt-calibration.json", inputsSha256.rawRnnt);
const lexicon = frozen("output/quran-development/muaalem-comparison/phonetic-lexicon-1791922011429-32dabcb6-d51d-483e-bba0-03427f0aa11c.json", inputsSha256.lexicon);
const modelSha256 = "6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb";
if (acoustic.complete !== true || acoustic.predeclared?.width !== 32 || acoustic.predeclared?.tokensPerFrame !== 12
  || acoustic.modelSha256 !== modelSha256 || acoustic.results?.length !== 48 || acoustic.failures?.length !== 0
  || previous.complete !== true || previous.rows?.length !== 48 || previous.analysisFailures !== 0
  || previous.inputsSha256?.phoneticCandidates !== inputsSha256.acoustic
  || previous.inputsSha256?.rnntTranscripts !== inputsSha256.rawRnnt
  || rnnt.complete !== true || rnnt.results?.length !== 48 || rnnt.failures?.length !== 0
  || lexicon.complete !== true || lexicon.entries?.length !== 9980 || lexicon.referenceCoverageComplete !== false)
  throw Error("All unchanged complete historical inputs required");
const parse = lexicalSegmenter(lexicon.entries, true);
const manifest = JSON.parse(readFileSync(resolve(root, "assets/verified-manifest.json"), "utf8"));
const worker = "apps/mobile/scripts/zipformer/worker.py";
const codeSha256 = Object.fromEntries([worker, "apps/mobile/scripts/zipformer/evaluate-exact-phone-ranking.mts",
  "apps/mobile/scripts/zipformer/exactPhoneReranking.ts", "apps/mobile/scripts/zipformer/ctcString.ts",
  "apps/mobile/scripts/zipformer/lexicalSegmentation.ts", "apps/mobile/scripts/recitationQualification.ts",
  "apps/mobile/scripts/recitationControlFidelity.ts", "apps/mobile/scripts/recitationComparisonScope.ts",
  "apps/mobile/scripts/recitationTranscriptDifferences.ts", "apps/mobile/src/quran/recitationTracking.ts",
  "apps/mobile/src/quran/reciteAssistFeedback.ts"].map(path => [path, sha(readFileSync(path))]));
const inventory: string[] = Array(251);
for (const line of readFileSync(resolve(root, "assets/tokens.txt"), "utf8").trim().split("\n")) {
  const at = line.lastIndexOf(" "), id = Number(line.slice(at + 1));
  if (!Number.isInteger(id) || id < 0 || id > 250 || inventory[id]) throw Error("Exact authoritative inventory required");
  inventory[id] = line.slice(0, at);
}
if (inventory.filter(Boolean).length !== 251 || inventory[250] !== "<blank>") throw Error("Complete original inventory required");
const output = resolve(root, `exact-phone-ranking-${Date.now()}-${randomUUID()}.json`);
let runtime: unknown, complete = false, inferenceAttempts = 0;
let planned: ComparisonCase[] = [];
const rows: any[] = [], failures: {index: number; reason: string}[] = [];
const percentile = (values: number[], p: number) => values.slice().sort((a,b) => a-b)[Math.ceil(values.length*p)-1] ?? null;
function save() {
  const scope = comparisonScope(planned, rows);
  const trueEvents = rows.filter(row => row.detected).length, predictions = rows.reduce((n,row) => n+row.differences.length,0);
  const positive = rows.filter(row => row.positive), negative = rows.filter(row => !row.positive);
  writeFileSync(output, JSON.stringify({complete, newInference: inferenceAttempts > 0, inferenceAttempts, freshHeldout: false,
    modelSha256, model: manifest.repository, revision: manifest.revision, license: manifest.license, runtime, inputsSha256, codeSha256,
    predeclared: {split: "calibration", expectedCases: 48, width: 32, tokensPerFrame: 12, inputScale: 1,
      compactQuiet: true, addedQuietSamples: 9600, acousticScore: "exact raw phone-string CTC likelihood across all inventory segmentations",
      selection: "first complete unique duration parse in exact acoustic order, else unchanged frozen raw RNNT",
      expectedReferenceReceivedBySelector: false, lexicalDurationRuns: true, phoneLikelihoodDurationNuisance: false},
    summary: {expectedCases: 48, analyzed: rows.length, failures: failures.length, ...scope,
      posteriorPairsUnchanged: rows.filter(row => row.posteriorUnchanged).length,
      scriptedExact: rows.filter(row => row.fidelity.exactScriptedSpeech).length,
      alteredExact: positive.filter(row => row.fidelity.exactScriptedSpeech).length,
      canonicalInstead: positive.filter(row => row.fidelity.canonicalInsteadOfScriptedSpeech).length,
      rawDifferenceDetections: trueEvents, predictedDifferences: predictions,
      rawDifferencePrecision: complete && !failures.length && predictions ? trueEvents/predictions : null,
      controlledOperationRecall: complete && !failures.length ? trueEvents/18 : null,
      negativeControlsWithDifferences: negative.filter(row => row.differences.length).length,
      categories: ["correct","pause","low_noise","speed_0.8","speed_1.2","omission","repetition","substitution"].map(category => {
        const group = rows.filter(row => row.category === category);
        return {category,cases:group.length,words:group.reduce((n,row)=>n+row.edits.words,0),edits:group.reduce((n,row)=>n+row.edits.errors,0),
          exact:group.filter(row=>row.fidelity.exactScriptedSpeech).length,canonicalInstead:group.filter(row=>row.fidelity.canonicalInsteadOfScriptedSpeech).length};}),
      improved: rows.filter(row => row.edits.errors < row.previousEdits), regressed: rows.filter(row => row.edits.errors > row.previousEdits),
      unchanged: rows.filter(row => row.edits.errors === row.previousEdits).length,
      newCanonicalInstead: rows.filter(row => row.fidelity.canonicalInsteadOfScriptedSpeech && !row.previousCanonicalInstead).map(row=>row.index),
      desktopInferenceMs: {p50:percentile(rows.map(row=>row.inferenceMs),.5),p95:percentile(rows.map(row=>row.inferenceMs),.95)},
      desktopRescoreAndParseMs: {p50:percentile(rows.map(row=>row.decoderMs),.5),p95:percentile(rows.map(row=>row.decoderMs),.95)}},
    wordRecognitionQualified:false,mistakeDetectionQualified:false,liveFollowingQualified:false,nativeQualified:false,
    limits:["Previously inspected biased approximate-splice/pitch controls, not fresh natural learner gold or independent speakers.",
      "Expected script enters scoring only after selection. Original phone strings only; no expected-verse repair or oracle selection.",
      "The incomplete global lexicon may still restore a canonical word. All regressions and abstention fallbacks remain visible.",
      "Raw transcript-difference metrics are not the live tracker, acoustic word timestamps or Tajweed accuracy.",
      "No native microphone, phone thermals/battery, production, OTA or store qualification."], plannedCases:planned, rows, failures}, null, 2));
}
let pending: {resolve:(value:any)=>void;reject:(error:Error)=>void}|null=null, stderr="";
const child=spawn(resolve("output/quran-development/nvidia-evaluation-runtime/bin/python"),[worker,root,"1","v3"],
  {stdio:["pipe","pipe","pipe"],env:{...process.env,PYTHONDONTWRITEBYTECODE:"1"}});
const lines=createInterface({input:child.stdout});
lines.on("line",line=>{const request=pending;pending=null;
  try{if(!request||line.length>1_000_000)throw Error("Only a bounded requested model response is accepted");request.resolve(JSON.parse(line));}
  catch(error){request?.reject(error instanceof Error?error:Error("Invalid model response"));child.kill("SIGTERM");}});
child.stderr.on("data",data=>{stderr=(stderr+String(data)).slice(-2000);});
child.on("error",error=>{pending?.reject(error);pending=null;});
child.on("exit",code=>{pending?.reject(Error(`Local model exited ${code}: ${stderr}`));pending=null;});
function bounded<T>(promise:Promise<T>){return new Promise<T>((resolve,reject)=>{const timer=setTimeout(()=>{
  child.kill("SIGTERM");reject(Error("Bounded local inference timeout"));},90_000);
  promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});}
const ready=bounded(new Promise<any>((resolve,reject)=>{pending={resolve,reject};})).then(value=>({value}),error=>({error}));
try {
  const response=await fetch("http://127.0.0.1:3011/cases",{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error("Historical RAM source unavailable");
  const all=await response.json();if(!Array.isArray(all)||all.length!==96)throw Error("All unchanged RAM cases required");
  const selected=all.filter(row=>row.split==="calibration");
  if(selected.length!==48||new Set(selected.map(row=>row.index)).size!==48)throw Error("All 48 historical cases required");
  planned=selected.map(row=>({index:row.index,words:row.spokenGold.length,audioSha256:row.audioSha256}));
  comparisonScope(planned,[]);
  for(const row of selected){const old=acoustic.results.find((r:any)=>r.index===row.index),raw=rnnt.results.find((r:any)=>r.index===row.index),before=previous.rows.find((r:any)=>r.index===row.index);
    if(!old||!raw||!before||[old,raw,before].some(r=>r.audioSha256!==row.audioSha256||r.originalSamples!==row.originalSamples||r.category!==row.category)
      ||!Array.isArray(row.spokenGold)||JSON.stringify(raw.spokenGold)!==JSON.stringify(row.spokenGold)
      ||raw.positive!==(row.expected!==null)||before.positive!==(row.expected!==null)
      ||before.selectedScore?.words!==row.spokenGold.length||typeof raw.finalTranscript!=="string")throw Error("Exact frozen waveform/script pair required");}
  const loaded=await ready;if("error"in loaded)throw loaded.error;runtime=loaded.value;
  if(!loaded.value.ready||loaded.value.blankId!==250||loaded.value.canonicalPrompt!==false||loaded.value.forcedAlignment!==false)throw Error("Independent original recognizer required");
  for(const row of selected){let pcm:Buffer|undefined,posterior:Buffer|undefined,compact:ReturnType<typeof compactQuietPausesWithTimeline>|undefined;
    try{
      const old=acoustic.results.find((r:any)=>r.index===row.index),raw=rnnt.results.find((r:any)=>r.index===row.index),before=previous.rows.find((r:any)=>r.index===row.index);
      const audio=await fetch(`http://127.0.0.1:3011/audio/${row.index}`,{signal:AbortSignal.timeout(10000)});
      if(!audio.ok)throw Error("RAM waveform unavailable");pcm=Buffer.from(await audio.arrayBuffer());
      if(sha(pcm)!==row.audioSha256||pcm.length!==row.originalSamples*4)throw Error("Actual waveform hash/count mismatch");
      compact=compactQuietPausesWithTimeline(new Float32Array(pcm.buffer,pcm.byteOffset,pcm.length/4));
      const inference=Buffer.from(compact.pcm.buffer,compact.pcm.byteOffset,compact.pcm.byteLength);
      if(sha(inference)!==old.inferenceAudioSha256||compact.pcm.length!==old.inferenceSamples)throw Error("Unchanged original compact waveform required");
      const start=performance.now();inferenceAttempts++;
      const recognized=await bounded(new Promise<any>((resolve,reject)=>{pending={resolve,reject};child.stdin.write(JSON.stringify({pcm:inference.toString("base64")})+"\n",error=>{if(error){pending?.reject(error);pending=null;}});}));
      const inferenceMs=performance.now()-start;
      if(recognized.vocabSize!==251||recognized.blankId!==250||recognized.referenceConditioned!==false||recognized.addedQuietSamples!==9600
        ||!Number.isSafeInteger(recognized.timeSteps)||recognized.timeSteps<1||recognized.timeSteps>650||recognized.phonemes!==old.greedyPhones)throw Error("Unchanged actual phonetic output required");
      posterior=Buffer.from(recognized.logprobs,"base64");
      if(posterior.length!==recognized.timeSteps*251*4||sha(posterior)!==old.acousticSha256)throw Error("Exact frozen posterior hash required");
      const retained=old.search.candidates.map((candidate:any)=>({phones:candidate.ids.map((id:number)=>inventory[id]).join(""),retainedPathLogScore:candidate.retainedPathLogScore}));
      const begin=performance.now();
      const reranked=rerankAcousticPhoneStrings(new Float32Array(posterior.buffer,posterior.byteOffset,posterior.length/4),inventory,250,retained);
      const proposals=reranked.ranked.map(candidate=>({...candidate,proposal:parse(candidate.phones)}));
      const first=proposals.find(candidate=>candidate.proposal.status==="unique");
      const transcript=first?.proposal.proposedWords?.join(" ")??raw.finalTranscript;
      const decoderMs=performance.now()-begin;
      // Scripts/categories enter only AFTER acoustic reranking and selection.
      const differences=transcriptDifferences(row.text,transcript);
      rows.push({index:row.index,category:row.category,positive:row.expected!==null,audioSha256:row.audioSha256,originalSamples:row.originalSamples,
        inferenceAudioSha256:sha(inference),inferenceSamples:compact.pcm.length,timeline:compact.spans,timeSteps:recognized.timeSteps,
        posteriorSha256:sha(posterior),posteriorUnchanged:true,greedyPhones:recognized.phonemes,reranked,proposals,
        selectedRank:first?.rank??null,selectedOriginalRanks:first?.originalRanks??null,source:first?"phonetic":"raw-rnnt",transcript,
        edits:wordEdits(row.spokenGold.join(" "),transcript),fidelity:controlRecognitionFidelity(row.text,row.spokenGold.join(" "),transcript),
        differences,detected:row.expected!==null&&differences.some(d=>d.kind===row.expected&&d.index===row.expectedIndex),
        previousEdits:before.selectedScore.errors,previousCanonicalInstead:before.fidelity.canonicalInsteadOfScriptedSpeech,inferenceMs,decoderMs});
      console.log(JSON.stringify({analyzed:rows.length,failures:failures.length}));
    }catch(error){failures.push({index:row.index,reason:error instanceof Error?error.message:"Inference/analysis failed"});}
    finally{pcm?.fill(0);posterior?.fill(0);compact?.pcm.fill(0);save();}
    if(failures.length)throw Error("Incomplete comparison retained; missing cases cannot qualify");
  }
  complete=rows.length===48;save();console.log(JSON.stringify({complete,output,summary:JSON.parse(readFileSync(output,"utf8")).summary},(key,value)=>["improved","regressed"].includes(key)?value.map((row:any)=>({index:row.index,category:row.category,before:row.previousEdits,after:row.edits.errors})):value));
}catch(error){if(!failures.length)failures.push({index:-1,reason:error instanceof Error?error.message:"Startup failed"});save();throw error;}
finally{child.stdin.end();lines.close();child.kill("SIGTERM");}
