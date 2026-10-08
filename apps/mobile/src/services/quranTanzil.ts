import { normalizeSearch, parseAyahReference, quranPageSize, validateChapters, validatePage, validateVerse, type QuranPage, type QuranResources, type QuranVerse } from "@hbic/shared";
import type { createQuranClient } from "./quranClient";
type Dataset = { chapters: { chapter: import("@hbic/shared").QuranChapter; opening: string | null; verses: QuranVerse[] }[] };
export function createTanzilClient(loadData: () => Dataset): Omit<ReturnType<typeof createQuranClient>, "readMushaf" | "mushafReference"> {
  let dataset: Dataset | null = null;
  function data() {
    if (!dataset) { const next = loadData(); validateChapters(next.chapters.map((s) => s.chapter), true); dataset = next; }
    return dataset;
  }
  function section(id: number) { const result = data().chapters.find((s) => s.chapter.id === id); if (!result) throw new Error("Unknown surah."); return result; }
  function abort(signal?: AbortSignal) { if (signal?.aborted) throw new Error("Quran request cancelled."); }
  return {
    async listChapters(signal) { abort(signal); return data().chapters.map((s) => s.chapter); },
    async resources(signal): Promise<QuranResources> { abort(signal); return { contentSource: "tanzil", reciters: [], translations: [] }; },
    async readChapter(id, page = 1, selection, signal): Promise<QuranPage> {
      abort(signal); const s = section(id);
      return validatePage({ chapter: s.chapter, verses: s.verses.slice((page - 1) * quranPageSize, page * quranPageSize),
        page, hasMore: page * quranPageSize < s.chapter.versesCount }, id, page);
    },
    async verse(key, selection, signal) {
      abort(signal); const ref = parseAyahReference(key);
      if (!ref) throw new Error("Enter a valid surah:ayah reference.");
      const verse = section(ref.chapter).verses.find((v) => v.verseNumber === ref.ayah);
      if (!verse) throw new Error("That ayah is outside this surah.");
      return validateVerse(verse);
    },
    async searchVerses(query, selection, signal) {
      abort(signal); const ref = parseAyahReference(query);
      if (ref) { const v = section(ref.chapter).verses.find((v) => v.verseNumber === ref.ayah); return v ? [validateVerse(v)] : []; }
      const needle = normalizeSearch(query); if (needle.length < 2) return [];
      return data().chapters.flatMap((s) => {
        const nameMatches = normalizeSearch(`${s.chapter.id} ${s.chapter.nameSimple} ${s.chapter.nameArabic} ${s.chapter.translatedName.name}`).includes(needle);
        return nameMatches ? [s.verses[0]] : s.verses.filter((v) => normalizeSearch(v.textUthmani).includes(needle));
      }).slice(0, 12);
    },
    clearContentCache() { /* Bundled verbatim text has no network cache. */ }
  };
}
