/** Synthetic evidence-contract fixtures, NOT Quran recognition accuracy. */
import assert from "node:assert/strict";
import test from "node:test";
import {evidenceHash,pairedResearchAudit} from "../scripts/recitationPairedAudit";
import {wordEdits} from "../scripts/recitationQualification";
import {phoneticComparison} from "../scripts/recitationPhoneticComparison";
const refs=[{id:"one",source:"phone",reference_text:"قل هو"},{id:"two",source:"phone",reference_text:"الله أحد"},
  {id:"one",source:"phone",reference_text:"قل هو"}];
function report(outputs:string[],word=true) {
  const rows=refs.map((ref,index)=>({identity:evidenceHash(ref.id).slice(0,16),index,source:ref.source,
    audioSha256:evidenceHash(ref.id),pcmSha256:evidenceHash(`pcm:${ref.id}`),samples:ref.id==="one"?64000:192000,
    referenceTextSha256:evidenceHash(ref.reference_text),wordLocationsQualified:false as const,
    transcript:word?outputs[index]:undefined,scriptWordComparison:word?wordEdits(ref.reference_text,outputs[index]):undefined,
    phonemes:word?undefined:outputs[index],referencePhones:word?undefined:"abc",
    comparison:word?undefined:phoneticComparison(["abc"],outputs[index])}));
  return {dataset:"fixture",datasetRevision:"a".repeat(40),metadataSha256:evidenceHash("fixture"),source:"phone",
    variant:word?"nvidia-rnnt":"v3",complete:true,canonicalPrompt:false,forcedAlignment:false,
    wordAccuracyQualified:false,mistakeDetectionQualified:false,results:rows,failures:[],summary:{expectedCases:3,
      analyzedCases:3,failures:0,scriptReferenceWordEdits:word?rows.reduce((n,r)=>n+(r.scriptWordComparison?.errors??0),0):null,
      scriptReferenceWords:word?6:null,rawCanonicalPhoneEdits:word?null:rows.reduce((n,r)=>n+(r.comparison?.edits??0),0),
      canonicalPhones:word?null:9}};
}
const baseline=()=>report(["قل هو","الله هو","قل هو"]);
const changed=()=>report(["قال هو","الله أحد","قال هو"]);
test("equal aggregate word edits cannot hide paired regressions or count duplicate audio twice",()=>{
  const r=pairedResearchAudit(baseline(),changed(),refs);
  assert.equal(r.newInference,false);assert.equal(r.freshHeldout,false);assert.equal(r.wordAccuracyQualified,false);
  assert.equal(r.metadataEntries,3);assert.equal(r.duplicateAudioRows,1);
  assert.deepEqual(r.summary,{recordings:2,referenceUnits:4,baselineEdits:1,candidateEdits:1,improved:1,regressed:1,
    equalEditCounts:0,changedOutputs:2,baselineExactStrings:1,candidateExactStrings:1,
    baselineExactNowDifferent:1,baselineDifferentNowExact:1});
  assert.deepEqual(r.durationBuckets.map(b=>b.recordings),[1,0,1]);
  assert.equal(JSON.stringify(r).includes("قال"),false); // no private transcripts in aggregate output
});
test("unchanged edit counts still report changed recognized output",()=>{
  const b=report(["قل هو","الله قل","قل هو"]),r=pairedResearchAudit(baseline(),b,refs);
  assert.equal(r.summary.equalEditCounts,2);assert.equal(r.summary.changedOutputs,1);
});
test("raw phone characters remain separate from script words and invented mistake labels",()=>{
  const r=pairedResearchAudit(report(["abc","abx","abc"],false),report(["abx","abc","abx"],false),refs);
  assert.equal(r.units,"raw canonical-phone Unicode characters");assert.equal(r.mistakeDetectionQualified,false);
  assert.equal(r.summary.referenceUnits,6);
  assert.throws(()=>pairedResearchAudit(baseline(),report(["abc","abx","abc"],false),refs),/Cannot compare/);
});
test("incomplete/failed/qualified or malformed evidence cannot be promoted by omission",()=>{
  const mutations:((r:ReturnType<typeof report>)=>void)[]=[r=>{r.complete=false;},r=>{r.summary.failures=1;},
    r=>{r.summary.analyzedCases=2;},r=>{r.results.pop();},r=>{r.canonicalPrompt=true;},
    r=>{r.wordAccuracyQualified=true;},r=>{r.results[1].index=0;},r=>{r.results[0].samples=NaN;}];
  for(const mutate of mutations){
    const r=changed();mutate(r);assert.throws(()=>pairedResearchAudit(baseline(),r,refs));
  }
});
test("tampered counts, mismatched scope/reference/PCM or conflicting duplicate fail closed",()=>{
  const mutations:((r:ReturnType<typeof report>)=>void)[]=[r=>{r.summary.scriptReferenceWordEdits=0;},
    r=>{r.results[1].scriptWordComparison!.errors=2;},r=>{r.metadataSha256=evidenceHash("other");},
    r=>{r.results[1].pcmSha256=evidenceHash("other");},r=>{r.results[1].audioSha256=evidenceHash("other");},
    r=>{r.results[1].referenceTextSha256=evidenceHash("other");},r=>{r.results[2].pcmSha256=evidenceHash("other");}];
  for(const mutate of mutations){
    const r=changed();mutate(r);assert.throws(()=>pairedResearchAudit(baseline(),r,refs));
  }
});
test("conflicting transcripts in duplicate audio cannot be hidden by consistent aggregate totals",()=>{
  const r=changed();r.results[2].transcript="قل هو";
  r.results[2].scriptWordComparison=wordEdits(refs[2].reference_text,r.results[2].transcript);
  r.summary.scriptReferenceWordEdits=1;
  assert.throws(()=>pairedResearchAudit(baseline(),r,refs),/Conflicting duplicate/);
});
