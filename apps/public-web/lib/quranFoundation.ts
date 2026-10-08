import { SearchMode, type Verse } from "@quranjs/api";
import { createServerClient } from "@quranjs/api/server";
import { parseAyahReference, quranPageSize, validateChapters, validatePage, validateVerse, validAudioUrl, validMushafPageNumber, validateMushafPage, type MushafLine, type QuranResources } from "@hbic/shared";

// Saheeh International verified against the production catalog. Clear Quran is
// offered only if the provider actually lists its authorized English edition.
export const translationId = 20;
type Client = ReturnType<typeof createServerClient>;
let client: Client | null = null;
export function availability() {
  const production = process.env.QF_ENV === "production";
  return { configured: Boolean(process.env.QF_CLIENT_ID && process.env.QF_CLIENT_SECRET), production,
    note: production ? "Quran data provided by Quran Foundation."
      : "Development provider access: Quran Foundation prelive contains only Al-Fatihah and Al-Baqarah." };
}
function sdk(): Client {
  if (client) return client;
  if (!availability().configured) throw new Error("QF_NOT_CONFIGURED");
  client = createServerClient({ clientId: process.env.QF_CLIENT_ID!, clientSecret: process.env.QF_CLIENT_SECRET!,
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
    services: availability().production ? undefined : {
      gatewayUrl: "https://apis-prelive.quran.foundation", oauth2BaseUrl: "https://prelive-oauth2.quran.foundation" } });
  return client;
}
export function plainText(html: string) {
  return html.replace(/<sup\b[^>]*\bfoot_note\s*=[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => { const n = Number(code); return n <= 0x10ffff ? String.fromCodePoint(n) : ""; })
    .replace(/&#x([a-f\d]+);/gi, (_, code: string) => { const n = parseInt(code, 16); return n <= 0x10ffff ? String.fromCodePoint(n) : ""; })
    .replace(/\s+/g, " ").trim();
}
function publicVerse(verse: Verse) {
  let audioUrl: string | null = verse.audio?.url ?? null;
  if (audioUrl && !audioUrl.startsWith("https://")) audioUrl = new URL(audioUrl, "https://verses.quran.com/").href;
  if (audioUrl && !validAudioUrl(audioUrl)) audioUrl = null;
  return validateVerse({ id: verse.id, verseKey: verse.verseKey, verseNumber: verse.verseNumber,
    textUthmani: verse.textUthmani ?? "", translation: plainText(verse.translations?.[0]?.text ?? ""),
    translationName: verse.translations?.[0]?.resourceName ?? "", audioUrl });
}
/** Injectable provider facade; no fixture Quran content is used by the application. */
export function createQuranProvider(getClient: () => Client, production: () => boolean) {
  const cache = new Map<string, { until: number; promise: Promise<unknown> }>();
  function cached<T>(key: string, load: () => Promise<T>, ttl = 3_600_000): Promise<T> {
    const existing = cache.get(key);
    if (existing && existing.until > Date.now()) return existing.promise as Promise<T>;
    if (cache.size >= 80) cache.delete(cache.keys().next().value!);
    const promise = load().catch((error) => { cache.delete(key); throw error; });
    cache.set(key, { until: Date.now() + ttl, promise });
    return promise;
  }
  async function chapters() {
    return cached("chapters", async () => validateChapters((await getClient().content.v4.chapters.list({ language: "en" }))
      .map(({ id, nameSimple, nameArabic, translatedName, versesCount, revelationPlace }) => ({ id, nameSimple, nameArabic,
        translatedName, versesCount, revelationPlace })), production()));
  }
  async function resources(): Promise<QuranResources> {
    return cached("resources", async () => {
      const api = getClient().content.v4;
      const [recitations, translations] = await Promise.all([api.resources.recitations.list({ language: "en" }), api.resources.translations.list({ language: "en" })]);
      const candidates = recitations.filter((r) => Number.isInteger(r.id) && r.reciterName).sort((a, b) => a.id === 7 ? -1 : b.id === 7 ? 1 : 0);
      const reciters: QuranResources["reciters"] = [];
      for (let offset = 0; offset < candidates.length; offset += 3) {
        const batch = await Promise.all(candidates.slice(offset, offset + 3).map(async (item) => {
          try {
            // The Content API embeds verse audio using `audio`, not `reciter`.
            const sample = await api.verses.byKey("1:1", { audio: item.id, fields: { textUthmani: true } });
            return publicVerse(sample).audioUrl ? { id: item.id!, name: item.reciterName!, ...(item.style ? { style: item.style } : {}) } : null;
          } catch { return null; }
        }));
        for (const item of batch) if (item) reciters.push(item);
      }
      return { reciters, translations: translations.filter((r) => Number.isInteger(r.id) && r.name && /^english$/i.test(r.languageName ?? "")
        && (/^saheeh international$/i.test(r.name) || /clear quran/i.test(r.name)))
        .sort((a, b) => a.id === translationId ? -1 : b.id === translationId ? 1 : 0)
        .map((r) => ({ id: r.id!, name: r.name!, language: r.languageName!, author: r.authorName ?? r.name! })) };
    });
  }
  async function options(reciter: number, translation: number) {
    const catalog = await resources();
    if (!catalog.reciters.some((r) => r.id === reciter) || !catalog.translations.some((t) => t.id === translation)) throw new Error("QF_RESOURCE_UNAVAILABLE");
    return { language: "en", translations: [translation], audio: reciter, fields: { textUthmani: true }, translationFields: { resourceName: true } };
  }
  async function chapter(id: number, page: number, reciter = 7, translation = translationId) {
    if (!Number.isInteger(id) || id < 1 || id > 114 || !Number.isInteger(page) || page < 1 || page > 6) throw new Error("QF_INVALID_REFERENCE");
    if (!production() && id > 2) throw new Error("QF_PRELIVE_LIMIT");
    const details = (await chapters()).find((c) => c.id === id);
    if (!details || (page - 1) * quranPageSize >= details.versesCount) throw new Error("QF_INVALID_REFERENCE");
    return cached(`chapter:${id}:${page}:${reciter}:${translation}`, async () => {
      const verses = await getClient().content.v4.verses.byChapter(String(id) as never, { ...await options(reciter, translation),
        page, perPage: quranPageSize, words: false });
      return validatePage({ chapter: details, verses: verses.map(publicVerse), page,
        hasMore: page * quranPageSize < details.versesCount }, id, page);
    });
  }
  async function verse(key: string, reciter = 7, translation = translationId) {
    const ref = parseAyahReference(key);
    if (!ref || ref.key !== key) throw new Error("QF_INVALID_REFERENCE");
    const details = (await chapters()).find((c) => c.id === ref.chapter);
    if (!details || ref.ayah > details.versesCount || (!production() && ref.chapter > 2)) throw new Error("QF_INVALID_REFERENCE");
    return cached(`verse:${key}:${reciter}:${translation}`, async () => publicVerse(await getClient().content.v4.verses.byKey(key as never, await options(reciter, translation))));
  }
  async function search(query: string, reciter = 7, translation = translationId) {
    const ref = parseAyahReference(query);
    if (ref) return { verses: [await verse(ref.key, reciter, translation)], navigation: [] };
    const result = await getClient().search.v1.query({ query, mode: SearchMode.Quick, getText: "1", size: 12, translationIds: [translation] });
    // Quick search returns ayah hits in navigation, not only result.verses.
    // Resolve each reference through Content API for the selected verified
    // translation/reciter; never render snippets or highlighted HTML as Quran.
    const keys = Array.from(new Set([...(result.result?.verses ?? []), ...(result.result?.navigation ?? []).filter((entry) => entry.resultType === "ayah")].map((entry) => String(entry.key))
      .filter((key) => parseAyahReference(key) && (production() || parseAyahReference(key)!.chapter <= 2)))).slice(0, 12);
    const verses = [];
    for (let i = 0; i < keys.length; i += 3) verses.push(...await Promise.all(keys.slice(i, i + 3).map((key) => verse(key, reciter, translation))));
    return { verses, navigation: result.result?.navigation ?? [] };
  }
  async function mushafReference(key: string) {
    const ref = parseAyahReference(key), catalog = await chapters();
    if (!ref || ref.key !== key || ref.ayah > (catalog.find((c) => c.id === ref.chapter)?.versesCount ?? 0)
      || (!production() && ref.chapter > 2)) throw new Error("QF_INVALID_REFERENCE");
    return cached(`mushaf-reference:${key}`, async () => {
      const value = await getClient().content.v4.verses.byKey(key as never, { mushaf: 1, words: true, wordFields: { v2Page: true } });
      const page = value.words?.[0]?.pageNumber;
      if (!page || !validMushafPageNumber(page)) throw new Error("QF_LAYOUT_UNAVAILABLE");
      return page;
    });
  }
  async function mushaf(page: number) {
    if (!validMushafPageNumber(page)) throw new Error("QF_INVALID_REFERENCE");
    return cached(`mushaf-v2:${page}`, async () => {
      const catalog = await chapters();
      const verses = await getClient().content.v4.verses.byPage(page as never,
        { mushaf: 1, words: true, wordFields: { codeV2: true, textUthmani: true, v2Page: true }, perPage: 50 });
      if (!production() && verses.some((v) => Number(v.verseKey.split(":")[0]) > 2)) throw new Error("QF_PRELIVE_LIMIT");
      const lines: MushafLine[] = Array.from({ length: 15 }, (_, i) => ({ number: i + 1, words: [] }));
      let previousLine = 0;
      for (const v of verses) for (const w of v.words ?? []) {
        // A verse can straddle pages. Only this page's actual words belong here.
        if (w.pageNumber !== page) continue;
        const number = w.lineNumber ?? 0;
        // The API supplies this requested field; the SDK's Word type omits it.
        const v2Page = (w as typeof w & { v2Page?: number }).v2Page;
        if (v2Page !== page || !Number.isInteger(number) || number < 1 || number > 15 || number < previousLine) throw new Error("QF_LAYOUT_UNAVAILABLE");
        previousLine = number;
        lines[number - 1].words.push({ key: v.verseKey, position: w.position, glyph: plainText(w.codeV2 ?? ""), text: w.textUthmani ?? "" });
      }
      const openings = verses.filter((v) => v.verseNumber === 1 && v.words?.[0]?.pageNumber === page);
      const basmala = openings.some((v) => ![1, 9].includes(Number(v.verseKey.split(":")[0])))
        ? (await getClient().content.v4.verses.byKey("1:1", { fields: { textUthmani: true } })).textUthmani : undefined;
      for (const v of openings) {
        const id = Number(v.verseKey.split(":")[0]), first = v.words![0].lineNumber!;
        const name = catalog.find((c) => c.id === id)?.nameArabic;
        const heading = first - ([1, 9].includes(id) ? 1 : 2);
        if (name && heading >= 1 && !lines[heading - 1].words.length) lines[heading - 1].heading = name;
        if (basmala && ![1, 9].includes(id) && first >= 2 && !lines[first - 2].words.length) lines[first - 2].basmala = basmala;
      }
      const ids = Array.from(new Set(lines.flatMap((l) => l.words.map((w) => Number(w.key.split(":")[0])))));
      return validateMushafPage({ page, juz: verses[0]?.juzNumber, chapterNames: ids.map((id) => catalog.find((c) => c.id === id)?.nameSimple ?? ""), lines }, page);
    });
  }
  return { chapters, chapter, verse, resources, search, mushaf, mushafReference };
}
const provider = createQuranProvider(sdk, () => availability().production);
export const { chapters, chapter, verse, resources, search, mushaf, mushafReference } = provider;
