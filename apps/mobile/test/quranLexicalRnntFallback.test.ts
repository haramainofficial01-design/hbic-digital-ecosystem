/** Synthetic selection/fidelity contracts only; NOT real speech accuracy. */
import test from "node:test";
import assert from "node:assert/strict";
import {lexicalRnntFallback} from "../scripts/zipformer/lexicalRnntFallback";
import {controlRecognitionFidelity} from "../scripts/recitationControlFidelity";
test("complete lexical transcript is selected by a fixed policy, not agreement or a known answer",()=>{
  const r=lexicalRnntFallback({status:"unique",proposedWords:["قل","قل","هو"]},"قل هو");
  assert.equal(r.source,"phonetic-global-unique");assert.equal(r.transcript,"قل قل هو");
  assert.equal(r.referenceReceived,false);assert.equal(r.confidenceQualified,false);
  assert.equal(r.wordRecognitionQualified,false);assert.equal(r.safeForMistakeTracking,false);
  assert.equal(r.liveFollowingQualified,false);assert.equal(r.nativeQualified,false);
});
test("ambiguous/uncovered lexical scopes keep the raw RNNT string unchanged, including errors and blanks",()=>{
  for(const status of ["ambiguous","uncovered"] as const)for(const text of ["  قل هو  ","هو قل",""]){
    const result=lexicalRnntFallback({status,proposedWords:null},text);
    assert.equal(result.source,"rnnt-raw");assert.equal(result.transcript,text);
  }
});
test("a complete canonical-looking output still fails altered-speech fidelity and is never certified",()=>{
  const result=lexicalRnntFallback({status:"unique",proposedWords:["قل","هو"]},"قل قل هو");
  const score=controlRecognitionFidelity("قل هو","قل قل هو",result.transcript);
  assert.equal(score.canonicalInsteadOfScriptedSpeech,true);assert.equal(score.exactScriptedSpeech,false);
  assert.equal(result.wordRecognitionQualified,false);
});
test("partial/inconsistent, multi-word and oversized proposals fail instead of dropping their gaps",()=>{
  assert.throws(()=>lexicalRnntFallback({status:"partial" as never,proposedWords:["قل"]},"قل"),/Bounded/);
  assert.throws(()=>lexicalRnntFallback({status:"unique",proposedWords:[]},"قل"),/Bounded/);
  assert.throws(()=>lexicalRnntFallback({status:"uncovered",proposedWords:["قل"]},"قل"),/Bounded/);
  assert.throws(()=>lexicalRnntFallback({status:"unique",proposedWords:["قل هو"]},"قل"),/Bounded/);
  assert.throws(()=>lexicalRnntFallback({status:"uncovered",proposedWords:null},"x".repeat(16001)),/Bounded/);
});
