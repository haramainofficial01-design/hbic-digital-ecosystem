/** Fictional prefix-mass algebra/selection only, NOT actual speech accuracy. */
import test from "node:test";
import assert from "node:assert/strict";
import {lexicalMassConsensus,type LexicalMassCandidate} from "../scripts/zipformer/lexicalMassConsensus";
import {lexicalRnntFallback} from "../scripts/zipformer/lexicalRnntFallback";
import {controlRecognitionFidelity} from "../scripts/recitationControlFidelity";
const candidate=(id:number,mass:number,word:string|null):LexicalMassCandidate=>({ids:[id],retainedPathLogScore:Math.log(mass),
  proposal:word?{status:"unique",proposedWords:[word]}:{status:"uncovered",proposedWords:null}});
test("unknown mass cannot be dropped to accept a low-ranked complete lexical sequence",()=>{
  const r=lexicalMassConsensus([candidate(1,.45,null),candidate(2,.25,null),candidate(3,.2,"قل")]);
  assert.equal(r.decision,"retain-unknown");assert.equal(r.proposedWords,null);
  assert.ok(Math.abs(Math.exp(r.unknownLogMass)-.7)<1e-12);
  assert.ok(Math.abs(Math.exp(r.totalRetainedLogMass)-.9)<1e-12);
  assert.equal(r.confidenceQualified,false);assert.equal(r.wordRecognitionQualified,false);
  assert.equal(r.safeForMistakeTracking,false);assert.equal(r.referenceReceived,false);
});
test("distinct acoustic prefixes for one normalized word group sum without becoming independent correctness votes",()=>{
  const r=lexicalMassConsensus([candidate(1,.3,null),candidate(2,.25,"قُلْ"),candidate(3,.2,"قل"),candidate(4,.1,"هو")]);
  assert.equal(r.decision,"word-group");assert.deepEqual(r.proposedWords,["قل"]);assert.deepEqual(r.selectedRanks,[2,3]);
  assert.ok(Math.abs(Math.exp(r.wordGroups[0].logMass)-.45)<1e-12);assert.equal(r.pathSumsPruned,true);
});
test("word/unknown ties, word/word ties and all-unknown evidence abstain",()=>{
  for(const rows of [[candidate(1,.4,null),candidate(2,.4,"قل")],
    [candidate(1,.4,"قل"),candidate(2,.4,"هو")],[candidate(1,.8,null)]])
    assert.equal(lexicalMassConsensus(rows).proposedWords,null);
  const ambiguous=candidate(1,.7,null);ambiguous.proposal.status="ambiguous";
  assert.equal(lexicalMassConsensus([ambiguous,candidate(2,.2,"قل")]).decision,"retain-unknown");
});
test("retaining unknown mass cannot certify a raw fallback that hides repeated speech",()=>{
  const mass=lexicalMassConsensus([candidate(1,.7,null),candidate(2,.2,"قل")]);
  assert.equal(mass.proposedWords,null);
  const fallback=lexicalRnntFallback({status:"uncovered",proposedWords:null},"قل هو");
  const fidelity=controlRecognitionFidelity("قل هو","قل قل هو",fallback.transcript);
  assert.equal(fallback.source,"rnnt-raw");assert.equal(fallback.wordRecognitionQualified,false);
  assert.equal(fidelity.canonicalInsteadOfScriptedSpeech,true);assert.equal(fidelity.exactScriptedSpeech,false);
});
test("duplicate prefixes, excess mass, blank hallucinations, partial words and oversized inputs fail closed",()=>{
  assert.throws(()=>lexicalMassConsensus([candidate(1,.3,"قل"),candidate(1,.3,"قل")]),/Duplicate/);
  assert.throws(()=>lexicalMassConsensus([candidate(1,.7,"قل"),candidate(2,.7,null)]),/mass/);
  assert.throws(()=>lexicalMassConsensus([{...candidate(1,.7,"قل"),ids:[]}]),/Valid/);
  assert.throws(()=>lexicalMassConsensus([candidate(250,.7,"قل")]),/Valid/);
  assert.throws(()=>lexicalMassConsensus([{...candidate(1,.7,"قل"),retainedPathLogScore:NaN}]),/Valid/);
  assert.throws(()=>lexicalMassConsensus([{...candidate(1,.7,null),proposal:{status:"uncovered",proposedWords:["قل"]}}]),/Valid/);
  assert.throws(()=>lexicalMassConsensus(Array.from({length:33},(_,i)=>candidate(i,.001,null))),/Bounded/);
});
test("exhaustive tiny normalized prefix masses conserve known plus unknown mass",()=>{
  for(let a=1;a<=4;a++)for(let b=1;b<=4;b++)for(let c=1;c<=4;c++){
    const total=a+b+c+1,r=lexicalMassConsensus([candidate(1,a/total,"قل"),candidate(2,b/total,"هو"),candidate(3,c/total,null)]);
    const mass=r.wordGroups.reduce((n,g)=>n+Math.exp(g.logMass),Math.exp(r.unknownLogMass));
    assert.ok(Math.abs(mass-(a+b+c)/total)<1e-12);
    assert.equal(r.decision,Math.max(a,b)>c&&a!==b?"word-group":"retain-unknown");
  }
});
