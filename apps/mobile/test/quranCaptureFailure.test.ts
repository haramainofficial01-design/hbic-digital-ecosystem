/** Controlled promise failures only, not a physical microphone/privacy test. */
import test from "node:test";
import assert from "node:assert/strict";
import {OwnedPcmCapture} from "../src/quran/ownedPcmCapture";

test("rejected stop retains ownership, refuses another start, and allows explicit stop retry",async()=>{
  const capture=new OwnedPcmCapture();let starts=0,stops=0;
  await capture.start(async()=>{starts++});
  await assert.rejects(capture.stop(async()=>{stops++;throw Error("FICTIONAL stop rejection")}),/stop rejection/);
  await assert.rejects(capture.start(async()=>{starts++}),/already in use/);
  assert.equal(starts,1);
  await capture.stop(async()=>{stops++});assert.equal(stops,2);
  await capture.stop(async()=>{stops++});assert.equal(stops,2,"confirmed idle must not stop another feature");
  await capture.start(async()=>{starts++});assert.equal(starts,2);
  await capture.stop(async()=>{stops++});assert.equal(stops,3);
});
test("concurrent stop callers share a rejection without discarding retry ownership",async()=>{
  const capture=new OwnedPcmCapture();await capture.start(async()=>{});
  let reject!:(error:Error)=>void,stops=0;
  const a=capture.stop(()=>{stops++;return new Promise<void>((_,fail)=>{reject=fail})});
  const b=capture.stop(async()=>{stops++});assert.equal(a,b);
  const rejected=assert.rejects(a,/FICTIONAL failure/);
  await Promise.resolve();reject(Error("FICTIONAL failure"));await rejected;
  await assert.rejects(capture.start(async()=>{}),/already in use/);
  await capture.stop(async()=>{stops++});assert.equal(stops,2);
});
test("cancelled late start plus rejected stop is still owned until a successful retry",async()=>{
  const capture=new OwnedPcmCapture();let finish!:()=>void,stops=0;
  const start=capture.start(()=>new Promise<void>(resolve=>{finish=resolve}));await Promise.resolve();
  const stop=capture.stop(async()=>{stops++;throw Error("FICTIONAL late stop rejection")});
  const rejected=assert.rejects(stop,/late stop rejection/);
  assert.equal(stops,0);finish();await start;await rejected;
  await assert.rejects(capture.start(async()=>{}),/already in use/);
  await capture.stop(async()=>{stops++});assert.equal(stops,2);
});
