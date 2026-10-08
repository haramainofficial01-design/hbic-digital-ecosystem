import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createQuranProvider, plainText } from "../lib/quranFoundation";
import { isQuranPublicEnabled } from "../lib/quranRelease";
import { createQuranRateLimit } from "../lib/quranRateLimit";
const data = JSON.parse(readFileSync(new URL("../../mobile/assets/quran/tanzil-uthmani.json", import.meta.url), "utf8"));
function harness(production = true) {
  const calls: { key: string; query: Record<string, unknown> }[] = [];
  const upstreamVerse = (key: string, query: Record<string, unknown>) => {
    calls.push({ key, query });
    const [c, a] = key.split(":").map(Number), source = data.chapters[c - 1].verses[a - 1];
    return { ...source, audio: { url: `https://verses.quran.com/audio/${c}/${a}.mp3` }, translations: [{ text: "Example meaning &amp; attribution", resourceName: "Licensed resource fixture" }] };
  };
  const client = { content: { v4: {
    chapters: { async list() { return data.chapters.map((s: { chapter: unknown }) => s.chapter); } },
    resources: { recitations: { async list() { return [{ id: 7, reciterName: "Verified reciter" }]; } }, translations: { async list() { return [
      { id: 20, name: "Saheeh International", languageName: "English", authorName: "Saheeh International" },
      { id: 85, name: "Abdel Haleem", languageName: "English", authorName: "Abdel Haleem" }]; } } },
    verses: { async byKey(key: string, query: Record<string, unknown>) { return { ...upstreamVerse(key, query), words: [{ pageNumber: 3 }] }; },
      async byPage(page: number, query: Record<string, unknown>) {
        const base = upstreamVerse("2:6", query);
        return [{ ...base, juzNumber: 1, words: Array.from({ length: 15 }, (_, i) => ({ position: i + 1, codeV2: "ﱁ", textUthmani: "إِنَّ", pageNumber: page, v2Page: page, lineNumber: i + 1 })) }];
      }, async byChapter(id: string, query: Record<string, unknown>) {
      const page = Number(query.page), c = data.chapters[Number(id) - 1]; return c.verses.slice((page - 1) * 50, page * 50).map((v: { verseKey: string }) => upstreamVerse(v.verseKey, query));
    } }
  } }, search: { v1: { async query() { return { result: { verses: [{ key: "2:255" }, { key: "2:255" }, { key: "invalid" }], navigation: [{ key: "1:3", resultType: "ayah" }, { key: "2", resultType: "surah" }] } }; } } } };
  return { calls, provider: createQuranProvider(() => client as never, () => production) };
}
test("provider returns complete authentic pages, coalesces cache, uses audio resource parameter", async () => {
  const { calls, provider } = harness(); assert.equal((await provider.chapters()).length, 114);
  assert.deepEqual((await provider.resources()).translations.map(t => t.id), [20]);
  await assert.rejects(provider.verse("1:1", 7, 85), /RESOURCE_UNAVAILABLE/);
  const [a, b] = await Promise.all([provider.chapter(2, 6), provider.chapter(2, 6)]);
  assert.equal(a, b); assert.equal(a.verses.length, 36); assert.equal(a.verses[0].verseKey, "2:251");
  assert.equal(calls[0].query.audio, 7); assert.equal(calls[0].query.reciter, undefined);
  assert.ok(calls.slice(1).every((c) => c.query.audio === 7 && Array.isArray(c.query.translations)));
  await assert.rejects(provider.chapter(1, 2), /INVALID_REFERENCE/);
  await assert.rejects(provider.verse("1:8"), /INVALID_REFERENCE/);
  await assert.rejects(provider.chapter(1, 1, 9999), /RESOURCE_UNAVAILABLE/);
  assert.equal((await provider.search("2:255")).verses[0].verseKey, "2:255");
  assert.deepEqual((await provider.search("mercy")).verses.map((v) => v.verseKey), ["2:255", "1:3"]);
});
test("prelive scope cannot masquerade as full Quran access", async () => {
  const { provider } = harness(false); await assert.rejects(provider.chapter(3, 1), /PRELIVE_LIMIT/);
  await assert.rejects(provider.verse("3:1"), /INVALID_REFERENCE/);
});
test("Madinah provider uses real V2 word lines with a separate page cache and no wrapped-text approximation", async () => {
  const { provider, calls } = harness();
  const [a, b] = await Promise.all([provider.mushaf(3), provider.mushaf(3)]);
  assert.equal(a, b); assert.equal(a.lines.length, 15); assert.equal(a.lines[14].words[0].position, 15);
  const query = calls.find((c) => c.query.words)?.query;
  assert.equal(query?.mushaf, 1); assert.deepEqual(query?.wordFields, { codeV2: true, textUthmani: true, v2Page: true });
  assert.equal(await provider.mushafReference("2:6"), 3);
  await assert.rejects(provider.mushaf(0), /INVALID_REFERENCE/);
  await assert.rejects(provider.mushafReference("1:8"), /INVALID_REFERENCE/);
});
test("plain meaning text removes markup and decodes entities", () => {
  assert.equal(plainText('<p>Example&nbsp;meaning &amp; &#39;quote&#39;</p>'), "Example meaning & 'quote'");
  assert.equal(plainText('Allāh,<sup foot_note=254011>1</sup> the Entirely Merciful.'), "Allāh, the Entirely Merciful.");
});
test("Quran abuse limiter respects distinct clients and resets bounded windows", () => {
  let clock = 0; const rate = createQuranRateLimit(2, 60_000, () => clock);
  assert.equal(rate("a").allowed, true); assert.equal(rate("a").allowed, true); assert.equal(rate("a").allowed, false);
  assert.equal(rate("b").allowed, true); clock = 60_000; assert.equal(rate("a").allowed, true);
});
test("public reader remains gated without explicit production credentials and approval", () => {
  const names = ["NODE_ENV", "HBIC_QURAN_PUBLIC_ENABLED", "QF_ENV", "QF_CLIENT_ID", "QF_CLIENT_SECRET"];
  const original = names.map((name) => process.env[name]);
  try {
    Object.assign(process.env, { NODE_ENV: "production" }); delete process.env.HBIC_QURAN_PUBLIC_ENABLED;
    process.env.QF_ENV = "production"; process.env.QF_CLIENT_ID = "test-only"; process.env.QF_CLIENT_SECRET = "test-only";
    assert.equal(isQuranPublicEnabled(), false);
    process.env.HBIC_QURAN_PUBLIC_ENABLED = "true"; process.env.QF_ENV = "prelive"; assert.equal(isQuranPublicEnabled(), false);
    process.env.QF_ENV = "production"; assert.equal(isQuranPublicEnabled(), true);
  } finally { names.forEach((name, i) => { if (original[i] === undefined) delete process.env[name]; else process.env[name] = original[i]; }); }
});
