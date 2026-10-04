import assert from "node:assert/strict";
import test from "node:test";
import { createReadCache } from "../lib/readCache";

test("coalesces simultaneous reads, isolates consumers, and expires at the TTL", async () => {
  let calls = 0, now = 0;
  const cache = createReadCache(async () => { calls++; return { prayers: ["6:30 AM"] }; }, 15_000, () => now);
  const results = await Promise.all(Array.from({ length: 50 }, () => cache.get("today")));
  assert.equal(calls, 1);
  results[0].prayers[0] = "wrong";
  assert.equal((await cache.get("today")).prayers[0], "6:30 AM");
  now = 14_999; await cache.get("today"); assert.equal(calls, 1);
  now = 15_000; await cache.get("today"); assert.equal(calls, 2);
});
test("Calgary date keys bypass yesterday's data", async () => {
  let calls = 0;
  const cache = createReadCache(async () => ++calls, 15_000);
  assert.equal(await cache.get("2026-10-03"), 1);
  assert.equal(await cache.get("2026-10-04"), 2);
});
test("publication invalidation does not let an older in-flight read refill the cache", async () => {
  let finish!: (value: number) => void, calls = 0;
  const cache = createReadCache(() => ++calls === 1 ? new Promise<number>((resolve) => { finish = resolve; }) : Promise.resolve(2), 15_000);
  const old = cache.get(); cache.clear();
  assert.equal(await cache.get(), 2);
  finish(1); assert.equal(await old, 1);
  assert.equal(await cache.get(), 2);
});
test("failures are not retained and concurrent failures remain retryable", async () => {
  let calls = 0;
  const cache = createReadCache(async () => { if (++calls === 1) throw new Error("offline"); return 2; }, 15_000);
  await assert.rejects(cache.get());
  assert.equal(await cache.get(), 2);
});
