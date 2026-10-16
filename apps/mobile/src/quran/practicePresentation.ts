import type { ReciteFeedback } from "./reciteAssistFeedback";

/** Presentation only. These cues never judge speech, advance an ayah or
 * rewrite the canonical words supplied by the reader. */
export function practiceWordCue(words: readonly string[], feedback: ReciteFeedback | null | undefined, index: number) {
  const valid = Number.isSafeInteger(index) && index >= 0 && index < words.length && feedback?.words.length === words.length
    && feedback.words.every((word, at) => word.text === words[at]);
  if (!valid || !feedback) return { current: false, possible: false, matched: false };
  return {
    current: feedback.followingIndex === index,
    possible: feedback.words[index].state === "possible_difference" || feedback.differences.some(difference => difference.index === index),
    matched: feedback.words[index].state === "matched"
  };
}

export function practiceProgress(reviewed: number, total: number) {
  const maximum = Number.isSafeInteger(total) && total > 0 ? total : 0;
  const value = Number.isSafeInteger(reviewed) ? Math.max(0, Math.min(maximum, reviewed)) : 0;
  return { maximum, value, fraction: maximum ? value / maximum : 0 };
}
