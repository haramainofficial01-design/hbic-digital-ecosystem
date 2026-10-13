import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {ReciteInferenceBudget, ReciteUtteranceTail} from "../src/quran/reciteInferenceBudget";

test("a finite captured quiet tail permits finishing inference, but initial/stale/endless silence does not", () => {
  const tail=new ReciteUtteranceTail(),budget=new ReciteInferenceBudget();
  tail.append(16000,false);assert.equal(tail.pending(32000),false);
  tail.append(32000,true);assert.equal(tail.pending(32000),false);
  assert.equal(tail.pending(48000),true);
  budget.started(32000);budget.finished(0,100);
  assert.equal(budget.ready(800,48000,false,true),false);
  assert.equal(budget.ready(1100,48000,false,true),true);
  assert.equal(budget.ready(1100,48000,false,false),false);
  tail.analyzed(false);tail.analyzed(false);tail.analyzed(false);assert.equal(tail.pending(48000),false);
  tail.append(64000,true);assert.equal(tail.pending(144001),false);
  tail.reset();assert.equal(tail.pending(80000),false);
});

test("normal recitation records and recognizes through one owned PCM capture, not a parallel audio-only recorder", () => {
  const practice=readFileSync(new URL("../src/quran/QuranPractice.tsx",import.meta.url),"utf8");
  const assist=readFileSync(new URL("../src/quran/ReciteAssist.tsx",import.meta.url),"utf8");
  assert.ok(practice.includes("Recite & record with word tracking"));
  assert.ok(practice.includes("assist.current?.toggleRecording()"));
  assert.ok(assist.includes("toggleRecording: () => requestStart(true)"));
  assert.ok(assist.includes("if (recordAudio && onRecording)"));
  assert.ok(assist.includes("held.recognize(pcm, startSample)"));
  assert.ok(assist.includes("setHeard(result.text)"));
  assert.ok(assist.includes("Start Recitation Test"));
  assert.ok(assist.includes("Show correction hint"));
  assert.ok(assist.includes("tail.pending(window.current.endSample)"));
});
