import { parseAyahReference, type QuranState, type QuranMistake } from "@hbic/shared";
import type { ReciteFeedback } from "./reciteAssistFeedback";

/** Local possible-word flags, never certified mistakes or a Tajweed score.
 * Overlapping observations from one attempt cannot count as three clean passes. */
export function rememberRecitationFeedback(state: QuranState, key: string, attemptId: string, feedback: ReciteFeedback, now = new Date()): QuranState {
  if (parseAyahReference(key)?.key !== key || !attemptId || attemptId.length > 100 || feedback.status === "uncertain") return state;
  const complete = feedback.status === "following" && feedback.stableComplete === true && feedback.words.length >= 2
    && feedback.words.every(w => w.state === "matched") && !feedback.differences.length;
  if (!complete && !feedback.differences.length) return state;
  let changed = false;
  const updated = new Map(state.mistakes.map(item => [item.id, item]));
  if (feedback.status === "possible_difference") {
    for (const difference of feedback.differences) {
      const index = difference.index;
      if (index !== null && (!Number.isInteger(index) || index < 0 || index >= feedback.words.length)) continue;
      const id = `${key}:${index ?? "ayah"}:${difference.kind}`, old = updated.get(id);
      if (old?.lastAttemptId === attemptId && old.cleanPasses === 0) continue;
      const item: QuranMistake = { id, key, kind: difference.kind, wordIndex: index, firstDetectedAt: old?.firstDetectedAt ?? now.toISOString(),
        lastDetectedAt: now.toISOString(), cleanPasses: 0, lastAttemptId: attemptId };
      updated.set(id, item); changed = true;
    }
  } else if (complete) {
    for (const item of updated.values()) {
      if (item.key !== key || item.lastAttemptId === attemptId) continue;
      if (item.cleanPasses + 1 >= 3) updated.delete(item.id);
      else updated.set(item.id, { ...item, cleanPasses: item.cleanPasses + 1, lastAttemptId: attemptId });
      changed = true;
    }
  }
  return changed ? { ...state, mistakes: [...updated.values()].slice(-500) } : state;
}
