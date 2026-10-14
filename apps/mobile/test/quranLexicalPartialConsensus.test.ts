/** Exhaustive graph/math fixtures only. No speech or independently reviewed gold. */
import test from "node:test";
import assert from "node:assert/strict";
import {lexicalPartialConsensus} from "../scripts/zipformer/lexicalPartialConsensus";
test("unknown middle/tail sounds remain explicit without discarding mandatory lexical anchors",()=>{
  const parse=lexicalPartialConsensus([{word:"واحد",phones:"ab"},{word:"اثنان",phones:"cd"}]);
  const result=parse("abxcdz");assert.equal(result.status,"partial");
  assert.deepEqual(result.retainedWords,["واحد","اثنان"]);
  assert.deepEqual(result.consensusSpans,[{start:0,end:2,word:"واحد"},{start:3,end:5,word:"اثنان"}]);
  assert.deepEqual(result.unresolvedSpans,[{start:2,end:3,phones:"x"},{start:5,end:6,phones:"z"}]);
  assert.equal(result.minimumUncoveredPhoneCharacters,2);assert.equal(result.missingWordCountQualified,false);
  assert.equal(result.confidenceQualified,false);assert.equal(result.wordCoordinatesQualified,false);
  assert.equal(result.wordRecognitionQualified,false);assert.equal(result.selectedReferenceReceived,false);
  assert.equal(result.fullTranscriptQualified,false);assert.equal(result.safeForMistakeTracking,false);
});
test("competing boundaries and homophones withhold words even when every sound has dictionary coverage",()=>{
  const entries=[{word:"واحد",phones:"m"},{word:"اثنان",phones:"n"},{word:"ثلاثة",phones:"mn"},{word:"أربعة",phones:"z"}];
  const ambiguous=lexicalPartialConsensus(entries)("mnz");
  assert.deepEqual(ambiguous.retainedWords,["اربعه"]);assert.equal(ambiguous.minimumUncoveredPhoneCharacters,0);
  assert.equal(ambiguous.unresolvedPhoneCharacters,2);assert.equal(ambiguous.optimalParsesCappedAtTwo,2);
  assert.deepEqual(ambiguous.unresolvedSpans,[{start:0,end:2,phones:"mn"}]);
  const homophones=lexicalPartialConsensus([{word:"واحد",phones:"m"},{word:"اثنان",phones:"m"}])("m");
  assert.equal(homophones.status,"ambiguous");assert.deepEqual(homophones.retainedWords,[]);
});
test("duplicates cannot add votes, silence is uncovered and repeated multi-phone words remain distinct",()=>{
  const entry={word:"واحد",phones:"ab"},parse=lexicalPartialConsensus([entry,entry]);
  assert.equal(parse("ab").optimalParsesCappedAtTwo,1);assert.deepEqual(parse("abab").retainedWords,["واحد","واحد"]);
  assert.equal(parse("").status,"uncovered");assert.deepEqual(parse("xx").retainedWords,[]);
  const duration=lexicalPartialConsensus([{word:"واحد",phones:"aaabbb"}],true)("aaabbbxaaabbb");
  assert.deepEqual(duration.retainedWords,["واحد","واحد"]);assert.equal(duration.pronunciationQualified,false);
});
test("consensus and minimum uncovered phones match ALL exhaustive paths for 363 tiny strings",()=>{
  const entries=[{word:"واحد",phones:"a"},{word:"اثنان",phones:"b"},{word:"ثلاثة",phones:"ab"}],parse=lexicalPartialConsensus(entries);
  for(let length=1;length<=5;length++)for(let code=0;code<3**length;code++){
    let n=code,text="";for(let i=0;i<length;i++){text+="abx"[n%3];n=Math.floor(n/3);}
    const paths:{cost:number;edges:{start:number;end:number;word:string}[]}[]=[];
    const walk=(start:number,cost:number,edges:typeof paths[number]["edges"])=>{
      if(start===text.length){paths.push({cost,edges});return;}
      walk(start+1,cost+1,edges);
      for(const entry of entries)if(text.startsWith(entry.phones,start))walk(start+entry.phones.length,cost,
        [...edges,{start,end:start+entry.phones.length,word:entry.word}]);
    };walk(0,0,[]);
    const minimum=Math.min(...paths.map(p=>p.cost)),optimal=paths.filter(p=>p.cost===minimum);
    const same=(a:typeof optimal[number]["edges"][number],b:typeof a)=>a.start===b.start&&a.end===b.end&&a.word===b.word;
    const mandatory=optimal[0].edges.filter(edge=>optimal.every(path=>path.edges.some(other=>same(edge,other))));
    const result=parse(text);assert.deepEqual(result.consensusSpans,mandatory,text);
    assert.equal(result.minimumUncoveredPhoneCharacters,minimum,text);
    assert.equal(result.optimalParsesCappedAtTwo,Math.min(2,optimal.length),text);
  }
});
test("malformed and unbounded vocabulary/output fail closed",()=>{
  assert.throws(()=>lexicalPartialConsensus([]),/Bounded/);
  assert.throws(()=>lexicalPartialConsensus([{word:"واحد اثنان",phones:"ab"}]),/One/);
  assert.throws(()=>lexicalPartialConsensus([{word:"واحد",phones:""}]),/Bounded/);
  assert.throws(()=>lexicalPartialConsensus([{word:"واحد",phones:"ab"}])("x".repeat(1001)),/Bounded/);
});
