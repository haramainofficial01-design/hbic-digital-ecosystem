/** Exact edit-math fixtures, never manufactured speech or accuracy gold. */
import assert from "node:assert/strict";
import test from "node:test";
import {scriptWordErrorBreakdown} from "../scripts/recitationWordErrorBreakdown";
import {wordEdits} from "../scripts/recitationQualification";
const exact={substitution:{min:0,max:0},deletion:{min:0,max:0},insertion:{min:0,max:0}};
test("empty and exact script comparison retains omissions without calling them learner mistakes",()=>{
  const r=scriptWordErrorBreakdown("قل هو","قل هو");assert.equal(r.errors,0);assert.deepEqual(r.ranges,exact);
  assert.equal(r.errorLocationsQualified,false);assert.equal(r.learnerMistakeGold,false);
  assert.equal(scriptWordErrorBreakdown("قل هو","").ranges.deletion.min,2);
  assert.equal(scriptWordErrorBreakdown("","قل هو").ranges.insertion.min,2);
  assert.equal(scriptWordErrorBreakdown("","").operationCountsAmbiguous,false);
});
test("unambiguous differences distinguish recognizer substitutions deletions and insertions",()=>{
  assert.deepEqual(scriptWordErrorBreakdown("قل هو الله","قل هو الرب").ranges,{...exact,substitution:{min:1,max:1}});
  assert.deepEqual(scriptWordErrorBreakdown("قل هو الله","قل الله").ranges,{...exact,deletion:{min:1,max:1}});
  assert.deepEqual(scriptWordErrorBreakdown("قل هو الله","قل هو هو الله").ranges,{...exact,insertion:{min:1,max:1}});
});
test("equally minimal swap paths cannot be arbitrarily labelled two substitutions or a skipped word",()=>{
  const r=scriptWordErrorBreakdown("قل هو","هو قل");assert.equal(r.errors,2);assert.equal(r.operationCountsAmbiguous,true);
  assert.deepEqual(r.ranges,{substitution:{min:0,max:2},deletion:{min:0,max:1},insertion:{min:0,max:1}});
});
test("same scoring normalizer is used; spelling aliases are not new audible accuracy",()=>{
  for(const[a,b]of[["ٱلْحَمْدُ لِلَّهِ","الحمد لله"],["۞ قل هو","قل هو"],["ٱلْعَـٰلَمِينَ","العالمين"], ["قلب","كلب"]])
    assert.equal(scriptWordErrorBreakdown(a,b).errors,wordEdits(a,b).errors);
});
test("all optimal ranges agree with independent exhaustive tiny-path enumeration",()=>{
  const enumerate=(a:string[],b:string[]):{cost:number;counts:number[]}[]=>{
    if(!a.length)return[{cost:b.length,counts:[0,0,b.length]}];
    if(!b.length)return[{cost:a.length,counts:[0,a.length,0]}];
    const paths:{cost:number;counts:number[]}[]=[];
    for(const [aa,bb,k,add]of [[a.slice(1),b,1,1],[a,b.slice(1),2,1],
      [a.slice(1),b.slice(1),0,Number(a[0]!==b[0])]] as [string[],string[],number,number][])
      for(const p of enumerate(aa,bb)){const counts=p.counts.slice();counts[k]+=add;paths.push({cost:p.cost+add,counts});}
    const best=Math.min(...paths.map(p=>p.cost));return paths.filter(p=>p.cost===best);
  };
  const sequences=[[],["قل"],["هو"],["قل","هو"],["هو","قل"],["قل","قل"],["قل","هو","قل"]];
  for(const a of sequences)for(const b of sequences){const all=enumerate(a,b),r=scriptWordErrorBreakdown(a.join(" "),b.join(" "));
    assert.equal(r.errors,all[0].cost);assert.equal(r.errors,wordEdits(a.join(" "),b.join(" ")).errors);
    for(const[k,index]of[["substitution",0],["deletion",1],["insertion",2]] as const)
      assert.deepEqual(r.ranges[k],{min:Math.min(...all.map(p=>p.counts[index])),max:Math.max(...all.map(p=>p.counts[index]))});
  }
});
test("oversized and invalid script data are refused, not trimmed to improve a result",()=>{
  assert.throws(()=>scriptWordErrorBreakdown("قل ".repeat(1001),""),/Bounded/);
  assert.throws(()=>scriptWordErrorBreakdown("","قل ".repeat(2001)),/Bounded/);
  assert.throws(()=>scriptWordErrorBreakdown("قل", "ق".repeat(16001)),/Bounded/);
  assert.throws(()=>scriptWordErrorBreakdown(null as unknown as string,""),/Bounded/);
});
