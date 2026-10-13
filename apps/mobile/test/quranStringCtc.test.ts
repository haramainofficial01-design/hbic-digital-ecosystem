/** Exhaustive math fixtures, never Quran speech-accuracy measurements. */
import assert from "node:assert/strict";
import test from "node:test";
import { compareStringHypotheses, phoneticStringLikelihood } from "../scripts/zipformer/ctcString";

test("compound phonetic units sum every segmentation without hiding blank-separated repeats", () => {
  const units = ["a", "aa", ""], rows = [[.3,.4,.3],[.6,.3,.1],[.2,.3,.5]], exact = new Map<string, number>();
  for (let a=0;a<3;a++) for(let b=0;b<3;b++) for(let c=0;c<3;c++) {
    const ids=[a,b,c], key=ids.filter((id,i)=>id!==2&&(!i||ids[i-1]!==id)).map(id=>units[id]).join("");
    exact.set(key,(exact.get(key)??0)+rows[0][a]*rows[1][b]*rows[2][c]);
  }
  const evidence = Float32Array.from(rows.flat().map(Math.log));
  for (const [text,p] of exact) assert.ok(Math.abs(Math.exp(phoneticStringLikelihood(evidence,units,2,text))-p)<1e-6, text);
  assert.equal(phoneticStringLikelihood(evidence,units,2,"b"),-Infinity);
});
test("uncertain or tied word hypotheses never become certified recognition", () => {
  const evidence=Float32Array.from([.9,.05,.05,.05,.05,.9].map(Math.log));
  const h=[{kind:"unchanged" as const,index:null,phones:"ab"},{kind:"omission" as const,index:1,phones:"a"},{kind:"omission" as const,index:2,phones:"a"}];
  const compared=compareStringHypotheses(evidence,["a","b",""],2,h);
  assert.equal(compared.predicted,null);assert.equal(compared.confidenceQualified,false);assert.equal(compared.recognitionTranscriptProduced,false);
});
test("disclosed sound-length nuisance sums all tiny paths without erasing a repeated multi-phone word", () => {
  const units=["a","aa","b",""], rows=[[.2,.3,.4,.1],[.4,.2,.1,.3],[.1,.4,.3,.2]], exact=new Map<string,number>();
  const collapse=(s:string)=>[...s].filter((c,i,a)=>!i||c!==a[i-1]).join("");
  for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++){
    const ids=[a,b,c], text=collapse(ids.filter((id,i)=>id!==3&&(!i||ids[i-1]!==id)).map(id=>units[id]).join(""));
    exact.set(text,(exact.get(text)??0)+rows[0][a]*rows[1][b]*rows[2][c]);
  }
  const p=Float32Array.from(rows.flat().map(Math.log));
  for(const [text,probability]of exact)assert.ok(Math.abs(Math.exp(phoneticStringLikelihood(p,units,3,text,true))-probability)<1e-6,text);
  assert.notEqual(phoneticStringLikelihood(p,units,3,"aba",true),phoneticStringLikelihood(p,units,3,"ab",true));
});
test("malformed inventory and unnormalized emissions fail safely", () => {
  assert.throws(()=>phoneticStringLikelihood(new Float32Array([0,0]),["a",""],1,"a"),/Normalized/);
  assert.throws(()=>phoneticStringLikelihood(new Float32Array([NaN,0]),["a",""],1,"a"),/Invalid/);
  assert.throws(()=>phoneticStringLikelihood(new Float32Array(3),["a","a",""],2,"a"),/Unique/);
  assert.throws(()=>phoneticStringLikelihood(new Float32Array(3),["a","b",""],2,"a".repeat(1001)),/Bounded/);
});
test("vocalizations of one event do not compete with their own word location", () => {
  const rows=[[.9998,.0001,.0001],[.0001,.9998,.0001],[.0001,.0001,.9998],[.0001,.0001,.9998]];
  const p=Float32Array.from(rows.flat().map(Math.log));
  const h=[{kind:"unchanged" as const,index:null,phones:"aba"},{kind:"substitution" as const,index:1,phones:"ab"},
    {kind:"substitution" as const,index:1,phones:"abb"},{kind:"substitution" as const,index:0,phones:"ba"}];
  assert.deepEqual(compareStringHypotheses(p,["a","b",""],2,h,true).predicted,{kind:"substitution",index:1});
  assert.equal(compareStringHypotheses(p,["a","b",""],2,[...h,{kind:"substitution",index:2,phones:"ab"}],true).predicted,null);
  assert.throws(()=>compareStringHypotheses(p,["a","b",""],2,[...h,h[1]],true),/Duplicate/);
  assert.throws(()=>compareStringHypotheses(p,["a","b",""],2,[h[0],{...h[1],index:-1}],true),/coordinates/);
});
