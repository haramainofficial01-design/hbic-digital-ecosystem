import { normalizeSearch, parseAyahReference, type QuranChapter } from "@hbic/shared";
const small: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
function number(value: string) {
  const latin = value.trim().replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0));
  if (/^\d+$/.test(latin)) return Number(latin);
  let n = 0;
  for (const word of latin.toLowerCase().replace(/-/g, " ").split(/\s+/)) {
    if (word === "and") continue;
    if (word === "hundred" && n > 0 && n < 10) n *= 100;
    else if (word in small) n += small[word]; else return null;
  }
  return n || null;
}
const key = (text: string) => normalizeSearch(text).replace(/[^\p{L}\p{N}]/gu, "");
const familiar: Record<number, string[]> = {
  1: ["Fatiha", "Fatihah", "Al Fatiha", "Al Fatihah"], 2: ["Baqarah", "Al Baqarah"],
  3: ["Al Imran", "Aali Imran"], 18: ["Kahf", "Al Kahf"], 36: ["Yasin", "Yaseen", "Ya Sin"],
  55: ["Rahman", "Ar Rahman"], 67: ["Mulk", "Al Mulk"], 112: ["Ikhlas", "Al Ikhlas"],
  113: ["Falaq", "Al Falaq"], 114: ["Nas", "An Nas"]
};
/** Voice is a navigation query, never a Quran-text source or assessment. */
export function resolveVoiceNavigation(text: string, chapters: QuranChapter[]) {
  const direct = parseAyahReference(text);
  if (direct && chapters.find((c) => c.id === direct.chapter)?.versesCount! >= direct.ayah) return direct;
  const normalized = normalizeSearch(text).replace(/^(?:please\s+)?(?:open|read|go to|play)\s+/, "")
    .replace(/^(?:surah|sura|chapter|سوره|سورة)\s+/, "").trim();
  const split = normalized.split(/\s+(?:ayah|aya|verse|ايه|اية|آية)\s+/);
  if (split.length > 2) return null;
  const title = split[0], ayah = split[1] ? number(split[1]) : 1;
  const chapter = chapters.find((c) => c.id === number(title) || [c.nameSimple, c.nameArabic, c.translatedName.name, ...(familiar[c.id] ?? [])].some((name) => key(name) === key(title)));
  return chapter && ayah && ayah <= chapter.versesCount ? { chapter: chapter.id, ayah, key: `${chapter.id}:${ayah}` } : null;
}
