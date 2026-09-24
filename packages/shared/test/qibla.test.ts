import assert from "node:assert/strict";
import test from "node:test";
import { calculateQiblaBearing, isAlignedWithQibla, qiblaRotation } from "../src/qibla";

for (const [city, latitude, longitude, expected] of [
  ["Calgary", 51.0447, -114.0719, 24.97],
  ["Makkah", 21.422487, 39.826206, 0],
  ["London", 51.5074, -0.1278, 118.99],
  ["New York", 40.7128, -74.006, 58.48],
  ["Sydney", -33.8688, 151.2093, 277.5]
] as const) {
  test(`${city} Qibla bearing`, () => {
    assert.ok(Math.abs(calculateQiblaBearing({ latitude, longitude }) - expected) < .15);
  });
}

test("alignment wraps across north", () => {
  assert.equal(qiblaRotation(2, 358), 4);
  assert.equal(isAlignedWithQibla(2, 358), true);
  assert.equal(isAlignedWithQibla(25, 18), false);
});
