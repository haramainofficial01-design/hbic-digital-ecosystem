/** Candidate-retrieval fixtures only, not actual-recognition/accuracy evidence. */
import assert from "node:assert/strict";
import test from "node:test";
import { phoneticLexiconProposals } from "../scripts/recitationPhoneticLexicon";
const lexicon = [{word: "الشمس", phones: "XYZ"}, {word: "رب", phones: "DEF"}, {word: "القمر", phones: "UVW"}];
test("only independently observed changed phone fragments can propose another word", () => {
  const result = phoneticLexiconProposals(["abc", "DEF", "ghi"], ["الحمد", "رب", "العالمين"], "abcXYZghi", lexicon);
  assert.equal(result.candidates[0].word, "الشمس"); assert.equal(result.candidates[0].heardFragment, "XYZ");
  assert.equal(result.candidates[0].index, 1); assert.equal(result.candidates[0].phoneEdits, 0);
  assert.equal(result.transcriptProduced, false); assert.equal(result.confidenceQualified, false);
  assert.equal(result.referenceConditionedRecognition, false);
});
test("matching/blank/omitted speech cannot manufacture a replacement from the expected word", () => {
  for (const heard of ["abcDEFghi", "abcghi", ""]) {
    assert.deepEqual(phoneticLexiconProposals(["abc", "DEF", "ghi"], ["الحمد", "رب", "العالمين"], heard, lexicon).candidates, []);
  }
});
test("duration repetition is retrieval nuisance only; distinct phone errors and unknown words are retained as gaps", () => {
  assert.deepEqual(phoneticLexiconProposals(["abc", "DEF", "ghi"], ["الحمد", "رب", "العالمين"], "abbcDDEFFghi", lexicon).candidates, []);
  assert.deepEqual(phoneticLexiconProposals(["abc", "DEF", "ghi"], ["الحمد", "رب", "العالمين"], "abc123ghi", lexicon).candidates, []);
});
test("duplicate phonetic forms count once and a word elsewhere in the ayah is not globally forbidden", () => {
  const duplicated = [...lexicon, ...lexicon];
  const result = phoneticLexiconProposals(["abc", "DEF", "ghi"], ["الشمس", "رب", "العالمين"], "abcXYZghi", duplicated);
  assert.equal(result.candidates.filter(row => row.word === "الشمس").length, 1);
  assert.equal(result.candidates[0].word, "الشمس");
});
test("candidate bounds and invalid input cannot produce feedback", () => {
  assert.throws(() => phoneticLexiconProposals(["abc"], ["رب"], "abc", lexicon), /Bounded/);
  assert.throws(() => phoneticLexiconProposals(["abc", "def", "ghi"], ["رب", "رب"], "abc", lexicon), /Bounded/);
  assert.throws(() => phoneticLexiconProposals(["abc", "def", "ghi"], ["رب", "رب", "رب"], "abc", []), /Bounded/);
});
