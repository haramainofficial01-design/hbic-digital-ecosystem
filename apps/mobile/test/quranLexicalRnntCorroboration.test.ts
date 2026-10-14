/** Fictional selector-contract fixtures, not speech/99% evidence. */
import test from "node:test";
import assert from "node:assert/strict";
import {lexicalRnntCorroboration,type CorroboratingCandidate} from "../scripts/zipformer/lexicalRnntCorroboration";
import {controlRecognitionFidelity} from "../scripts/recitationControlFidelity";
const row=(rank:number,words:string[]|null):CorroboratingCandidate=>({rank,retainedPathLogScore:-rank,
  proposal:words?{status:"unique",proposedWords:words}:{status:"uncovered",proposedWords:null}});
test("raw RNNT supported at a lower acoustic rank stays raw, never replaced by the first dictionary parse",()=>{
  const raw=" قُلْ   هُوَ ",r=lexicalRnntCorroboration([row(1,["قل","هي"]),row(2,null),row(3,["قل","هو"])],raw);
  assert.equal(r.source,"rnnt-acoustic-corroborated");assert.equal(r.transcript,raw);
  assert.deepEqual(r.matchingAcousticRanks,[3]);assert.equal(r.firstUniqueRank,1);
  for(const field of ["confidenceQualified","wordRecognitionQualified","safeForMistakeTracking",
    "referenceReceived","modelErrorIndependenceQualified","liveFollowingQualified","nativeQualified"] as const)
    assert.equal(r[field],false);
});
test("partial, ambiguous, reordered and fuzzy matches cannot corroborate raw RNNT",()=>{
  const ambiguous=row(1,null);ambiguous.proposal.status="ambiguous";
  for(const words of [["قل"],["هو","قل"],["قل","هي"],["قل","قل","هو"]]){
    const r=lexicalRnntCorroboration([ambiguous,row(2,words)],"قل هو");
    assert.equal(r.source,"phonetic-global-unique");assert.deepEqual(r.matchingAcousticRanks,[]);
    assert.equal(r.transcript,words.join(" "));
  }
});
test("no complete proposal keeps the original RNNT fallback, including blank/error text",()=>{
  for(const raw of [""," ","FICTIONAL unknown words"]){
    const r=lexicalRnntCorroboration([row(1,null)],raw);
    assert.equal(r.source,"rnnt-raw");assert.equal(r.transcript,raw);assert.equal(r.firstUniqueRank,null);
  }
});
test("joint canonical agreement still fails altered-speech fidelity and never certifies an omitted/repeated word",()=>{
  const r=lexicalRnntCorroboration([row(1,["قل","هو"])],"قل هو");
  assert.equal(r.source,"rnnt-acoustic-corroborated");assert.equal(r.wordRecognitionQualified,false);
  for(const script of ["قل قل هو","قل هي"]){
    const f=controlRecognitionFidelity("قل هو",script,r.transcript);
    assert.equal(f.exactScriptedSpeech,false);assert.equal(f.canonicalInsteadOfScriptedSpeech,true);
  }
});
test("all proposals/ranks/scores are validated even after an early raw match",()=>{
  for(const bad of [row(3,["هو"]),{...row(2,["هو"]),retainedPathLogScore:NaN},
    {...row(2,["هو"]),retainedPathLogScore:0},row(2,["two words"]),
    {...row(2,null),proposal:{status:"uncovered",proposedWords:["هو"]}}])
    assert.throws(()=>lexicalRnntCorroboration([row(1,["قل","هو"]),bad as CorroboratingCandidate],"قل هو"));
  assert.throws(()=>lexicalRnntCorroboration([],"قل"));
  assert.throws(()=>lexicalRnntCorroboration(Array.from({length:33},(_,i)=>row(i+1,["قل"])),"قل"));
});
