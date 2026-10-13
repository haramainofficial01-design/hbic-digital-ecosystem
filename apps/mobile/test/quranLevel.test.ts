/** Signal-math fixtures, not manufactured speech or accuracy measurements. */
import assert from "node:assert/strict";
import test from "node:test";
import {recitationLevel} from "../scripts/recitationLevel";
test("level comparison preserves sample count, zeros, sign and shape with one bounded gain",()=>{
  const input=Float32Array.from({length:4000},(_,i)=>i%3===0?0:i%3===1?.01:-.02),before=input.slice();
  const adjusted=recitationLevel(input);
  assert.deepEqual(input,before);assert.equal(adjusted.pcm.length,input.length);assert.equal(adjusted.gain,4);
  assert.equal(adjusted.referenceConditioned,false);
  for(let i=0;i<input.length;i++)assert.ok(Math.abs(adjusted.pcm[i]-input[i]*4)<1e-7);
});
test("silence is never amplified into speech and no adjusted sample clips",()=>{
  const silence=recitationLevel(new Float32Array(4000));assert.equal(silence.gain,1);assert.equal(silence.originalRms,0);
  const peaked=new Float32Array(4000);peaked[0]=1;peaked[1]=-1;
  const adjusted=recitationLevel(peaked);assert.equal(adjusted.gain,.95);
  assert.ok(adjusted.pcm.every(v=>Math.abs(v)<=.950001));
  assert.equal(recitationLevel(new Float32Array(4000).fill(.8)).gain,.25);
});
test("invalid, out-of-range and oversized input fails instead of silently changing evidence",()=>{
  assert.throws(()=>recitationLevel(new Float32Array(3999)),/Bounded/);
  assert.throws(()=>recitationLevel(new Float32Array(16000*90+1)),/Bounded/);
  for(const value of[NaN,Infinity,1.1,-1.1])assert.throws(()=>recitationLevel(new Float32Array(4000).fill(value)),/Valid/);
});
