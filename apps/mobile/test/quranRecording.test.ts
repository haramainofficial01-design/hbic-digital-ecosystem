import test from "node:test";
import assert from "node:assert/strict";
import { quranRecordingPermission } from "../src/quran/recordingPermission";
const allowed = { granted: true, canAskAgain: true }, denied = { granted: false, canAskAgain: true };
test("granted microphone permission does not reopen an OS permission Activity", async () => {
  let requests = 0;
  assert.equal(await quranRecordingPermission({ getRecordingPermissionsAsync: async () => allowed,
    requestRecordingPermissionsAsync: async () => { requests++; return allowed; } },
  { isActive: () => true, subscribe: () => { throw Error("No foreground wait needed"); } }, () => {}), allowed);
  assert.equal(requests, 0);
});
test("first microphone consent waits for foreground stability, removes listener and preserves decline", async () => {
  for (const permission of [allowed, denied]) {
    let active = false, callback: () => void = () => {}, removed = false;
    const flags: boolean[] = [];
    const pending = quranRecordingPermission({ getRecordingPermissionsAsync: async () => denied,
      requestRecordingPermissionsAsync: async () => permission }, {
      isActive: () => active, subscribe: check => { callback = check; return { remove: () => { removed = true; } }; }
    }, flag => flags.push(flag));
    await new Promise(resolve => setTimeout(resolve, 20)); active = true; callback();
    assert.equal(await pending, permission); assert.equal(removed, true); assert.deepEqual(flags, [true, false]);
  }
});
test("leaving the app during permission consent never permits background recording", async () => {
  const flags: boolean[] = []; let removed = false;
  await assert.rejects(quranRecordingPermission({ getRecordingPermissionsAsync: async () => denied,
    requestRecordingPermissionsAsync: async () => allowed }, { isActive: () => false,
    subscribe: () => ({ remove: () => { removed = true; } }) }, flag => flags.push(flag)), /cancelled/);
  assert.deepEqual(flags, [true, false]); assert.equal(removed, true);
});
