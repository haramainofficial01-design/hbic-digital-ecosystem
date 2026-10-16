import assert from "node:assert/strict";
import test from "node:test";
import { practiceProgress, practiceWordCue } from "../src/quran/practicePresentation";
import { recentReviewItems, recordingReviewPoints } from "../src/quran/reviewLibraryPresentation";
import type { ReciteFeedback } from "../src/quran/reciteAssistFeedback";
import type { QuranRecording } from "@hbic/shared";
test("word cues require the same canonical text and separate following from possible differences", () => {
  const words = ["الحمد", "لله", "رب", "العالمين"];
  const feedback: ReciteFeedback = { status: "following", attempted: 2, stableComplete: false, followingIndex: 1,
    words: words.map((text, i) => ({ text, state: i < 2 ? "matched" : "not_heard" })), differences: [] };
  assert.deepEqual(practiceWordCue(words, feedback, 1), { current: true, possible: false, matched: true });
  assert.deepEqual(practiceWordCue(words, { ...feedback, differences: [{ kind: "repetition", index: 1 }] }, 1), { current: true, possible: true, matched: true });
  for (const index of [-1, 4, NaN]) assert.deepEqual(practiceWordCue(words, feedback, index), { current: false, possible: false, matched: false });
  assert.deepEqual(practiceWordCue(["different", ...words.slice(1)], feedback, 1), { current: false, possible: false, matched: false });
  assert.deepEqual(practiceWordCue(words, null, 1), { current: false, possible: false, matched: false });
});
test("self-test progress is bounded and is never a recitation accuracy score", () => {
  assert.deepEqual(practiceProgress(2, 5), { maximum: 5, value: 2, fraction: .4 });
  assert.equal(practiceProgress(20, 5).value, 5); assert.equal(practiceProgress(-1, 5).value, 0);
  assert.equal(practiceProgress(1, NaN).fraction, 0); assert.equal(practiceProgress(Infinity, 5).value, 0);
});
test("review points disclose a bounded page and keep all stored markers and recordings unchanged", () => {
  const item: QuranRecording = { id: "quran-1000-test", uri: "file:///fixture.wav", chapter: 1, from: 1, to: 7, durationMillis: 65000, createdAt: "2026-10-15T12:00:00Z",
    markers: Array.from({ length: 12 }, (_, i) => ({ key: "1:2", kind: "repetition", wordIndex: 1, offsetMillis: i * 1000 })) };
  const before = JSON.stringify(item), first = recordingReviewPoints(item);
  assert.equal(first.markers.length, 4); assert.equal(first.remaining, 8); assert.equal(recordingReviewPoints(item, first.next).markers.length, 8);
  assert.equal(recordingReviewPoints(item, 12).remaining, 0); assert.equal(JSON.stringify(item), before);
  for (const limit of [0, -1, 1.5, Infinity, 101]) assert.throws(() => recordingReviewPoints(item, limit), /Bounded/);
  const old = { ...item, id: "quran-999-old", createdAt: "2026-10-13T12:00:00Z" }, items = [old, item];
  assert.deepEqual(recentReviewItems(items).map(x => x.id), [item.id, old.id]); assert.deepEqual(items, [old, item]);
});
