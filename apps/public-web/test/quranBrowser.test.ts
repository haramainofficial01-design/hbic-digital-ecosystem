import test from "node:test";
import assert from "node:assert/strict";
import { emptyQuranState } from "@hbic/shared";
import { approvedWebQuranResources, restoreWebQuranState } from "../lib/quranBrowser";
import { createBrowserRecording, recordingExtension, type BrowserRecordingState } from "../lib/quranBrowserRecording";

function recordingHarness() {
  let stoppedTracks = 0, visible = true, created = 0;
  const revoked: string[] = [], states: BrowserRecordingState[] = [];
  const stream = { getTracks: () => [{ stop() { stoppedTracks++; } }] } as unknown as MediaStream;
  const recorder = {
    state: "inactive", mimeType: "audio/ogg;codecs=opus",
    ondataavailable: null as ((event: { data: Blob }) => void) | null, onstop: null as (() => void) | null, onerror: null as (() => void) | null,
    start() { this.state = "recording"; }, stop() { this.state = "inactive"; },
  };
  const session = createBrowserRecording({
    async getUserMedia() { return stream; }, recorder: () => recorder as unknown as MediaRecorder,
    createUrl(blob) { assert.equal(blob.type, "audio/ogg;codecs=opus"); created++; return "blob:private-review"; },
    revokeUrl(url) { revoked.push(url); }, isVisible: () => visible,
  }, (state) => states.push(state));
  return { session, recorder, stream, states, revoked, setVisible(value: boolean) { visible = value; }, get stoppedTracks() { return stoppedTracks; }, get created() { return created; } };
}

test("manual stop releases microphone, permits only a local review, and deletion revokes the blob", async () => {
  const h = recordingHarness(); await h.session.start();
  assert.equal(h.states.at(-1)?.phase, "recording");
  h.recorder.ondataavailable?.({ data: new Blob(["private audio"], { type: h.recorder.mimeType }) });
  h.session.stop(); assert.equal(h.stoppedTracks, 1);
  h.recorder.onstop?.(); assert.equal(h.states.at(-1)?.url, "blob:private-review");
  h.session.erase(); assert.deepEqual(h.revoked, ["blob:private-review"]); assert.equal(h.states.at(-1)?.phase, "idle");
  h.session.dispose();
});

test("background disposal discards audio even if final browser callbacks arrive later", async () => {
  const h = recordingHarness(); await h.session.start();
  const lateData = h.recorder.ondataavailable, lateStop = h.recorder.onstop;
  h.recorder.ondataavailable?.({ data: new Blob(["private audio"]) });
  h.setVisible(false); h.session.erase();
  lateData?.({ data: new Blob(["late private audio"]) }); lateStop?.();
  assert.equal(h.created, 0); assert.equal(h.stoppedTracks, 1); assert.equal(h.recorder.ondataavailable, null);
  h.session.dispose();
});

test("leaving during the permission request closes a stream granted after disposal", async () => {
  let grant!: (stream: MediaStream) => void, stopped = 0, recorderOpened = false;
  const session = createBrowserRecording({
    getUserMedia: () => new Promise((resolve) => { grant = resolve; }),
    recorder() { recorderOpened = true; throw new Error("Must not open recorder after leaving"); },
    createUrl: () => "blob:unused", revokeUrl() {}, isVisible: () => true,
  }, () => {});
  const pending = session.start(); session.dispose();
  grant({ getTracks: () => [{ stop() { stopped++; } }] } as unknown as MediaStream);
  await pending; assert.equal(stopped, 1); assert.equal(recorderOpened, false);
});

test("a browser stop in the background does not create a saved review", async () => {
  const h = recordingHarness(); await h.session.start();
  h.recorder.ondataavailable?.({ data: new Blob(["private audio"]) }); h.session.stop(); h.setVisible(false); h.recorder.onstop?.();
  assert.equal(h.created, 0); assert.equal(h.states.at(-1)?.phase, "idle"); h.session.dispose();
});

test("microphone errors discard all chunks and release tracks", async () => {
  const h = recordingHarness(); await h.session.start(); h.recorder.onerror?.();
  assert.equal(h.stoppedTracks, 1); assert.equal(h.created, 0); assert.ok(h.states.at(-1)?.error); h.session.dispose();
});

test("a borrowed recognition stream opens no second microphone and only the owner stops its tracks", async () => {
  const h = recordingHarness(); await h.session.start(h.stream);
  assert.equal(h.states.at(-1)?.phase, "recording");
  h.recorder.ondataavailable?.({data: new Blob(["shared-stream audio"], {type: h.recorder.mimeType})});
  h.session.stop(); h.recorder.onstop?.();
  assert.equal(h.stoppedTracks, 0);
  assert.equal(h.states.at(-1)?.url, "blob:private-review");
  h.session.dispose(); assert.equal(h.stoppedTracks, 0);
  h.stream.getTracks().forEach(track => track.stop()); assert.equal(h.stoppedTracks, 1);
});

test("disposing or failing borrowed recording leaves recognition capture owned by recognition", async () => {
  const h = recordingHarness(); await h.session.start(h.stream); h.recorder.onerror?.();
  assert.equal(h.stoppedTracks, 0); assert.equal(h.created, 0); assert.ok(h.states.at(-1)?.error);
  h.session.dispose(); assert.equal(h.stoppedTracks, 0);
});

test("browser library restores exact bookmarks but never imports native recording paths", () => {
  const migrated = restoreWebQuranState(null, ["2:255", "2:255", "javascript:alert(1)", "115:1"], 2);
  assert.deepEqual(migrated.bookmarks, ["2:255"]); assert.deepEqual(migrated.lastRead, { chapter: 2, ayah: 1 });
  const state = emptyQuranState(); state.recordings = [{ id: "quran-123-abc", uri: "file:///private.m4a", chapter: 1, from: 1, to: 1, createdAt: "2026-10-08", durationMillis: 1000 }];
  assert.deepEqual(restoreWebQuranState(state).recordings, []);
});

test("the browser offers only approved English meanings and preserves provider attribution", () => {
  const resources = approvedWebQuranResources({ reciters: [{ id: 7, name: "Credited reciter" }], translations: [
    { id: 20, name: "Saheeh International", language: "English", author: "Saheeh International" },
    { id: 131, name: "Dr. Mustafa Khattab, The Clear Quran", language: "English", author: "Dr. Mustafa Khattab" },
    { id: 85, name: "Abdel Haleem", language: "English", author: "Abdel Haleem" },
    { id: 99, name: "The Clear Quran", language: "French", author: "Example" },
  ] });
  assert.deepEqual(resources.translations.map((item) => item.id), [20, 131]); assert.equal(resources.translations[1].author, "Dr. Mustafa Khattab");
  assert.equal(recordingExtension("audio/mp4"), "m4a"); assert.equal(recordingExtension("audio/ogg;codecs=opus"), "ogg");
});
