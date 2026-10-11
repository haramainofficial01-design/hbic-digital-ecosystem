import test from "node:test";
import assert from "node:assert/strict";
import { emptyQuranState, normalizeQuranState, markRead } from "@hbic/shared";
import { createQuranStore } from "../src/services/quranStorage";
import { rememberRecitationFeedback } from "../src/quran/mistakeReview";
import { containsVoiceEnergy, ReciteInferenceBudget } from "../src/quran/reciteInferenceBudget";
import { acousticQuality, ReciteAudioWindow, type ReciteFeedback } from "../src/quran/reciteAssistFeedback";
import { decodeRecitationEvidence } from "../src/quran/recitationTracking";
import { PcmReviewWriter, wavHeader, type PcmSink } from "../src/quran/pcmReview";
import { ChallengePracticeClock } from "../src/quran/challengePracticeClock";
import { localRecordingPath } from "../src/quran/localRecordingPath";
import { OwnedPcmCapture } from "../src/quran/ownedPcmCapture";
import { recordingMessage } from "../src/quran/recordingMessage";
const clean: ReciteFeedback = { status: "following", words: ["الحمد", "لله", "رب", "العالمين"].map(text => ({ text, state: "matched" })), differences: [], attempted: 4, stableComplete: true };
const difference: ReciteFeedback = { ...clean, status: "possible_difference", stableComplete: false, differences: [{ kind: "omission", index: 2 }] };
test("possible flags persist; three distinct complete attempts clear them, never three ticks", () => {
  let state = rememberRecitationFeedback(emptyQuranState(), "1:2", "wrong-1", difference);
  assert.equal(state.mistakes[0].id, "1:2:2:omission");
  assert.equal(rememberRecitationFeedback(state, "1:2", "wrong-1", difference), state);
  for (const id of ["clean-1", "clean-2"]) {
    state = rememberRecitationFeedback(state, "1:2", id, clean);
    const repeated = rememberRecitationFeedback(state, "1:2", id, clean); assert.equal(repeated, state);
  }
  assert.equal(state.mistakes[0].cleanPasses, 2);
  state = rememberRecitationFeedback(state, "1:2", "clean-3", clean); assert.deepEqual(state.mistakes, []);
});
test("uncertain, incomplete and other-ayah observations never clear a review flag", () => {
  const state = rememberRecitationFeedback(emptyQuranState(), "1:2", "wrong", difference);
  for (const feedback of [{ ...clean, status: "uncertain" as const }, { ...clean, stableComplete: false }, { ...clean, words: [...clean.words.slice(0, 3), { text: "العالمين", state: "not_heard" as const }] }])
    assert.equal(rememberRecitationFeedback(state, "1:2", "try", feedback), state);
  assert.equal(rememberRecitationFeedback(state, "1:3", "other", clean), state);
  assert.equal(rememberRecitationFeedback(state, "bad", "try", clean), state);
});
test("new possible difference resets its clean streak without changing other local history", () => {
  let state = { ...emptyQuranState(), bookmarks: ["2:255"] };
  state = rememberRecitationFeedback(state, "1:2", "wrong", difference);
  state = rememberRecitationFeedback(state, "1:2", "clean", clean);
  state = rememberRecitationFeedback(state, "1:2", "wrong-again", difference);
  assert.equal(state.mistakes[0].cleanPasses, 0); assert.deepEqual(state.bookmarks, ["2:255"]);
  assert.deepEqual(normalizeQuranState(JSON.parse(JSON.stringify(state))).mistakes, state.mistakes);
});
test("old state keeps progress with efficient/no-Assist-audio defaults; corrupt review data is ignored", () => {
  const state = emptyQuranState(), old = { ...state, preferences: { arabicSize: 32, reciter: 7 }, mistakes: [null, { key: false }], recordings: [] };
  const migrated = normalizeQuranState(old);
  assert.equal(migrated.preferences.recognitionMode, "efficient"); assert.equal(migrated.preferences.saveAssistAudio, false);
  assert.deepEqual(migrated.mistakes, []); assert.equal(migrated.preferences.arabicSize, 32);
});
test("new recording caps do not hide or discard a longer legacy recording", () => {
  const old = { ...emptyQuranState(), recordings: [{ id: "quran-123-abc", uri: "file:///old/quran-practice/quran-123-abc.m4a", chapter: 1, from: 1, to: 7, createdAt: "2026-10-01T00:00:00Z", durationMillis: 310000 }] };
  assert.equal(normalizeQuranState(old).recordings[0].durationMillis, 310000);
});
test("no-op reading/feedback does not rewrite local storage", async () => {
  let writes = 0, saved: string | null = null;
  const store = createQuranStore({ getItem: async () => saved, setItem: async (_, value) => { saved = value; writes++; } });
  await store.read(); await store.update(s => markRead(s, 1, 2)); const before = writes;
  for (let i = 0; i < 100; i++) await store.update(s => markRead(s, 1, 2));
  assert.equal(writes, before);
});
test("recognition pacing avoids silence, stale windows and overworking a slow device", () => {
  const budget = new ReciteInferenceBudget();
  assert.equal(budget.ready(0, 16000, false), false); assert.equal(budget.ready(0, 15000, true), false);
  assert.equal(budget.ready(0, 16000, true), true); budget.started(16000); budget.finished(1000, 1000);
  assert.equal(budget.ready(2499, 80000, true), false); assert.equal(budget.ready(2500, 80000, true), true);
  budget.started(80000); budget.finished(6500, 4000);
  assert.equal(budget.ready(10499, 160000, true), false); assert.equal(budget.ready(10500, 160000, true), true);
  assert.equal(containsVoiceEnergy([0, 0, 0]), false); assert.equal(containsVoiceEnergy([.05, -.05]), true);
});
test("combined CTC pass preserves quality statistic and word timings", () => {
  const ids = [1, 1, 0, 2, 0, 2, 0], logprobs = new Float32Array(ids.length * 3).fill(-15);
  ids.forEach((id, frame) => { logprobs[frame * 3 + id] = Math.log(.98); });
  const result = { text: "الحمد لله لله", tokenIds: [1, 2, 2], acoustic: { logprobs, timeSteps: ids.length, vocabSize: 3, blankId: 0 } };
  const decoded = decodeRecitationEvidence(result, { "0": "<blank>", "1": "▁الحمد", "2": "▁لله" }, 7000, [{ compactStart: 0, originalStart: 0, length: 7000 }]);
  assert.equal(decoded.quality, acousticQuality(result)); assert.deepEqual(decoded.words.map(w => w.text), ["الحمد", "لله", "لله"]);
  assert.equal(decoded.words[1].startSample, 3000);
});
test("bulk ring-buffer snapshots exactly preserve wrapped audio and erase on stop", () => {
  const ring = new ReciteAudioWindow(), first = Array.from({ length: 96000 }, (_, i) => (i % 100) / 100), next = [.1, .2, .3, .4];
  ring.append(first); ring.append(next);
  assert.deepEqual(ring.snapshot(), Float32Array.from([...first.slice(4), ...next])); assert.equal(ring.endSample, 96004);
  ring.clear(); assert.equal(ring.endSample, 0); assert.deepEqual([...ring.snapshot()], []);
});
function sink() {
  let offset = 0, closed = 0, removed = 0; const bytes = new Uint8Array(256);
  return { bytes, get closed() { return closed; }, get removed() { return removed; },
    write(data: Uint8Array) { bytes.set(data, offset); offset += data.length; }, seek(value: number) { offset = value; }, close() { closed++; }, remove() { removed++; } } satisfies PcmSink & { bytes: Uint8Array; closed: number; removed: number };
}
test("private PCM review writes playable mono WAV, clips safely and caps session size", () => {
  const out = sink(), writer = new PcmReviewWriter(out, 4);
  writer.append([0, 2, -2, NaN, 1]); assert.equal(writer.finish(), .25); assert.equal(out.closed, 1);
  const view = new DataView(out.bytes.buffer);
  assert.equal(view.getUint32(24, true), 16000); assert.equal(view.getUint32(40, true), 8);
  assert.equal(view.getInt16(46, true), 32767); assert.equal(view.getInt16(48, true), -32768); assert.equal(view.getInt16(50, true), 0);
  assert.equal(wavHeader(16000 * 120).byteLength + 16000 * 120 * 2, 3840044);
  writer.discard(); assert.equal(out.removed, 1);
});
test("empty/discarded/failing review files close their handles and do not become library recordings", () => {
  const empty = sink(); assert.equal(new PcmReviewWriter(empty).finish(), 0); assert.equal(empty.removed, 1);
  const broken = sink(); assert.throws(() => new PcmReviewWriter({ ...broken, write: () => { throw Error("Disk full"); }, close: broken.close, remove: broken.remove }), /Disk full/);
  assert.equal(broken.closed, 1); assert.equal(broken.removed, 1);
});
test("leaderboard clock ignores background/idle time, bounds delayed timers and playback sessions", () => {
  const clock = new ChallengePracticeClock(0);
  for (let n = 10000; n <= 60000; n += 10000) clock.sample(n, true, false);
  assert.equal(clock.seconds, 60); clock.sample(120000, true, false); assert.equal(clock.seconds, 60);
  clock.sample(130000, false, true); assert.equal(clock.seconds, 60);
  clock.touch(130000); clock.sample(140000, true, false); assert.equal(clock.seconds, 70);
  clock.sample(240000, true, true); assert.equal(clock.seconds, 90);
  for (let n = 250000; n <= 600000; n += 10000) clock.sample(n, true, true);
  assert.equal(clock.seconds, 300);
});
test("restored recordings resolve in the new private container; arbitrary paths cannot be played/deleted", () => {
  assert.equal(localRecordingPath({ id: "quran-123-abc", uri: "file:///old-container/quran-practice/quran-123-abc.wav" }, "file:///new/Documents/"), "file:///new/Documents/quran-practice/quran-123-abc.wav");
  assert.throws(() => localRecordingPath({ id: "../unrelated", uri: "file:///private.m4a" }, "file:///new/Documents/"));
  assert.throws(() => localRecordingPath({ id: "quran-123-abc", uri: "file:///other.txt" }, "file:///new/Documents/"));
});
test("idle recognition never stops the manual recorder; owned cancellation waits for a pending start", async () => {
  const capture = new OwnedPcmCapture(); let starts = 0, stops = 0, finish!: () => void;
  await capture.stop(async () => { stops++; }); assert.equal(stops, 0);
  const start = capture.start(() => new Promise<void>(resolve => { starts++; finish = resolve; }));
  await Promise.resolve();
  const a = capture.stop(async () => { stops++; }), b = capture.stop(async () => { stops++; });
  assert.equal(a, b); assert.equal(stops, 0); finish(); await start; await a;
  assert.equal(starts, 1); assert.equal(stops, 1);
  await capture.stop(async () => { stops++; }); assert.equal(stops, 1);
});
test("recording failures explain recovery without exposing native exception dumps", () => {
  assert.match(recordingMessage(new Error("Calling prepareToRecord failed: native error"), "start"), /Reading and listening still work/);
  assert.doesNotMatch(recordingMessage(new Error("Native error in /private/path"), "save"), /private\/path/);
  assert.equal(recordingMessage(new Error("Enable microphone access in Settings."), "start"), "Enable microphone access in Settings.");
});
