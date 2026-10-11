import test from "node:test";
import assert from "node:assert/strict";
import { validateChallenge, challengeNickname, challengeActive, type QuranChallenge } from "@hbic/shared";
import { createQuranChallengeService, type ChallengeRepository } from "../lib/quranChallengeService";
const event: QuranChallenge = { id: "qa-practice-event", title: "Test fixture only", season: "community", startsAt: "2026-10-11T12:00:00.000Z", endsAt: "2026-10-11T14:00:00.000Z", status: "published", rules: "Adults opt in with nicknames. Practice time is not a Quran grade. Staff review is required.", prizeDetails: "" };
function fixture() {
  const data = new Map<string, any>([[`quranChallenges/${event.id}`, event]]); let now = Date.parse(event.startsAt), lock = Promise.resolve();
  const repo: ChallengeRepository = { transaction<T>(job: Parameters<ChallengeRepository["transaction"]>[0]) {
    const pending = lock.then(async () => {
      const staged = new Map<string, any>([...data].map(([k, v]) => [k, structuredClone(v)])); let writing = false;
      const result = await job({ get: async path => { assert.equal(writing, false, "Firestore reads must precede writes"); return staged.get(path); },
        set: (path, value) => { writing = true; staged.set(path, value); }, delete: path => { writing = true; staged.delete(path); } });
      data.clear(); staged.forEach((value, key) => data.set(key, value)); return result as T;
    }); lock = pending.then(() => {}, () => {}); return pending;
  } };
  return { data, service: createQuranChallengeService(repo, () => now), advance: (millis: number) => { now += millis; } };
}
test("event dates/rules and nickname privacy validate without inventing seasonal events or prizes", () => {
  assert.deepEqual(validateChallenge(event), event); assert.equal(challengeActive(event, Date.parse(event.startsAt)), true);
  assert.throws(() => validateChallenge({ ...event, rules: "" })); assert.throws(() => validateChallenge({ ...event, endsAt: event.startsAt }));
  for (const name of ["email@example.com", "1234567890", "https example", "<script>"]) assert.throws(() => challengeNickname(name));
  assert.equal(challengeNickname("  Reader   One "), "Reader One");
});
test("only explicit adult/public consent and a published event can join", async () => {
  const f = fixture();
  for (const consent of [false, undefined, "true"]) await assert.rejects(async () => f.service.join(event.id, "reader", "Reader One", consent, true));
  await assert.rejects(async () => f.service.join(event.id, "reader", "Reader One", true, false));
  f.data.set(`quranChallenges/${event.id}`, { ...event, status: "draft" });
  await assert.rejects(f.service.join(event.id, "reader", "Reader One", true, true), /not open/);
});
test("server timing caps claims, start retries share a lease and repeated finishes never double-credit", async () => {
  const f = fixture(); await f.service.join(event.id, "reader", "Reader One", true, true);
  const [a, b] = await Promise.all([f.service.start(event.id, "reader"), f.service.start(event.id, "reader")]); assert.equal(a.id, b.id);
  f.advance(62000);
  const [first, replay] = await Promise.all([f.service.finish(event.id, "reader", a.id, 300), f.service.finish(event.id, "reader", a.id, 300)]);
  assert.equal(first.credited, 62); assert.equal(replay.seconds, 62); assert.equal(replay.replay, true);
  assert.equal(f.data.get(`quranChallenges/${event.id}/participants/reader`).seconds, 62);
  const next = await f.service.start(event.id, "reader"); f.advance(600000);
  assert.equal((await f.service.finish(event.id, "reader", next.id, 300)).credited, 300);
});
test("zero-time, forged sessions, future claims and other accounts cannot inflate credit", async () => {
  const f = fixture(); await f.service.join(event.id, "reader", "Reader One", true, true);
  const session = await f.service.start(event.id, "reader");
  assert.equal((await f.service.finish(event.id, "reader", session.id, 300)).credited, 0);
  const next = await f.service.start(event.id, "reader");
  await assert.rejects(f.service.finish(event.id, "other", next.id, 300), /withdrawn/);
  for (const seconds of [-1, 301, NaN, 1.2, "20"]) await assert.rejects(async () => f.service.finish(event.id, "reader", next.id, seconds));
  await assert.rejects(f.service.finish(event.id, "reader", "00000000-0000-0000-0000-000000000000", 1), /no longer valid/);
});
test("opting out removes nickname/time and invalidates in-flight practice without affecting private Quran data", async () => {
  const f = fixture(); f.data.set("academyFamilies/unrelated", { preserved: true });
  await f.service.join(event.id, "reader", "Reader One", true, true); const session = await f.service.start(event.id, "reader");
  f.advance(20000); await f.service.leave(event.id, "reader");
  assert.equal(f.data.has(`quranChallenges/${event.id}/participants/reader`), false); assert.equal(f.data.has("quranChallengeSessions/reader"), false);
  await assert.rejects(f.service.finish(event.id, "reader", session.id, 20), /withdrawn/);
  assert.deepEqual(f.data.get("academyFamilies/unrelated"), { preserved: true });
  await f.service.join(event.id, "reader", "Reader Two", true, true);
  await assert.rejects(f.service.finish(event.id, "reader", session.id, 20), /no longer valid/);
});
test("unpublishing immediately stops credit; event end bounds the final valid session", async () => {
  const f = fixture(); await f.service.join(event.id, "reader", "Reader One", true, true);
  const session = await f.service.start(event.id, "reader"); f.data.set(`quranChallenges/${event.id}`, { ...event, status: "draft" });
  await assert.rejects(f.service.finish(event.id, "reader", session.id, 20), /no longer valid/);
  f.data.set(`quranChallenges/${event.id}`, event); f.advance(7190000); const last = await f.service.start(event.id, "reader"); f.advance(20000);
  assert.equal((await f.service.finish(event.id, "reader", last.id, 300)).credited, 10);
  await assert.rejects(f.service.start(event.id, "reader"), /active/);
});
