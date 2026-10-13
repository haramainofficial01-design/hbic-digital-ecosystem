/** Research adapter contract only; no waveform or recognition-accuracy claim. */
import assert from "node:assert/strict";
import test from "node:test";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

test("full-scope reference conversion never fabricates written-word coordinates", () => {
  const corpus=JSON.parse(readFileSync(resolve("apps/mobile/assets/quran/tanzil-uthmani.json"),"utf8"));
  const text=corpus.chapters[0].verses[0].textUthmani;
  const r=spawnSync(resolve("output/quran-development/nvidia-evaluation-runtime/bin/python"),
    ["apps/mobile/scripts/recitation-phonetic-reference.py","--raw-scope"],
    {input:JSON.stringify([{index:0,text}]),encoding:"utf8",timeout:30000,maxBuffer:10000});
  assert.equal(r.status,0,r.stderr);
  const parsed=JSON.parse(r.stdout);
  assert.equal(parsed.referenceOnly,true);assert.equal(parsed.version,"0.6.4");
  assert.equal(parsed.results.length,1);assert.equal(parsed.results[0].wordLocationsQualified,false);
  assert.equal(parsed.results[0].wordPhones,undefined);
  assert.ok(typeof parsed.results[0].phonemes==="string"&&parsed.results[0].phonemes.length>0);
});

test("the approved benchmark adapter does not read credentials, save audio or infer perfect word accuracy", () => {
  const code=readFileSync(resolve("apps/mobile/scripts/zipformer/benchmark.mts"),"utf8");
  assert.ok(code.includes('cache:"no-store"'));
  assert.ok(code.includes("wordAccuracyQualified:false")&&code.includes("mistakeDetectionQualified:false"));
  assert.ok(code.includes("uniqueInputIdentities")&&code.includes("duplicateRows"));
  assert.ok(!/document\.cookie|Authorization|Bearer |hf_[A-Za-z0-9]{16}|\.writeFile[^\n]*audio/.test(code));
});

test("Imlaei comparison mapping preserves repeated ayahs and refuses changed words", () => {
  const corpus=JSON.parse(readFileSync(resolve("output/quran-development/muaalem-comparison/libraries/quran_transcript/quran-script/quran-uthmani-imlaey.json"),"utf8"));
  const aya=corpus.quran.sura[0].aya[0], imlaei=aya["@imlaey"], uthmani=aya["@uthmani"];
  const requests=[{index:0,text:imlaei,scriptFormat:"imlaei"},
    {index:1,text:`${imlaei} ${imlaei}`,scriptFormat:"imlaei"},
    {index:2,text:`${uthmani} ${uthmani}`},
    {index:3,text:imlaei.split(" ").slice(0,-1).join(" "),scriptFormat:"imlaei"},
    {index:4,text:"noncanonical reference words",scriptFormat:"imlaei"}];
  const r=spawnSync(resolve("output/quran-development/nvidia-evaluation-runtime/bin/python"),
    ["apps/mobile/scripts/recitation-phonetic-reference.py","--raw-scope"],
    {input:JSON.stringify(requests),encoding:"utf8",timeout:30000,maxBuffer:10000});
  assert.equal(r.status,0,r.stderr);
  const results=JSON.parse(r.stdout).results;
  assert.equal(results.length,5);
  assert.ok(results[0].phonemes&&results[1].phonemes);
  assert.equal(results[1].phonemes,results[2].phonemes);
  assert.notEqual(results[0].phonemes,results[1].phonemes);
  assert.equal(results[0].referenceProvenance.method,"exact-base-letter full-ayah composition");
  assert.equal(results[0].referenceProvenance.vowelsQualified,false);
  assert.ok(results[3].error&&results[4].error);
  assert.ok(results.every((r:any)=>r.wordPhones===undefined));
});
