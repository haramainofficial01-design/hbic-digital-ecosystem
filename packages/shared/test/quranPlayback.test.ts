import assert from "node:assert/strict";
import test from "node:test";
import { adjacentQuranPlaybackSpeed, QURAN_PLAYBACK_SPEEDS, validQuranPlaybackSpeed } from "../src/quranPlayback";
test("playback speed steps stay within 0.5–2 times, default to normal and reject unsafe values", () => {
  for (const rate of QURAN_PLAYBACK_SPEEDS) assert.ok(validQuranPlaybackSpeed(rate));
  for (const rate of [NaN, Infinity, 0, -1, 4, .6]) assert.equal(validQuranPlaybackSpeed(rate), false);
  assert.equal(adjacentQuranPlaybackSpeed(.5, -1), .5);
  assert.equal(adjacentQuranPlaybackSpeed(2, 1), 2);
  assert.equal(adjacentQuranPlaybackSpeed(1, -1), .75);
  assert.equal(adjacentQuranPlaybackSpeed(1, 1), 1.25);
});
