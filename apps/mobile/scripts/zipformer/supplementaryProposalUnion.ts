/** Quran-Lab NPL-1.2; retain LICENSE. Local research only, not a released
 * recognizer. Unchanged Tanzil forms retain their upstream CC BY 3.0 terms.
 * Supplementary words come from a complete independently decoded transcript;
 * reference words only exclude unchanged comparison candidates. No planted
 * operation, expected location, spoken gold, fuzzy repair or acoustic decision.
 */
import { recitationDisplayWords, recitationLexeme } from "../../src/quran/recitationTracking";

type Input = {
  reference: string;
  oldForms: readonly string[];
  supplementaryTranscript: string;
  canonicalForms: ReadonlyMap<string, readonly string[]>;
};

const singleForm = (value: unknown): value is string => typeof value === "string"
  && value.length > 0 && value.length <= 100 && !/\s/.test(value) && !!recitationLexeme(value);

export function unionIndependentLexicalProposals({ reference, oldForms, supplementaryTranscript, canonicalForms }: Input) {
  if (typeof reference !== "string" || reference.length > 8000
    || typeof supplementaryTranscript !== "string" || supplementaryTranscript.length > 16000
    || !Array.isArray(oldForms) || oldForms.length > 16 || oldForms.some(form => !singleForm(form))
    || new Set(oldForms).size !== oldForms.length
    || !(canonicalForms instanceof Map) || !canonicalForms.size || canonicalForms.size > 100000)
    throw Error("Bounded original forms, raw transcript and unchanged canonical form map required");
  for (const [key, forms] of canonicalForms) {
    if (!singleForm(key) || recitationLexeme(key) !== key || !Array.isArray(forms) || forms.length < 1 || forms.length > 3
      || forms.some(form => !singleForm(form) || recitationLexeme(form) !== key) || new Set(forms).size !== forms.length)
      throw Error("Every canonical map entry must preserve one exact normalized observed lexeme");
  }
  const referenceWords = recitationDisplayWords(reference), decodedWords = recitationDisplayWords(supplementaryTranscript);
  if (referenceWords.length < 3 || referenceWords.length > 32 || decodedWords.length > 240)
    throw Error("Bounded complete comparison scope required");
  const original = new Set(referenceWords.map(recitationLexeme)), oldLexemes = new Set(oldForms.map(recitationLexeme));
  const seen = new Set<string>(), addedForms: string[] = [];
  const observedWords: { decodedWord: string; decodedWordIndex: number; lexeme: string; existingProposalLexeme: boolean;
    mapping: "canonical" | "exact-clitic" | "unavailable"; candidateForms: string[]; addedForms: string[] }[] = [];
  for (const [decodedWordIndex, decodedWord] of decodedWords.entries()) {
    const lexeme = recitationLexeme(decodedWord);
    if (original.has(lexeme) || seen.has(lexeme)) continue;
    seen.add(lexeme);
    const candidateForms = [...(canonicalForms.get(lexeme) ?? [])];
    let mapping: "canonical" | "exact-clitic" | "unavailable" = candidateForms.length ? "canonical" : "unavailable";
    if (!candidateForms.length) for (const [prefix, vocalized] of [["ك", "كَ"], ["ب", "بِ"], ["ل", "لِ"], ["و", "وَ"], ["ف", "فَ"]]) {
      if (lexeme.startsWith(prefix) && lexeme.length > 3) for (const form of canonicalForms.get(lexeme.slice(1)) ?? []) {
        const compound = vocalized + form;
        if (recitationLexeme(compound) === lexeme && !candidateForms.includes(compound)) candidateForms.push(compound);
      }
    }
    if (candidateForms.length && mapping === "unavailable") mapping = "exact-clitic";
    const additions = candidateForms.filter(form => !oldForms.includes(form) && !addedForms.includes(form));
    addedForms.push(...additions);
    observedWords.push({ decodedWord, decodedWordIndex, lexeme, existingProposalLexeme: oldLexemes.has(lexeme),
      mapping, candidateForms, addedForms: additions });
  }
  const substitutions = [...oldForms, ...addedForms];
  // Never silently drop an old or new word to satisfy the phonetizer limit.
  if (substitutions.length > 16 || (referenceWords.length - 2) * (2 + substitutions.length) + 1 > 257)
    throw Error("Complete proposal union exceeds comparison bounds; truncation is forbidden");
  return { substitutions, oldForms: [...oldForms], addedForms, observedWords,
    missingCoverageCountsAsMiss: true as const, acousticInferencePerformed: false as const,
    expectedOperationReceived: false as const, spokenGoldReceived: false as const,
    confidenceQualified: false as const, wordRecognitionQualified: false as const,
    mistakeDetectionQualified: false as const, liveFollowingQualified: false as const, nativeQualified: false as const };
}
