import { judgeAttempt, lcsRatio, normalizeArabicForJudge, phoneticNormalize, type AsrTranscribeResult } from "@tilawi/quran-asr";

export interface ReciteFeedback {
  status: "uncertain" | "following" | "possible_difference";
  words: { text: string; state: "matched" | "possible_difference" | "uncertain" | "not_heard" }[];
  differences: { kind: "omission" | "substitution" | "repetition" | "extra_word"; index: number | null }[];
  attempted: number;
}
/** Require two complete, stable observations before suggesting verse progression.
 * This is a navigation guard, never a memorization score or teacher assessment. */
export class ReciteCompletionGuard {
  private count = 0;
  private sent = false;
  observe(feedback: ReciteFeedback) {
    const complete = feedback.status === "following" && feedback.words.length >= 2
      && !feedback.differences.length && feedback.words.every((word) => word.state === "matched");
    this.count = complete ? this.count + 1 : 0;
    if (this.count < 2 || this.sent) return false;
    this.sent = true; return true;
  }
  reset() { this.count = 0; this.sent = false; }
}
/** A signal-quality indicator, NOT a calibrated probability of user correctness. */
export function acousticQuality(result: AsrTranscribeResult) {
  const { logprobs, timeSteps, vocabSize, blankId } = result.acoustic;
  if (!Number.isInteger(timeSteps) || !Number.isInteger(vocabSize) || timeSteps < 1 || vocabSize < 2 || logprobs.length !== timeSteps * vocabSize) return 0;
  let sum = 0, voiced = 0;
  for (let t = 0; t < timeSteps; t++) {
    let max = -Infinity, winner = blankId;
    for (let v = 0; v < vocabSize; v++) { const score = logprobs[t * vocabSize + v]; if (score > max) { max = score; winner = v; } }
    if (winner !== blankId && Number.isFinite(max)) { voiced++; sum += Math.min(1, Math.exp(max)); }
  }
  return voiced >= 3 ? sum / voiced : 0;
}
/** Never display/generated ASR text as the Quran. Index only into canonical text. */
export function reciteFeedback(expected: string, heard: string, quality: number): ReciteFeedback {
  const words = expected.trim().split(/\s+/).filter(Boolean);
  const spoken = heard.trim().split(/\s+/).filter(Boolean);
  const empty: ReciteFeedback = { status: "uncertain", attempted: 0, differences: [], words: words.map((text) => ({ text, state: "not_heard" })) };
  if (words.length > 200 || spoken.length > 240 || !Number.isFinite(quality) || quality < .7 || spoken.length < 2
    || normalizeArabicForJudge(heard).replace(/\s/g, "").length < 8) return empty;
  const judged = judgeAttempt(words, spoken);
  // The upstream verse matcher accepted a one-word noise hallucination during
  // HBIC evaluation. Independent multi-word anchors are mandatory; uncertain
  // audio never becomes a recitation error, even if a verse matcher accepts it.
  // A suffix clipped by the rolling microphone window is not an independent
  // word anchor. The upstream matcher treats substring matches (e.g. "ما"
  // inside "ربكما") as correct, which appended spurious words to a completed
  // verse in native evaluation. Require whole-word agreement, not substring
  // agreement, before accepting an observation into the transcript.
  const anchors = judged.words.filter((word) => word.judgment === "correct" && word.operation !== "insertion"
    && word.expectedIndex !== null && word.recognizedIndex !== null
    && lcsRatio(phoneticNormalize(words[word.expectedIndex]), phoneticNormalize(spoken[word.recognizedIndex])) >= .8).length;
  if (anchors < 2) return empty;
  const differences: ReciteFeedback["differences"] = [];
  const states = words.map((text): ReciteFeedback["words"][number] => ({ text, state: "not_heard" }));
  for (const word of judged.words) {
    if (word.expectedIndex !== null) states[word.expectedIndex].state = word.judgment === "correct" ? "matched"
      : word.judgment === "apparent-error" ? "possible_difference" : word.judgment === "uncertain" ? "uncertain" : "not_heard";
    if (word.judgment !== "apparent-error") continue;
    if (word.operation === "omission" || word.operation === "substitution") differences.push({ kind: word.operation, index: word.expectedIndex });
    else if (word.operation === "insertion") {
      const i = word.recognizedIndex;
      const resembles = (a: string, b: string) => {
        const x = normalizeArabicForJudge(a), y = normalizeArabicForJudge(b);
        return x === y || (Math.min(x.length, y.length) >= 2 && Math.abs(x.length - y.length) === 1
          && (x.startsWith(y) || y.startsWith(x)));
      };
      const repeated = i !== null && ((i > 0 && resembles(spoken[i], spoken[i - 1]))
        || (i + 1 < spoken.length && resembles(spoken[i], spoken[i + 1])));
      differences.push({ kind: repeated ? "repetition" : "extra_word", index: null });
    }
  }
  return { status: differences.length ? "possible_difference" : "following", words: states, differences, attempted: judged.attempted };
}

/** Silence is not a word. Keep short articulation gaps intact, but bound long
 * quiet runs before CTC inference, which otherwise hallucinated an extra word
 * during HBIC's controlled pause evaluation. This is not a noise classifier. */
export function compactQuietPauses(pcm: Float32Array) {
  const frame = 320, quiet: boolean[] = [];
  for (let start = 0; start < pcm.length; start += frame) {
    let sum = 0; const end = Math.min(pcm.length, start + frame);
    for (let i = start; i < end; i++) sum += pcm[i] * pcm[i];
    quiet.push(Math.sqrt(sum / (end - start)) < .003);
  }
  const keep: [number, number][] = []; let begin = 0, index = 0;
  while (index < quiet.length) {
    if (!quiet[index]) { index++; continue; }
    const start = index; while (index < quiet.length && quiet[index]) index++;
    if (index - start >= 20) {
      // Retain 80 ms either side of a >=400 ms quiet run.
      const left = Math.min(pcm.length, (start + 4) * frame), right = Math.max(left, (index - 4) * frame);
      keep.push([begin, left]); begin = right;
    }
  }
  keep.push([begin, pcm.length]);
  const result = new Float32Array(keep.reduce((n, [a, b]) => n + b - a, 0)); let at = 0;
  for (const [a, b] of keep) { result.set(pcm.subarray(a, b), at); at += b - a; }
  return result;
}

/** Bounded rolling audio; one inference at a time, no stored/uploaded mic audio. */
export class ReciteAudioWindow {
  private buffer = new Float32Array(16_000 * 6);
  private cursor = 0;
  private length = 0;
  append(samples: readonly number[]) {
    for (const value of samples) {
      this.buffer[this.cursor] = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
      this.cursor = (this.cursor + 1) % this.buffer.length;
      this.length = Math.min(this.buffer.length, this.length + 1);
    }
  }
  snapshot() {
    const pcm = new Float32Array(this.length), start = (this.cursor - this.length + this.buffer.length) % this.buffer.length;
    for (let i = 0; i < this.length; i++) pcm[i] = this.buffer[(start + i) % this.buffer.length];
    return pcm;
  }
  clear() { this.buffer.fill(0); this.cursor = 0; this.length = 0; }
}
