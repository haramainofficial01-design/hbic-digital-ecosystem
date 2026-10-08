import { parseAyahReference, validateChapters, validatePage, validateVerse, validMushafPageNumber, validateMushafPage, type MushafPage, type QuranPage, type QuranResources, type QuranVerse } from "@hbic/shared";

export interface QuranSelection { reciter?: number; translation?: number }
export function createQuranClient(base: string, fetcher: typeof fetch = fetch) {
  const pages = new Map<string, { until: number; data: QuranPage }>();
  const mushafPages = new Map<number, { until: number; data: MushafPage }>();
  const selectionParams = (selection: QuranSelection): Record<string, number> => ({ reciter: selection.reciter ?? 7, translation: selection.translation ?? 20 });
  async function request<T>(params: Record<string, string | number>, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 20_000);
    try {
      const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
      const response = await fetcher(`${base.replace(/\/$/, "")}/api/quran?${query}`, { signal: controller.signal });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.message ?? "Quran content is unavailable. Check your connection and retry.");
      return body as T;
    } finally { clearTimeout(timeout); signal?.removeEventListener("abort", abort); }
  }
  return {
    async mushafReference(key: string, signal?: AbortSignal) {
      if (parseAyahReference(key)?.key !== key) throw new Error("Invalid ayah.");
      const body = await request<{ page: number }>({ mode: "mushaf-reference", key }, signal);
      if (!validMushafPageNumber(body.page)) throw new Error("Verified Mushaf layout is unavailable.");
      return body.page;
    },
    async readMushaf(page: number, signal?: AbortSignal) {
      if (!validMushafPageNumber(page)) throw new Error("Invalid Mushaf page.");
      if (signal?.aborted) throw new Error("Mushaf request cancelled.");
      const cached = mushafPages.get(page);
      if (cached && cached.until > Date.now()) return cached.data;
      const body = await request<{ mushaf: unknown }>({ mode: "mushaf", page }, signal);
      const data = validateMushafPage(body.mushaf, page);
      if (mushafPages.size >= 8) mushafPages.delete(mushafPages.keys().next().value!);
      mushafPages.set(page, { until: Date.now() + 300_000, data });
      return data;
    },
    async listChapters(signal?: AbortSignal) {
      const body = await request<{ chapters: unknown; availability?: { production: boolean } }>({ mode: "chapters" }, signal);
      return validateChapters(body.chapters, body.availability?.production);
    },
    async resources(signal?: AbortSignal): Promise<QuranResources> {
      const body = await request<{ resources: QuranResources }>({ mode: "resources" }, signal);
      if (!Array.isArray(body.resources?.reciters) || !Array.isArray(body.resources?.translations)
        || body.resources.reciters.some((r) => !Number.isInteger(r.id) || r.id < 1 || !r.name)
        || body.resources.translations.some((t) => !Number.isInteger(t.id) || t.id < 1 || !t.name || !t.author || !t.language)) throw new Error("Quran resource catalog is unavailable.");
      return body.resources;
    },
    async readChapter(id: number, page = 1, selection: QuranSelection = {}, signal?: AbortSignal) {
      if (!Number.isInteger(id) || id < 1 || id > 114 || !Number.isInteger(page) || page < 1 || page > 6) throw new Error("Invalid surah or page.");
      const key = `${id}:${page}:${selection.reciter ?? 7}:${selection.translation ?? 20}`;
      const cached = pages.get(key);
      if (cached && cached.until > Date.now()) return cached.data;
      const result = validatePage(await request({ mode: "chapter", chapter: id, page, ...selectionParams(selection) }, signal), id, page);
      if (pages.size >= 15) pages.delete(pages.keys().next().value!);
      pages.set(key, { data: result, until: Date.now() + 300_000 });
      return result;
    },
    async verse(key: string, selection: QuranSelection = {}, signal?: AbortSignal) {
      if (!parseAyahReference(key)) throw new Error("Enter a valid surah:ayah reference.");
      const body = await request<{ verse: QuranVerse }>({ mode: "verse", key: parseAyahReference(key)!.key, ...selectionParams(selection) }, signal);
      const verse = validateVerse(body.verse);
      if (verse.verseKey !== parseAyahReference(key)!.key) throw new Error("The provider returned a different ayah.");
      return verse;
    },
    async searchVerses(query: string, selection: QuranSelection = {}, signal?: AbortSignal) {
      if (query.trim().length < 2 || query.trim().length > 120) throw new Error("Enter 2–120 characters.");
      const body = await request<{ verses: unknown }>({ mode: "search", q: query.trim(), ...selectionParams(selection) }, signal);
      if (!Array.isArray(body.verses) || body.verses.length > 12) throw new Error("Invalid Quran search results.");
      return body.verses.map(validateVerse);
    },
    clearContentCache() { pages.clear(); mushafPages.clear(); }
  };
}
