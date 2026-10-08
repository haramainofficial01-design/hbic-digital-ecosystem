import { parseAyahReference } from "./quran";

/** QCF V2 Madinah/Hafs layout from Quran Foundation, never inferred by wrapping. */
export interface MushafWord { key: string; position: number; glyph: string; text: string }
export interface MushafLine {
  number: number;
  words: MushafWord[];
  heading?: string;
  basmala?: string;
}
export interface MushafPage { page: number; juz: number; chapterNames: string[]; lines: MushafLine[] }
export function validMushafPageNumber(page: number) { return Number.isInteger(page) && page >= 1 && page <= 604; }
export function mushafFontUrl(page: number) {
  if (!validMushafPageNumber(page)) throw new Error("Invalid Mushaf page.");
  return `https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p${page}.woff2`;
}
export function validateMushafPage(value: unknown, page: number): MushafPage {
  const p = value as MushafPage;
  if (!validMushafPageNumber(page) || !p || p.page !== page || !Number.isInteger(p.juz) || p.juz < 1 || p.juz > 30
    || !Array.isArray(p.chapterNames) || !p.chapterNames.length || p.chapterNames.some((s) => typeof s !== "string" || !s || s.length > 100 || /[<>]/.test(s))
    || !Array.isArray(p.lines) || p.lines.length !== 15) throw new Error("Verified Mushaf layout is unavailable.");
  let count = 0;
  const seen = new Set<string>();
  for (const [i, line] of p.lines.entries()) {
    if (line.number !== i + 1 || !Array.isArray(line.words) || line.words.length > 35
      || (line.words.length && (line.heading || line.basmala)) || (line.heading && line.basmala)) throw new Error("Invalid Mushaf line.");
    for (const header of [line.heading, line.basmala]) if (header !== undefined && (typeof header !== "string" || !header || header.length > 180 || /[<>]/.test(header))) throw new Error("Invalid Mushaf heading.");
    for (const word of line.words) {
      const id = `${word.key}:${word.position}`;
      if (parseAyahReference(word.key)?.key !== word.key || !Number.isInteger(word.position) || word.position < 1 || word.position > 200
        || typeof word.glyph !== "string" || !/^[\uE000-\uF8FF\uFB50-\uFDFF]{1,8}$/.test(word.glyph)
        || typeof word.text !== "string" || !word.text || word.text.length > 120 || /[<>]/.test(word.text) || seen.has(id)) throw new Error("Invalid Mushaf word.");
      seen.add(id); count++;
    }
  }
  if (!count || count > 500) throw new Error("Empty Mushaf page.");
  return p;
}
