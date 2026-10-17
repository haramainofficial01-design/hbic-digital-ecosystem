import assert from "node:assert/strict";
import test from "node:test";
import { companionReply, defaultContent, normalizeContent } from "@hbic/shared";
import { buildCompanionKnowledge } from "../lib/bilalCompanionKnowledge";

const now = new Date("2026-10-17T19:50:00Z");
const content = normalizeContent({ ...structuredClone(defaultContent), updatedAt: now.toISOString(), prayerTime: {
  ...defaultContent.prayerTime, date: "2026-10-17", fajr: "6:00 AM", sunrise: "8:00 AM", dhuhr: "1:30 PM", asr: "4:00 PM", maghrib: "6:30 PM", isha: "8:30 PM", source: "iqamah.ca"
}, iqamahTime: { ...defaultContent.iqamahTime, dhuhrIqamah: "2:00 PM", maghribIqamah: "6:40 PM" } });
const options = { academy: true, quran: true, monthlyCents: 5000, tuitionMode: "per_child" };
const facts = buildCompanionKnowledge(content, now, options);
function answer(question: string) { return companionReply({ request: { question, previousQuestions: [] }, facts, now, contentVersion: content.version }); }

test("canonical current-day timetable keeps adhan and iqamah separate, including pending iqamah", () => {
  assert.match(answer("today prayer times").answer, /2026-10-17/);
  assert.match(answer("maghrib").answer, /Maghrib: adhan 6:30 PM · iqamah 6:40 PM/);
  assert.match(answer("next prayer").answer, /Dhuhr iqamah at 2:00 PM/);
  assert.doesNotMatch(answer("next prayer").answer, /next adhan.*2:00/);
  const stale = buildCompanionKnowledge({ ...content, prayerTime: { ...content.prayerTime, date: "2026-10-16" } }, now, options);
  assert.match(stale.find(f => f.id === "prayer.today")!.text, /can’t verify/);
  assert.equal(stale.some(f => f.id === "prayer.next"), false);
});
test("live public billing controls price, missing evidence refuses an old amount", () => {
  assert.match(answer("academy tuition").answer, /50.00 CAD per child per month/);
  assert.match(buildCompanionKnowledge(content, now, { ...options, monthlyCents: 7250, tuitionMode: "per_family" }).find(f => f.id === "academy.fees")!.text, /72.50 CAD per family/);
  const missing = buildCompanionKnowledge(content, now, { academy: true, quran: true });
  assert.match(missing.find(f => f.id === "academy.fees")!.text, /can’t verify a current fee/);
  assert.doesNotMatch(missing.find(f => f.id === "academy.fees")!.text, /50.00/);
  assert.match(answer("donations").answer, /Donations and Quran Academy tuition are separate/);
});
test("release gates, expiry and explicit field allowlist exclude unpublished/private information", () => {
  const hidden = buildCompanionKnowledge(content, now, { academy: false, quran: false });
  assert.equal(hidden.some(f => f.id.startsWith("academy.") || f.id.startsWith("quran.")), false);
  const draft = structuredClone(content);
  draft.announcements = [
    { ...defaultContent.announcements[0], id: "private", title: "PRIVATE_FAMILY", body: "PRIVATE_RECORD", audience: "Youth", priority: "Normal", publishedAt: "2026-10-17T16:00:00Z", visible: true },
    { ...defaultContent.announcements[0], id: "expired", title: "EXPIRED_NOTICE", body: "OLD", audience: "All", priority: "Normal", publishedAt: "2026-10-01T16:00:00Z", expiresAt: "2026-10-02T16:00:00Z", visible: true },
    { ...defaultContent.announcements[0], id: "future", title: "FUTURE_NOTICE", body: "UNPUBLISHED", audience: "All", priority: "Normal", publishedAt: "2026-10-18T16:00:00Z", visible: true },
    { ...defaultContent.announcements[0], id: "visible", title: "PUBLIC_NOTICE", body: "Current public text", audience: "All", priority: "Normal", publishedAt: "2026-10-17T16:00:00Z", visible: true }
  ];
  (draft.settings as any).privateToken = "PRIVATE_SECRET";
  const text = JSON.stringify(buildCompanionKnowledge(draft, now, options));
  for (const excluded of ["PRIVATE_FAMILY", "PRIVATE_RECORD", "EXPIRED_NOTICE", "FUTURE_NOTICE", "PRIVATE_SECRET"]) assert.equal(text.includes(excluded), false, excluded);
  assert.match(text, /PUBLIC_NOTICE/);
});
test("unqualified speech preview, expired term and unknown details are described honestly", () => {
  assert.match(answer("recite assist accuracy").answer, /not been qualified at 99%/);
  const future = buildCompanionKnowledge(content, new Date("2027-03-01T16:00:00Z"), options);
  assert.match(future.find(f => f.id === "academy.overview")!.text, /term dates have passed/);
  assert.equal(answer("Can I hire a trampoline?").needsHuman, true);
  assert.match(answer("who are you").answer, /No external AI service/);
});
