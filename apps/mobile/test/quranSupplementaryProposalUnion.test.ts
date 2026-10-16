/** Fictional lexical-contract tests, not speech or mistake-accuracy evidence. */
import assert from "node:assert/strict";
import test from "node:test";
import { unionIndependentLexicalProposals } from "../scripts/zipformer/supplementaryProposalUnion";

const forms = () => new Map<string, readonly string[]>([
  ["قلب", ["قَلْب", "قُلُب"]], ["كلب", ["كَلْب"]], ["نور", ["نُور"]], ["كتاب", ["كِتَاب"]],
]);
const input = () => ({ reference: "هذا نور لنا", oldForms: ["قَلْب"], supplementaryTranscript: "كَلْب قلب كلب نور كتاب", canonicalForms: forms() });

test("union preserves every old form first and new decoded-word order without fuzzy lexical replacement", () => {
  const request = input(), before = JSON.stringify({ ...request, canonicalForms: [...request.canonicalForms] });
  const result = unionIndependentLexicalProposals(request);
  assert.deepEqual(result.substitutions, ["قَلْب", "كَلْب", "قُلُب", "كِتَاب"]);
  assert.deepEqual(result.observedWords.map(row => row.lexeme), ["كلب", "قلب", "كتاب"]);
  assert.deepEqual(result.observedWords.map(row => row.decodedWordIndex), [0, 1, 4]);
  assert.deepEqual(result.observedWords.map(row => row.existingProposalLexeme), [false, true, false]);
  assert.equal(JSON.stringify({ ...request, canonicalForms: [...request.canonicalForms] }), before);
  assert.equal(result.spokenGoldReceived, false); assert.equal(result.expectedOperationReceived, false);
  assert.equal(result.wordRecognitionQualified, false); assert.equal(result.mistakeDetectionQualified, false);
});

test("unknown mapping remains explicit and exact clitic composition preserves the whole observed word", () => {
  const result = unionIndependentLexicalProposals({ ...input(), oldForms: [], supplementaryTranscript: "بكتاب لنور مجهول" });
  assert.deepEqual(result.substitutions, ["بِكِتَاب", "لِنُور"]);
  assert.deepEqual(result.observedWords.map(row => row.mapping), ["exact-clitic", "exact-clitic", "unavailable"]);
  assert.deepEqual(result.observedWords[2].candidateForms, []);
  assert.deepEqual(result.observedWords[2].addedForms, []);
  assert.equal(result.observedWords[2].lexeme, "مجهول");
  assert.equal(result.missingCoverageCountsAsMiss, true);
});

test("complete old forms survive silence, repeated words and reference-only output", () => {
  const oldForms = Object.freeze(["قَلْب", "كَلْب"]);
  for (const supplementaryTranscript of ["", "هذا نور لنا", "قلب قلب كلب كلب"]) {
    const result = unionIndependentLexicalProposals({ ...input(), oldForms, supplementaryTranscript });
    assert.deepEqual(result.substitutions.slice(0, 2), oldForms);
    assert.equal(result.substitutions.filter(word => word === "قَلْب").length, 1);
    assert.equal(result.substitutions.filter(word => word === "كَلْب").length, 1);
  }
});

test("overflow is an explicit failure rather than silently truncating old or supplementary forms", () => {
  const words = Array.from({ length: 17 }, (_, i) => `ق${"ل".repeat(i + 1)}`), canonicalForms = new Map(words.map(word => [word, [word]]));
  assert.throws(() => unionIndependentLexicalProposals({ ...input(), oldForms: words.slice(0, 16),
    supplementaryTranscript: words[16], canonicalForms }), /truncation/);
  assert.throws(() => unionIndependentLexicalProposals({ ...input(), oldForms: words, canonicalForms }), /Bounded/);
  assert.throws(() => unionIndependentLexicalProposals({ ...input(), reference: Array(32).fill("نور").join(" "),
    oldForms: words.slice(0, 8), supplementaryTranscript: "", canonicalForms }), /truncation/);
});

test("malformed tail map/forms and out-of-bound transcripts fail before a partial union can escape", () => {
  assert.throws(() => unionIndependentLexicalProposals({ ...input(), oldForms: ["قلب", "قلب"] }), /Bounded/);
  assert.throws(() => unionIndependentLexicalProposals({ ...input(), oldForms: ["قلب كلب"] }), /Bounded/);
  assert.throws(() => unionIndependentLexicalProposals({ ...input(), canonicalForms: new Map([...forms(), ["علم", ["قلم"]]]) }), /exact/);
  assert.throws(() => unionIndependentLexicalProposals({ ...input(), canonicalForms: new Map([...forms(), ["علم", ["علم", "علم"]]]) }), /exact/);
  assert.throws(() => unionIndependentLexicalProposals({ ...input(), supplementaryTranscript: Array(241).fill("نور").join(" ") }), /scope/);
  assert.throws(() => unionIndependentLexicalProposals({ ...input(), reference: "نور" }), /scope/);
  assert.throws(() => unionIndependentLexicalProposals({ ...input(), canonicalForms: new Map() }), /Bounded/);
});
