import assert from "node:assert/strict";
import test from "node:test";
import { createWidgetPrayerSnapshot } from "@hbic/shared";
import { invalidatePublicReads } from "../lib/publicReadPolicy";
import { getPublishedContent } from "../lib/contentStore";
import { GET as display } from "../app/api/display/route";
import { GET as published } from "../app/api/content/published/route";
import { GET as version } from "../app/api/content/version/route";
import { GET as snapshot } from "../app/api/content/prayer-snapshot/route";
import { fetchPublicDisplay, publicDisplayUrl } from "../lib/displayClient";

test("display CDN keys change at canonical Calgary midnight, including Alberta Time", () => {
  assert.equal(publicDisplayUrl(new Date("2026-10-04T05:59:59Z")), "/api/display?date=2026-10-03");
  assert.equal(publicDisplayUrl(new Date("2026-10-04T06:00:00Z")), "/api/display?date=2026-10-04");
  assert.equal(publicDisplayUrl(new Date("2026-11-02T05:59:59Z")), "/api/display?date=2026-11-01");
  assert.equal(publicDisplayUrl(new Date("2026-11-02T06:00:00Z")), "/api/display?date=2026-11-02");
});

test("public caches preserve display/mobile contracts and invalidate after publishing", async () => {
  // Offline fixture only: never use production Firestore or send notifications.
  for (const key of ["FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "GOOGLE_APPLICATION_CREDENTIALS_JSON", "GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]) delete process.env[key];
  const originalFetch = globalThis.fetch;
  let upstream = 0;
  globalThis.fetch = async () => { upstream++; return Response.json({ salah_fajr: "6:00 AM", salah_sunrise: "7:30 AM", salah_zuhr: "1:30 PM", salah_asr: "4:30 PM", salah_maghrib: "7:00 PM", salah_isha: "8:30 PM", iqamah_fajr: "6:30 AM", iqamah_zuhr: "2:00 PM", iqamah_asr: "5:15 PM", iqamah_maghrib: "+10 MINS", iqamah_isha: "+5 MINS", jummah: "1:45/2:30PM" }); };
  try {
    invalidatePublicReads();
    const responses = await Promise.all(Array.from({ length: 40 }, () => display(new Request("https://hbic.ca/api/display"))));
    assert.equal(upstream, 1);
    const first = await responses[0].json();
    assert.deepEqual(Object.keys(first).sort(), ["contentVersion", "display", "ok", "snapshot"]);
    assert.equal(first.ok, true);
    assert.equal(first.snapshot.timezone, "America/Edmonton");
    assert.equal(first.snapshot.availability, "available");
    const canonical = createWidgetPrayerSnapshot((await getPublishedContent()).content);
    assert.equal(first.snapshot.scheduleRevision, canonical.scheduleRevision);
    assert.deepEqual(first.snapshot.prayers, canonical.prayers);
    for (const read of [display, published, snapshot, version]) {
      const response = await read(new Request("https://hbic.ca/api/content/published"));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "public, max-age=0, s-maxage=15, must-revalidate");
    }
    invalidatePublicReads(); await display(new Request("https://hbic.ca/api/display"));
    assert.equal(upstream, 2);
  } finally { globalThis.fetch = originalFetch; invalidatePublicReads(); }
});


test("rail, occasion styling and Bilal tour share one public snapshot request", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async input => {
    requests++;
    assert.match(String(input), /^\/api\/display\?date=\d{4}-\d{2}-\d{2}$/);
    return Response.json({ ok: true, contentVersion: 1, snapshot: { prayers: [], scheduleRevision: "fixture" } });
  };
  try {
    const [rail, occasion, tour] = await Promise.all([fetchPublicDisplay(), fetchPublicDisplay(), fetchPublicDisplay()]);
    assert.equal(requests, 1);
    assert.deepEqual(rail, occasion); assert.deepEqual(occasion, tour);
    rail.snapshot.scheduleRevision = "changed locally";
    assert.equal((await fetchPublicDisplay()).snapshot.scheduleRevision, "fixture");
  } finally { globalThis.fetch = originalFetch; }
});
