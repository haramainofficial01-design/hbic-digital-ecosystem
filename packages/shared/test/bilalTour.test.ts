import assert from "node:assert/strict";
import test from "node:test";
import { BilalTourLedger, bilalTourCampaign, bilalTourQuiet } from "../src/bilalTour";

test("existing installs and first visits claim once, across dismissals and restarts, without an account", async () => {
  let disk: string | null = null;
  const store = { read: async () => disk, write: async (value: string | null) => { disk = value; } };
  const ledger = new BilalTourLedger(store);
  assert.equal(await ledger.seen(), false);
  assert.deepEqual(await Promise.all([ledger.claim(), ledger.claim()]), [true, false]);
  assert.equal(disk, bilalTourCampaign);
  assert.equal(await new BilalTourLedger(store).claim(), false);
});
test("actually viewed new-user introduction consumes the tour; older valid campaigns do not", async () => {
  let disk: string | null = "hbic-bilal-welcome-2026-09-v1";
  const store = { read: async () => disk, write: async (value: string | null) => { disk = value; } };
  assert.equal(await new BilalTourLedger(store).seen(), false);
  await new BilalTourLedger(store).markSeen();
  assert.equal(await new BilalTourLedger(store).claim(), false);
});
test("storage failures/corruption suppress automatic display; cancellation during persistence releases the claim", async () => {
  assert.equal(await new BilalTourLedger({ read: async () => { throw Error("disk"); }, write: async () => {} }).claim(), false);
  assert.equal(await new BilalTourLedger({ read: async () => "corrupt", write: async () => {} }).claim(), false);
  let eligible = true, disk: string | null = null;
  const ledger = new BilalTourLedger({ read: async () => disk, write: async value => { disk = value; if (value) eligible = false; } });
  assert.equal(await ledger.claim(() => eligible), false); assert.equal(disk, null);
});
test("tour waits for idle, known prayer schedule, prayer quiet windows, recent urgent news and notification deferral", () => {
  const now = Date.now(), base = { now, prayerTimes: [now + 3_600_000], lastInteractionAt: now - 7000, deferredUntil: 0 };
  assert.equal(bilalTourQuiet(base), true);
  for (const patch of [{ prayerTimes: [] }, { prayerTimes: [NaN] }, { lastInteractionAt: now - 1000 }, { deferredUntil: now + 1 }, { prayerTimes: [now + 60_000] }, { prayerTimes: [now - 599_000] }, { recentUrgentAt: now - 50_000 }]) assert.equal(bilalTourQuiet({ ...base, ...patch }), false);
});
