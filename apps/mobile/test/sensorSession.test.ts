import assert from 'node:assert/strict';
import test from 'node:test';
import { createSensorSession, shouldSuspendSensor } from '../src/services/sensorSession';

test('background or blur retires both current sensors and delayed sensor arrivals', async () => {
  const session = createSensorSession(); let removed = 0;
  const pending = session.begin(); session.stop();
  await Promise.resolve();
  session.attach(pending, { remove() { removed++; } });
  assert.equal(removed, 1); assert.equal(session.current(pending), false);
  const current = session.begin(); session.attach(current, { remove() { removed++; } });
  session.stop(); session.stop(); assert.equal(removed, 2);
});
test('a repeated start cannot leave two compass subscriptions running', () => {
  const session = createSensorSession(); let removed = 0;
  const old = session.begin(); session.attach(old, { remove() { removed++; } });
  const next = session.begin(); assert.equal(removed, 1);
  session.attach(old, { remove() { removed++; } });
  assert.equal(removed, 2); assert.equal(session.current(next), true);
});

test('permission sheets do not cancel first-use setup; background and live-sensor inactivity still stop', () => {
  assert.equal(shouldSuspendSensor('inactive', true), false);
  assert.equal(shouldSuspendSensor('background', true), true);
  assert.equal(shouldSuspendSensor('inactive', false), true);
  assert.equal(shouldSuspendSensor('active', false), false);
});
