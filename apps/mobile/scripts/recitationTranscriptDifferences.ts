/** Offline whole-transcript diagnostic, NOT live acoustic mistake feedback.
 * No timestamps/confidence are invented for recognizers that do not supply them. */
import { recitationDisplayWords, recitationLexeme, wholeWordAnchor } from "../src/quran/recitationTracking";
export type TranscriptDifference = { kind: "omission" | "substitution" | "repetition" | "extra_word"; index: number; heard: string | null };
export function transcriptDifferences(reference: string, transcript: string): TranscriptDifference[] {
  const a = recitationDisplayWords(reference), b = recitationDisplayWords(transcript);
  if (a.length > 200 || b.length > 240) throw Error("Bounded comparison transcripts required");
  const width = b.length + 1, costs = new Uint16Array((a.length + 1) * width);
  for (let i = 0; i <= a.length; i++) costs[i * width] = i;
  for (let j = 0; j <= b.length; j++) costs[j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) costs[i * width + j] = Math.min(
    costs[(i - 1) * width + j] + 1, costs[i * width + j - 1] + 1,
    costs[(i - 1) * width + j - 1] + (wholeWordAnchor(a[i - 1], b[j - 1]) ? 0 : 1));
  const differences: TranscriptDifference[] = [];
  let i = a.length, j = b.length;
  while (i || j) {
    if (i && j && wholeWordAnchor(a[i - 1], b[j - 1]) && costs[i * width + j] === costs[(i - 1) * width + j - 1]) { i--; j--; }
    else if (i && j && costs[i * width + j] === costs[(i - 1) * width + j - 1] + 1) {
      differences.push({ kind: "substitution", index: --i, heard: b[--j] });
    } else if (i && costs[i * width + j] === costs[(i - 1) * width + j] + 1) {
      differences.push({ kind: "omission", index: --i, heard: null });
    } else {
      const word = b[--j], repeated = (j > 0 && recitationLexeme(word) === recitationLexeme(b[j - 1]))
        || (j + 1 < b.length && recitationLexeme(word) === recitationLexeme(b[j + 1]));
      const index = i > 0 && wholeWordAnchor(a[i - 1], word) ? i - 1 : i;
      differences.push({ kind: repeated ? "repetition" : "extra_word", index, heard: word });
    }
  }
  return differences.reverse();
}
