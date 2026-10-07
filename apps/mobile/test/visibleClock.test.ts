import assert from "node:assert/strict";
import test from "node:test";
import { startVisibleClock } from "../src/services/visibleClock";

test("screen clock pauses in background, refreshes on resume and stops on screen exit", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let ticks = 0;
  let onState: (active: boolean) => void = () => {};
  let unsubscribed = false;
  const stop = startVisibleClock(() => ticks++, 30_000, (listener) => {
    onState = listener;
    return () => { unsubscribed = true; };
  }, true);
  assert.equal(ticks, 1);
  t.mock.timers.tick(30_000);
  assert.equal(ticks, 2);
  onState(false);
  t.mock.timers.tick(300_000);
  assert.equal(ticks, 2, "hidden screens do no clock work");
  onState(true);
  assert.equal(ticks, 3, "resume refreshes immediately");
  onState(true);
  t.mock.timers.tick(30_000);
  assert.equal(ticks, 5, "repeated foreground events never multiply timers");
  stop();
  t.mock.timers.tick(300_000);
  assert.equal(ticks, 5);
  assert.equal(unsubscribed, true);
});

test("mounting in the background schedules nothing until foreground", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let ticks = 0;
  let onState: (active: boolean) => void = () => {};
  const stop = startVisibleClock(() => ticks++, 60_000, (listener) => { onState = listener; return () => {}; }, false);
  t.mock.timers.tick(600_000);
  assert.equal(ticks, 0);
  onState(true);
  assert.equal(ticks, 1);
  t.mock.timers.tick(60_000);
  assert.equal(ticks, 2);
  stop();
});
