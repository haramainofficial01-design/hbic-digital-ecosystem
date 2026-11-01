import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createWidgetPrayerSnapshot, defaultContent, normalizeContent, toPublicContent, iqamahOverrideWeekEndsAt, isIqamahOverrideActive } from "@hbic/shared";
import { boundPrayerOverrides } from "../lib/prayerOverrides";
import { defaultMaghribIqamah, changedIqamahTimes, applyPrayerSync, isOverrideActive, resolveEffectivePrayerSchedule, retainPrayerScheduleDuringOutage, type PrayerFeed } from "../lib/prayerSync";
import { iqamahCaAdhanUrl, parseIqamahCaAdhan } from "../lib/iqamahCaAdhan";
import { deriveDisplayFocus } from "../lib/tvDisplay";

const now = new Date("2026-10-06T18:00:00Z"), sourceUpdatedAt = "2026-10-06T17:59:00Z";
const baseFeed: PrayerFeed = { salah_fajr: "6:18 AM", salah_sunrise: "7:48 AM", salah_zuhr: "1:23 PM", salah_asr: "4:25 PM", salah_maghrib: "7:03 PM", salah_isha: "8:33 PM",
  iqamah_asr: "6:00 PM", nw_i_fajr: "6:50M", nw_i_asr: "4:45 PM", jummah: "1:45/2:30PM" };
const sourceText = `const SALAH_SCHEDULE = { "2026-10-06": { fajr: "6:18 AM", sunrise: "7:48 AM", zuhr: "1:23 PM", asr: "4:25 PM", maghrib: "7:03 PM", isha: "8:33 PM" } };`;

test("Maghrib is today's official adhan plus ten minutes unless staff explicitly override it", () => {
  const content = overridden(); content.iqamahTime.maghribIqamah = "7:40 PM";
  const feed = { ...baseFeed, salah_maghrib: "6:43 PM", iqamah_maghrib: "8:00 PM" };
  const resolved = resolveEffectivePrayerSchedule(content, feed, "live", "2026-10-06", sourceUpdatedAt, now).content;
  assert.equal(resolved.iqamahTime.maghribIqamah, "6:53 PM");
  assert.equal(resolved.iqamahTime.automaticIqamah?.maghrib, "6:53 PM");
  content.iqamahTime.overrides = { maghrib: { enabled: true, value: "7:20 PM" } };
  assert.equal(resolveEffectivePrayerSchedule(content, feed, "live", "2026-10-06", sourceUpdatedAt, now).content.iqamahTime.maghribIqamah, "7:20 PM");
  content.iqamahTime.overrides.maghrib!.enabled = false;
  assert.equal(resolveEffectivePrayerSchedule(content, feed, "live", "2026-10-06", sourceUpdatedAt, now).content.iqamahTime.maghribIqamah, "6:53 PM");
  assert.equal(retainPrayerScheduleDuringOutage(resolved, now).iqamahTime.maghribIqamah, "6:53 PM");
  assert.equal(defaultMaghribIqamah("11:55 PM"), "12:05 AM");
  assert.equal(defaultMaghribIqamah("12:00 PM"), "12:10 PM");
  assert.equal(defaultMaghribIqamah("invalid"), "");
});
function overridden() {
  return normalizeContent({ ...structuredClone(defaultContent), iqamahTime: { ...structuredClone(defaultContent.iqamahTime),
    fajrIqamah: "6:40 AM", dhuhrIqamah: "2:00 PM", asrIqamah: "5:00 PM", maghribIqamah: "7:13 PM", ishaIqamah: "8:45 PM",
    overrides: { asr: { enabled: true, value: "5:00 PM", updatedAt: sourceUpdatedAt, endsAt: iqamahOverrideWeekEndsAt(now) } }
  } });
}

test("Maghrib follows each day's adhan plus ten across every week until an explicit persistent override", () => {
  const content = overridden();
  for (const [date, adhan, expected] of [["2026-10-11", "6:52 PM", "7:02 PM"], ["2026-10-18", "6:37 PM", "6:47 PM"], ["2026-11-01", "5:08 PM", "5:18 PM"], ["2027-01-10", "4:55 PM", "5:05 PM"]]) {
    const instant = new Date(`${date}T19:00:00Z`), feed = { ...baseFeed, salah_maghrib: adhan };
    assert.equal(resolveEffectivePrayerSchedule(content, feed, "live", date, instant.toISOString(), instant).content.iqamahTime.maghribIqamah, expected);
    const manual = structuredClone(content); manual.iqamahTime.overrides!.maghrib = { enabled: true, value: "7:30 PM", updatedAt: sourceUpdatedAt, persistent: true };
    assert.equal(resolveEffectivePrayerSchedule(manual, feed, "live", date, instant.toISOString(), instant).content.iqamahTime.maghribIqamah, "7:30 PM");
  }
});

test("staff overrides persist across midnight, following weeks and timezone transition", () => {
  for (const date of ["2026-10-11T05:59:59Z", "2026-10-11T06:00:00Z", "2026-10-18T06:00:00Z", "2026-11-01T08:00:00Z", "2027-01-10T06:00:00Z"]) {
    const instant = new Date(date), resolved = resolveEffectivePrayerSchedule(overridden(), baseFeed, "live", date.slice(0,10), date, instant);
    assert.equal(resolved.content.iqamahTime.asrIqamah, "5:00 PM");
    assert.equal(resolved.content.iqamahTime.overrides?.asr?.endsAt, undefined);
    assert.equal(resolved.content.iqamahTime.overrides?.asr?.persistent, true);
    assert.equal(isOverrideActive(resolved.content.iqamahTime.overrides?.asr, instant), true);
    assert.equal(createWidgetPrayerSnapshot(resolved.content, instant).prayers.find(p => p.key === "asr")?.iqamah, "5:00 PM");
  }
});

test("server preserves legacy times and stamps only actual staff changes", () => {
  const original = overridden(), bounded = boundPrayerOverrides(original, undefined, now), later = new Date("2026-10-20T18:00:00Z");
  assert.equal(bounded.iqamahTime.overrides?.asr?.endsAt, undefined);
  const unchanged = boundPrayerOverrides(bounded, original, later);
  assert.equal(unchanged.iqamahTime.overrides?.asr?.updatedAt, sourceUpdatedAt);
  const edited = structuredClone(unchanged); edited.iqamahTime.overrides!.asr!.value = "4:30 PM";
  const saved = boundPrayerOverrides(edited, unchanged, later);
  assert.equal(saved.iqamahTime.overrides?.asr?.updatedAt, later.toISOString());
  assert.equal(saved.iqamahTime.overrides?.asr?.value, "4:30 PM");
  assert.equal(isOverrideActive(saved.iqamahTime.overrides?.asr, new Date("2026-12-01T18:00:00Z")), true);
});

test("staff iqamah survives provider outage; obsolete upcoming values cannot leak to old apps", () => {
  const content = overridden(); content.iqamahTime.upcomingWeekIqamah = { asr: "4:45 PM", fajr: "6:50M" };
  const confirmed = resolveEffectivePrayerSchedule(content, baseFeed, "live", "2026-10-06", sourceUpdatedAt, now).content;
  const retained = retainPrayerScheduleDuringOutage(confirmed, new Date("2026-10-18T06:00:00Z"));
  assert.equal(retained.iqamahTime.asrIqamah, "5:00 PM"); assert.equal(retained.iqamahTime.manualOverride, true);
  assert.equal(retained.iqamahTime.upcomingWeekIqamah, undefined);
});

test("provider updates adhan only; saved staff iqamah and Jumuah never change automatically", () => {
  const content = overridden(), resolved = resolveEffectivePrayerSchedule(content, baseFeed, "live", "2026-10-06", sourceUpdatedAt, now);
  assert.equal(resolved.content.prayerTime.asr, "4:25 PM"); assert.equal(resolved.content.iqamahTime.asrIqamah, "5:00 PM");
  assert.equal(resolved.content.iqamahTime.fajrIqamah, "6:28 AM");
  assert.deepEqual(resolved.content.jumuahSchedule, content.jumuahSchedule);
  assert.equal(resolved.content.iqamahTime.upcomingWeekIqamah, undefined); assert.equal(resolved.schedule.upcomingWeek, undefined);
  assert.deepEqual(resolved.activeOverrides, ["asr"]);
});

test("clear override returns to saved HBIC iqamah, never the retired AWS feed", () => {
  const content = overridden(); content.iqamahTime.overrides = {};
  const resolved = resolveEffectivePrayerSchedule(content, baseFeed, "live", "2026-10-06", sourceUpdatedAt, now);
  assert.equal(resolved.content.iqamahTime.asrIqamah, content.iqamahTime.asrIqamah);
  assert.notEqual(resolved.content.iqamahTime.asrIqamah, baseFeed.iqamah_asr); assert.equal(resolved.activeOverrides.length, 0);
});

test("scheduled overrides wait for start; shared explicitly timed overrides stay supported", () => {
  assert.equal(isOverrideActive({ enabled: true, value: "5:00 PM", startsAt: "2026-10-07T18:00:00Z" }, now), false);
  assert.equal(isIqamahOverrideActive({ enabled: true, value: "5:00 PM", endsAt: "2026-10-06T17:00:00Z" }, now), false);
  assert.equal(isIqamahOverrideActive({ enabled: true, value: "5:00 PM", endsAt: "invalid" }, now), false);
  assert.equal(isIqamahOverrideActive({ enabled: true, value: "5:00 PM" }, now), true);
});

test("public, TV and mobile/Watch/widget snapshots agree across Saturday to Sunday", () => {
  const saturday = new Date("2026-10-11T05:30:00Z"), content = overridden();
  content.iqamahTime.upcomingWeekIqamah = { fajr: "6:50 AM", asr: "4:45 PM" };
  assert.equal(createWidgetPrayerSnapshot(content, saturday).nextIqamah, content.iqamahTime.fajrIqamah, "even legacy cached next-week data cannot replace staff times");
  const resolved = resolveEffectivePrayerSchedule(content, baseFeed, "live", "2026-10-10", saturday.toISOString(), saturday);
  const publicContent = toPublicContent(resolved.content, saturday), snapshot = createWidgetPrayerSnapshot(resolved.content, saturday);
  assert.equal(publicContent.iqamahTime.asrIqamah, "5:00 PM"); assert.equal(publicContent.iqamahTime.upcomingWeekIqamah, undefined);
  assert.equal(snapshot.prayers.find(p => p.key === "asr")?.iqamah, "5:00 PM");
  assert.equal(snapshot.nextIqamah, "6:28 AM");
  assert.equal(deriveDisplayFocus(snapshot, saturday)?.iqamahDate?.toISOString(), snapshot.nextIqamahDate);
});

test("Iqamah.ca parsing is date-exact, validated and never executes remote code", () => {
  assert.deepEqual(parseIqamahCaAdhan(sourceText, "2026-10-06"), Object.fromEntries(Object.entries(baseFeed).filter(([k]) => k.startsWith("salah_"))));
  assert.throws(() => parseIqamahCaAdhan(sourceText, "2026-10-07"), /no adhan schedule/);
  assert.throws(() => parseIqamahCaAdhan(sourceText.replace("6:18 AM", "99:18 AM"), "2026-10-06"), /invalid fajr/);
  assert.throws(() => parseIqamahCaAdhan("<html>Challenge</html>", "2026-10-06"), /no adhan schedule/);
});

test("direct sync never calls AWS even when its legacy environment variable exists", async () => {
  const original = globalThis.fetch, old = process.env.HBIC_PRAYER_SOURCE_URL, urls: string[] = [];
  process.env.HBIC_PRAYER_SOURCE_URL = "https://retired.execute-api.us-west-2.amazonaws.com/unused";
  globalThis.fetch = async input => { urls.push(String(input)); return new Response(sourceText); };
  try {
    const result = await applyPrayerSync(overridden(), null, { now, force: true });
    assert.equal(result.status.sourceState, "live"); assert.equal(result.status.endpointHost, "iqamah.ca");
    assert.equal(result.content.prayerTime.fajr, "6:18 AM"); assert.equal(result.content.iqamahTime.asrIqamah, "5:00 PM");
    assert.equal(new URL(urls[0]).origin + new URL(urls[0]).pathname, iqamahCaAdhanUrl);
  } finally { globalThis.fetch = original; if (old === undefined) delete process.env.HBIC_PRAYER_SOURCE_URL; else process.env.HBIC_PRAYER_SOURCE_URL = old; }
});

test("unavailable upstream retains bounded retry backoff while forced sync retries", async () => {
  const original = globalThis.fetch; let attempts = 0, writes = 0;
  globalThis.fetch = async () => { attempts++; throw new Error("isolated upstream outage"); };
  const db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({ notificationBaseline: defaultContent.iqamahTime, lastAttemptedSync: sourceUpdatedAt, lastError: "isolated upstream outage" }) }), set: async () => { writes++; } }) }) } as unknown as NonNullable<Parameters<typeof applyPrayerSync>[1]>;
  try {
    const result = await applyPrayerSync(defaultContent, db, { now }); assert.equal(result.status.sourceState, "unavailable"); assert.equal(attempts, 0); assert.equal(writes, 0);
    await applyPrayerSync(defaultContent, db, { now, force: true }); assert.equal(attempts, 1); assert.equal(writes, 1);
    await applyPrayerSync(defaultContent, db, { now: new Date("2026-10-06T18:04:00Z") }); assert.equal(attempts, 2);
  } finally { globalThis.fetch = original; }
});

test("draft preview never changes public comparison snapshot or notification baseline", async () => {
  const previous = resolveEffectivePrayerSchedule(defaultContent, baseFeed, "live", "2026-10-06", sourceUpdatedAt, now).content, writes: unknown[] = [];
  const db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({ feed: baseFeed, serviceDate: "2026-10-06", lastAttemptedSync: sourceUpdatedAt, normalizedContent: previous }) }), set: async (v: unknown) => { writes.push(v); } }) }) } as unknown as NonNullable<Parameters<typeof applyPrayerSync>[1]>;
  const result = await applyPrayerSync(overridden(), db, { now, preview: true }); assert.equal(result.content.iqamahTime.asrIqamah, "5:00 PM"); assert.equal(writes.length, 0);
});

test("weekly comparison includes only changed iqamah, not daily adhan drift", () => {
  const before = structuredClone(defaultContent.iqamahTime);
  assert.deepEqual(changedIqamahTimes(before, { ...before, asrIqamah: "4:30 PM" }), [{ prayer: "asr", oldTime: before.asrIqamah, newTime: "4:30 PM" }]);
  assert.deepEqual(changedIqamahTimes(before, before), []); assert.deepEqual(changedIqamahTimes(undefined, before), []);
});

test("both prayer editors create persistent overrides without weekly expiry wording", () => {
  for (const file of [new URL("../components/DisplayAdmin.tsx", import.meta.url), new URL("../../admin-web/components/AdminDashboard.tsx", import.meta.url)]) {
    const source = readFileSync(file, "utf8");
    assert.ok(source.includes("persistent: true")); assert.ok(source.includes("endsAt: undefined"));
    assert.equal(source.includes("Overrides expire Sunday"), false);
    assert.equal(source.includes("endsAt: iqamahOverrideWeekEndsAt"), false);
  }
});


test("Fajr follows each day's adhan by ten minutes and preserves all other staff overrides", () => {
  const content = overridden(); content.iqamahTime.overrides = {
    dhuhr: { enabled: true, value: "1:30 PM" }, asr: { enabled: true, value: "4:00 PM" }, isha: { enabled: true, value: "8:00 PM" }
  };
  for (const [date, adhan, expected] of [["2026-10-31", "6:57 AM", "7:07 AM"], ["2026-11-01", "6:58 AM", "7:08 AM"], ["2026-11-08", "7:10 AM", "7:20 AM"]]) {
    const instant = new Date(`${date}T18:00:00Z`), resolved = resolveEffectivePrayerSchedule(content, { ...baseFeed, salah_fajr: adhan }, "live", date, instant.toISOString(), instant).content;
    assert.equal(resolved.iqamahTime.fajrIqamah, expected);
    assert.equal(retainPrayerScheduleDuringOutage(resolved, instant).iqamahTime.fajrIqamah, expected);
    for (const prayer of ["dhuhr", "asr", "isha"] as const) assert.equal(resolved.iqamahTime[`${prayer}Iqamah`], content.iqamahTime.overrides![prayer]!.value);
    const snapshot = createWidgetPrayerSnapshot(resolved, instant);
    assert.equal(snapshot.prayers.find(p => p.key === "fajr")?.iqamah, expected);
    assert.equal(snapshot.tomorrowFajrIqamah, expected);
  }
  content.iqamahTime.overrides.fajr = { enabled: true, value: "7:30 AM" };
  assert.equal(resolveEffectivePrayerSchedule(content, baseFeed, "live", "2026-10-31", sourceUpdatedAt, now).content.iqamahTime.fajrIqamah, "7:30 AM");
});
