import assert from "node:assert/strict";
import test from "node:test";
import { tvWeatherBudget, weatherSurfaceSize } from "../lib/tvWeatherCanvas";

test("TV weather has a fixed pixel budget independent of viewport and device pixel ratio", () => {
  for (const [width, height] of [[1280, 720], [1920, 1080], [3840, 2160], [7680, 4320], [1024, 600], [400, 900]]) {
    const size = weatherSurfaceSize(width, height);
    assert.ok(size.width <= tvWeatherBudget.maxWidth && size.height <= tvWeatherBudget.maxHeight);
    assert.ok(size.width * size.height <= 518_400);
    assert.ok(Math.abs(size.width / size.height - width / height) < .01);
  }
  assert.deepEqual(weatherSurfaceSize(3840, 2160), { width: 960, height: 540 });
});

test("TV weather rejects invalid surface dimensions without unbounded allocations", () => {
  for (const size of [weatherSurfaceSize(0, 0), weatherSurfaceSize(Infinity, NaN), weatherSurfaceSize(-1, -1)]) {
    assert.deepEqual(size, { width: 960, height: 540 });
  }
});
