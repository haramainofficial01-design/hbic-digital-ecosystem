/** Navigation/lifecycle unit fixtures only, NOT recognition-accuracy evidence. */
import assert from "node:assert/strict";
import test from "node:test";
import { recitationFollowingIndex, RecitationTracker, type RecitationObservation, type RecitationWord } from "../src/quran/recitationTracking";
import { ReciteCompletionGuard } from "../src/quran/reciteAssistFeedback";
const expected = "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ";
const word = (text: string, at: number): RecitationWord => ({ text, startSample: at, endSample: at + 1600, confidence: .99, edge: false });
const observation = (words: RecitationWord[], endSample = 64000): RecitationObservation => ({ text: words.map(w => w.text).join(" "), quality: .99, words, startSample: 0, endSample });
test("a clear unique opening follows immediately without falsely completing or grading the ayah", () => {
  const tracker = new RecitationTracker(), result = tracker.observe(expected, observation([word("الحمد", 4000)]));
  assert.equal(result.followingIndex, 0); assert.equal(result.status, "uncertain");
  assert.equal(result.stableComplete, false); assert.deepEqual(result.differences, []);
  assert.ok(result.words.every(w => w.state === "not_heard"));
  assert.equal(new ReciteCompletionGuard().observe(result, 64000), false);
});
test("consecutive real anchors follow the latest word including a middle-ayah start", () => {
  assert.equal(recitationFollowingIndex(expected, observation([word("الحمد", 4000), word("لله", 12000)])), 1);
  assert.equal(recitationFollowingIndex(expected, observation([word("رب", 4000), word("العالمين", 12000)])), 3);
  assert.equal(recitationFollowingIndex(expected, observation([word("رب", 4000)])), null);
  assert.equal(recitationFollowingIndex("وَمَآ أَدْرَىٰكَ مَا ٱلْقَارِعَةُ", observation([word("وما", 4000)])), 0);
  assert.equal(recitationFollowingIndex("وما ادراك وما القارعه", observation([word("وما", 4000)])), null);
});
test("similar words, weak/edge words, noise and a gap cannot become artificial voice-following progress", () => {
  const good = observation([word("الحمد", 4000), word("لله", 12000)]);
  assert.equal(recitationFollowingIndex(expected, {...good, quality: .69}), null);
  assert.equal(recitationFollowingIndex(expected, observation([{...word("الحمد", 4000), confidence: .94}])), null);
  assert.equal(recitationFollowingIndex(expected, observation([{...word("الحمد", 4000), edge: true}])), null);
  assert.equal(recitationFollowingIndex("افلا يعلم الانسان", observation([word("افلا", 4000), word("علم", 12000)])), 0);
  assert.equal(recitationFollowingIndex(expected, observation([word("الحمد", 4000), word("رب", 12000)])), 0);
});
test("a conflicting new observation or stale replay cannot retain the last cursor", () => {
  const tracker = new RecitationTracker();
  assert.equal(tracker.observe(expected, observation([word("الحمد", 4000), word("لله", 12000)])).followingIndex, 1);
  assert.equal(tracker.observe(expected, observation([word("الشمس", 12000)], 80000)).followingIndex, undefined);
  assert.equal(tracker.observe(expected, observation([word("الحمد", 4000), word("لله", 12000)], 80000)).followingIndex, undefined);
  tracker.reset(); assert.equal(tracker.observe(expected, observation([])).followingIndex, undefined);
});
test("joined Quran writing remains exact, while invalid capture coordinates cannot move a cursor", () => {
  assert.equal(recitationFollowingIndex("قُلْ يَـٰٓأَيُّهَا ٱلْكَـٰفِرُونَ", observation([word("قل", 4000), word("يا", 12000), word("ايها", 18000)])), 1);
  assert.equal(recitationFollowingIndex(expected, observation([word("الحمد", -1)])), null);
  assert.equal(recitationFollowingIndex(expected, observation([word("الحمد", 64000)])), null);
  assert.equal(recitationFollowingIndex(expected, observation([word("الحمد", 4000)], NaN)), null);
  assert.equal(recitationFollowingIndex(expected, observation([word("الحمد", 12000), word("لله", 4000)])), null);
});
test("repeated phrases do not pick an arbitrary location until actual context is unique", () => {
  const repeated = "من كل امر سلام هي من كل امر";
  assert.equal(recitationFollowingIndex(repeated, observation([word("من", 4000), word("كل", 12000)])), null);
  assert.equal(recitationFollowingIndex(repeated, observation([word("كل", 4000), word("امر", 12000)])), null);
  assert.equal(recitationFollowingIndex(repeated, observation([word("كل", 4000), word("امر", 12000), word("سلام", 20000)])), 3);
});
