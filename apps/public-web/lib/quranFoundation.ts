import { SearchMode } from "@quranjs/api";
import { createServerClient } from "@quranjs/api/server";

export const translationId = 131;
let client: ReturnType<typeof createServerClient> | null = null;

export function availability() {
  const production = process.env.QF_ENV === "production";
  return {
    configured: Boolean(process.env.QF_CLIENT_ID && process.env.QF_CLIENT_SECRET),
    production,
    note: production
      ? "Content supplied by Quran Foundation / Quran.com."
      : "Preview access is limited to Al-Fatihah and Al-Baqarah until Quran Foundation grants production access."
  };
}

function sdk() {
  if (client) return client;
  if (!process.env.QF_CLIENT_ID || !process.env.QF_CLIENT_SECRET) throw new Error("QF_NOT_CONFIGURED");
  client = createServerClient({
    clientId: process.env.QF_CLIENT_ID,
    clientSecret: process.env.QF_CLIENT_SECRET,
    services: process.env.QF_ENV === "production" ? undefined : {
      gatewayUrl: "https://apis-prelive.quran.foundation",
      oauth2BaseUrl: "https://prelive-oauth2.quran.foundation"
    }
  });
  return client;
}

function plainText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ").trim();
}

function publicVerse(verse: Awaited<ReturnType<ReturnType<typeof sdk>["content"]["v4"]["verses"]["byKey"]>>) {
  return {
    id: verse.id,
    verseKey: verse.verseKey,
    verseNumber: verse.verseNumber,
    pageNumber: verse.pageNumber,
    juzNumber: verse.juzNumber,
    textUthmani: verse.textUthmani ?? "",
    translation: plainText(verse.translations?.[0]?.text ?? ""),
    translationName: verse.translations?.[0]?.resourceName ?? "Translation of the meaning",
    audioUrl: verse.audio?.url ?? null
  };
}

const verseOptions = () => ({
  language: "en", translations: [translationId], reciter: 7,
  fields: { textUthmani: true }, translationFields: { resourceName: true }
});

export async function chapters() {
  const all = await sdk().content.v4.chapters.list({ language: "en" });
  return all.map(({ id, nameSimple, nameArabic, translatedName, versesCount, revelationPlace }) => ({
    id, nameSimple, nameArabic, translatedName, versesCount, revelationPlace
  }));
}

export async function chapter(id: number, page: number) {
  const api = sdk();
  const [details, verses] = await Promise.all([
    api.content.v4.chapters.get(String(id) as never, { language: "en" }),
    api.content.v4.verses.byChapter(String(id) as never, {
      ...verseOptions(), page, perPage: 50, words: false
    })
  ]);
  return { chapter: details, verses: verses.map(publicVerse), page, hasMore: page * 50 < details.versesCount };
}

export async function juz(id: number, page: number) {
  const api = sdk();
  const [juzs, verses] = await Promise.all([
    api.content.v4.juzs.list(),
    api.content.v4.verses.byJuz(String(id) as never, { ...verseOptions(), page, perPage: 50 })
  ]);
  const details = juzs.find((item) => item.juzNumber === id);
  if (!details) throw new Error("QF_INVALID_JUZ");
  return { juz: id, verses: verses.map(publicVerse), page, hasMore: page * 50 < details.versesCount };
}

export async function mushafPage(id: number) {
  const verses = await sdk().content.v4.verses.byPage(String(id) as never, { ...verseOptions(), page: 1, perPage: 50 });
  return { mushafPage: id, verses: verses.map(publicVerse), hasMore: false };
}

export async function ayah(key: string) {
  const verse = await sdk().content.v4.verses.byKey(key as never, verseOptions());
  return { verse: publicVerse(verse) };
}

export async function search(query: string) {
  const api = sdk();
  if (/^\d{1,3}:\d{1,3}$/.test(query)) {
    const { verse } = await ayah(query);
    return { verses: [verse], navigation: [] };
  }
  const result = await api.search.v1.query({ query, mode: SearchMode.Quick, getText: "1", size: 12, translationIds: [translationId] });
  const keys = (result.result?.verses ?? []).map((entry) => String(entry.key))
    .filter((key) => /^\d{1,3}:\d{1,3}$/.test(key)).slice(0, 12);
  const verses = await Promise.all(keys.map((key) => api.content.v4.verses.byKey(key as never, {
    ...verseOptions()
  })));
  return { verses: verses.map(publicVerse), navigation: result.result?.navigation ?? [] };
}
