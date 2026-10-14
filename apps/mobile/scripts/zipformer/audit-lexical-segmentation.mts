/** Quran-Lab NPL-1.2; see LICENSE. Read-only replay of pinned actual outputs,
 * never new model inference, voice storage, fresh gold or release qualification.
 * The candidate receives only saved decoded phones and the global vocabulary;
 * scripted words enter this separate comparison AFTER it returns proposals.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {lexicalSegmenter} from "./lexicalSegmentation";
import {wordEdits} from "../recitationQualification";
import {recitationLexeme,recitationDisplayWords} from "../../src/quran/recitationTracking";
const sha=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const load=(path:string,pin:string)=>{
  const bytes=readFileSync(path);
  if(bytes.length>8_000_000||sha(bytes)!==pin)throw Error("Frozen bounded existing artifact required");
  return {data:JSON.parse(bytes.toString()),sha256:pin};
};
const lex=load("output/quran-development/muaalem-comparison/phonetic-lexicon-1791922011429-32dabcb6-d51d-483e-bba0-03427f0aa11c.json",
  "262736fca4c16f924fbccb1b66ec133b23a735c9ddb3d139657461f84d5057c4");
const phones=load("output/quran-development/zipformer-comparison/zipformer-raw-calibration-1-1791926000854-c086bd67-c92e-4a48-8c95-81953f113355.json",
  "00906711e6bc7dcba73529ca99cfeb900b80878728d5a823066f4794d654be89");
const scripts=load("output/quran-development/sherpa-comparison/nvidia-whole-rnnt-calibration.json",
  "cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310");
const r=phones.data,s=scripts.data,l=lex.data;
if(r.complete!==true||r.split!=="calibration"||r.newInference!==true||r.canonicalPrompt!==false||r.forcedAlignment!==false
  ||r.modelSha256!=="6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb"
  ||r.summary?.analyzedCases!==48||r.summary?.expectedCases!==48||r.summary?.failures!==0
  ||!Array.isArray(r.results)||r.results.length!==48||!Array.isArray(r.failures)||r.failures.length
  ||s.complete!==true||s.split!=="calibration"||s.scope!=="whole"||s.results?.length!==48||s.failures?.length!==0
  ||l.complete!==true||l.entries?.length!==9980||l.totalVerses!==6236||l.convertedVerses!==3364
  ||l.referenceCoverageComplete!==false||l.exclusions?.length!==2872||l.referenceProvenance?.version!=="0.6.4"
  ||l.canonicalSha256!=="19453574fcf89b4611d27456a9f10673e63635f7f124ec80815d3392e0ef6a67")
  throw Error("Complete pinned historical calibration and explicit partial-vocabulary provenance required");
const seen=new Set<number>();
const pairs:{row:{phonemes:string;category:string;referenceWordPhones:string[]};gold:{spokenGold:string[];positive:boolean;scopedExpected:string}}[]=r.results.map((row:any)=>{
  const gold=s.results.find((g:any)=>g.index===row.index);
  if(!Number.isSafeInteger(row.index)||seen.has(row.index)||typeof row.phonemes!=="string"||row.phonemes.length>1000
    ||!/^[a-f0-9]{64}$/.test(row.audioSha256)||!gold||row.audioSha256!==gold.audioSha256
    ||row.originalSamples!==gold.originalSamples||row.category!==gold.category
    ||!Array.isArray(gold.spokenGold)||gold.spokenGold.some((w:unknown)=>typeof w!=="string")
    ||typeof gold.positive!=="boolean"||typeof gold.scopedExpected!=="string"
    ||!Array.isArray(row.referenceWordPhones)||row.referenceWordPhones.some((p:unknown)=>typeof p!=="string"))
    throw Error("Full original waveform/sample/category pair required; no dropped cases");
  seen.add(row.index);return {row,gold};
});
const experiments=[false,true].map(lexicalDurationRuns=>{
  const parse=lexicalSegmenter(l.entries,lexicalDurationRuns);
  const evaluated=pairs.map(({row,gold})=>{
    const proposal=parse(row.phonemes); // NO reference/category/gold is an input
    const score=wordEdits(gold.spokenGold.join(" "),proposal.proposedWords?.join(" ")??"");
    return {category:row.category,positive:gold.positive,proposal,score};
  });
  const count=(rows:typeof evaluated)=>({cases:rows.length,unique:rows.filter(r=>r.proposal.status==="unique").length,
    ambiguous:rows.filter(r=>r.proposal.status==="ambiguous").length,uncovered:rows.filter(r=>r.proposal.status==="uncovered").length,
    scriptWords:rows.reduce((n,r)=>n+r.score.words,0),scriptWordEditsIncludingAbstentions:rows.reduce((n,r)=>n+r.score.errors,0),
    exactScriptedSequences:rows.filter(r=>r.proposal.status==="unique"&&r.score.errors===0).length});
  // Written-reference form coverage is separate from actual-phone decoding.
  // No reference phone/string enters parse(), nor is this audible phone gold.
  const normal=(p:string)=>lexicalDurationRuns?[...p].filter((c,i,a)=>!i||c!==a[i-1]).join(""):p;
  const forms=new Set(l.entries.map((e:{word:string;phones:string})=>`${recitationLexeme(e.word)}:${normal(e.phones)}`));
  let referenceLocations=0,formsPresent=0,completeCanonicalScopes=0;
  for(const {row,gold} of pairs){
    const words=recitationDisplayWords(gold.scopedExpected);
    if(words.length!==row.referenceWordPhones.length)throw Error("Exact canonical comparison coordinates required");
    let present=0;
    words.forEach((word,i)=>{referenceLocations++;if(forms.has(`${recitationLexeme(word)}:${normal(row.referenceWordPhones[i])}`)){formsPresent++;present++;}});
    completeCanonicalScopes+=Number(present===words.length);
  }
  return {lexicalDurationRuns,...count(evaluated),altered:count(evaluated.filter(r=>r.positive)),
    unaltered:count(evaluated.filter(r=>!r.positive)),categories:["correct","pause","low_noise","speed_0.8","speed_1.2","omission","repetition","substitution"]
      .map(category=>({category,...count(evaluated.filter(r=>r.category===category))})),
    canonicalComparisonFormCoverage:{referenceLocations,formsPresent,completeCanonicalScopes,
      scope:"Written canonical reference forms ONLY; not audible phones, recognition, independent words or natural error gold"},
    wordRecognitionQualified:false,naturalMistakeMetricsApplicable:false};
});
console.log(JSON.stringify({newInference:false,freshHeldout:false,analysisFailures:0,matchedOriginalWaveforms:pairs.length,
  inputsSha256:{lexicon:lex.sha256,phoneticOutputs:phones.sha256,scriptedScopes:scripts.sha256},
  codeSha256:{segmenter:sha(readFileSync("apps/mobile/scripts/zipformer/lexicalSegmentation.ts")),
    audit:sha(readFileSync("apps/mobile/scripts/zipformer/audit-lexical-segmentation.mts")),
    scorer:sha(readFileSync("apps/mobile/scripts/recitationQualification.ts"))},
  partialVocabulary:{forms:l.entries.length,convertedVerses:l.convertedVerses,excludedVerses:l.exclusions.length},experiments,
  limits:["Frozen outputs of actual licensed acoustics, not new voice inference or a fresh independent cohort.",
    "Global partial vocabulary is not the selected ayah. Unique means within this vocabulary, not human correctness.",
    "Uncovered/ambiguous complete scopes abstain; every scripted word remains in the diagnostic denominator.",
    "Duration-run collapse is an explicit lexical experiment, not pronunciation/Tajweed grading or preservation of every possible boundary.",
    "Historical approximate splices, biased prior-success selections and reused calibration cannot establish 99% natural recognition.",
    "No lexical event precision/recall, live timing, native thermal or release qualification is inferred. No decoder is integrated or promoted."]},null,2));
