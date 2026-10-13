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
}
export interface AudioSpan { compactStart: number; originalStart: number; length: number }

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
  compactSamples: number, spans: AudioSpan[], startSample = 0, originalSamples = compactSamples) {
  const { logprobs, timeSteps, vocabSize, blankId } = result.acoustic;
  if (!Number.isInteger(timeSteps) || timeSteps < 1 || !Number.isInteger(vocabSize) || vocabSize < 2
    || logprobs.length !== timeSteps * vocabSize || compactSamples < 1 || originalSamples < 1) return { words: [] as RecitationWord[], quality: 0 };
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
    for (let v = 0; v < vocabSize; v++) if (logprobs[t * vocabSize + v] > score) { score = logprobs[t * vocabSize + v]; id = v; }
    if (id !== blankId && Number.isFinite(score)) { voiced++; qualitySum += Math.min(1, Math.exp(score)); }
    if (id !== blankId && id !== previous) {
      const piece = vocab[String(id)] ?? "";
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

interface TrackedWord extends RecitationWord { support: number; context: number; lastEnd: number }
const emptyFeedback = (expected: string): ReciteFeedback => ({status: "uncertain", attempted: 0, differences: [], stableComplete: false,
  words: recitationDisplayWords(expected).map(text => ({text, state: "not_heard"}))});

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
    if (!Number.isSafeInteger(observation.startSample) || observation.startSample < 0 || !Number.isSafeInteger(observation.endSample)
      || observation.endSample <= this.lastEnd || observation.endSample < observation.startSample
      || observation.words.length > 240 || !Number.isFinite(observation.quality)) return emptyFeedback(expected);
    this.lastEnd = observation.endSample;
    if (observation.quality < .7 || !observation.words.length) return emptyFeedback(expected);
    const used = new Set<TrackedWord>();
    for (const word of observation.words) {
      if (!Number.isFinite(word.startSample) || !Number.isFinite(word.endSample) || word.endSample <= word.startSample
        || word.startSample < observation.startSample || word.endSample > observation.endSample || !Number.isFinite(word.confidence)
        || word.confidence < 0 || word.confidence > 1 || !recitationLexeme(word.text)) continue;
      const context = Math.max(0, Math.min(word.startSample - observation.startSample, observation.endSample - word.endSample));
      const middle = (word.startSample + word.endSample) / 2;
      const nearby = this.history.filter(old => !used.has(old) && old.endSample > observation.startSample)
        .sort((a, b) => Math.abs((a.startSample + a.endSample) / 2 - middle) - Math.abs((b.startSample + b.endSample) / 2 - middle));
      const candidate = nearby.find(old => recitationLexeme(old.text) === recitationLexeme(word.text)
        && Math.abs((old.startSample + old.endSample) / 2 - middle) < 6400)
        ?? nearby.find(old => Math.abs((old.startSample + old.endSample) / 2 - middle) < 4000);
      if (candidate) {
        used.add(candidate);
        const agrees = recitationLexeme(candidate.text) === recitationLexeme(word.text);
        if (!agrees) candidate.support = 1;
        if (agrees && !word.edge && !candidate.edge && word.confidence >= .85) candidate.support++;
        const preferred = !word.edge && (candidate.edge || context > candidate.context + 1600
          || (context >= candidate.context && word.confidence > candidate.confidence));
        if (preferred) Object.assign(candidate, word, {context, support: agrees ? candidate.support : 1});
        else if (!agrees) candidate.support = 0;
        candidate.lastEnd = observation.endSample;
      } else if (!word.edge) {
        const tracked = {...word, support: 1, context, lastEnd: observation.endSample};
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
    return this.assess(expected);
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
      if (vocabulary.has(joined) && !vocabulary.has(recitationLexeme(a.text)) && b.startSample - a.endSample < 24000) {
        spoken.splice(i, 2, {...a, text: joined, endSample: b.endSample, confidence: Math.min(a.confidence, b.confidence), support: Math.min(a.support, b.support)});
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
        if ((hi > firstHeard && hi < lastHeard || repeatsAnchor) && stable(hi)) {
          const reference = repeated ? anchors.find(anchor => recitationLexeme(words[anchor.expectedIndex!]) === recitationLexeme(spoken[hi].text)) : null;
          differences.push({kind: repeated ? "repetition" : "extra_word", index: reference?.expectedIndex ?? null});
        }
      }
    }
    const complete = states.every(word => word.state === "matched") && !differences.length;
    const stableComplete = complete && judged.words.filter(word => word.expectedIndex !== null && word.recognizedIndex !== null)
      .every(word => stable(word.recognizedIndex));
    return {status: differences.length ? "possible_difference" : states.some(word => word.state === "matched") ? "following" : "uncertain",
      words: states, differences, stableComplete, attempted: complete ? words.length : states.filter(word => word.state !== "not_heard").length};
  }
}
