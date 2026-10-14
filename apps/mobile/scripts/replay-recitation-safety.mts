/** Immutable saved-evidence replay only. No inference, audio, browser, network,
 * generated labels or private transcripts in output. Not fresh qualification. */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {RecitationTracker,validRecitationObservation,type RecitationObservation} from "../src/quran/recitationTracking";
import type {ReciteFeedback} from "../src/quran/reciteAssistFeedback";
import {controlledEventMetrics,type ControlledEventAttempt} from "./recitationEventMetrics";
const sha=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const pins=[
  {scope:"natural",cases:172,path:"output/quran-development/qualification/acoustic-beam-natural-1791921616295-e36543ff-3d7d-4e32-908d-d41f75723922.json",
    sha256:"f175c9a9b67ff864b5df19319394da858c91828278ce0d57ef4dcdd843f4b48a"},
  {scope:"controls",cases:96,path:"output/quran-development/qualification/acoustic-beam-controls-1791922340454-c9c67dff-9b96-49f5-8406-c199e26aa05e.json",
    sha256:"ffa329a70c19ad3a40f74aebaf8f039e0d39b2d0ae6317d67c905461f479092e"}
];
const comparable=(f:ReciteFeedback)=>JSON.stringify({status:f.status,words:f.words,differences:f.differences,
  attempted:f.attempted,stableComplete:f.stableComplete??false,followingIndex:f.followingIndex??null});
const reports=pins.map(pin=>{
  const bytes=readFileSync(pin.path);
  if(bytes.length>30_000_000||sha(bytes)!==pin.sha256)throw Error("Frozen saved-evidence hash required");
  const input=JSON.parse(bytes.toString());
  if(input.scope!==pin.scope||input.complete!==true||!Array.isArray(input.results)||input.results.length!==pin.cases
    ||!Array.isArray(input.failures)||input.failures.length!==0)throw Error("All unchanged saved cases with explicit zero failures required");
  const methods=(["greedy","beam"] as const).map(method=>{
    let observations=0,malformedObservations=0,changedFeedback=0,cleanAlerts=0,lexicalDetected=0,stableComplete=0;
    const events:ControlledEventAttempt[]=[];
    for(const row of input.results){
      if(typeof row.reference!=="string"||typeof row.clean!=="boolean"||typeof row.lexicalPositive!=="boolean"
        ||!Array.isArray(row.lexicalLocations)||!Array.isArray(row[method]?.observations)
        ||row[method].observations.length<1||row[method].observations.length>100)
        throw Error("Actual bounded complete acoustic history required");
      const tracker=new RecitationTracker(),feedbacks:ReciteFeedback[]=[];let ever=false,detected=false;
      for(const observation of row[method].observations as (RecitationObservation&{feedback:ReciteFeedback})[]){
        if(!observation.feedback)throw Error("Saved original feedback required for exact regression comparison");
        observations++;if(!validRecitationObservation(observation))malformedObservations++;
        const feedback=tracker.observe(row.reference,observation);feedbacks.push(feedback);
        changedFeedback+=Number(comparable(feedback)!==comparable(observation.feedback));
        ever ||= feedback.differences.length>0;
        // Natural label locations are retained as historical annotations only;
        // this does not manufacture omission/substitution/repetition gold.
        detected ||= feedback.differences.some(diff=>diff.index!==null&&row.lexicalLocations.includes(diff.index));
      }
      cleanAlerts+=Number(row.clean&&ever);lexicalDetected+=Number(row.lexicalPositive&&detected);
      const last=feedbacks.at(-1)!;stableComplete+=Number(last.stableComplete===true&&!last.differences.length);
      if(pin.scope==="controls")events.push({expected:row.lexicalPositive?{kind:row.category,index:row.expectedIndex}:null,observations:feedbacks});
    }
    return {method,cases:pin.cases,observations,malformedObservations,changedFeedback,
      labelledCleanCases:input.results.filter((r:{clean:boolean})=>r.clean).length,cleanAlerts,
      historicalLexicalCases:input.results.filter((r:{lexicalPositive:boolean})=>r.lexicalPositive).length,
      historicalLocationDetections:pin.scope==="natural"?lexicalDetected:null,stableComplete,
      controlledEvents:pin.scope==="controls"?controlledEventMetrics(events):null};
  });
  return {scope:pin.scope,inputSha256:pin.sha256,analysisFailures:0,methods};
});
console.log(JSON.stringify({newInference:false,freshHeldout:false,wordAccuracyQualified:false,mistakeDetectionQualified:false,
  trackerSha256:sha(readFileSync("apps/mobile/src/quran/recitationTracking.ts")),
  replayScriptSha256:sha(readFileSync("apps/mobile/scripts/replay-recitation-safety.mts")),reports,
  limits:["Historical already-inspected observations; no model execution or new voices.",
    "Token/lifecycle regression verification, not human-verbatim word WER, voice-following accuracy or natural error qualification.",
    "No threshold relaxation, teacher labels, independently verified speakers or native thermal measurements invented."]},null,2));
