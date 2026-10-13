import test from "node:test";
import assert from "node:assert/strict";
import {decodeNvidiaRnntEvidence,type RnntEmission} from "../scripts/nvidiaRecitationEvidence";
// Token/unit fixtures ONLY. These are not actual recognition or accuracy gold.
const e=(piece:string,frame:number,confidence=.98):RnntEmission=>({piece,frame,confidence});
test("RNNT repeated tokens and same-frame pieces are not incorrectly CTC-collapsed",()=>{
  const result=decodeNvidiaRnntEvidence([e("▁الحمد",1),e("▁لله",3),e("▁لله",5)],10,16000,[{compactStart:0,originalStart:0,length:16000}],0,24000);
  assert.deepEqual(result.words.map(w=>w.text),["الحمد","لله","لله"]);
  assert.ok(result.words[2].startSample>result.words[1].startSample);
  assert.equal(result.quality,.98);
  const pieces=decodeNvidiaRnntEvidence([e("▁ورفع",1),e("نا",1)],10,16000,[{compactStart:0,originalStart:0,length:16000}],0,24000);
  assert.equal(pieces.words[0].text,"ورفعنا");assert.equal(pieces.words[0].endSample,3200);
});
test("RNNT pause timeline maps word end left and following word start right",()=>{
  const result=decodeNvidiaRnntEvidence([e("▁الحمد",1),e("▁لله",2)],5,5000,[{compactStart:0,originalStart:0,length:2000},{compactStart:2000,originalStart:10000,length:3000}],0,14000);
  assert.equal(result.words[0].endSample,2000);assert.equal(result.words[1].startSample,10000);
});
test("RNNT keeps weak pieces uncertain and clipped openings marked as edges",()=>{
  const result=decodeNvidiaRnntEvidence([e("ورفع",1),e("نا",2,.41),e("▁",3),e("لك",4)],10,16000,[{compactStart:0,originalStart:0,length:16000}],16000,24000);
  assert.equal(result.words[0].edge,true);assert.equal(result.words[0].confidence,.41);
  assert.equal(result.words[1].edge,false);
});
test("invalid or backward RNNT emissions cannot fabricate a valid timeline",()=>{
  const decode=(data:RnntEmission[])=>decodeNvidiaRnntEvidence(data,10,16000,[{compactStart:0,originalStart:0,length:16000}],0,24000);
  assert.throws(()=>decode([e("▁الحمد",5),e("▁لله",2)]));
  assert.throws(()=>decode([e("▁الحمد",1,NaN)]));assert.throws(()=>decode([e("▁الحمد",11)]));
  assert.deepEqual(decode([]),{quality:0,words:[]});
  assert.throws(()=>decodeNvidiaRnntEvidence([],10,16000,[{compactStart:1,originalStart:0,length:16000}],0,24000));
});
