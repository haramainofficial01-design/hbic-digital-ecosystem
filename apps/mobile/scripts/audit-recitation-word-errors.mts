/** Offline aggregate error budget from frozen existing RNNT reports. No new
 * inference, audio access, training, teacher annotation or expected-text decode. */
import {readFileSync} from "node:fs";
import {evidenceHash,pairedResearchAudit} from "./recitationPairedAudit";
import {scriptWordErrorBreakdown,type ScriptErrorKind} from "./recitationWordErrorBreakdown";
const base="output/quran-development/zipformer-comparison/";
const pins=[
  {name:"original",path:"benchmark-tlog_holdout-nvidia-rnnt-greedy-1791932693165-c6449db8-86bd-43a9-b2e0-8b5b4e61e67c.json",
    sha256:"7e747b3b117858bd9a29076441189c80a402eafc884458635820ae2b50ea1962"},
  {name:"fixed-rms",path:"benchmark-tlog_holdout-nvidia-rnnt-greedy-rms-0.1-1791933174388-d19c66d7-2c42-4e59-97ed-d4cdc2c88fdc.json",
    sha256:"9d52b0eb1d9ef19bcd927779fe8b772c5f3732036f4cd3122a884f1f5e4bb441"}
];
const metadata=readFileSync(base+"benchmark/benchmark.jsonl"),metadataSha256=evidenceHash(metadata);
if(metadata.length!==192388||metadataSha256!=="5d54d855872fc2f110840c80683a1ca2799efcd18d244cf18662e421e6fd9c1f")
  throw Error("Pinned approved unchanged metadata required");
const references=metadata.toString().trim().split("\n").map(line=>JSON.parse(line));
const reports=pins.map(pin=>{
  const bytes=readFileSync(base+pin.path);
  if(bytes.length>8_000_000||evidenceHash(bytes)!==pin.sha256)throw Error("Frozen bounded source report required");
  const report=JSON.parse(bytes.toString());
  if(report.dataset!=="Quran-Lab/quranic-asr-benchmark"||report.datasetRevision!=="d9fc635276a6a2b770293e6bffbe5b077bfc52b0"
    ||report.metadataSha256!==metadataSha256||report.variant!=="nvidia-rnnt"||report.source!=="tlog_holdout")
    throw Error("Pinned permitted research provenance required");
  // Recompute existing counts, all identities, original waveform bounds and
  // conflicting duplicates before deriving any additional diagnostic.
  const validation=pairedResearchAudit(report,report,references);
  const refs=references.filter(r=>r.source===report.source);
  const unique=[...new Map<string,typeof report.results[number]>(report.results.map((r:typeof report.results[number])=>[r.audioSha256,r])).values()];
  const scored=unique.map(r=>{
    const metric=scriptWordErrorBreakdown(refs[r.index].reference_text,r.transcript);
    if(metric.errors!==r.scriptWordComparison.errors||metric.referenceWords!==r.scriptWordComparison.words)
      throw Error("Breakdown disagrees with existing unchanged word metric");
    return metric;
  });
  const errors=scored.reduce((n,r)=>n+r.errors,0),words=scored.reduce((n,r)=>n+r.referenceWords,0);
  if(errors!==validation.summary.baselineEdits||words!==validation.summary.referenceUnits)
    throw Error("Complete deduplicated error budget required");
  const counts=(kind:ScriptErrorKind)=>({min:scored.reduce((n,r)=>n+r.ranges[kind].min,0),max:scored.reduce((n,r)=>n+r.ranges[kind].max,0)});
  const bins=[{name:"exact",accept:(n:number)=>n===0},{name:"one edit",accept:(n:number)=>n===1},
    {name:"two edits",accept:(n:number)=>n===2},{name:"three or more edits",accept:(n:number)=>n>=3}];
  return {name:pin.name,inputSha256:pin.sha256,recordings:unique.length,metadataEntries:report.results.length,
    failures:0,referenceWords:words,scriptReferenceWordEdits:errors,scriptReferenceWer:errors/words,
    optimalPathOperationRanges:{substitution:counts("substitution"),deletion:counts("deletion"),insertion:counts("insertion")},
    recordingsWithAmbiguousOperationCounts:scored.filter(r=>r.operationCountsAmbiguous).length,
    recordingsByErrorCount:bins.map(bin=>{const rows=scored.filter(r=>bin.accept(r.errors));
      return {name:bin.name,recordings:rows.length,referenceWords:rows.reduce((n,r)=>n+r.referenceWords,0),edits:rows.reduce((n,r)=>n+r.errors,0)};}),
    onePercentScriptReferenceErrorBudget:{maximumEdits:Math.floor(words*.01),minimumNetEditReductionRequired:Math.max(0,errors-Math.floor(words*.01)),
      releaseQualificationEstablished:false}};
});
console.log(JSON.stringify({newInference:false,freshHeldout:false,wordAccuracyQualified:false,mistakeDetectionQualified:false,
  metadataSha256,analysisCodeSha256:evidenceHash(readFileSync("apps/mobile/scripts/recitationWordErrorBreakdown.ts")),
  runnerSha256:evidenceHash(readFileSync("apps/mobile/scripts/audit-recitation-word-errors.mts")),reports,
  limitations:["Publisher-script differences are recognition diagnostics, not double-reviewed audible words or natural learner errors.",
    "Each operation range covers all equally minimal paths; different category maxima may describe different paths and must not be added.",
    "Deletion/insertion is not proof of skipped/repeated recitation; no coordinates, teacher labels, calibrated confidence or speaker identity inferred.",
    "One-percent script WER alone cannot qualify 99% spoken-word recognition, lexical mistake precision/recall, live voice-following or native performance.",
    "Historical development-inspected recordings remain the same, no audio stored, uploaded, collected or redistributed. Production/stores unchanged."]},null,2));
