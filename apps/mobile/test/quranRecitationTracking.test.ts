import test from "node:test";
import assert from "node:assert/strict";
import type { AsrTranscribeResult } from "@tilawi/quran-asr";
import { acousticQuality, compactQuietPausesWithTimeline, ReciteAudioWindow, ReciteCompletionGuard } from "../src/quran/reciteAssistFeedback";
import { decodeRecitationWords, recitationDisplayWords, recitationLexeme, wholeWordAnchor, RecitationTracker, type RecitationObservation, type RecitationWord } from "../src/quran/recitationTracking";

// Synthetic unit evidence only. Human/waveform qualification is a separate script.
const expected = "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ";
const word = (text: string, at: number, confidence = .99): RecitationWord => ({text, startSample: at, endSample: at + 1600, confidence, edge: false});
const observation = (words: RecitationWord[], endSample: number, startSample = 0): RecitationObservation =>
  ({text: words.map(word => word.text).join(" "), words, quality: .99, startSample, endSample});
const twice = (tracker: RecitationTracker, text: string, words: RecitationWord[]) => {
  tracker.observe(text, observation(words, 64000));
  return tracker.observe(text, observation(words, 80000));
};
test("acoustic quality accepts short real CTC emissions but rejects malformed/blank evidence", () => {
  const make = (ids: number[]) => {
    const logprobs = new Float32Array(ids.length * 3).fill(-20);
    ids.forEach((id, frame) => { logprobs[frame * 3 + id] = Math.log(.98); });
    return {text: "الرحمن الرحيم", tokenIds: [], acoustic: {logprobs, timeSteps: ids.length, vocabSize: 3, blankId: 2}} as AsrTranscribeResult;
  };
  assert.ok(acousticQuality(make([0, 2, 1, 2])) > .97);
  assert.equal(acousticQuality(make([2, 2, 2])), 0);
  assert.equal(acousticQuality({...make([0]), acoustic: {...make([0]).acoustic, timeSteps: 3}}), 0);
});
test("CTC collapse keeps real repeated words and maps compacted pauses to original capture time", () => {
  const vocab = {"0": "<blank>", "1": "▁الحمد", "2": "▁لله"}, ids = [1, 1, 0, 2, 0, 2, 0];
  const logprobs = new Float32Array(ids.length * 3).fill(-15);
  ids.forEach((id, frame) => {logprobs[frame * 3 + id] = Math.log(.98);});
  const result: AsrTranscribeResult = {text: "الحمد لله لله", tokenIds: [1, 2, 2], acoustic: {logprobs, timeSteps: 7, vocabSize: 3, blankId: 0}};
  const decoded = decodeRecitationWords(result, vocab, 7000, [{compactStart: 0, originalStart: 0, length: 3000}, {compactStart: 3000, originalStart: 11000, length: 4000}], 16000, 15000);
  assert.deepEqual(decoded.map(word => word.text), ["الحمد", "لله", "لله"]);
  assert.equal(decoded[1].startSample, 27000); assert.equal(decoded[2].startSample, 29000);
  assert.ok(decoded.every(word => word.confidence > .97));
  const silence = new Float32Array(16000); silence.fill(.1, 0, 3200); silence.fill(.1, 11200);
  const compacted = compactQuietPausesWithTimeline(silence);
  assert.equal(compacted.spans.reduce((sum, span) => sum + span.length, 0), compacted.pcm.length);
  assert.ok(compacted.spans[1].originalStart > compacted.spans[1].compactStart);
});
test("canonical Quran is unchanged; nonspoken marks and joined orthography do not create omissions", () => {
  assert.deepEqual(recitationDisplayWords("۞ أَفَلَا يَعْلَمُ"), ["أَفَلَا", "يَعْلَمُ"]);
  assert.notEqual(recitationLexeme("قلب"), recitationLexeme("كلب"));
  assert.equal(wholeWordAnchor("يعلم", "علم"), false);
  assert.equal(wholeWordAnchor("ٱلْعَـٰلَمِينَ", "العالمين"), true);
  assert.equal(wholeWordAnchor("ٱلْعَـٰلَمِينَ", "العلمين"), true);
  const tracker = new RecitationTracker();
  const result = twice(tracker, "قُلْ يَـٰٓأَيُّهَا ٱلْكَـٰفِرُونَ", [word("قل", 4000), word("يا", 9000), word("ايها", 14000), word("الكافرون", 24000)]);
  assert.deepEqual(result.differences, []); assert.ok(result.words.every(word => word.state === "matched"));
});
test("standalone SentencePiece word boundary is not mistaken for clipped speech", () => {
  const vocab = {"0": "<blank>", "1": "▁", "2": "جمع", "3": "▁مالا"}, ids = [1, 0, 2, 0, 3, 0, 0];
  const logprobs = new Float32Array(ids.length * 4).fill(-15);
  ids.forEach((id, frame) => {logprobs[frame * 4 + id] = Math.log(.99);});
  const result: AsrTranscribeResult = {text: "جمع مالا", tokenIds: [1, 2, 3], acoustic: {logprobs, timeSteps: 7, vocabSize: 4, blankId: 0}};
  const decoded = decodeRecitationWords(result, vocab, 14000, [{compactStart: 0, originalStart: 0, length: 14000}]);
  assert.equal(decoded[0].text, "جمع"); assert.equal(decoded[0].edge, false);
});
test("word ends map left of a compacted pause, while following starts map right", () => {
  const vocab = {"0": "<blank>", "1": "▁الحمد", "2": "▁لله"}, ids = [0, 1, 2, 0, 0];
  const logprobs = new Float32Array(15).fill(-15); ids.forEach((id, frame) => {logprobs[frame * 3 + id] = Math.log(.99);});
  const result: AsrTranscribeResult = {text: "الحمد لله", tokenIds: [1, 2], acoustic: {logprobs, timeSteps: 5, vocabSize: 3, blankId: 0}};
  const decoded = decodeRecitationWords(result, vocab, 5000, [{compactStart: 0, originalStart: 0, length: 2000}, {compactStart: 2000, originalStart: 10000, length: 3000}], 0, 13000);
  assert.equal(decoded[0].endSample, 2000); assert.equal(decoded[1].startSample, 10000);
});
test("different audio timestamps preserve repeated words; overlapping windows never invent repetition", () => {
  const tracker = new RecitationTracker(), heard = [word("الحمد", 4000), word("لله", 12000), word("رب", 22000), word("العالمين", 32000)];
  const following = twice(tracker, expected, heard); assert.deepEqual(following.differences, []); assert.equal(tracker.snapshot().length, 4);
  tracker.reset();
  const repeated = twice(tracker, expected, [heard[0], heard[1], word("لله", 17000), heard[2], heard[3]]);
  assert.ok(repeated.differences.some(difference => difference.kind === "repetition"));
  assert.ok(repeated.differences.some(difference => difference.kind === "repetition" && difference.index === 1), "correction hint points to the actual repeated reference word");
});
test("no mistake on a single unstable observation; stable omissions/substitutions have internal anchors", () => {
  const tracker = new RecitationTracker(), skipped = [word("الحمد", 4000), word("لله", 12000), word("العالمين", 32000)];
  assert.deepEqual(tracker.observe(expected, observation(skipped, 64000)).differences, []);
  const omitted = tracker.observe(expected, observation(skipped, 80000)); assert.deepEqual(omitted.differences, [{kind: "omission", index: 2}]);
  tracker.reset();
  const swapped = [word("الحمد", 4000), word("لله", 12000), word("الشمس", 22000), word("العالمين", 32000)];
  assert.ok(twice(tracker, expected, swapped).differences.some(difference => difference.kind === "substitution"));
  tracker.reset();
  assert.deepEqual(twice(tracker, expected, swapped.map(word => ({...word, confidence: .75}))).differences, []);
});
test("later interior recognition revises an early guess instead of freezing it into history", () => {
  const tracker = new RecitationTracker(), heard = [word("الحمد", 4000), word("لله", 12000), word("الشمس", 22000, .95), word("العالمين", 32000)];
  tracker.observe(expected, observation(heard, 40000));
  const revised = tracker.observe(expected, observation([...heard.slice(0, 2), word("رب", 22000, .99), heard[3]], 80000));
  assert.equal(tracker.snapshot()[2].text, "رب"); assert.deepEqual(revised.differences, []);
});
test("starting mid-ayah and valid neighboring ayahs are not labeled as omitted/extra words", () => {
  const tracker = new RecitationTracker();
  assert.deepEqual(twice(tracker, expected, [word("رب", 4000), word("العالمين", 22000)]).differences, []);
  tracker.reset();
  const result = twice(tracker, expected, [word("الرحمن", 500), word("الرحيم", 2500), word("الحمد", 7000), word("لله", 14000), word("رب", 24000), word("العالمين", 34000), word("الرحمن", 46000), word("الرحيم", 54000)]);
  assert.deepEqual(result.differences, []); assert.ok(result.words.every(word => word.state === "matched"));
});
test("same capture cannot accumulate stability or advance an ayah; reset erases timeline", () => {
  const tracker = new RecitationTracker(), heard = [word("الحمد", 4000), word("لله", 12000), word("العالمين", 32000)];
  tracker.observe(expected, observation(heard, 64000));
  assert.deepEqual(tracker.observe(expected, observation(heard, 64000)).differences, []);
  tracker.reset(); assert.deepEqual(tracker.snapshot(), []);
  const full = twice(tracker, expected, [heard[0], heard[1], word("رب", 22000), heard[2]]), guard = new ReciteCompletionGuard();
  assert.equal(guard.observe(full, 80000), false); assert.equal(guard.observe(full, 80000), false); assert.equal(guard.observe(full, 120000), true);
  const ring = new ReciteAudioWindow(); ring.append([.1, .2]); assert.equal(ring.snapshotWithTimeline().endSample, 2);
  ring.clear(); assert.equal(ring.snapshotWithTimeline().endSample, 0);
});
test("a low-confidence canonical hallucination cannot certify a skipped word or complete an ayah", () => {
  const tracker = new RecitationTracker();
  const heard = [word("الحمد", 4000), word("لله", 12000), word("رب", 22000, .51), word("العالمين", 32000)];
  const result = twice(tracker, expected, heard);
  assert.equal(result.words[2].state, "uncertain");
  const guard = new ReciteCompletionGuard(); assert.equal(guard.observe(result, 80000), false); assert.equal(guard.observe(result, 120000), false);
});

test("similar but different whole words never silently become correct; Quran orthographic alternatives remain valid", () => {
  const tracker = new RecitationTracker();
  const result = twice(tracker, "أَفَلَا يَعْلَمُ ٱلْإِنسَـٰنُ", [word("افلا", 4000), word("علم", 16000), word("الانسان", 32000)]);
  assert.notEqual(result.words[1].state, "matched");
  assert.equal(result.stableComplete, false);
  assert.equal(wholeWordAnchor("ءَامَنُوا۟", "امنوا"), true);
  assert.equal(wholeWordAnchor("أَدْرَىٰكَ", "ادراك"), true);
  tracker.reset();
  const oneLetter = twice(tracker, "أَلَمْ نَجْعَل لَّهُۥ عَيْنَيْنِ", [word("الم", 4000), word("يجعل", 16000), word("له", 24000), word("عينين", 32000)]);
  assert.equal(oneLetter.words[1].state, "uncertain"); assert.equal(oneLetter.stableComplete, false);
});

test("an overlapping conflicting hypothesis cannot keep an old word green just because its timing context was better", () => {
  const tracker = new RecitationTracker(), full = [word("الحمد", 4000), word("لله", 12000), word("رب", 22000), word("العالمين", 32000)];
  twice(tracker, expected, full);
  const result = tracker.observe(expected, observation([word("الشمس", 22000, .95), full[3]], 90000, 16000));
  assert.equal(result.words[2].state, "uncertain"); assert.equal(result.stableComplete, false);
});
test("invalid capture bounds cannot poison subsequent timing or fabricate stable feedback", () => {
  const tracker = new RecitationTracker(), heard = [word("الحمد", 4000), word("لله", 12000), word("رب", 22000), word("العالمين", 32000)];
  assert.equal(tracker.observe(expected, observation(heard, NaN)).status, "uncertain");
  assert.equal(tracker.observe(expected, observation(heard, 64000, -1)).status, "uncertain");
  assert.ok(twice(tracker, expected, heard).words.every(word => word.state === "matched"));
});
test("an overlapping decode retracting a word cannot reuse stale history to advance", () => {
  const tracker = new RecitationTracker(), guard = new ReciteCompletionGuard();
  const full = [word("الحمد", 4000), word("لله", 12000), word("رب", 22000), word("العالمين", 32000)];
  const first = tracker.observe(expected, observation(full, 64000));
  assert.equal(first.stableComplete, false); assert.equal(guard.observe(first, 64000), false);
  const next = tracker.observe(expected, observation([full[0], full[1], full[3]], 80000));
  assert.equal(next.words[2].state, "uncertain"); assert.equal(next.stableComplete, false);
  assert.equal(guard.observe(next, 80000), false);
});
