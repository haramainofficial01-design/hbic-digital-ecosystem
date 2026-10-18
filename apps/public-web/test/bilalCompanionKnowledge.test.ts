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
test("authored public translations preserve canonical times, contact details and privacy handoffs", () => {
  for (const language of ["ur", "fa-AF", "ar"] as const) {
    const get = (question: string) => companionReply({ request: { question, previousQuestions: [], language }, facts, now, contentVersion: content.version });
    const prayers = get("Today’s prayer times");
    assert.match(prayers.answer, /6:30 PM/); assert.match(prayers.answer, /6:40 PM/); assert.match(prayers.answer, /2026-10-17/);
    assert.doesNotMatch(prayers.answer, /Masjid Bilal timetable/);
    assert.ok(get("contact the office").answer.includes(content.settings.phone));
    assert.ok(get("contact the office").answer.includes(content.settings.email));
    assert.equal(get("my Academy payment").needsHuman, true);
    assert.equal(get("my Academy payment").topicIds.length, 0);
  }
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

test("every core topic has authored Urdu, Dari and Arabic answers and localized source labels", () => {
  const core = facts.filter(f => !f.id.startsWith("program.") && !f.id.startsWith("notice."));
  assert.ok(core.length >= 18);
  for (const language of ["ur", "fa-AF", "ar"] as const) for (const fact of core) {
    const text = fact.translations?.[language];
    assert.ok(text && text.length > 40, `${fact.id}/${language}`);
    assert.doesNotMatch(text, /Published upcoming events|The public Academy|Recite Assist can|The Masjid Bilal app brings/);
    assert.ok(text.length <= 2400);
  }
  for (const language of ["ur", "fa-AF", "ar"] as const) {
    const get = (question: string) => companionReply({ request: { question, previousQuestions: [], language }, facts, now, contentVersion: 1 });
    for (const q of ["academy tuition", "recite assist accuracy", "next prayer", "download app", "volunteer", "events", "about hbic"]) {
      const result = get(q); assert.equal(result.needsHuman, false, `${language}/${q}`);
      // A matched CMS program may legitimately accompany the core answer as
      // labelled original prose. Isolate core facts to check authored coverage.
      for (const fact of core.filter(f => result.topicIds.includes(f.id))) {
        const isolated = companionReply({ request: { question: fact.terms[0], previousQuestions: [], language }, facts: [fact], now, contentVersion: 1 });
        assert.equal(isolated.answer, fact.translations![language]);
        for (const source of isolated.sources) assert.match(source.title, /[\u0600-\u06ff]/, source.title);
      }
    }
    assert.doesNotMatch(get("donations").answer, /General Donation|Building \/ Maintenance|Youth Programs/);
  }
});

test("natural supported-language questions select the intended core topics, not similar-sounding registration", () => {
  for (const [language, q, expected] of [
    ["ur", "اگلی نماز کب ہے؟", "prayer.next"], ["fa-AF", "نماز بعدی چه وقت است؟", "prayer.next"], ["ar", "متى الصلاة القادمة؟", "prayer.next"],
    ["ur", "قرآن اکیڈمی کی فیس کتنی ہے؟", "academy.fees"], ["fa-AF", "فیس ماهانه صنف قرآن چقدر است؟", "academy.fees"], ["ar", "كم رسوم أكاديمية القرآن؟", "academy.fees"],
    ["ur", "قرآن کیسے پڑھوں؟", "quran.features"], ["fa-AF", "چگونه قرآن بخوانم؟", "quran.features"], ["ar", "كيف أقرأ القرآن؟", "quran.features"],
    ["ur", "میری ریکارڈنگ کہاں محفوظ ہے؟", "quran.privacy"], ["fa-AF", "ضبط صدا کجا ذخیره می‌شود؟", "quran.privacy"], ["ar", "أين يتم تخزين التسجيلات؟", "quran.privacy"],
    ["ur", "کیا تلاوت کی غلطیاں درست کرتا ہے؟", "quran.preview"], ["fa-AF", "دقت تشخیص اشتباه چقدر است؟", "quran.preview"], ["ar", "هل يكشف أخطاء التلاوة؟", "quran.preview"],
    ["ur", "مسجد کا پتہ کیا ہے؟", "contact.location"], ["fa-AF", "آدرس مسجد کجاست؟", "contact.location"], ["ar", "ما عنوان المسجد؟", "contact.location"],
    ["ur", "عطیہ کیسے دوں؟", "donations"], ["fa-AF", "کمک مالی چگونه است؟", "donations"], ["ar", "كيف أتبرّع؟", "donations"]
  ] as const) {
    const result = companionReply({ request: { question: q, previousQuestions: [], language }, facts, now, contentVersion: 1 });
    assert.ok(result.topicIds.includes(expected), `${language}: ${q}: ${result.topicIds}`);
    if (expected === "quran.privacy") assert.equal(result.topicIds.some(t => t.startsWith("academy.")), false, q);
  }
});

test("localized tuition preserves live amount/mode and refuses missing price; expired terms stay explicit", () => {
  for (const language of ["ur", "fa-AF", "ar"] as const) {
    const family = buildCompanionKnowledge(content, now, { ...options, monthlyCents: 7250, tuitionMode: "per_family" }).find(f => f.id === "academy.fees")!.translations![language]!;
    assert.match(family, /\$72.50 CAD/); assert.ok(family.includes(language === "ur" ? "فی خاندان" : language === "fa-AF" ? "هر خانواده" : "لكل عائلة"));
    const missing = buildCompanionKnowledge(content, now, { academy: true, quran: true }).find(f => f.id === "academy.fees")!.translations![language]!;
    assert.doesNotMatch(missing, /50.00|72.50/);
    const expired = buildCompanionKnowledge(content, new Date("2027-03-01T16:00:00Z"), options).find(f => f.id === "academy.overview")!.translations![language]!;
    assert.ok(expired.includes(language === "ur" ? "مدت گزر چکی" : language === "fa-AF" ? "دوره پایان یافته" : "انتهت هذه الفترة"));
    const next = facts.find(f => f.id === "prayer.next")!.translations![language]!;
    assert.match(next, /2:00 PM/); assert.match(next, /اقامت|الإقامة/);
  }
});
