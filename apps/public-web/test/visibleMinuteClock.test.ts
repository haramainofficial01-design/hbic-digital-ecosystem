import assert from 'node:assert/strict';
import test from 'node:test';
import { startVisibleMinuteClock } from '../lib/visibleMinuteClock';
test('minute clock aligns, pauses while hidden and immediately resumes without duplicate timers', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 12_345 });
  let ticks = 0, visible = true;
  const clock = startVisibleMinuteClock(() => ticks++, () => visible);
  assert.equal(ticks, 1);
  t.mock.timers.tick(47_654); assert.equal(ticks, 1);
  t.mock.timers.tick(1); assert.equal(ticks, 2);
  for (let i = 0; i < 10; i++) t.mock.timers.tick(60_000); assert.equal(ticks, 12);
  visible = false; clock.update(); t.mock.timers.tick(600_000); assert.equal(ticks, 12);
  visible = true; clock.update(); clock.update(); assert.equal(ticks, 14);
  t.mock.timers.tick(60_000); assert.equal(ticks, 15);
  clock.stop(); t.mock.timers.tick(600_000); assert.equal(ticks, 15);
});
