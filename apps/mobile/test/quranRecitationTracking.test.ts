import test from "node:test";
import assert from "node:assert/strict";
import type { AsrTranscribeResult } from "@tilawi/quran-asr";
import { acousticQuality, compactQuietPausesWithTimeline, ReciteAudioWindow, ReciteCompletionGuard, type ReciteFeedback } from "../src/quran/reciteAssistFeedback";
import { decodeRecitationWords, decodeRecitationEvidence, recitationDisplayWords, recitationLexeme, wholeWordAnchor, RecitationTracker, type RecitationObservation, type RecitationWord } from "../src/quran/recitationTracking";

// Synthetic unit evidence only. Human/waveform qualification is a separate script.
const expected = "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ";
const word = (text: string, at: number, confidence = .99): RecitationWord => ({text, startSample: at, endSample: at + 1600, confidence, edge: false});
const observation = (words: RecitationWord[], endSample: number, startSample = 0): RecitationObservation =>
  ({text: words.map(word => word.text).join(" "), words, quality: .99, startSample, endSample});
const twice = (tracker: RecitationTracker, text: string, words: RecitationWord[]) => {
  tracker.observe(text, observation(words, 64000));
  return tracker.observe(text, observation(words, 80000));
};
const acousticFixture = () => {
  const ids = [0, 1, 0, 2, 0, 3, 0, 4, 0], logprobs = new Float32Array(ids.length * 5).fill(-15);
  ids.forEach((id, frame) => {logprobs[frame * 5 + id] = Math.log(.99);});
  return {text: "الحمد لله رب العالمين", tokenIds: [1, 2, 3, 4], acoustic: {logprobs, timeSteps: 9, vocabSize: 5, blankId: 0}};
};
const acousticVocab = {"0": "<blank>", "1": "▁الحمد", "2": "▁لله", "3": "▁رب", "4": "▁العالمين"};
const decodeFixture = (result: AsrTranscribeResult) => decodeRecitationEvidence(result, acousticVocab, 48000,
  [{compactStart: 0, originalStart: 0, length: 48000}], 0, 80000);

test("a corrupt CTC frame cannot disappear into a high-confidence skipped-word warning", () => {
  for (const value of [NaN, Infinity, .1]) for (const offset of [5 * 5 + 3, 5 * 5 + 4]) {
    const result = acousticFixture(); result.acoustic.logprobs[offset] = value;
    const evidence = decodeFixture(result), tracker = new RecitationTracker();
    assert.equal(acousticQuality(result), 0);
    assert.equal(evidence.evidenceValid, false); assert.equal(evidence.quality, 0); assert.deepEqual(evidence.words, []);
    for (const endSample of [64000, 80000]) {
      const feedback = tracker.observe(expected, {text: "", ...evidence, startSample: 0, endSample});
      assert.equal(feedback.status, "uncertain"); assert.deepEqual(feedback.differences, []);
      assert.equal(feedback.stableComplete, false); assert.equal(feedback.followingIndex, undefined);
    }
    assert.deepEqual(tracker.snapshot(), []);
  }
});
test("an emitted token missing from the vocabulary cannot look like a skipped word", () => {
  const {"3": _missing, ...incompleteVocab} = acousticVocab;
  const evidence = decodeRecitationEvidence(acousticFixture(), incompleteVocab, 48000,
    [{compactStart: 0, originalStart: 0, length: 48000}], 0, 80000);
  assert.equal(evidence.evidenceValid, false);
  assert.deepEqual(evidence.words, []);
  const tracker = new RecitationTracker();
  for (const endSample of [64000, 80000]) {
    const feedback = tracker.observe(expected, {text: "", ...evidence, startSample: 0, endSample});
    assert.equal(feedback.status, "uncertain");
    assert.deepEqual(feedback.differences, []);
    assert.equal(feedback.stableComplete, false);
  }
});
test("winning unknown or special tokens are missing evidence, never a skipped word", () => {
  const vocabulary = { ...acousticVocab, "5": "<unk>" };
  const fixture = () => {
    const original = acousticFixture(), logprobs = new Float32Array(9 * 6).fill(-15);
    for (let frame = 0; frame < 9; frame++) logprobs.set(original.acoustic.logprobs.subarray(frame * 5, frame * 5 + 5), frame * 6);
    return { ...original, acoustic: { ...original.acoustic, logprobs, vocabSize: 6 } };
  };
  const decode = (result: AsrTranscribeResult, special = "<unk>") => decodeRecitationEvidence(result,
    { ...vocabulary, "5": special }, 48000, [{compactStart: 0, originalStart: 0, length: 48000}], 0, 80000);
  // The mere existence of an unknown-vocabulary alternative must not discard
  // valid words, normal SentencePiece boundaries or legitimate blank frames.
  assert.deepEqual(decode(fixture()), decodeFixture(acousticFixture()));
  for (const special of ["<unk>", "<pad>", "<blank>"]) for (const positions of [[0], [5], [8], [5, 6]]) {
    const result = fixture();
    for (const frame of positions) result.acoustic.logprobs[frame * 6 + 5] = Math.log(.995);
    const evidence = decode(result, special), tracker = new RecitationTracker();
    assert.equal(evidence.evidenceValid, false);
    assert.equal(evidence.quality, 0); assert.deepEqual(evidence.words, []);
    for (const endSample of [64000, 80000]) {
      const feedback = tracker.observe(expected, {text: "", ...evidence, startSample: 0, endSample});
      assert.equal(feedback.status, "uncertain"); assert.deepEqual(feedback.differences, []);
      assert.equal(feedback.stableComplete, false); assert.equal(feedback.followingIndex, undefined);
    }
    assert.deepEqual(tracker.snapshot(), []);
  }
});
test("corrupt new acoustic output clears old stability and cannot reuse the same capture", () => {
  const tracker = new RecitationTracker(), good = decodeFixture(acousticFixture());
  for (const endSample of [64000, 80000]) tracker.observe(expected, {text: "", ...good, startSample: 0, endSample});
  const broken = acousticFixture(); broken.acoustic.logprobs[28] = NaN;
  const invalid = decodeFixture(broken);
  assert.equal(tracker.observe(expected, {text: "", ...invalid, startSample: 0, endSample: 90000}).stableComplete, false);
  assert.deepEqual(tracker.snapshot(), []);
  assert.equal(tracker.observe(expected, {text: "", ...good, startSample: 0, endSample: 90000}).stableComplete, false);
  assert.deepEqual(tracker.snapshot(), []);
  assert.equal(tracker.observe(expected, {text: "", ...good, startSample: 0, endSample: 100000}).stableComplete, false);
  assert.equal(tracker.observe(expected, {text: "", ...good, startSample: 0, endSample: 110000}).stableComplete, true);
});
test("impossible blank IDs, tensor shapes and all-zero-probability frames fail closed", () => {
  for (const blankId of [-1, 5, NaN, .5]) {
    const result = acousticFixture(); result.acoustic.blankId = blankId;
    assert.equal(decodeFixture(result).evidenceValid, false);
    assert.equal(acousticQuality(result), 0);
  }
  const badShape = acousticFixture(); badShape.acoustic.timeSteps = 10;
  assert.equal(decodeFixture(badShape).evidenceValid, false);
  const noWinner = acousticFixture(); noWinner.acoustic.logprobs.fill(-Infinity, 25, 30);
  assert.equal(decodeFixture(noWinner).evidenceValid, false);
  assert.equal(acousticQuality(noWinner), 0);
});
test("zero-probability alternatives and valid blank-only silence do not become corrupted speech", () => {
  const result = acousticFixture(); result.acoustic.logprobs[5 * 5 + 4] = -Infinity;
  const evidence = decodeFixture(result);
  assert.notEqual(evidence.evidenceValid, false); assert.equal(evidence.words.length, 4);
  const silence = acousticFixture(); silence.acoustic.logprobs.fill(-Infinity);
  for (let frame = 0; frame < 9; frame++) silence.acoustic.logprobs[frame * 5] = 0;
  const quiet = decodeFixture(silence);
  assert.notEqual(quiet.evidenceValid, false); assert.equal(quiet.quality, 0); assert.deepEqual(quiet.words, []);
});
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
test("overlapping acoustic words cannot be concatenated into a certified canonical word", () => {
  const text = "قُلْ يَـٰٓأَيُّهَا ٱلْكَـٰفِرُونَ";
  const heard = [word("قل", 4000), { ...word("يا", 9000), endSample: 17000 },
    { ...word("ايها", 14000), endSample: 20000 }, word("الكافرون", 24000)];
  const overlapping = twice(new RecitationTracker(), text, heard);
  assert.notEqual(overlapping.words[1].state, "matched");
  assert.equal(overlapping.stableComplete, false); assert.equal(overlapping.followingIndex, 0);
  // Adjacent or genuinely separated split pieces remain valid orthographic
  // support, with the same positive timing contract as the voice follower.
  for (const startSample of [17000, 18000]) {
    const adjacent = twice(new RecitationTracker(), text, heard.map((word, index) => index === 2 ? { ...word, startSample } : word));
    assert.ok(adjacent.words.every(word => word.state === "matched"));
    assert.equal(adjacent.stableComplete, true); assert.equal(adjacent.followingIndex, 2);
  }
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
test("an actual uncertain-result guard reset cannot be undone by unrelated fresh speech", () => {
  const tracker = new RecitationTracker(), guard = new ReciteCompletionGuard();
  const heard = [word("الحمد", 4000), word("لله", 12000), word("رب", 22000), word("العالمين", 32000)];
  // Match the component: uncertain feedback resets its completion guard;
  // ordinary following feedback is observed with its real capture clock.
  const analyze = (capture: RecitationObservation) => {
    const feedback = tracker.observe(expected, capture);
    if (feedback.status === "uncertain") { guard.reset(); return {feedback, advance: false}; }
    return {feedback, advance: guard.observe(feedback, capture.endSample)};
  };
  assert.equal(analyze(observation(heard, 64000)).advance, false);
  const beforeQuiet = analyze(observation(heard, 80000));
  assert.equal(beforeQuiet.feedback.stableComplete, true); assert.equal(beforeQuiet.advance, false);
  const quiet = analyze({...observation([], 96000), quality: 0});
  assert.equal(quiet.feedback.status, "uncertain"); assert.equal(quiet.advance, false);
  const unrelated = [word("الرحمن", 110000), word("الرحيم", 122000)];
  for (const endSample of [160000, 176000]) {
    const result = analyze(observation(unrelated, endSample, 100000));
    assert.equal(result.feedback.stableComplete, false); assert.equal(result.advance, false);
  }
  assert.ok(tracker.snapshot().some(word => word.text === "الحمد"), "historical text remains available, not re-certified");
});
test("long passages complete with a fresh final anchor while early words remain outside the rolling window", () => {
  // Controlled timing fixture, not a natural-voice or accuracy benchmark.
  const text = "الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين إياك نعبد نستعين";
  for (const pauseSamples of [0, 96000]) {
    const tracker = new RecitationTracker(), guard = new ReciteCompletionGuard();
    const heard = text.split(" ").map((text, index) => word(text, 4000 + index * 12000 + (index >= 6 ? pauseSamples : 0)));
    const early = [64000, 80000, 96000];
    const later = pauseSamples ? [192000, 208000, 224000, 240000, 256000, 272000] : [112000, 128000, 144000, 160000, 176000];
    let latest: ReciteFeedback | undefined, advanced = false;
    const analyze = (endSample: number, quiet = false) => {
      const startSample = Math.max(0, endSample - 96000);
      const words = quiet ? [] : heard.filter(word => word.startSample >= startSample && word.endSample <= endSample);
      latest = tracker.observe(text, {...observation(words, endSample, startSample), quality: quiet ? 0 : .99});
      if (latest.status === "uncertain") guard.reset(); else advanced ||= guard.observe(latest, endSample);
    };
    for (const endSample of early) analyze(endSample);
    if (pauseSamples) for (const endSample of [112000, 128000, 144000, 160000]) analyze(endSample, true);
    for (const endSample of later) analyze(endSample);
    assert.ok(heard[0].endSample < later.at(-1)! - 96000, "opening has left the current six-second window");
    assert.equal(tracker.snapshot().length, heard.length);
    assert.equal(latest?.stableComplete, true); assert.ok(latest?.words.every(word => word.state === "matched"));
    assert.equal(advanced, true);
  }
});
test("quiet feedback preserves history but fresh strong final-word evidence is required to recover completion", () => {
  const tracker = new RecitationTracker(), heard = [word("الحمد", 4000), word("لله", 12000), word("رب", 22000), word("العالمين", 32000)];
  assert.equal(twice(tracker, expected, heard).stableComplete, true);
  assert.equal(tracker.observe(expected, {...observation([], 90000), quality: 0}).stableComplete, false);
  assert.equal(tracker.snapshot().length, heard.length);
  const clipped = tracker.observe(expected, observation(heard.map((word, index) => index === 3 ? {...word, edge: true} : word), 100000));
  assert.equal(clipped.stableComplete, false, "an old strong final copy cannot borrow the new clipped token's clock");
  const weak = tracker.observe(expected, observation(heard.map((word, index) => index === 3 ? {...word, confidence: .85} : word), 110000));
  assert.equal(weak.stableComplete, false);
  assert.equal(tracker.observe(expected, observation(heard, 120000)).stableComplete, true);
});
test("a joined final word requires fresh strong evidence for both acoustic fragments", () => {
  const text = "قُلْ يَـٰٓأَيُّهَا";
  const heard = [word("قل", 4000), word("يا", 12000), word("ايها", 18000)];
  const tracker = new RecitationTracker();
  assert.equal(twice(tracker, text, heard).stableComplete, true);
  for (const staleIndex of [1, 2]) {
    const feedback = tracker.observe(text, observation(heard.map((word, index) => index === staleIndex ? {...word, edge: true} : word), staleIndex === 1 ? 90000 : 100000));
    assert.equal(feedback.stableComplete, false, "one fresh fragment cannot refresh the whole joined canonical word");
  }
  assert.equal(tracker.observe(text, observation(heard, 110000)).stableComplete, true);
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
test("a stable wrong-looking word cannot be localized using unstable surrounding anchors", () => {
  const tracker = new RecitationTracker();
  const uncertainContext = [word("الحمد", 4000), word("لله", 12000, .82), word("الشمس", 22000), word("العالمين", 32000, .82)];
  const result = twice(tracker, expected, uncertainContext);
  assert.deepEqual(result.differences, []);
  assert.equal(result.status, "uncertain");
  assert.notEqual(result.words[2].state, "matched");
  assert.equal(result.stableComplete, false);
});

test("a strong word followed by NEW interior uncertainty withdraws its old correction and completion support", () => {
  const tracker = new RecitationTracker(), swapped = [word("الحمد", 4000), word("لله", 12000), word("الشمس", 22000), word("العالمين", 32000)];
  assert.ok(twice(tracker, expected, swapped).differences.some(d => d.kind === "substitution"));
  const weaker = swapped.map((w, i) => i === 2 ? {...w, confidence: .55} : w);
  const uncertain = tracker.observe(expected, observation(weaker, 90000));
  assert.deepEqual(uncertain.differences, []); assert.equal(uncertain.words[2].state, "uncertain");
  assert.equal(uncertain.stableComplete, false);
  assert.deepEqual(tracker.observe(expected, observation(swapped, 100000)).differences, []);
  assert.ok(tracker.observe(expected, observation(swapped, 110000)).differences.some(d => d.kind === "substitution"));
});
test("an uncertain split word cannot turn its stable prefix into an extra-word correction", () => {
  const tracker = new RecitationTracker(), heard = [word("قل", 4000), word("يا", 9000), word("ايهاي", 19000, .55), word("الكافرون", 30000)];
  const result = twice(tracker, "قُلْ يَـٰٓأَيُّهَا ٱلْكَـٰفِرُونَ", heard);
  assert.deepEqual(result.differences, []); assert.notEqual(result.words[1].state, "matched"); assert.equal(result.stableComplete, false);
});
test("independently stable real extra words still require their immediate stable neighboring anchors", () => {
  const tracker = new RecitationTracker(), heard = [word("الحمد", 4000), word("لله", 12000), word("الشمس", 17000), word("رب", 22000), word("العالمين", 32000)];
  assert.ok(twice(tracker, expected, heard).differences.some(d => d.kind === "extra_word"));
  assert.deepEqual(tracker.observe(expected, observation(heard.map((w, i) => i === 3 ? {...w, confidence: .55} : w), 90000)).differences, []);
});
test("window-boundary timing drift and overlapping revised word emissions never fabricate repetition", () => {
  const tracker = new RecitationTracker(), text = "فَهُوَ فِى عِيشَةٍ رَّاضِيَةٍ";
  tracker.observe(text, observation([word("فهو", 2500, .65), word("في", 13750), {...word("ععيشه", 20200, .55), endSample: 35380}, word("راضيه", 43000, .55)], 79472));
  tracker.observe(text, observation([word("فهو", 2500, .65), word("في", 13900), {...word("ععيشه", 20200, .55), endSample: 35380}, word("راضيه", 43000, .55)], 95472));
  const result = tracker.observe(text, observation([word("في", 18000), {...word("عيشه", 30640, .865), endSample: 36960}, word("راضيه", 43280)], 111472, 15472));
  assert.deepEqual(result.differences, []); assert.equal(tracker.snapshot().filter(w => w.text === "في").length, 1);
  assert.equal(tracker.snapshot().filter(w => w.text === "عيشه").length, 1);
  assert.equal(tracker.snapshot().filter(w => w.text === "ععيشه").length, 0);
  assert.equal(result.stableComplete, false);
});
test("a weak repeated anchor does not certify a second acoustic copy, but separate strong copies remain", () => {
  const tracker = new RecitationTracker(), heard = [word("الحمد", 4000), word("لله", 12000, .82), word("لله", 17000), word("رب", 22000), word("العالمين", 32000)];
  assert.deepEqual(twice(tracker, expected, heard).differences, []);
  assert.equal(tracker.snapshot().filter(w => w.text === "لله").length, 2);
});

test("a malformed interior token must not be silently dropped and turned into an omission", () => {
  for (const bad of [NaN, Infinity, -1, 1.1]) {
    const tracker = new RecitationTracker();
    const heard = [word("الحمد", 4000), word("لله", 12000), word("رب", 22000, bad), word("العالمين", 32000)];
    const first = tracker.observe(expected, observation(heard, 64000));
    const second = tracker.observe(expected, observation(heard, 80000));
    for (const result of [first, second]) {
      assert.equal(result.status, "uncertain"); assert.deepEqual(result.differences, []);
      assert.equal(result.stableComplete, false); assert.equal(result.followingIndex, undefined);
    }
    assert.deepEqual(tracker.snapshot(), []);
  }
});
test("backward, out-of-scope or empty word evidence cannot become a different spoken sequence", () => {
  const valid = [word("الحمد", 4000), word("لله", 12000), word("رب", 22000), word("العالمين", 32000)];
  for (const heard of [
    valid.map((w, i) => i === 2 ? {...w, startSample: -1} : w),
    valid.map((w, i) => i === 2 ? {...w, endSample: 100000} : w),
    [valid[0], valid[2], valid[1], valid[3]],
    valid.map((w, i) => i === 2 ? {...w, text: ""} : w),
    valid.map((w, i) => i === 2 ? {...w, endSample: w.startSample} : w),
  ]) {
    const tracker = new RecitationTracker(), result = twice(tracker, expected, heard);
    assert.equal(result.status, "uncertain"); assert.deepEqual(result.differences, []);
    assert.equal(result.stableComplete, false); assert.deepEqual(tracker.snapshot(), []);
  }
});
test("malformed fresh evidence withdraws old stability and needs fresh observations to recover", () => {
  const tracker = new RecitationTracker(), guard = new ReciteCompletionGuard();
  const valid = [word("الحمد", 4000), word("لله", 12000), word("رب", 22000), word("العالمين", 32000)];
  const stable = twice(tracker, expected, valid);
  assert.equal(stable.stableComplete, true); assert.equal(guard.observe(stable, 80000), false);
  const bad = tracker.observe(expected, observation(valid.map((w, i) => i === 2 ? {...w, confidence: NaN} : w), 90000));
  assert.equal(guard.observe(bad, 90000), false); assert.deepEqual(tracker.snapshot(), []);
  assert.equal(tracker.observe(expected, observation(valid, 90000)).status, "uncertain", "same samples cannot be recycled after a failed result");
  const recovered = tracker.observe(expected, observation(valid, 100000));
  assert.equal(recovered.stableComplete, false); assert.equal(guard.observe(recovered, 100000), false);
  const next = tracker.observe(expected, observation(valid, 110000));
  assert.equal(next.stableComplete, true); assert.equal(guard.observe(next, 110000), false);
  assert.equal(guard.observe(tracker.observe(expected, observation(valid, 120000)), 120000), true);
});
test("invalid fresh quality cannot leave cached evidence certified or create a new error", () => {
  const valid=[word("الحمد",4000),word("لله",12000),word("رب",22000),word("العالمين",32000)];
  for(const quality of [NaN,Infinity,-1,1.1]){
    const tracker=new RecitationTracker();assert.equal(twice(tracker,expected,valid).stableComplete,true);
    const result=tracker.observe(expected,{...observation(valid,90000),quality});
    assert.equal(result.status,"uncertain");assert.equal(result.stableComplete,false);
    assert.deepEqual(result.differences,[]);assert.deepEqual(tracker.snapshot(),[]);
  }
});
