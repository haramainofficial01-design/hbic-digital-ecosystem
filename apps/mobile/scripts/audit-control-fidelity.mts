/** Offline comparison of frozen actual waveform-recognition outputs. No new
 * inference, source audio, remote request, transcript disclosure or gold labels. */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {controlRecognitionFidelity} from "./recitationControlFidelity";
const sha=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const base="output/quran-development/sherpa-comparison/";
const pins=[{mode:"rnnt",path:"nvidia-whole-rnnt-calibration.json",
  sha256:"cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310"},
  {mode:"rnnt-beam-4",path:"nvidia-whole-rnnt-beam-4-calibration-1791952044714-159590c9-c2c8-465c-87a7-46193e9e92a0.json",
  sha256:"eafc6a9074c1bddd1eb51beca984292d19386f46baf94106b32a6db6141375d0"}];
const kinds=["omission","repetition","substitution"];
type Row={index:number;audioSha256:string;originalSamples:number;positive:boolean;category:string;scopedExpected:string;
  spokenGold:string[];finalTranscript:string;goldEdits:{errors:number;words:number};fidelity:ReturnType<typeof controlRecognitionFidelity>};
const inputs=pins.map(pin=>{
  const bytes=readFileSync(base+pin.path);
  if(bytes.length>8_000_000||sha(bytes)!==pin.sha256)throw Error("Frozen bounded real-inference report required");
  const report=JSON.parse(bytes.toString());
  if(report.complete!==true||report.mode!==pin.mode||report.scope!=="whole"||report.split!=="calibration"
    ||report.canonicalPrompt!==false||report.summary.expectedCases!==48||report.summary.cases!==48
    ||report.summary.failures!==0||!Array.isArray(report.failures)||report.failures.length
    ||!Array.isArray(report.results)||report.results.length!==48
    ||report.assets.official!=="d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31"
    ||report.assets.encoder!=="a74e77489a9e48d689bac080a30c5e54b35e5f54171273771dba9c72752eade3")
    throw Error("Complete matched independent whole-clip waveform controls required");
  const seen=new Set<number>();
  const rows:Row[]=report.results.map((r:Row)=>{
    if(!r||!Number.isSafeInteger(r.index)||seen.has(r.index)||typeof r.positive!=="boolean"||typeof r.category!=="string"
      ||!Array.isArray(r.spokenGold)||r.spokenGold.some(w=>typeof w!=="string")
      ||!/^[a-f0-9]{64}$/.test(r.audioSha256)||!Number.isSafeInteger(r.originalSamples)||r.originalSamples<16000||r.originalSamples>192000)
      throw Error("Exact bounded control identities required");
    seen.add(r.index);
    const fidelity=controlRecognitionFidelity(r.scopedExpected,r.spokenGold.join(" "),r.finalTranscript);
    if(fidelity.scriptedPositive!==r.positive||fidelity.scriptedWordEdits!==r.goldEdits.errors||fidelity.scriptedWords!==r.goldEdits.words
      ||r.positive&&!kinds.includes(r.category))throw Error("Existing control scope/word metric disagrees; no fabricated positive");
    return {...r,fidelity};
  });
  if(rows.reduce((n,r)=>n+r.fidelity.scriptedWordEdits,0)!==report.summary.controlledScriptEdits
    ||rows.reduce((n,r)=>n+r.fidelity.scriptedWords,0)!==report.summary.controlledScriptWords)
    throw Error("Full unchanged denominator required");
  return {pin,rows};
});
const bucket=(r:Row)=>r.fidelity.exactScriptedSpeech?"exact-scripted":r.fidelity.canonicalInsteadOfScriptedSpeech?"canonical-instead":"neither-exact";
const transitions:Record<string,number>={};
for(const a of inputs[0].rows){const b=inputs[1].rows.find(r=>r.index===a.index);
  if(!b||a.audioSha256!==b.audioSha256||a.originalSamples!==b.originalSamples||a.positive!==b.positive
    ||a.scopedExpected!==b.scopedExpected||JSON.stringify(a.spokenGold)!==JSON.stringify(b.spokenGold))
    throw Error("Identical original waveforms and scripted scope required");
  if(a.positive){const key=`${bucket(a)} -> ${bucket(b)}`;transitions[key]=(transitions[key]??0)+1;}}
const count=(rows:Row[])=>({cases:rows.length,exactScriptedSpeech:rows.filter(r=>r.fidelity.exactScriptedSpeech).length,
  canonicalInsteadOfScriptedSpeech:rows.filter(r=>r.fidelity.canonicalInsteadOfScriptedSpeech).length,
  neitherExact:rows.filter(r=>r.fidelity.neitherExact).length});
console.log(JSON.stringify({newInference:false,freshHeldout:false,naturalMistakeDetectionQualified:false,failures:0,
  comparatorSha256:sha(readFileSync("apps/mobile/scripts/recitationControlFidelity.ts")),
  runnerSha256:sha(readFileSync("apps/mobile/scripts/audit-control-fidelity.mts")),matchedWaveforms:48,
  reports:inputs.map(({pin,rows})=>({mode:pin.mode,inputSha256:pin.sha256,altered:count(rows.filter(r=>r.positive)),
    unaltered:count(rows.filter(r=>!r.positive)),categories:kinds.map(kind=>({kind,...count(rows.filter(r=>r.category===kind))}))})),transitions,
  limits:["Approximate historical splices with baseline-success selection are not fresh, independent or double-reviewed natural learner speech.",
    "Canonical text returned instead of scripted alteration is an output diagnostic, not proof of a model's internal intent or exact audible pronunciation.",
    "Whole-clip fidelity is not live correction precision/recall, natural word-recognition accuracy, following, Tajweed or native performance.",
    "References enter comparison only; no ASR decoder saw them. No voice stored/fetched/uploaded and no production/store change."]},null,2));
