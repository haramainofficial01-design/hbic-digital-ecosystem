/** Transcript-comparison fixtures only, NOT acoustic/mistake accuracy. */
import assert from "node:assert/strict";
import test from "node:test";
import {controlRecognitionFidelity} from "../scripts/recitationControlFidelity";
const canonical="الحمد لله رب العالمين";
test("recognizing the canonical answer is NOT faithful recognition of an omitted scripted word",()=>{
  const r=controlRecognitionFidelity(canonical,"الحمد لله العالمين",canonical);
  assert.equal(r.scriptedPositive,true);assert.equal(r.scriptedWordEdits,1);
  assert.equal(r.exactScriptedSpeech,false);assert.equal(r.canonicalInsteadOfScriptedSpeech,true);
  assert.equal(r.naturalMistakeDetectionQualified,false);
});
test("repetition and substitution controls require the actual altered words, not the intended verse",()=>{
  for(const spoken of ["الحمد لله لله رب العالمين","الحمد لله الشمس العالمين"]){
    const faithful=controlRecognitionFidelity(canonical,spoken,spoken);
    assert.equal(faithful.exactScriptedSpeech,true);assert.equal(faithful.canonicalInsteadOfScriptedSpeech,false);
    const restored=controlRecognitionFidelity(canonical,spoken,canonical);
    assert.equal(restored.exactScriptedSpeech,false);assert.equal(restored.canonicalInsteadOfScriptedSpeech,true);
  }
});
test("negative exact speech does not create a canonical-restoration positive",()=>{
  const r=controlRecognitionFidelity(canonical,canonical,canonical);
  assert.equal(r.scriptedPositive,false);assert.equal(r.exactScriptedSpeech,true);
  assert.equal(r.canonicalInsteadOfScriptedSpeech,false);assert.equal(r.neitherExact,false);
});
test("neither-exact transcripts remain distinct from faithful or canonical outputs",()=>{
  const r=controlRecognitionFidelity(canonical,"الحمد لله العالمين","الشمس لله العالمين");
  assert.equal(r.neitherExact,true);assert.equal(r.exactScriptedSpeech,false);assert.equal(r.canonicalInsteadOfScriptedSpeech,false);
});
test("failed/missing recognition cannot use cached perfect text to claim fidelity",()=>{
  for(const [analyzed,failed]of[[false,false],[true,true]]){
    const r=controlRecognitionFidelity(canonical,"الحمد لله العالمين","الحمد لله العالمين",analyzed,failed);
    assert.equal(r.analysisAvailable,false);assert.equal(r.exactScriptedSpeech,false);
    assert.equal(r.canonicalInsteadOfScriptedSpeech,false);assert.equal(r.scriptedWordEdits,3);
  }
});
test("blank scopes, oversized/untrusted evidence fail, and orthographic scoring stays unchanged",()=>{
  assert.throws(()=>controlRecognitionFidelity("",canonical,canonical),/Nonempty/);
  assert.throws(()=>controlRecognitionFidelity(canonical,"",canonical),/Nonempty/);
  assert.throws(()=>controlRecognitionFidelity(canonical,"ق".repeat(16001),canonical),/Bounded/);
  assert.throws(()=>controlRecognitionFidelity(canonical,canonical,canonical,"yes" as unknown as boolean),/Bounded/);
  assert.equal(controlRecognitionFidelity("ٱلْحَمْدُ لِلَّهِ","الحمد لله","الحمد لله").scriptedPositive,false);
});
