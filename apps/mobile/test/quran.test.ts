import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createQuranClient } from "../src/services/quranClient";
import { createTanzilClient } from "../src/services/quranTanzil";
import { createQuranStore, quranStateKey } from "../src/services/quranStorage";
import { QuranAudioQueue, type QuranAudioPort } from "../src/quran/audioQueue";
import { createSelfTest, emptyQuranState, markRead, normalizeQuranState, parseAyahReference, repeatSequence, validateChapters, validatePage, validateVerse, validAudioUrl, versePage, type QuranVerse } from "@hbic/shared";

const dataset = JSON.parse(readFileSync(new URL("../assets/quran/tanzil-uthmani.json", import.meta.url), "utf8"));
const tanzil = createTanzilClient(() => dataset);
const sample = (ayah = 1): QuranVerse => ({ ...dataset.chapters[0].verses[ayah - 1], audioUrl: `https://verses.quran.com/example/00100${ayah}.mp3` });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial)); let fail = false;
  return { data, failNext() { fail = true; }, async getItem(key: string) { return data.get(key) ?? null; },
    async setItem(key: string, value: string) { if (fail) { fail = false; throw new Error("Disk full"); } data.set(key, value); } };
}

test("Quran references support Latin, Arabic and Persian numerals; invalid references rejected", () => {
  assert.equal(parseAyahReference(" ٢:٢٥٥ ")?.key, "2:255");
  assert.equal(parseAyahReference("۲:۲۵۵")?.key, "2:255");
  for (const input of ["0:1", "115:1", "1:0", "2:287", "2:1x"]) assert.equal(parseAyahReference(input), null);
  assert.equal(versePage(50), 1); assert.equal(versePage(51), 2); assert.equal(versePage(286), 6);
  assert.throws(() => versePage(0));
});

test("bundled Tanzil Quran has complete 114-surah/6236-ayah index and exact page order", async () => {
  const chapters = await tanzil.listChapters(); validateChapters(chapters, true);
  let count = 0;
  for (const c of chapters) {
    for (let page = 1; page <= Math.ceil(c.versesCount / 50); page++) {
      const result = await tanzil.readChapter(c.id, page);
      validatePage(result, c.id, page); count += result.verses.length;
    }
  }
  assert.equal(count, 6236);
  assert.equal(dataset.chapters[8].opening, null);
  assert.equal((await tanzil.resources()).reciters.length, 0);
  assert.equal((await tanzil.verse("2:255")).audioUrl, null);
  assert.equal((await tanzil.searchVerses("٢:٢٥٥"))[0].verseKey, "2:255");
  assert.equal((await tanzil.searchVerses("The Opening"))[0].verseKey, "1:1");
  await assert.rejects(tanzil.verse("1:8"));
  const controller = new AbortController(); controller.abort(); await assert.rejects(tanzil.listChapters(controller.signal));
});

test("imported Arabic is byte-identical to licensed source verse text when source files are available", () => {
  let xml: string;
  try { xml = readFileSync(new URL("../../../output/quran-development/provider/quran-uthmani.xml", import.meta.url), "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
  assert.equal(createHash("sha256").update(xml).digest("hex"), "8c5aeae20363a98f6963720d29fce040ca8b56a8e75f8b564c257fce7f6d0417");
  const arabic = Array.from(xml.matchAll(/<aya\s+[^>]*text="([^"]+)"/g), (m) => m[1].replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
  assert.deepEqual(dataset.chapters.flatMap((c: { verses: QuranVerse[] }) => c.verses.map((v) => v.textUthmani)), arabic);
  assert.match(JSON.stringify(dataset), /Tanzil/); assert.match(JSON.stringify(dataset), /Creative Commons|CC BY/i);
});

test("remote Quran validation rejects missing, reordered, mismatched and unsafe content", () => {
  const good = { chapter: dataset.chapters[0].chapter, verses: dataset.chapters[0].verses, page: 1, hasMore: false };
  assert.equal(validatePage(good, 1, 1).verses.length, 7);
  assert.throws(() => validatePage({ ...good, verses: good.verses.slice(1) }, 1, 1));
  assert.throws(() => validatePage({ ...good, verses: [...good.verses].reverse() }, 1, 1));
  assert.throws(() => validateVerse({ ...sample(), textUthmani: "<script>wrong</script>" }));
  assert.throws(() => validateVerse({ ...sample(), audioUrl: "https://evil.example/audio.mp3" }));
  assert.equal(validAudioUrl("https://verses.quran.com/audio.mp3"), true);
  assert.equal(validAudioUrl("https://user:password@verses.quran.com/audio.mp3"), false);
  assert.equal(validAudioUrl("http://verses.quran.com/audio.mp3"), false);
});

test("local state migration preserves legacy keys, rejects future/corrupt data, serializes writes", async () => {
  const disk = memory({ "hbic:quran:bookmarks:v1": '["2:255","2:255","wrong"]', "hbic:quran:last-read:v1": "2" });
  const store = createQuranStore(disk);
  assert.equal((await store.read()).lastRead?.chapter, 2);
  assert.ok(disk.data.has("hbic:quran:bookmarks:v1"));
  await Promise.all([store.update((s) => ({ ...s, bookmarks: [...s.bookmarks, "1:1"] })), store.update((s) => ({ ...s, bookmarks: [...s.bookmarks, "1:2"] }))]);
  assert.deepEqual((await store.read()).bookmarks, ["2:255", "1:1", "1:2"]);
  disk.failNext(); await assert.rejects(store.update((s) => markRead(s, 3, 4)), /Disk full/);
  assert.equal((await store.read()).lastRead?.chapter, 2);
  await store.update((s) => markRead(s, 3, 4)); assert.deepEqual((await store.read()).lastRead, { chapter: 3, ayah: 4 });
  for (const raw of ['{"version":3}', "invalid JSON"]) {
    const bad = memory({ [quranStateKey]: raw }); await assert.rejects(createQuranStore(bad).read()); assert.equal(bad.data.get(quranStateKey), raw);
  }
});

test("saved preferences and memorization normalize safely, reading history is bounded", () => {
  let state = emptyQuranState(); for (let c = 1; c <= 20; c++) state = markRead(state, c, 1);
  assert.equal(state.recent.length, 12); assert.equal(state.recent[0], 20);
  const normalized = normalizeQuranState({ ...state, preferences: { ...state.preferences, arabicSize: 100, translationSize: 0 }, recordings: [{ uri: "https://bad.example" }] });
  assert.equal(normalized.preferences.arabicSize, 48); assert.equal(normalized.preferences.translationSize, 14); assert.equal(normalized.recordings.length, 0);
  assert.deepEqual(repeatSequence({ chapter: 1, from: 1, to: 3 }, 2), [1, 2, 3, 1, 2, 3]);
  assert.deepEqual(repeatSequence({ chapter: 1, from: 1, to: 3 }, 2, "ayah"), [1, 1, 2, 2, 3, 3]);
  const questions = createSelfTest({ chapter: 2, from: 1, to: 20 }, 5, () => .3); assert.equal(new Set(questions).size, 5);
  assert.throws(() => repeatSequence({ chapter: 1, from: 3, to: 1 }));
});

test("client forwards only resource choices, validates responses and caches bounded pages", async () => {
  const urls: URL[] = [];
  const client = createQuranClient("https://hbic.example", (async (input) => {
    const url = new URL(String(input)); urls.push(url);
    return response({ ok: true, ...(await tanzil.readChapter(1)) });
  }) as typeof fetch);
  await client.readChapter(1, 1, { reciter: 7, translation: 20, arabicSize: 32 } as never); await client.readChapter(1);
  assert.equal(urls.length, 1); assert.equal(urls[0].searchParams.has("arabicSize"), false);
  client.clearContentCache(); await client.readChapter(1); assert.equal(urls.length, 2);
  const bad = createQuranClient("https://hbic.example", (async () => response({ ok: true, verse: sample(2) })) as typeof fetch);
  await assert.rejects(bad.verse("1:1"), /different ayah/);
  const unavailable = createQuranClient("https://hbic.example", (async () => response({ ok: false, message: "Unavailable" }, 503)) as typeof fetch);
  await assert.rejects(unavailable.readChapter(1), /Unavailable/);
});

function audioHarness() {
  const calls: string[] = [];
  const port: QuranAudioPort = { replace: (uri) => calls.push(uri), play: () => calls.push("play"), pause: () => calls.push("pause"), async seekTo() {} };
  return { calls, queue: new QuranAudioQueue(port, () => {}) };
}
test("one audio player advances/repeats, pauses/resumes, finishes and surfaces unavailable audio", async () => {
  const { queue, calls } = audioHarness(); await queue.start([1, 2, 2], async (ayah) => sample(ayah));
  assert.equal(queue.snapshot().verse?.verseKey, "1:1"); queue.pause(); assert.equal(queue.snapshot().phase, "paused");
  await queue.resume(); assert.equal(queue.snapshot().phase, "playing");
  await queue.finished(); assert.equal(queue.snapshot().verse?.verseKey, "1:2");
  await queue.finished(); assert.equal(queue.snapshot().index, 2);
  await queue.finished(); assert.equal(queue.snapshot().phase, "idle");
  assert.equal(calls.filter((call) => call === "play").length, 4);
  await queue.start([1], async () => ({ ...sample(), audioUrl: null })); assert.equal(queue.snapshot().phase, "error");
});
test("audio queue discards stale loads and does not advance twice on duplicate finish", async () => {
  const { queue, calls } = audioHarness(); let resolve!: (v: QuranVerse) => void;
  const pending = queue.start([1], () => new Promise((r) => { resolve = r; }));
  queue.stop(); resolve(sample()); await pending; assert.equal(calls.includes("play"), false);
  await queue.start([1, 2], async (ayah) => sample(ayah)); await Promise.all([queue.finished(), queue.finished()]);
  assert.equal(queue.snapshot().index, 1);
  queue.fail("Offline"); assert.equal(queue.snapshot().phase, "error"); await queue.resume(); assert.equal(queue.snapshot().phase, "playing");
  queue.interrupted(); assert.equal(queue.snapshot().phase, "paused");
});
