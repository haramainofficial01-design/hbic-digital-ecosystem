import { normalizeArabicForJudge, type AsrTranscribeResult } from "@tilawi/quran-asr";
import type { ReciteFeedback } from "./reciteAssistFeedback";

/** Acoustic evidence, not a probability that a recitation is correct. Times
 * refer to the original 16 kHz capture, including pauses removed for inference. */
export interface RecitationWord {
  text: string;
  startSample: number;
  endSample: number;
  confidence: number;
  edge: boolean;
}
export interface RecitationObservation {
  text: string;
  quality: number;
  words: RecitationWord[];
  startSample: number;
  endSample: number;
  /** Explicit decoder failure, not silence or a missing spoken word. */
  evidenceValid?: boolean;
}
export interface AudioSpan { compactStart: number; originalStart: number; length: number }

function validCaptureBounds(observation: RecitationObservation) {
  return Number.isSafeInteger(observation.startSample) && observation.startSample >= 0
    && Number.isSafeInteger(observation.endSample) && observation.endSample > observation.startSample;
}
/** A malformed token is not an omitted spoken word. Validate the ENTIRE
 * observation before aligning or accumulating temporal support; filtering out
 * a broken interior token could otherwise fabricate an omission or completion.
 * Fractional CTC boundaries are valid, but all words must remain chronological
 * and inside the original capture. Low finite confidence remains uncertainty. */
export function validRecitationObservation(observation: RecitationObservation) {
  return validCaptureBounds(observation) && (observation.evidenceValid === undefined || observation.evidenceValid === true)
    && Number.isFinite(observation.quality)
    && observation.quality >= 0 && observation.quality <= 1 && Array.isArray(observation.words)
    && observation.words.length <= 240 && observation.words.every((word, i, spoken) =>
      word && typeof word.text === "string" && !!recitationLexeme(word.text) && typeof word.edge === "boolean"
      && Number.isFinite(word.startSample) && Number.isFinite(word.endSample)
      && word.startSample >= observation.startSample && word.endSample <= observation.endSample
      && word.endSample > word.startSample && (i === 0 || word.startSample >= spoken[i - 1].startSample
        && word.endSample >= spoken[i - 1].endSample)
      && Number.isFinite(word.confidence) && word.confidence >= 0 && word.confidence <= 1);
}

/** Quran annotations are retained for display, but are not spoken words.
 * Never change the licensed canonical text itself. No phonetic letter folding:
 * e.g. قلب/كلب must not become the same lexical word. */
export function recitationLexeme(text: string) {
  return normalizeArabicForJudge(text.replace(/ىٰ/g, "ا").replaceAll("ٰ", "ا")).replace(/ءا/g, "ا").replace(/[^\u0621-\u063A\u0641-\u064A\u066E\u066F\u0671-\u06D3\s]/g, "")
    .replace(/[\u06E5\u06E6]/g, "").trim();
}
export function recitationDisplayWords(text: string) {
  return text.trim().split(/\s+/).filter(word => recitationLexeme(word).length > 0);
}
export function wholeWordAnchor(a: string, b: string) {
  const x = recitationLexeme(a), y = recitationLexeme(b);
  // Permit the two written forms of a dagger-alef word, not arbitrary fuzzy
  // lexical matches. In particular علم must not anchor the different word يعلم.
  const plain = normalizeArabicForJudge(a).replace(/[^\u0621-\u063A\u0641-\u064A\u066E\u066F\u0671-\u06D3]/g, "");
  return !!x && !!y && (x === y || plain === y);
}

/** Lexical alignment must not call a different word correct merely because it
 * sounds similar or is a substring. ASR uncertainty is handled separately by
 * the acoustic/stability gates, not by silently correcting the transcript. */
export function alignRecitationWords(expected: string[], heard: string[]) {
  const aliases = expected.map(word => new Set([recitationLexeme(word), normalizeArabicForJudge(word)
    .replace(/[^\u0621-\u063A\u0641-\u064A\u066E\u066F\u0671-\u06D3]/g, "")].filter(Boolean)));
  const spoken = heard.map(recitationLexeme), width = heard.length + 1;
  // Free heard prefix/suffix permits neighboring ayahs without dragging their
  // words into the selected ayah. Among equal edit counts prefer more exact
  // anchors, then the earliest matching span (important for repeated ayahs).
  const costs = new Int32Array((expected.length + 1) * width);
  for (let i = 1; i <= expected.length; i++) costs[i * width] = i * 256;
  const matches = (i: number, j: number) => aliases[i].has(spoken[j]);
  for (let i = 1; i <= expected.length; i++) for (let j = 1; j <= heard.length; j++) {
    costs[i * width + j] = Math.min(costs[(i - 1) * width + j] + 256, costs[i * width + j - 1] + 256,
      costs[(i - 1) * width + j - 1] + (matches(i - 1, j - 1) ? -1 : 256));
  }
  const words: {expectedIndex: number | null; recognizedIndex: number | null;
    operation: "match" | "substitution" | "omission" | "insertion"; judgment: "correct" | "apparent-error"}[] = [];
  let i = expected.length, j = 0;
  for (let end = 1; end <= heard.length; end++) if (costs[i * width + end] < costs[i * width + j]) j = end;
  for (let suffix = heard.length - 1; suffix >= j; suffix--) words.push({expectedIndex: null, recognizedIndex: suffix, operation: "insertion", judgment: "apparent-error"});
  while (i) {
    const value = costs[i * width + j];
    if (i && j && value === costs[(i - 1) * width + j - 1] + (matches(i - 1, j - 1) ? -1 : 256)) {
      const exact = matches(i - 1, j - 1);
      words.push({expectedIndex: --i, recognizedIndex: --j, operation: exact ? "match" : "substitution", judgment: exact ? "correct" : "apparent-error"});
    } else if (i && value === costs[(i - 1) * width + j] + 256) words.push({expectedIndex: --i, recognizedIndex: null, operation: "omission", judgment: "apparent-error"});
    else words.push({expectedIndex: null, recognizedIndex: --j, operation: "insertion", judgment: "apparent-error"});
  }
  while (j) words.push({expectedIndex: null, recognizedIndex: --j, operation: "insertion", judgment: "apparent-error"});
  return {words: words.reverse()};
}

/** Greedy CTC timings from actual model emissions. This does NOT force-align
 * the expected Quran into the audio, which would conceal omissions/repetitions.
 * CTC emission times are approximate, not expert phoneme boundaries. */
export function decodeRecitationWords(result: AsrTranscribeResult, vocab: Record<string, string>,
  compactSamples: number, spans: AudioSpan[], startSample = 0, originalSamples = compactSamples): RecitationWord[] {
  return decodeRecitationEvidence(result, vocab, compactSamples, spans, startSample, originalSamples).words;
}
/** Timings and the same acoustic-quality statistic share one argmax pass. */
export function decodeRecitationEvidence(result: AsrTranscribeResult, vocab: Record<string, string>,
  compactSamples: number, spans: AudioSpan[], startSample = 0, originalSamples = compactSamples):
  {words: RecitationWord[]; quality: number; evidenceValid?: boolean} {
  const { logprobs, timeSteps, vocabSize, blankId } = result.acoustic;
  const invalid = () => ({words: [] as RecitationWord[], quality: 0, evidenceValid: false as const});
  if (!Number.isInteger(timeSteps) || timeSteps < 1 || !Number.isInteger(vocabSize) || vocabSize < 2
    || !Number.isSafeInteger(blankId) || blankId < 0 || blankId >= vocabSize
    || logprobs.length !== timeSteps * vocabSize || compactSamples < 1 || originalSamples < 1) return invalid();
  let voiced = 0, qualitySum = 0;
  const original = (sample: number, side: "start" | "end") => {
    const bounded = Math.max(0, Math.min(compactSamples, sample));
    // A start at a removed pause maps right; an end at that SAME compact
    // boundary maps left. Otherwise a word would incorrectly span the pause.
    if (bounded === 0) return startSample + (spans[0]?.originalStart ?? 0);
    const span = spans.find(s => side === "start" ? bounded >= s.compactStart && bounded < s.compactStart + s.length
      : bounded > s.compactStart && bounded <= s.compactStart + s.length) ?? spans.at(-1);
    return startSample + (span ? span.originalStart + Math.min(span.length, Math.max(0, bounded - span.compactStart)) : bounded);
  };
  const words: RecitationWord[] = []; let previous = -1, explicitBoundary = startSample === 0;
  let current: RecitationWord | null = null;
  for (let t = 0; t < timeSteps; t++) {
    let score = -Infinity, id = blankId;
    for (let v = 0; v < vocabSize; v++) {
      const value = logprobs[t * vocabSize + v];
      // -Infinity is a legitimate zero-probability alternative. NaN, +Infinity
      // or positive log probabilities invalidate the ENTIRE observation; do
      // not skip a broken token/frame and fabricate an omitted spoken word.
      if (Number.isNaN(value) || value > 0) return invalid();
      if (value > score) { score = value; id = v; }
    }
    if (!Number.isFinite(score)) return invalid();
    // A mismatched/incomplete vocabulary is invalid acoustic evidence. Silently
    // dropping an emitted interior token could otherwise fabricate an omission.
    const piece = id === blankId ? "" : vocab[String(id)];
    // An emitted <unk> is missing lexical evidence, not silence. Dropping it
    // between two known words could turn unheard speech into a skipped-word
    // correction, or join pieces across the unknown sound. Only the actual
    // blank ID may be discarded; nonwinning special alternatives are harmless.
    if (id !== blankId && (typeof piece !== "string" || !piece || piece.startsWith("<"))) return invalid();
    if (id !== blankId && Number.isFinite(score)) { voiced++; qualitySum += Math.min(1, Math.exp(score)); }
    if (id !== blankId && id !== previous) {
      if (piece && !piece.startsWith("<")) {
        if (piece.startsWith("▁")) {
          if (current && recitationLexeme(current.text)) words.push(current);
          current = null; explicitBoundary = true;
        }
        const text = piece.replaceAll("▁", "");
        if (text) {
          const a = original(t * compactSamples / timeSteps, "start"), b = original((t + 1) * compactSamples / timeSteps, "end");
          const confidence = Number.isFinite(score) ? Math.max(0, Math.min(1, Math.exp(score))) : 0;
          if (!current) current = { text: "", startSample: a, endSample: b, confidence, edge: !explicitBoundary };
          current.text += text; current.endSample = b; current.confidence = Math.min(current.confidence, confidence);
          explicitBoundary = false;
        }
      }
    } else if (id !== blankId && current) current.endSample = original((t + 1) * compactSamples / timeSteps, "end");
    previous = id;
  }
  if (current && recitationLexeme(current.text)) words.push(current);
  return { quality: voiced ? qualitySum / voiced : 0, words: words.map(word => ({ ...word, text: recitationLexeme(word.text), edge: word.edge
    || (startSample > 0 && word.startSample - startSample < 1600)
    || startSample + originalSamples - word.endSample < 1600 })) };
}

interface TrackedWord extends RecitationWord {
  support: number;
  context: number;
  /** Latest observation with an actual confident, interior copy of this word. */
  lastEnd: number;
}
const emptyFeedback = (expected: string): ReciteFeedback => ({status: "uncertain", attempted: 0, differences: [], stableComplete: false,
  words: recitationDisplayWords(expected).map(text => ({text, state: "not_heard"}))});

/** Navigation only: follow ACTUAL current tokens without waiting for whole-ayah
 * assessment. This never marks a word correct, creates a mistake, advances an
 * ayah, or fills gaps with the expected text. A lone token is accepted only at a
 * unique selected opening; otherwise two adjacent exact word anchors are needed.
 * Revisions/weak/clipped/new unrelated speech cannot reuse a stale cursor. */
export function recitationFollowingIndex(expected: string, observation: RecitationObservation): number | null {
  const words = recitationDisplayWords(expected);
  if (!words.length || words.length > 200 || !validRecitationObservation(observation) || observation.quality < .7) return null;
  const spoken = observation.words.map(word => ({ ...word }));
  const vocabulary = new Set(words.map(recitationLexeme));
  for (let i = 0; i + 1 < spoken.length; i++) {
    const a = spoken[i], b = spoken[i + 1], joined = recitationLexeme(a.text + b.text);
    if (vocabulary.has(joined) && !vocabulary.has(recitationLexeme(a.text)) && b.startSample >= a.endSample
      && b.startSample - a.endSample < 24000) spoken.splice(i, 2, { ...a, text: joined, endSample: b.endSample,
        confidence: Math.min(a.confidence, b.confidence), edge: a.edge || b.edge });
  }
  const aligned = alignRecitationWords(words, spoken.map(word => word.text));
  const anchors = aligned.words.filter(word => word.operation === "match" && word.expectedIndex !== null && word.recognizedIndex !== null
    && wholeWordAnchor(words[word.expectedIndex], spoken[word.recognizedIndex].text)
    && spoken[word.recognizedIndex].confidence >= .85 && !spoken[word.recognizedIndex].edge);
  let following: number | null = null;
  const opening = anchors.find(anchor => anchor.expectedIndex === 0 && anchor.recognizedIndex === 0);
  if (opening && spoken[0].confidence >= .95 && words.filter(word => wholeWordAnchor(word, spoken[0].text)).length === 1) following = 0;
  let possibleStarts: number[] = [], runLength = 0;
  for (let i = 0; i < anchors.length; i++) {
    const current = anchors[i], before = anchors[i - 1];
    const heard = spoken[current.recognizedIndex!].text;
    if (!before || current.expectedIndex !== before.expectedIndex! + 1 || current.recognizedIndex !== before.recognizedIndex! + 1) {
      runLength = 0;
      possibleStarts = words.flatMap((word, index) => wholeWordAnchor(word, heard) ? [index] : []);
    } else possibleStarts = possibleStarts.filter(start => start + runLength < words.length && wholeWordAnchor(words[start + runLength], heard));
    runLength++;
    // Repeated Quran phrases need enough actual context to identify a UNIQUE
    // location. Minimum-edit alignment alone must not invent which repeat was
    // heard. Candidate filtering is bounded, with no new inference or timers.
    if (runLength >= 2 && possibleStarts.length === 1 && possibleStarts[0] + runLength - 1 === current.expectedIndex)
      following = current.expectedIndex;
  }
  return following;
}

/** Temporal overlap, not string overlap. Equal words at different acoustic times
 * remain repetitions; a second decode of the same samples is not new evidence.
 * A corrected interior decode replaces a clipped/unstable boundary token. */
export class RecitationTracker {
  private history: TrackedWord[] = [];
  private lastEnd = -1;
  reset() { this.history = []; this.lastEnd = -1; }
  snapshot(): RecitationWord[] { return this.history.map(word => ({text: word.text, startSample: word.startSample, endSample: word.endSample,
    confidence: word.confidence, edge: word.edge})); }
  observe(expected: string, observation: RecitationObservation): ReciteFeedback {
    if (!validCaptureBounds(observation) || observation.endSample <= this.lastEnd) return emptyFeedback(expected);
    this.lastEnd = observation.endSample;
    if (!validRecitationObservation(observation)) {
      // Retain the clock so failed/same samples cannot become independent
      // support on retry. Withdraw history rather than keeping a prior green
      // assessment through an invalid NEW observation. Fresh valid evidence
      // must build its own stability again; no learner error is inferred.
      this.history = []; return emptyFeedback(expected);
    }
    if (observation.quality < .7 || !observation.words.length) return emptyFeedback(expected);
    const used = new Set<TrackedWord>();
    for (const word of observation.words) {
      const context = Math.max(0, Math.min(word.startSample - observation.startSample, observation.endSample - word.endSample));
      const middle = (word.startSample + word.endSample) / 2;
      // CTC emission boundaries move slightly when a rolling window starts
      // inside an already-heard word. A bounded timing halo lets the new decode
      // revise that word instead of inventing a second copy at the window edge.
      // `used` still preserves two genuinely co-observed repetitions.
      const nearby = this.history.filter(old => !used.has(old) && old.endSample > observation.startSample - 6400)
        .sort((a, b) => Math.abs((a.startSample + a.endSample) / 2 - middle) - Math.abs((b.startSample + b.endSample) / 2 - middle));
      const overlaps = (old: TrackedWord) => Math.min(old.endSample, word.endSample) - Math.max(old.startSample, word.startSample)
        >= .5 * Math.min(old.endSample - old.startSample, word.endSample - word.startSample);
      const candidate = nearby.find(old => recitationLexeme(old.text) === recitationLexeme(word.text)
        && Math.abs((old.startSample + old.endSample) / 2 - middle) < 6400)
        ?? nearby.find(old => Math.abs((old.startSample + old.endSample) / 2 - middle) < 4000 || overlaps(old));
      if (candidate) {
        used.add(candidate);
        const agrees = recitationLexeme(candidate.text) === recitationLexeme(word.text);
        if (!agrees) candidate.support = 1;
        if (agrees && !word.edge && !candidate.edge && word.confidence >= .85) candidate.support++;
        // Better historical context cannot overrule NEW interior uncertainty.
        // Keep its timing/text for review, but withdraw correction/advance
        // support until consecutive confident observations recover it.
        if (agrees && !word.edge && word.confidence < .9) candidate.support = Math.min(candidate.support, word.confidence < .85 ? 0 : 1);
        const preferred = !word.edge && (candidate.edge || context > candidate.context + 1600
          || (context >= candidate.context && word.confidence > candidate.confidence)
          || (overlaps(candidate) && word.confidence >= candidate.confidence + .15));
        if (preferred) Object.assign(candidate, word, {context, support: agrees ? candidate.support : 1});
        else if (!agrees) candidate.support = 0;
        // A clipped/weak new token cannot lend its capture clock to an older,
        // stronger copy for completion. Its older text may remain for review.
        if (!word.edge && word.confidence >= .9) candidate.lastEnd = observation.endSample;
      } else if (!word.edge) {
        const tracked = {...word, support: 1, context, lastEnd: word.confidence >= .9 ? observation.endSample : -1};
        this.history.push(tracked); used.add(tracked);
      }
    }
    // A newly decoded well-covered interior region can retract an early guess.
    // Preserve out-of-window history, but do not certify a token absent from
    // the new overlapping evidence. Absence becomes uncertainty, not a mistake.
    for (const word of this.history) if (!used.has(word)
      && word.startSample >= observation.startSample + 1600 && word.endSample <= observation.endSample - 1600) word.support = 0;
    this.history.sort((a, b) => a.startSample - b.startSample);
    // The UI caps a session at two minutes; independently cap text-side memory.
    if (this.history.length > 240) { this.reset(); return emptyFeedback(expected); }
    const assessment = this.assess(expected), followingIndex = recitationFollowingIndex(expected, observation);
    return followingIndex === null ? assessment : { ...assessment, followingIndex };
  }
  private assess(expected: string): ReciteFeedback {
    const words = recitationDisplayWords(expected), spoken = this.history.map(word => ({...word}));
    if (!words.length || words.length > 200 || spoken.length < 2
      || spoken.map(word => recitationLexeme(word.text)).join("").length < 8) return emptyFeedback(expected);
    // A single Quran display word can be two ASR words (e.g. يٰأيها / يا أيها).
    // Join only an exact adjacent lexical concatenation, never fuzzy guesses.
    const vocabulary = new Set(words.map(recitationLexeme));
    for (let i = 0; i + 1 < spoken.length; i++) {
      const a = spoken[i], b = spoken[i + 1], joined = recitationLexeme(a.text + b.text);
      if (vocabulary.has(joined) && !vocabulary.has(recitationLexeme(a.text)) && b.startSample >= a.endSample
        && b.startSample - a.endSample < 24000) {
        spoken.splice(i, 2, {...a, text: joined, endSample: b.endSample, confidence: Math.min(a.confidence, b.confidence),
          support: Math.min(a.support, b.support), lastEnd: Math.min(a.lastEnd, b.lastEnd)});
      }
    }
    const judged = alignRecitationWords(words, spoken.map(word => word.text));
    const anchors = judged.words.filter(word => word.expectedIndex !== null && word.recognizedIndex !== null
      && word.judgment === "correct" && wholeWordAnchor(words[word.expectedIndex], spoken[word.recognizedIndex].text)
      && spoken[word.recognizedIndex].confidence >= .8 && spoken[word.recognizedIndex].support > 0);
    if (anchors.length < 2) return emptyFeedback(expected);
    const first = anchors[0], last = anchors.at(-1)!;
    const firstExpected = first.expectedIndex!, lastExpected = last.expectedIndex!;
    const firstHeard = first.recognizedIndex!, lastHeard = last.recognizedIndex!;
    const states: ReciteFeedback["words"] = words.map(text => ({text, state: "not_heard"}));
    const differences: ReciteFeedback["differences"] = [];
    const stable = (index: number | null) => index !== null && spoken[index]?.support >= 2
      && spoken[index].confidence >= .9 && !spoken[index].edge;
    for (const word of judged.words) {
      const ei = word.expectedIndex, hi = word.recognizedIndex;
      // A model sometimes restores a skipped canonical word with a weak token.
      // Text agreement alone must not certify it or trigger automatic advance.
      if (ei !== null && hi !== null && word.judgment === "correct") states[ei].state = wholeWordAnchor(words[ei], spoken[hi].text)
        && spoken[hi].confidence >= .8 && spoken[hi].support > 0 ? "matched" : "uncertain";
      // Starting halfway through an ayah is not evidence that its opening was skipped.
      // Likewise adjacent ayahs in a recording are not extra words in this ayah.
      if (word.judgment === "apparent-error" && ei !== null && ei > firstExpected && ei < lastExpected) {
        if (word.operation === "omission") {
          const before = [...anchors].reverse().find(a => a.expectedIndex! < ei), after = anchors.find(a => a.expectedIndex! > ei);
          if (stable(before?.recognizedIndex ?? null) && stable(after?.recognizedIndex ?? null)) { states[ei].state = "possible_difference"; differences.push({kind: "omission", index: ei}); }
          else states[ei].state = "uncertain";
        } else if (word.operation === "substitution") {
          // Single-letter ASR confusions are not validated pronunciation errors.
          // Keep them visibly uncertain, NEVER silently count them as correct.
          const a = recitationLexeme(words[ei]), b = recitationLexeme(spoken[hi!]?.text ?? "");
          const oneLetter = a.length === b.length && [...a].filter((letter, index) => letter !== b[index]).length === 1;
          // An acoustically stable wrong-looking word alone cannot establish
          // its position in the selected ayah. Both surrounding exact anchors
          // must also survive overlap revisions; retracted/unstable context
          // remains uncertainty, not a correction at the wrong word.
          const before = [...anchors].reverse().find(a => a.expectedIndex! < ei), after = anchors.find(a => a.expectedIndex! > ei);
          if (stable(hi) && stable(before?.recognizedIndex ?? null) && stable(after?.recognizedIndex ?? null) && !oneLetter) {states[ei].state = "possible_difference"; differences.push({kind: "substitution", index: ei});}
          else states[ei].state = "uncertain";
        }
      } else if (word.operation === "insertion" && hi !== null) {
        const repeated = (hi > 0 && recitationLexeme(spoken[hi].text) === recitationLexeme(spoken[hi - 1].text))
          || (hi + 1 < spoken.length && recitationLexeme(spoken[hi].text) === recitationLexeme(spoken[hi + 1].text));
        const repeatsAnchor = repeated && anchors.some(anchor => Math.abs(anchor.recognizedIndex! - hi) === 1
          && recitationLexeme(words[anchor.expectedIndex!]) === recitationLexeme(spoken[hi].text));
        const before = anchors.find(anchor => anchor.recognizedIndex === hi - 1), after = anchors.find(anchor => anchor.recognizedIndex === hi + 1);
        // A stable prefix beside an uncertain word fragment is not an extra
        // word. Non-repetitions require immediate stable exact neighbors;
        // repetitions require BOTH acoustic copies, not one stable copy and
        // an unstable anchor at the same written word.
        const stableRepeat = repeatsAnchor && anchors.some(anchor => Math.abs(anchor.recognizedIndex! - hi) === 1
          && recitationLexeme(words[anchor.expectedIndex!]) === recitationLexeme(spoken[hi].text) && stable(anchor.recognizedIndex));
        const stableExtra = !repeated && hi > firstHeard && hi < lastHeard && stable(before?.recognizedIndex ?? null) && stable(after?.recognizedIndex ?? null);
        if ((stableExtra || stableRepeat) && stable(hi)) {
          const reference = repeated ? anchors.find(anchor => recitationLexeme(words[anchor.expectedIndex!]) === recitationLexeme(spoken[hi].text)) : null;
          differences.push({kind: repeated ? "repetition" : "extra_word", index: reference?.expectedIndex ?? null});
        }
      }
    }
    const complete = states.every(word => word.state === "matched") && !differences.length;
    const finalHeard = judged.words.find(word => word.expectedIndex === words.length - 1)?.recognizedIndex ?? null;
    // Keep earlier stable words outside the rolling window for long ayahs and
    // ordinary pauses, but unrelated new speech must not recertify an old
    // complete transcript. The final canonical anchor must be strong/interior
    // in THIS observation; joined words require both current acoustic pieces.
    const stableComplete = complete && finalHeard !== null && spoken[finalHeard].lastEnd === this.lastEnd
      && judged.words.filter(word => word.expectedIndex !== null && word.recognizedIndex !== null)
      .every(word => stable(word.recognizedIndex));
    return {status: differences.length ? "possible_difference" : states.some(word => word.state === "matched") ? "following" : "uncertain",
      words: states, differences, stableComplete, attempted: complete ? words.length : states.filter(word => word.state !== "not_heard").length};
  }
}
