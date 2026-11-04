import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { defaultContent } from "@hbic/shared";
import { notifyPublishedIqamahChange } from "../lib/publishedPrayerNotifications";
import { runWeeklyPrayerNotifications } from "../lib/weeklyPrayerNotifications";
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

test("midweek publication alerts once, not on unchanged content, and Sunday does not repeat", async () => {
 const {db}=fixture(); let sends=0;
 const previous=defaultContent.iqamahTime,current={...previous,ishaIqamah:"8:30 PM"};
 const deliver=async (_date: string, changes: any[])=>{sends++;assert.deepEqual(changes.map(c=>c.prayer),["isha"]);return {status:"accepted",logId:"fixture",successCount:1,failureCount:0,tokenCount:1,receiptCount:1};};
 const now=new Date("2026-11-04T18:00:00Z");
 await Promise.all([notifyPublishedIqamahChange(db,previous,current,10,now,deliver),notifyPublishedIqamahChange(db,previous,current,10,now,deliver)]);
 assert.equal(sends,1);
 assert.equal((await notifyPublishedIqamahChange(db,current,current,11,now,deliver)).status,"no_change");
 assert.equal((await runWeeklyPrayerNotifications(db,current,new Date("2026-11-08T06:00:00Z"),async()=>{throw Error("Duplicate");})).status,"no_change");
});
test("ambiguous delivery is recorded and never automatically broadcast again",async()=>{
 const {db,documents}=fixture();let sends=0;
 const previous=defaultContent.iqamahTime,current={...previous,asrIqamah:"4:30 PM"};
 const deliver=async()=>{sends++;throw Error("timeout");};
 assert.equal((await notifyPublishedIqamahChange(db,previous,current,12,new Date(),deliver)).status,"delivery_error");
 assert.equal((await notifyPublishedIqamahChange(db,previous,current,12,new Date(),deliver)).status,"already_processed");
 assert.equal(sends,1);assert.equal(documents.get("prayerChangeNotifications/publication-12").status,"delivery_error");
});
