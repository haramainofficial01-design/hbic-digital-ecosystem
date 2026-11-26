import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
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
  for (const change of [{ glyph: "<script>" }, { glyph: "generated text" }, { glyph: "ﱨ  ﱩ" }, { glyph: "ﱨ\nﱩ" }, { glyph: "ﱨ\n" }, { glyph: " ﱨ" }, { glyph: "ﱨ ".repeat(5) + "ﱩ" }, { key: "115:1" }, { position: 0 }]) {
    const broken = structuredClone(page); Object.assign(broken.lines[0].words[0], change);
    assert.throws(() => validateMushafPage(broken, 3));
  }
  const duplicate = structuredClone(page); duplicate.lines[1].words[0].position = 1;
  assert.throws(() => validateMushafPage(duplicate, 3));
  const heading = structuredClone(page); heading.lines[0] = { number: 1, words: [], heading: "<img onerror=alert(1)>" };
  assert.throws(() => validateMushafPage(heading, 3));
});
test("QCF V2 glyphs separated by a space stay together as one selectable word", () => {
  for (const [number, line, key, glyph, text] of [[5, 4, "2:26", "\uFC68 \uFC69", "إِنَّ"], [7, 9, "2:44", "\uFC93 \uFC94", "أَتَأْمُرُونَ"]] as const) {
    const sample = { ...structuredClone(page), page: number };
    sample.lines[line - 1].words[0] = { key, position: 1, glyph, text };
    assert.equal(validateMushafPage(sample, number).lines[line - 1].words[0].glyph, glyph);
    const html = mushafDocument(sample, false, key);
    assert.match(html, new RegExp(`data-key="${key}"[^>]+>${glyph}</button>`));
    assert.equal((html.match(new RegExp(`data-key="${key}"`, "g")) ?? []).length, 1);
  }
});
test("browser Mushaf uses an explicit channel without weakening the native sandbox", () => {
  const html = mushafDocument(page, false, "2:6", {channel: "mushaf_test_1"});
  assert.match(html, /window.parent.postMessage/);
  assert.match(html, /channel:"mushaf_test_1"/);
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html, /ReactNativeWebView/);
  assert.doesNotMatch(html, /hbicSelectMushafAyah/);
  assert.throws(() => mushafDocument(page, false, "", {channel: "<script>"}));
});
test("both native facing pages reflect the reader's latest ayah without reloading", async () => {
  async function openLeaf(number: number, key: string) {
    let selected = false;
    const sample = { ...structuredClone(page), page: number };
    sample.lines[0].words[0].key = key;
    const html = mushafDocument(sample, false, "");
    const script = html.match(/<script[^>]*>([\s\S]+)<\/script>/)![1];
    const word = { dataset: { key }, style: {}, classList: { toggle: (_: string, next: boolean) => { selected = next; } } };
    const { promise: firstMessage, resolve } = Promise.withResolvers<{ type: string }>();
    const window = {
      addEventListener() {},
      ReactNativeWebView: { postMessage: (message: string) => resolve(JSON.parse(message)) },
      hbicSelectMushafAyah: undefined as ((key: string) => void) | undefined,
    };
    const document = {
      fonts: { load: async () => [], check: () => true },
      createElement: () => ({ getContext: () => ({}) }),
      querySelectorAll: (selector: string) => selector === ".word" ? [word] : [],
      getElementById: () => ({ style: {}, classList: { add() {} } }),
      addEventListener() {},
    };
    runInNewContext(script, { document, window, setTimeout, clearTimeout });
    assert.equal((await firstMessage).type, "ready");
    return { select: window.hbicSelectMushafAyah!, isSelected: () => selected };
  }
  const right = await openLeaf(3, "2:6");
  const left = await openLeaf(4, "2:17");
  for (const [key, expected] of [["2:6", [true, false]], ["2:17", [false, true]], ["2:6", [true, false]]] as const) {
    right.select(key);
    left.select(key);
    assert.deepEqual([right.isSelected(), left.isSelected()], expected);
  }
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
