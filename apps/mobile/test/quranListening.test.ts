import test from "node:test";
import assert from "node:assert/strict";
import { availableListeningChapters, createListeningClient, filterListeningCatalog, listeningUrl, validateListeningCatalog, validListeningUrl } from "../src/services/quranListening";
import { compactQuietPauses, reciteFeedback, ReciteAudioWindow, ReciteCompletionGuard } from "../src/quran/reciteAssistFeedback";
import { resolveVoiceNavigation } from "../src/quran/voiceNavigation";
import { emptyQuranState, normalizeQuranState, type QuranChapter } from "@hbic/shared";
const catalog = { reciters: [{ id: 259, name: "Ahmad Al Nufais", moshaf: [
  { id: 259, name: "Hafs", rewaya_id: 1, server: "https://cdn.mp3quran.net/audio/ahmad-nufais/r1/", surah_list: "1,2,112" },
  { id: 999, name: "Different riwayah", rewaya_id: 2, server: "https://cdn.mp3quran.net/other/", surah_list: "1" }
] }] };
test("real catalog uses separate identities and only verified Hafs editions/available chapters", () => {
  const voices = validateListeningCatalog(catalog), reciter = voices[0];
  assert.equal(reciter.editions.length, 1); assert.equal(reciter.group, "Well-known reciters");
  assert.equal(listeningUrl(reciter, 259, 112), "https://cdn.mp3quran.net/audio/ahmad-nufais/r1/112.mp3");
  assert.throws(() => listeningUrl(reciter, 259, 3), /not available/);
  assert.throws(() => listeningUrl(reciter, 999, 1), /not available/);
  assert.equal(availableListeningChapters(reciter, 259, [{ id: 1 }, { id: 3 }] as never).length, 1);
  for (const url of ["https://mp3quran.net.evil.test/001.mp3", "http://cdn.mp3quran.net/a/001.mp3", "https://cdn.mp3quran.net/a/001.mp3?x=1", "https://user:password@cdn.mp3quran.net/a/001.mp3", "https://cdn.mp3quran.net/a/no.mp3"]) assert.equal(validListeningUrl(url), false);
  assert.equal(validListeningUrl(listeningUrl(reciter, 259, 1)), true);
});
test("catalog validates partial lists, malicious servers and duplicates without inventing options", () => {
  assert.throws(() => validateListeningCatalog({ reciters: [...catalog.reciters, ...catalog.reciters] }));
  assert.throws(() => validateListeningCatalog({ reciters: [{ ...catalog.reciters[0], moshaf: [{ ...catalog.reciters[0].moshaf[0], server: "https://attacker.test/" }] }] }));
  assert.throws(() => validateListeningCatalog({ reciters: [{ ...catalog.reciters[0], moshaf: [{ ...catalog.reciters[0].moshaf[0], surah_list: "1,115" }] }] }));
});
test("familiar reciter spellings find the real provider identity", () => {
  const nufais = validateListeningCatalog(catalog);
  assert.equal(filterListeningCatalog(nufais, "Ahmad an Nufais")[0]?.id, 259);
  const husary = validateListeningCatalog({ reciters: [{ ...catalog.reciters[0], id: 118, name: "Mahmoud Khalil Al-Hussary" }] });
  assert.equal(filterListeningCatalog(husary, "Husary")[0]?.id, 118);
  assert.equal(filterListeningCatalog(husary, "Hossary")[0]?.id, 118);
});
test("saved listening preference does not collide with verse-recitation IDs", () => {
  const state = normalizeQuranState({ ...emptyQuranState(), listening: { reciterId: 259, editionId: 259 } });
  assert.deepEqual(state.listening, { reciterId: 259, editionId: 259 });
  assert.equal(state.preferences.reciter, 7);
  assert.equal(normalizeQuranState({ ...state, listening: { reciterId: -1, editionId: 0 } }).listening, null);
});
test("voice navigation resolves surahs/ayahs without treating speech as Quran text", () => {
  const chapters = [{ id: 1, nameSimple: "Al-Faatiha", nameArabic: "الفاتحة", translatedName: { name: "The Opening" }, versesCount: 7 },
    { id: 2, nameSimple: "Al-Baqara", nameArabic: "البقرة", translatedName: { name: "The Cow" }, versesCount: 286 }] as QuranChapter[];
  for (const input of ["Open surah Al Fatiha ayah three", "سورة الفاتحة آية ٣", "1:3"]) assert.equal(resolveVoiceNavigation(input, chapters)?.key, "1:3");
  assert.equal(resolveVoiceNavigation("Surah two verse two hundred fifty five", chapters)?.key, "2:255");
  assert.equal(resolveVoiceNavigation("surah Al Fatiha verse eighty", chapters), null);
  assert.equal(resolveVoiceNavigation("a random heard sentence", chapters), null);
});
test("reciter requests coalesce/cache and failed requests can retry", async () => {
  let calls = 0, fail = true, clock = 0;
  const client = createListeningClient((async () => { calls++; return new Response(JSON.stringify(catalog), { status: fail ? 503 : 200 }); }) as typeof fetch, () => clock);
  await assert.rejects(client.catalog()); fail = false;
  const [a, b] = await Promise.all([client.catalog(), client.catalog()]); assert.equal(a, b); assert.equal(calls, 2);
  clock = 3_600_001; await client.catalog(); assert.equal(calls, 3);
  const controller = new AbortController(); controller.abort(); await assert.rejects(client.catalog(controller.signal));
});
test("recitation feedback never grades noise, silence, short or low-confidence input", () => {
  const expected = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
  for (const [heard, quality] of [["نهايه", 1], ["", 1], ["بسم الله الرحمن الرحيم", .2], ["بسم الله الرحمن الرحيم", NaN]] as const) {
    const result = reciteFeedback(expected, heard, quality); assert.equal(result.status, "uncertain"); assert.equal(result.differences.length, 0);
  }
  assert.equal(reciteFeedback(expected, "بسم الله الرحمن الرحيم", 1).status, "following");
});
test("comparison handles missing/substituted/repeated words, while a pause is not a missed ending", () => {
  const expected = "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ";
  assert.ok(reciteFeedback(expected, "الحمد لله العالمين", 1).differences.some((d) => d.kind === "omission"));
  assert.ok(reciteFeedback(expected, "الحمد لله الشمس العالمين", 1).differences.some((d) => d.kind === "substitution"));
  assert.ok(reciteFeedback(expected, "الحمد لله لله رب العالمين", 1).differences.some((d) => d.kind === "repetition"));
  const paused = reciteFeedback(expected, "الحمد لله رب", 1); assert.equal(paused.differences.length, 0);
  assert.equal(paused.words.at(-1)?.state, "not_heard");
});
test("microphone memory is capped at six seconds and erased on clear", () => {
  const audio = new ReciteAudioWindow(); audio.append(Array.from({ length: 100000 }, (_, i) => i / 100000));
  const pcm = audio.snapshot(); assert.equal(pcm.length, 96000); assert.ok(Math.abs(pcm[0] - .04) < .0001);
  audio.clear(); assert.equal(audio.snapshot().length, 0);
  audio.append([NaN, Infinity, -2, 2]); assert.deepEqual([...audio.snapshot()], [0, 0, -1, 1]);
});
test("quiet-pause compaction keeps short articulation gaps and all voiced samples", () => {
  const input = new Float32Array(16000); input.fill(.05, 0, 3200); input.fill(.05, 11200);
  const result = compactQuietPauses(input);
  assert.ok(result.length < input.length); assert.equal(result.filter((v) => v !== 0).length, 8000);
  const short = new Float32Array(4000); short.fill(.05); short.fill(0, 1000, 2600);
  assert.deepEqual(compactQuietPauses(short), short);
});
test("verse progression needs two stable complete observations and never grades partial/noisy recitation", () => {
  const guard = new ReciteCompletionGuard(), text = "الحمد لله رب العالمين";
  const complete = reciteFeedback(text, text, 1);
  assert.equal(guard.observe(complete), false);
  assert.equal(guard.observe(reciteFeedback(text, "الحمد لله رب", 1)), false);
  assert.equal(guard.observe(complete), false); assert.equal(guard.observe(complete), true);
  assert.equal(guard.observe(complete), false);
  guard.reset(); assert.equal(guard.observe(reciteFeedback(text, text, .2)), false);
  assert.equal(guard.observe(reciteFeedback(text, "الحمد لله الشمس العالمين", 1)), false);
  assert.equal(guard.observe(complete), false); assert.equal(guard.observe(complete), true);
});
