import assert from "node:assert/strict";
import test from "node:test";
import { transcriptDifferences } from "../scripts/recitationTranscriptDifferences";

test("offline diagnostics preserve different words and exact omission/substitution coordinates", () => {
  assert.deepEqual(transcriptDifferences("ورفعنا لك ذكرك", "ورفعنا لك ذكرك"), []);
  assert.deepEqual(transcriptDifferences("ورفعنا لك ذكرك", "ورفعنا ذكرك"), [{ kind: "omission", index: 1, heard: null }]);
  assert.deepEqual(transcriptDifferences("ورفعنا لك ذكرك", "ورفعنا على ذكرك"), [{ kind: "substitution", index: 1, heard: "على" }]);
  assert.equal(transcriptDifferences("قلب", "كلب")[0].kind, "substitution");
});
test("repeat diagnostics identify the correct canonical word, not just any repeated token", () => {
  for (const transcript of ["ورفعنا لك لك ذكرك", "ورفعنا ورفعنا لك ذكرك"])
    assert.equal(transcriptDifferences("ورفعنا لك ذكرك", transcript)[0].kind, "repetition");
  assert.equal(transcriptDifferences("ورفعنا لك ذكرك", "ورفعنا لك لك ذكرك")[0].index, 1);
  assert.equal(transcriptDifferences("ورفعنا لك ذكرك", "ورفعنا ورفعنا لك ذكرك")[0].index, 0);
  assert.deepEqual(transcriptDifferences("ورفعنا لك ذكرك", "ورفعنا هو لك ذكرك"), [{ kind: "extra_word", index: 1, heard: "هو" }]);
});
test("orthography remains comparison-only; absent speech is not invented and diagnostic sizes are bounded", () => {
  assert.deepEqual(transcriptDifferences("هَٰذَا كِتَٰبٌ", "هذا كتاب"), []);
  assert.equal(transcriptDifferences("ورفعنا لك ذكرك", "").length, 3);
  assert.throws(() => transcriptDifferences("كلمة ".repeat(201), "كلمة"));
});
