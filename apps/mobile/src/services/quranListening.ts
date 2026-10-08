import { normalizeSearch, type QuranChapter } from "@hbic/shared";
import curation from "../../assets/quran/reciter-curation.json";

export interface ListeningReciter {
  id: number; name: string; group: "Makkah" | "Madinah" | "Well-known reciters" | "More reciters";
  editions: { id: number; name: string; server: string; chapters: number[] }[];
}
// Official PRH imam directory cross-checked with the live MP3Quran catalog,
// 8 October 2026. Curation is not a claim of exhaustive recording coverage.
const makkah = new Set(curation.makkah);
const madinah = new Set(curation.madinah);
const popular = new Set(curation.popular);
const groups = ["Makkah", "Madinah", "Well-known reciters", "More reciters"];
// Search accepts familiar transliterations without changing the provider's
// credited names, IDs, or recording editions.
const aliases: Record<number, string> = {
  112: "Minshawi Menshawi Muhammad Siddiq", 51: "Abdul Basit Abd al Basit Abdulbaset",
  123: "Mishary Rashid Al Afasy Alafasy", 259: "Ahmed Ahmad an Nufais Nufays",
  118: "Husary Hussary Hussari Husari Hossary", 31: "Shuraim Shuraym",
  54: "Sudais Sudays", 62: "Juhany Juhani", 102: "Muaiqly Mueaqly Muaikly",
  217: "Baleela Balila", 254: "Badr Turki", 92: "Dossari Dosari Dawsari",
  74: "Hudhaify Hudhaifi Hudhayfi", 205: "Ahmad Hudhaify Hudhaifi Hudhayfi",
  137: "Ahmad Ahmed Talib Humaid Humayd", 58: "Buayjan Buaijan",
  49: "Thubayti Thubaiti", 43: "Budair Budayr", 67: "Qasim Qasem",
};
function trustedServer(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash
      && (url.hostname === "mp3quran.net" || url.hostname.endsWith(".mp3quran.net")) && url.pathname.endsWith("/");
  } catch { return false; }
}
export function validListeningUrl(value: string) {
  try { const url = new URL(value); return trustedServer(new URL("./", url).href)
    && /\/\d{3}\.mp3$/.test(url.pathname) && !url.search && !url.hash; } catch { return false; }
}
export function listeningUrl(reciter: ListeningReciter, editionId: number, chapter: number) {
  const edition = reciter.editions.find((e) => e.id === editionId);
  if (!edition || !edition.chapters.includes(chapter)) throw new Error("This surah is not available in this recording edition.");
  const url = new URL(`${String(chapter).padStart(3, "0")}.mp3`, edition.server).href;
  if (!validListeningUrl(url)) throw new Error("The recording source could not be verified.");
  return url;
}
export function validateListeningCatalog(value: unknown): ListeningReciter[] {
  const raw = (value as { reciters?: unknown })?.reciters;
  if (!Array.isArray(raw) || !raw.length || raw.length > 2000) throw new Error("The reciter catalog is unavailable.");
  const result: ListeningReciter[] = [];
  for (const item of raw) {
    if (!Number.isInteger(item?.id) || item.id < 1 || typeof item.name !== "string" || !item.name.trim() || !Array.isArray(item.moshaf)) continue;
    const editions: ListeningReciter["editions"] = [];
    for (const edition of item.moshaf) {
      // Only Hafs matches this reader. Partial collections stay partial.
      if (edition?.rewaya_id !== 1 || !Number.isInteger(edition.id) || typeof edition.name !== "string" || !trustedServer(edition.server)
        || typeof edition.surah_list !== "string") continue;
      const chapters = edition.surah_list.split(",").map(Number);
      if (!chapters.length || chapters.some((n: number) => !Number.isInteger(n) || n < 1 || n > 114) || new Set(chapters).size !== chapters.length) continue;
      editions.push({ id: edition.id, name: edition.name, server: edition.server, chapters });
    }
    editions.sort((a, b) => b.chapters.length - a.chapters.length);
    if (editions.length) result.push({ id: item.id, name: item.name.trim(), editions,
      group: makkah.has(item.id) ? "Makkah" : madinah.has(item.id) ? "Madinah" : popular.has(item.id) ? "Well-known reciters" : "More reciters" });
  }
  if (!result.length || new Set(result.map((r) => r.id)).size !== result.length) throw new Error("The reciter catalog could not be verified.");
  return result.sort((a, b) => groups.indexOf(a.group) - groups.indexOf(b.group) || a.name.localeCompare(b.name));
}
export function filterListeningCatalog(reciters: ListeningReciter[], query: string) {
  const term = normalizeSearch(query);
  return reciters.filter((r) => normalizeSearch(`${r.name} ${r.group} ${aliases[r.id] ?? ""}`).includes(term));
}
export function availableListeningChapters(reciter: ListeningReciter, editionId: number, chapters: QuranChapter[]) {
  const edition = reciter.editions.find((e) => e.id === editionId);
  return chapters.filter((chapter) => edition?.chapters.includes(chapter.id));
}
export function createListeningClient(fetcher: typeof fetch = fetch, clock = Date.now) {
  let cache: { until: number; promise: Promise<ListeningReciter[]> } | null = null;
  return { async catalog(signal?: AbortSignal) {
    if (signal?.aborted) throw new Error("Request cancelled.");
    if (!cache || cache.until <= clock()) {
      const promise = (async () => {
        // Hermes does not implement the browser-only AbortSignal.timeout API.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20_000);
        try {
          const response = await fetcher("https://www.mp3quran.net/api/v3/reciters?language=eng", { signal: controller.signal });
          if (!response.ok) throw new Error("The reciter library could not load. Please retry.");
          return validateListeningCatalog(await response.json());
        } finally { clearTimeout(timeout); }
      })().catch((error) => { cache = null; throw error; });
      cache = { until: clock() + 3_600_000, promise };
    }
    const result = await cache.promise;
    if (signal?.aborted) throw new Error("Request cancelled.");
    return result;
  } };
}
export const listeningClient = createListeningClient();
