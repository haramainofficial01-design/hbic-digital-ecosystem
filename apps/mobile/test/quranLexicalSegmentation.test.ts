/** Fictional dictionary/phone math fixtures, NOT speech or 99% evidence. */
import test from "node:test";
import assert from "node:assert/strict";
import {lexicalSegmenter} from "../scripts/zipformer/lexicalSegmentation";

test("global lexical segmentation requires only actual phones, preserving word repetition",()=>{
  const parse=lexicalSegmenter([{word:"قل",phones:"ab"},{word:"هو",phones:"cd"}]);
  const result=parse("ababcd");assert.equal(result.status,"unique");
  assert.deepEqual(result.proposedWords,["قل","قل","هو"]);
  assert.equal(result.selectedReferenceReceived,false);assert.equal(result.confidenceQualified,false);
  assert.equal(result.wordRecognitionQualified,false);assert.equal(result.pronunciationQualified,false);
  assert.equal(result.vocabularyCompletenessQualified,false);
});
test("unknown tails, middle gaps and silence are not filled with Quran words",()=>{
  const parse=lexicalSegmenter([{word:"قل",phones:"ab"}]);
  for(const phones of ["", "xab", "abx", "abxab"]){const r=parse(phones);
    assert.equal(r.status,"uncovered");assert.equal(r.proposedWords,null);}
  assert.equal(parse("abx").prefixPhonesCovered,2);
});
test("homophones and competing word boundaries abstain rather than picking a reference",()=>{
  assert.equal(lexicalSegmenter([{word:"قل",phones:"ab"},{word:"هو",phones:"ab"}])("ab").status,"ambiguous");
  const r=lexicalSegmenter([{word:"قل",phones:"a"},{word:"هو",phones:"aa"}])("aa");
  assert.equal(r.status,"ambiguous");assert.equal(r.proposedWords,null);
  assert.equal(r.distinctParsesCappedAtTwo,2);
});
test("orthographic duplicate forms cannot create votes or hide different lexical sequences",()=>{
  const parse=lexicalSegmenter([{word:"قُلْ",phones:"ab"},{word:"قل",phones:"ab"},
    {word:"قُلْ",phones:"a"},{word:"قل",phones:"b"}]);
  assert.equal(parse("ab").status,"ambiguous"); // one word versus two repeated words
  assert.equal(lexicalSegmenter([{word:"قُلْ",phones:"ab"},{word:"قل",phones:"ab"}])("ab").status,"unique");
});
test("explicit duration collapse remains lexical only and cannot erase repeated multi-phone words",()=>{
  const parse=lexicalSegmenter([{word:"قل",phones:"aabb"}],true);
  assert.deepEqual(parse("aaaabbbb").proposedWords,["قل"]);
  assert.deepEqual(parse("aabbaabb").proposedWords,["قل","قل"]);
  assert.equal(parse("acb").status,"uncovered");
  assert.equal(parse("aabb").pronunciationQualified,false);
});
test("tiny exhaustive dictionary parsing agrees with bounded ambiguity tracking",()=>{
  const forms=[{word:"قل",phones:"a"},{word:"هو",phones:"ab"},{word:"رب",phones:"b"}],parse=lexicalSegmenter(forms);
  const exhaustive=(text:string):string[][]=>text===""?[[]]:forms.flatMap(f=>text.startsWith(f.phones)
    ?exhaustive(text.slice(f.phones.length)).map(s=>[f.word,...s]):[]);
  for(let length=1;length<=6;length++)for(let bits=0;bits<2**length;bits++){
    const text=Array.from({length},(_,i)=>bits&(1<<i)?"a":"b").join("");
    const exact=new Set(exhaustive(text).map(s=>s.join(" "))),r=parse(text);
    assert.equal(r.distinctParsesCappedAtTwo,Math.min(2,exact.size),text);
    assert.equal(r.status,exact.size>1?"ambiguous":exact.size?"unique":"uncovered",text);
  }
});
test("malformed entries and oversized/untrusted inputs cannot produce lexical proposals",()=>{
  for(const entries of [[],[{word:"",phones:"a"}],[{word:"قل هو",phones:"a"}],[{word:"قل",phones:""}]])
    assert.throws(()=>lexicalSegmenter(entries));
  assert.throws(()=>lexicalSegmenter([{word:"قل",phones:"a"}],"true" as unknown as boolean));
  const parse=lexicalSegmenter([{word:"قل",phones:"a"}]);
  assert.throws(()=>parse("a".repeat(1001)));assert.throws(()=>parse(null as unknown as string));
});
