import test from "node:test";
import assert from "node:assert/strict";
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
