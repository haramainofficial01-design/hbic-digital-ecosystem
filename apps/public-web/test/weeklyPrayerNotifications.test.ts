import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { defaultContent } from "@hbic/shared";
import { isWeeklyPrayerNotificationWindow, runWeeklyPrayerNotifications } from "../lib/weeklyPrayerNotifications";
import { readFileSync } from "node:fs";

function fixture(previous = defaultContent.iqamahTime) {
  const documents = new Map<string, any>([["integrations/hbicOfficialPrayerTimes", { notificationBaseline: structuredClone(previous) }]]);
  const snapshot = (ref: { path: string }) => ({ exists: documents.has(ref.path), data: () => documents.get(ref.path) });
  const write = (ref: { path: string }, value: unknown, options?: { merge: boolean }) => documents.set(ref.path, options?.merge ? { ...documents.get(ref.path), ...value as object } : value);
  let chain = Promise.resolve();
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ({ path: `${name}/${id}`, update: async (value: object) => { const path = `${name}/${id}`; documents.set(path, { ...documents.get(path), ...value }); } }) }),
    runTransaction: (fn: (tx: any) => Promise<any>) => {
      const run = chain.then(() => fn({ getAll: async (...refs: { path: string }[]) => refs.map(snapshot), set: write, create: write }));
      chain = run.then(() => undefined); return run;
    }
  } as unknown as Firestore;
  return { db, documents };
}
const sunday = new Date("2026-10-18T06:00:00Z");

test("notification is Saturday-night midnight/Sunday 00:00 Calgary, including November", () => {
  assert.equal(isWeeklyPrayerNotificationWindow(new Date("2026-10-18T05:59:59Z")), false);
  assert.equal(isWeeklyPrayerNotificationWindow(sunday), true);
  assert.equal(isWeeklyPrayerNotificationWindow(new Date("2026-10-18T07:00:00Z")), false);
  assert.equal(isWeeklyPrayerNotificationWindow(new Date("2026-10-19T06:00:00Z")), false);
  assert.equal(isWeeklyPrayerNotificationWindow(new Date("2026-11-08T06:00:00Z")), true);
  const config = JSON.parse(readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8"));
  assert.ok(config.crons.some((job: { path: string; schedule: string }) => job.path === "/api/prayer/weekly-notifications" && job.schedule === "0 6 * * 0"));
});

test("changed iqamah alerts once, concurrent/replayed jobs cannot duplicate, unchanged week stays quiet", async () => {
  const { db, documents } = fixture(), deliveries: any[] = [];
  const current = { ...defaultContent.iqamahTime, asrIqamah: "4:30 PM", overrides: { asr: { enabled: true, value: "4:30 PM", endsAt: undefined } } };
  const deliver = async (...args: any[]) => { deliveries.push(args); return { logId: "fixture", successCount: 1, failureCount: 0, tokenCount: 1, receiptCount: 0, status: "sent" }; };
  const results = await Promise.all([runWeeklyPrayerNotifications(db, current, sunday, deliver), runWeeklyPrayerNotifications(db, current, sunday, deliver)]);
  assert.equal(results.filter(r => r.status === "sent").length, 1);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0][0], "2026-10-18"); assert.deepEqual(deliveries[0][1].map((c: any) => c.prayer), ["asr"]);
  assert.equal((await runWeeklyPrayerNotifications(db, current, sunday, deliver)).status, "already_processed");
  assert.equal((await runWeeklyPrayerNotifications(db, current, new Date("2026-10-25T06:00:00Z"), deliver)).status, "no_change");
  assert.equal(deliveries.length, 1);
  assert.equal(documents.get("integrations/hbicOfficialPrayerTimes").notificationBaseline.overrides.asr.endsAt, undefined);
  assert.deepEqual(current.asrIqamah, "4:30 PM", "job never changes the actual prayer timetable");
});

test("outside the window makes no writes/sends; ambiguous failed send cannot auto-repeat", async () => {
  const { db, documents } = fixture(), current = { ...defaultContent.iqamahTime, asrIqamah: "4:30 PM" };
  const size = documents.size; let sent = 0;
  const deliver = async () => { sent++; throw Error("isolated ambiguous delivery"); };
  assert.equal((await runWeeklyPrayerNotifications(db, current, new Date("2026-10-18T05:59:00Z"), deliver)).status, "outside_window");
  assert.equal(documents.size, size); assert.equal(sent, 0);
  await assert.rejects(runWeeklyPrayerNotifications(db, current, sunday, deliver));
  assert.equal(documents.get("prayerChangeNotifications/weekly-2026-10-18").status, "delivery_error");
  assert.equal((await runWeeklyPrayerNotifications(db, current, sunday, deliver)).status, "already_processed"); assert.equal(sent, 1);
});
