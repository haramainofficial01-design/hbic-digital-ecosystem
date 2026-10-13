/** Deterministic waveform preparation, NOT speech-recognition accuracy. */
import assert from "node:assert/strict";
import test from "node:test";
import { withRecitationAcousticTail } from "../scripts/recitationAcousticTail";

test("a disclosed quiet tail preserves every original sample and introduces only zeros", () => {
  const original = new Uint8Array(16000 * 4).fill(37), snapshot = original.slice();
  const padded = withRecitationAcousticTail(original, 600);
  assert.equal(padded.byteLength, original.byteLength + 9600 * 4);
  assert.deepEqual(padded.subarray(0, original.byteLength), snapshot);
  assert.ok(padded.subarray(original.byteLength).every(value => value === 0));
  padded.fill(0);
  assert.deepEqual(original, snapshot);
  assert.deepEqual(withRecitationAcousticTail(original, 0), snapshot);
});

test("settling cannot silently shorten a clip or accept an unregistered experiment", () => {
  assert.throws(() => withRecitationAcousticTail(new Uint8Array(192000 * 4), 600), /truncate/);
  assert.throws(() => withRecitationAcousticTail(new Uint8Array(16000 * 4), 123), /explicit/);
  assert.throws(() => withRecitationAcousticTail(new Uint8Array(16000 * 4 + 1), 0), /PCM/);
  assert.throws(() => withRecitationAcousticTail(new Uint8Array(16000 * 4 - 4), 0), /PCM/);
});
