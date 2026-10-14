/** Synthetic decoder/selection fixtures only, NOT speech or accuracy gold. */
import test from "node:test";
import assert from "node:assert/strict";
import {lexicalSegmenter} from "../scripts/zipformer/lexicalSegmentation";
import {lexicalAcousticCandidates,lexicalSearchWidth} from "../scripts/zipformer/lexicalAcousticCandidates";
const parse=lexicalSegmenter([{word:"واحد",phones:"m"},{word:"اثنان",phones:"n"}]);
test("explicit wider search preserves the default and refuses sweeps/unbounded arguments",()=>{
  assert.equal(lexicalSearchWidth(),8);assert.equal(lexicalSearchWidth(['8']),8);
  assert.equal(lexicalSearchWidth(['32']),32);
  for(const args of [['0'],['33'],['16'],[''],['32','8'],[32 as never]])assert.throws(()=>lexicalSearchWidth(args),/Explicit/);
});
test("a candidate at acoustic rank 32 stays rank 32 and is not silently promoted to rank one",()=>{
  const acoustic=Array.from({length:32},(_,i)=>({phones:i===31?'m':'x',retainedPathLogScore:-(i+1)}));
  const result=lexicalAcousticCandidates(acoustic,parse);
  assert.equal(result.candidates.length,32);assert.equal(result.top.proposal.status,'uncovered');
  assert.equal(result.firstUnique?.rank,32);assert.equal(result.acousticRankDrop,31);
  assert.equal(result.confidenceQualified,false);
});
test("lexical alternative selection uses unchanged acoustic rank, never reference or shortest words",()=>{
  const result=lexicalAcousticCandidates([{phones:"x",retainedPathLogScore:-1},
    {phones:"mn",retainedPathLogScore:-2},{phones:"m",retainedPathLogScore:-3}],parse);
  assert.equal(result.top.proposal.status,"uncovered");assert.equal(result.firstUnique?.rank,2);
  assert.deepEqual(result.firstUnique?.proposal.proposedWords,["واحد","اثنان"]);
  assert.equal(result.acousticRankDrop,1);assert.equal(result.referenceConditioned,false);
  assert.equal(result.confidenceQualified,false);assert.equal(result.wordRecognitionQualified,false);
});
test("ambiguous, uncovered and blank candidates are retained, not repaired or allowed to vote",()=>{
  const ambiguous=lexicalSegmenter([{word:"واحد",phones:"m"},{word:"اثنان",phones:"m"}]);
  const result=lexicalAcousticCandidates([{phones:"m",retainedPathLogScore:-1},
    {phones:"x",retainedPathLogScore:-2},{phones:"",retainedPathLogScore:-3}],ambiguous);
  assert.equal(result.firstUnique,null);assert.equal(result.acousticRankDrop,null);
  assert.deepEqual(result.candidates.map(row=>row.proposal.status),["ambiguous","uncovered","uncovered"]);
});
test("unordered, invalid or unbounded acoustic candidates fail closed",()=>{
  assert.throws(()=>lexicalAcousticCandidates([],parse),/Bounded/);
  assert.throws(()=>lexicalAcousticCandidates(Array.from({length:33},()=>({phones:"m",retainedPathLogScore:-1})),parse),/Bounded/);
  assert.throws(()=>lexicalAcousticCandidates([{phones:"m",retainedPathLogScore:NaN}],parse),/Bounded/);
  assert.throws(()=>lexicalAcousticCandidates([{phones:"m",retainedPathLogScore:1}],parse),/Bounded/);
  assert.throws(()=>lexicalAcousticCandidates([{phones:"m",retainedPathLogScore:-2},{phones:"n",retainedPathLogScore:-1}],parse),/Bounded/);
});
