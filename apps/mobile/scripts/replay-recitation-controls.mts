/** Replay immutable, actual-model acoustic observations. No generated speech,
 * fabricated transcripts, microphone recording, or threshold search. */
import {readFileSync, writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {RecitationTracker, recitationLexeme, type RecitationObservation} from "../src/quran/recitationTracking";
const input=resolve(process.argv[2]??"output/quran-development/qualification/waveform-controls-boundary-fixed.json");
const output=resolve(process.argv[3]??"output/quran-development/qualification/lexical-controls-replayed.json");
if(!input.includes("/output/quran-development/")||!output.includes("/output/quran-development/")||input===output)throw Error("Separate ignored evidence paths required.");
const bytes=readFileSync(input), evidence=JSON.parse(bytes.toString());
if(!Array.isArray(evidence.results)||evidence.results.length!==96)throw Error("Expected the existing 96 real-waveform controls.");
for(const row of evidence.results){
 const tracker=new RecitationTracker();row.anyAlert=false;row.detected=false;
 for(const observation of row.observations){
  if(!Array.isArray(observation.words)||!Number.isSafeInteger(observation.endSample))throw Error("Actual timestamped acoustic evidence required.");
  const feedback=tracker.observe(row.scopedExpected,observation as RecitationObservation);
  observation.feedback=feedback;row.feedback=feedback;row.anyAlert ||= feedback.differences.length>0;
  const target = recitationLexeme(String(row.edit?.repeatedWord ?? "")), tracked = tracker.snapshot();
  const repeatedTarget = !!target && tracked.some((word, i) => i > 0 && recitationLexeme(word.text) === target && recitationLexeme(tracked[i - 1].text) === target);
  row.detected ||= row.positive&&feedback.differences.some(d=>d.kind===row.category&&(row.category==="repetition"?repeatedTarget:d.index===row.expectedIndex));
 }
}
const summaries=Object.fromEntries(["calibration","heldout","all"].map(split=>{
 const rows=evidence.results.filter((r:any)=>split==="all"||r.split===split);
 const positives=rows.filter((r:any)=>r.positive),negatives=rows.filter((r:any)=>!r.positive),tp=positives.filter((r:any)=>r.detected).length;
 const fp=negatives.filter((r:any)=>r.anyAlert).length,wrong=positives.filter((r:any)=>!r.detected&&r.anyAlert).length;
 return [split,{cases:rows.length,trueOperations:tp,positiveCases:positives.length,falsePositiveControls:fp,negativeCases:negatives.length,wrongOperationAlerts:wrong,
  precision:tp+fp+wrong?tp/(tp+fp+wrong):null,recall:tp/positives.length,
  categories:Object.fromEntries(["omission","repetition","substitution"].map(kind=>[kind,{total:positives.filter((r:any)=>r.category===kind).length,detected:positives.filter((r:any)=>r.category===kind&&r.detected).length}]))}];
}));
evidence.replay={inputSha256:createHash("sha256").update(bytes).digest("hex"),trackerSha256:createHash("sha256").update(readFileSync("apps/mobile/src/quran/recitationTracking.ts")).digest("hex"),newInference:false};
evidence.summaries=summaries;writeFileSync(output,JSON.stringify(evidence,null,2));console.log(JSON.stringify(summaries));
