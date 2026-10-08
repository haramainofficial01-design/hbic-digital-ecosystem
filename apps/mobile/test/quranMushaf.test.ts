import test from "node:test";
import assert from "node:assert/strict";
import { emptyQuranState, memorizationLabels, mushafFontUrl, normalizeQuranState, validateMushafPage, type MushafPage } from "@hbic/shared";
import { createQuranClient } from "../src/services/quranClient";
import { mushafDocument } from "../src/quran/mushafDocument";
const page: MushafPage = { page: 3, juz: 1, chapterNames: ["Al-Baqarah"], lines: Array.from({ length: 15 }, (_, i) => ({ number: i + 1,
  words: [{ key: "2:6", position: i + 1, glyph: "ﱁ", text: "إِنَّ" }] })) };
test("Madinah layout has 15 fixed lines, exact glyphs and independent 604-page navigation", () => {
  assert.equal(validateMushafPage(page, 3), page);
  assert.match(mushafFontUrl(604), /\/v2\/woff2\/p604.woff2$/);
  assert.throws(() => mushafFontUrl(605));
  const html = mushafDocument(page, false, "2:6");
  assert.equal((html.match(/data-line=/g) ?? []).length, 15);
  assert.equal((html.match(/data-key="2:6"/g) ?? []).length, 15);
  assert.match(html, /font-src https:\/\/verses.quran.foundation/);
  assert.match(html, /connect-src 'none'/); assert.match(html, /overflow:rows.some/);
  assert.match(html, /prefers-reduced-motion:reduce/);
  assert.match(html, /send\(x,\(attempt\|\|0\)\+1\)/); // Android bridge can attach after cached fonts.
  assert.match(mushafDocument(page, true, ""), /#152B35/);
});
test("Mushaf rejects missing lines, bad page/glyphs, duplicated positions and injected headings", () => {
  assert.throws(() => validateMushafPage({ ...page, lines: page.lines.slice(1) }, 3));
  assert.throws(() => validateMushafPage(page, 4));
  for (const change of [{ glyph: "<script>" }, { glyph: "generated text" }, { key: "115:1" }, { position: 0 }]) {
    const broken = structuredClone(page); Object.assign(broken.lines[0].words[0], change);
    assert.throws(() => validateMushafPage(broken, 3));
  }
  const duplicate = structuredClone(page); duplicate.lines[1].words[0].position = 1;
  assert.throws(() => validateMushafPage(duplicate, 3));
  const heading = structuredClone(page); heading.lines[0] = { number: 1, words: [], heading: "<img onerror=alert(1)>" };
  assert.throws(() => validateMushafPage(heading, 3));
});
test("saved reading mode preserves old state and capitalized progress labels", () => {
  const previous = emptyQuranState(); delete (previous.preferences as Partial<typeof previous.preferences>).layout;
  assert.equal(normalizeQuranState(previous).preferences.layout, "ayah");
  assert.equal(normalizeQuranState({ ...previous, preferences: { ...previous.preferences, layout: "madinah" } }).preferences.layout, "madinah");
  assert.deepEqual(Object.values(memorizationLabels), ["Not Started", "Practising", "Memorized", "Needs Revision"]);
  assert.equal(emptyQuranState().preferences.translation, 20);
});
test("Mushaf requests are validated, cached, cancellable and cannot send provider credentials", async () => {
  const calls: string[] = [];
  const client = createQuranClient("https://hbic.ca", (async (url) => {
    calls.push(String(url)); const u = new URL(String(url));
    return new Response(JSON.stringify({ ok: true, ...(u.searchParams.get("mode") === "mushaf" ? { mushaf: page } : { page: 3 }) }));
  }) as typeof fetch);
  assert.equal(await client.mushafReference("2:6"), 3);
  const a = await client.readMushaf(3), b = await client.readMushaf(3); assert.equal(a, b); assert.equal(calls.length, 2);
  assert.deepEqual(Array.from(new URL(calls[1]).searchParams.keys()), ["mode", "page"]);
  await assert.rejects(client.readMushaf(605)); await assert.rejects(client.mushafReference("incorrect"));
  const request = new AbortController(); request.abort(); await assert.rejects(client.readMushaf(3, request.signal));
});
