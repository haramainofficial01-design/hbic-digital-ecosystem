import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {binomialLower,qualifyRecitation,wordEdits,type QualificationEvidence,type QualificationCase} from "../scripts/recitationQualification";

// All cases here are explicit math/unit fixtures. They MUST NOT qualify a model.
const one=(overrides:Partial<QualificationCase>={}):QualificationCase=>({id:"fixture",speaker:"fixture-speaker",recording:"fixture-recording",split:"heldout",origin:"unit-fixture",reference:"الحمد لله رب العالمين",spokenGold:"الحمد لله رب العالمين",recognized:"الحمد لله رب العالمين",gold:[],predicted:[],analyzed:true,recognitionFailed:false,...overrides});
const evidence=(cases:QualificationCase[]):QualificationEvidence=>({modelSha256:"a".repeat(64),pipelineSha256:"b".repeat(64),consentDocumented:false,usageRightsVerified:true,doubleReviewedNaturalGold:false,spokenScopeVerified:false,modelTrainingSpeakerOverlapExcluded:false,testSetFrozenBeforeTuning:true,heldoutUsedForTuning:false,cases});

test("exact one-sided bounds cannot claim 99% from a tiny perfect sample",()=>{
  assert.equal(binomialLower(0,30),0);assert.ok(Math.abs(binomialLower(30,30)-Math.pow(.05,1/30))<1e-12);
  assert.ok(binomialLower(30,30)<.99);assert.ok(binomialLower(1000,1000,.05/6)>.99);
  assert.ok(binomialLower(990,1000,.05/6)<.99);
  assert.ok(Math.abs(binomialLower(1,2)- (1-Math.sqrt(.95)))<1e-12);
  assert.throws(()=>binomialLower(4,3));assert.throws(()=>binomialLower(2,0));
});
test("blank recognition and wrong words count against actual verbatim WER",()=>{
  assert.deepEqual(wordEdits("الحمد لله رب العالمين",""),{errors:4,words:4});
  assert.deepEqual(wordEdits("الحمد لله رب العالمين","الحمد لله الشمس العالمين"),{errors:1,words:4});
  assert.deepEqual(wordEdits("ٱلْحَمْدُ لِلَّهِ","الحمد لله"),{errors:0,words:2});
});
test("blanket abstention cannot qualify despite having no false corrections",()=>{
  const result=qualifyRecitation(evidence([one({gold:[{kind:"omission",index:2}]})]));
  assert.equal(result.status,"FAIL");assert.equal(result.metrics.find(m=>m.name==="omission recall")?.observed,0);
  assert.equal(result.metrics.find(m=>m.name==="correction precision")?.observed,null);
});
test("wrong error category or localization cannot become a true correction",()=>{
  const result=qualifyRecitation(evidence([one({gold:[{kind:"omission",index:2}],predicted:[{kind:"omission",index:1}]})]));
  assert.equal(result.metrics[0].observed,0);assert.equal(result.metrics.find(m=>m.name==="correction precision")?.observed,0);
});
test("thousands of correlated clips still provide only one independent speaker",()=>{
  const rows=Array.from({length:600},(_,i)=>one({id:`fixture-${i}`,recording:`fixture-recording-${i}`}));
  const result=qualifyRecitation(evidence(rows));assert.equal(result.uniqueSpeakers,1);
  assert.equal(result.metrics.find(m=>m.name==="clean-recitation specificity")?.independentSpeakers,1);
  assert.equal(result.status,"FAIL");
});
test("missing permissions, waveform controls, reused held-out groups and failed inference fail closed",()=>{
  const result=qualifyRecitation({...evidence([one({split:"calibration",id:"calibration"}),one({origin:"waveform-control",analyzed:false,recognitionFailed:true})]),heldoutUsedForTuning:true});
  assert.equal(result.status,"FAIL");
  for(const fragment of ["consent","natural recitations","overlap calibration","fresh, frozen","cannot be dropped"])assert.ok(result.reasons.some(r=>r.includes(fragment)),fragment);
});
test("untrusted JSON cannot turn truthy consent, invalid splits or fabricated categories into evidence",()=>{
  assert.throws(()=>qualifyRecitation({...evidence([one()]),consentDocumented:"yes"} as unknown as QualificationEvidence),/declaration/);
  assert.throws(()=>qualifyRecitation(evidence([one({split:"unmeasured" as "heldout"})])),/case/);
  assert.throws(()=>qualifyRecitation(evidence([one({predicted:[{kind:"made_up" as "omission",index:1}]})])),/annotation/);
  assert.throws(()=>qualifyRecitation(evidence([one({predicted:[{kind:"omission",index:1},{kind:"omission",index:1}]})])),/Duplicate/);
  assert.throws(()=>qualifyRecitation(evidence([one({recognized:null as unknown as string})])),/case/);
});
test("cached perfect text from failed or missing inference cannot inflate word recognition",()=>{
  for(const row of [one({analyzed:false}),one({recognitionFailed:true})]){
    const result=qualifyRecitation(evidence([row]));
    assert.equal(result.wordRecognition.accuracy,0);assert.equal(result.wordRecognition.errors,4);
  }
});
test("matching invented out-of-range coordinates cannot qualify as localized correction",()=>{
  const result=qualifyRecitation(evidence([one({gold:[{kind:"substitution",index:99}],predicted:[{kind:"substitution",index:99}]})]));
  assert.equal(result.status,"FAIL");assert.ok(result.reasons.some(r=>r.includes("word-localized")));
});

test("a single recording cannot be relabelled as hundreds of independent speakers",()=>{
  // Fictional metadata-validation probe ONLY. No audio, speakers or genuine
  // consent/review exist. This intentionally impersonates all declarations to
  // reproduce the gate loophole; it never qualifies a recognizer.
  const cases=Array.from({length:500},(_,n)=>[[],[{kind:"omission",index:2}],
    [{kind:"substitution",index:2}],[{kind:"repetition",index:1}]].map((gold,i)=>one({
      id:`fictional-${n}-${i}`,speaker:`fictional-speaker-${n}`,recording:"same-fictional-recording",
      origin:"natural",pcmSha256:"c".repeat(64),gold:gold as QualificationCase["gold"],predicted:gold as QualificationCase["predicted"]}))).flat();
  const result=qualifyRecitation({...evidence(cases),consentDocumented:true,doubleReviewedNaturalGold:true,
    spokenScopeVerified:true,modelTrainingSpeakerOverlapExcluded:true});
  assert.equal(result.status,"FAIL");assert.equal(result.corpusIdentity.checksPassed,false);
  assert.equal(result.corpusIdentity.conflictingRecordingSpeakers,1996);
  assert.equal(result.corpusIdentity.duplicatePcmScopes,1999);
  assert.equal(result.uniqueSpeakers,null);assert.equal(result.declaredSpeakerGroups,500);
  for(const metric of result.metrics){assert.equal(metric.independentSpeakers,null);
    assert.equal(metric.lowerConfidenceBound,null);assert.equal(metric.observed,null);
    assert.equal(metric.declaredSpeakerGroups,500);}
  assert.ok(result.reasons.some(r=>r.includes("conflicting speakers")));
  assert.ok(result.reasons.some(r=>r.includes("Duplicate evaluated PCM")));
});

test("renamed identical PCM and reused calibration audio cannot disappear from the corpus",()=>{
  for(const calibration of [false,true]){
    const result=qualifyRecitation(evidence([one({id:"a",recording:"renamed-a",speaker:"speaker-a",
      split:calibration?"calibration":"heldout",pcmSha256:"c".repeat(64)}),
      one({id:"b",recording:"renamed-b",speaker:"speaker-b",pcmSha256:"c".repeat(64)})]));
    assert.equal(result.status,"FAIL");assert.equal(result.corpusIdentity.duplicatePcmScopes,1);
    assert.equal(result.evaluatedCases,calibration?1:2); // no silent drop/select
  }
});

test("multiple different audible scopes from the same recording retain one speaker",()=>{
  const cases=Array.from({length:3},(_,n)=>one({id:`scope-${n}`,
    pcmSha256:createHash("sha256").update(`FICTIONAL scope ${n}`).digest("hex")}));
  const result=qualifyRecitation(evidence(cases));
  assert.equal(result.uniqueSpeakers,1);assert.equal(result.corpusIdentity.checksPassed,true);
  assert.equal(result.evaluatedCases,3);assert.equal(result.status,"FAIL"); // fixtures cannot qualify
});

test("missing natural hashes and untrusted hash values fail without altering old measurements",()=>{
  const result=qualifyRecitation(evidence([one({origin:"natural"})]));
  assert.equal(result.status,"FAIL");assert.equal(result.corpusIdentity.missingNaturalPcmHashes,1);
  assert.equal(result.wordRecognition.words,4);assert.equal(result.wordRecognition.errors,0);
  assert.ok(result.metrics.every(metric=>metric.lowerConfidenceBound===null));
  for(const pcmSha256 of ["", "not-a-hash", true, null, "C".repeat(64)])
    assert.throws(()=>qualifyRecitation(evidence([one({pcmSha256:pcmSha256 as string})])),/PCM scope hash/);
});
