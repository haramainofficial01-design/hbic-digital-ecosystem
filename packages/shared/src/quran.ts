/** Quran text is never generated here. These types validate approved provider responses. */
export interface QuranChapter {
  id: number;
  nameSimple: string;
  nameArabic: string;
  translatedName: { name: string };
  versesCount: number;
  revelationPlace: string;
}
export interface QuranVerse {
  id: number;
  verseKey: string;
  verseNumber: number;
  textUthmani: string;
  translation: string;
  translationName: string;
  audioUrl: string | null;
  source?: "tanzil" | "qf";
}
export interface QuranResources {
  contentSource?: "tanzil" | "qf";
  reciters: { id: number; name: string; style?: string }[];
  translations: { id: number; name: string; language: string; author: string }[];
}
export const quranPageSize = 50;
export const quranAttribution = "Quran data provided by Quran Foundation.";

export function parseAyahReference(input: string): { chapter: number; ayah: number; key: string } | null {
  const latin = input.trim().replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0));
  const match = /^(\d{1,3})\s*[:：]\s*(\d{1,3})$/.exec(latin);
  if (!match) return null;
  const chapter = Number(match[1]), ayah = Number(match[2]);
  if (chapter < 1 || chapter > 114 || ayah < 1 || ayah > 286) return null;
  return { chapter, ayah, key: `${chapter}:${ayah}` };
}
export function versePage(ayah: number) {
  if (!Number.isInteger(ayah) || ayah < 1 || ayah > 286) throw new Error("Invalid ayah.");
  return Math.ceil(ayah / quranPageSize);
}
export function normalizeSearch(input: string) {
  // Only search terms are normalized; displayed provider Arabic is untouched.
  return input.normalize("NFKD").replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").toLocaleLowerCase().trim();
}
export function validChapter(value: unknown): value is QuranChapter {
  const c = value as QuranChapter | undefined;
  return Boolean(c && Number.isInteger(c.id) && c.id >= 1 && c.id <= 114
    && Number.isInteger(c.versesCount) && c.versesCount >= 1 && c.versesCount <= 286
    && typeof c.nameSimple === "string" && c.nameSimple.trim()
    && typeof c.nameArabic === "string" && /[\u0600-\u06ff]/.test(c.nameArabic)
    && typeof c.translatedName?.name === "string" && typeof c.revelationPlace === "string");
}
export function validateChapters(value: unknown, requireComplete = false): QuranChapter[] {
  if (!Array.isArray(value) || !value.length || !value.every(validChapter)
    || new Set(value.map((c) => c.id)).size !== value.length) throw new Error("Invalid Quran surah index.");
  const items = [...value].sort((a, b) => a.id - b.id);
  if (requireComplete && (items.length !== 114 || items.some((c, i) => c.id !== i + 1)
    || items.reduce((sum, c) => sum + c.versesCount, 0) !== 6236)) throw new Error("Incomplete Quran surah index.");
  return items;
}
export function validAudioUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      && ["verses.quran.com", "verses.quran.foundation", "audio.qurancdn.com", "audio.quran.com", "mirrors.quranicaudio.com"].includes(url.hostname);
  } catch { return false; }
}
export function validateVerse(value: unknown): QuranVerse {
  const v = value as QuranVerse;
  const reference = parseAyahReference(v?.verseKey ?? "");
  if (!reference || reference.key !== v.verseKey || reference.ayah !== v.verseNumber
    || !Number.isInteger(v.id) || v.id < 1 || typeof v.textUthmani !== "string"
    || !/[\u0600-\u06ff]/.test(v.textUthmani) || /[<>]/.test(v.textUthmani)
    || typeof v.translation !== "string" || typeof v.translationName !== "string"
    || (v.translation && !v.translationName.trim())
    || (v.audioUrl !== null && !validAudioUrl(v.audioUrl))) throw new Error("Invalid Quran ayah response.");
  return v;
}
export interface QuranPage {
  chapter: QuranChapter; verses: QuranVerse[]; page: number; hasMore: boolean;
  availability?: { production: boolean; note: string };
}
export function validatePage(value: unknown, chapterId: number, page: number): QuranPage {
  const result = value as QuranPage;
  if (!validChapter(result?.chapter) || result.chapter.id !== chapterId || result.page !== page
    || !Array.isArray(result.verses)) throw new Error("Invalid Quran page.");
  const start = (page - 1) * quranPageSize + 1;
  const expected = Math.min(quranPageSize, result.chapter.versesCount - start + 1);
  if (expected < 1 || result.verses.length !== expected) throw new Error("Incomplete Quran page.");
  result.verses.forEach((verse, index) => {
    validateVerse(verse);
    if (verse.verseKey !== `${chapterId}:${start + index}`) throw new Error("Quran page is out of order.");
  });
  if (result.hasMore !== (page * quranPageSize < result.chapter.versesCount)) throw new Error("Invalid Quran pagination.");
  return result;
}

export type MemorizationStatus = "not_started" | "practising" | "memorized" | "needs_revision";
export const memorizationLabels: Record<MemorizationStatus, string> = {
  not_started: "Not Started", practising: "Practising", memorized: "Memorized", needs_revision: "Needs Revision"
};
export interface QuranPassage { chapter: number; from: number; to: number }
export function validPassage(value: unknown): value is QuranPassage {
  const p = value as QuranPassage;
  return Boolean(p && Number.isInteger(p.chapter) && p.chapter >= 1 && p.chapter <= 114
    && Number.isInteger(p.from) && Number.isInteger(p.to) && p.from >= 1 && p.to >= p.from && p.to <= 286);
}
export function passageId(p: QuranPassage) { return `${p.chapter}:${p.from}-${p.to}`; }
export interface QuranPreferences { arabicSize: number; translationSize: number; showTranslation: boolean; reciter: number; translation: number; layout: "ayah" | "madinah" }
export interface QuranRecording extends QuranPassage { id: string; uri: string; createdAt: string; durationMillis: number }
export interface QuranState {
  version: 2; bookmarks: string[]; lastRead: { chapter: number; ayah: number } | null;
  recent: number[]; preferences: QuranPreferences;
  listening: { reciterId: number; editionId: number } | null;
  memorization: (QuranPassage & { status: MemorizationStatus; updatedAt: string })[];
  recordings: QuranRecording[];
}
export function emptyQuranState(): QuranState {
  return { version: 2, bookmarks: [], lastRead: null, recent: [],
    preferences: { arabicSize: 30, translationSize: 16, showTranslation: true, reciter: 7, translation: 20, layout: "ayah" },
    listening: null, memorization: [], recordings: [] };
}
export function normalizeQuranState(value: unknown): QuranState {
  const result = emptyQuranState(), s = value as Partial<QuranState> | null;
  if (!s || s.version !== 2) return result;
  result.bookmarks = Array.from(new Set((Array.isArray(s.bookmarks) ? s.bookmarks : [])
    .filter((key) => typeof key === "string" && parseAyahReference(key)?.key === key))).slice(0, 1000);
  if (s.lastRead && Number.isInteger(s.lastRead.chapter) && Number.isInteger(s.lastRead.ayah)
    && parseAyahReference(`${s.lastRead.chapter}:${s.lastRead.ayah}`)) result.lastRead = { chapter: s.lastRead.chapter, ayah: s.lastRead.ayah };
  result.recent = Array.from(new Set((Array.isArray(s.recent) ? s.recent : []).filter((n) => Number.isInteger(n) && n >= 1 && n <= 114))).slice(0, 12);
  if (s.listening && Number.isInteger(s.listening.reciterId) && s.listening.reciterId > 0
    && Number.isInteger(s.listening.editionId) && s.listening.editionId > 0)
    result.listening = { reciterId: s.listening.reciterId, editionId: s.listening.editionId };
  const prefs = s.preferences;
  if (prefs) {
    if (prefs.layout === "madinah") result.preferences.layout = "madinah";
    if (Number.isFinite(prefs.arabicSize)) result.preferences.arabicSize = Math.max(24, Math.min(48, prefs.arabicSize));
    if (Number.isFinite(prefs.translationSize)) result.preferences.translationSize = Math.max(14, Math.min(24, prefs.translationSize));
    if (typeof prefs.showTranslation === "boolean") result.preferences.showTranslation = prefs.showTranslation;
    for (const key of ["reciter", "translation"] as const) if (Number.isInteger(prefs[key]) && prefs[key] > 0) result.preferences[key] = prefs[key];
  }
  result.memorization = (Array.isArray(s.memorization) ? s.memorization : []).filter((p) => validPassage(p)
    && ["not_started", "practising", "memorized", "needs_revision"].includes(p.status)
    && typeof p.updatedAt === "string").slice(0, 500);
  result.recordings = (Array.isArray(s.recordings) ? s.recordings : []).filter((p) => validPassage(p)
    && /^quran-\d+-[a-z0-9]+$/.test(p.id) && /^file:\/\//.test(p.uri)
    && Number.isFinite(p.durationMillis) && p.durationMillis > 0 && typeof p.createdAt === "string").slice(0, 100);
  return result;
}
export function markRead(state: QuranState, chapter: number, ayah: number): QuranState {
  if (!parseAyahReference(`${chapter}:${ayah}`)) throw new Error("Invalid reading position.");
  return { ...state, lastRead: { chapter, ayah }, recent: [chapter, ...state.recent.filter((id) => id !== chapter)].slice(0, 12) };
}
export function repeatSequence(passage: QuranPassage, repeat = 1, mode: "passage" | "ayah" = "passage"): number[] {
  if (!validPassage(passage) || !Number.isInteger(repeat) || repeat < 1 || repeat > 10) throw new Error("Invalid practice range.");
  const ayahs = Array.from({ length: passage.to - passage.from + 1 }, (_, i) => passage.from + i);
  return mode === "passage" ? Array.from({ length: repeat }, () => ayahs).flat()
    : ayahs.flatMap((ayah) => Array.from({ length: repeat }, () => ayah));
}
export function createSelfTest(passage: QuranPassage, count = 5, random: () => number = Math.random) {
  if (!validPassage(passage)) throw new Error("Invalid self-test range.");
  const pool = repeatSequence(passage);
  // Fisher-Yates prevents repeated questions within a session.
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.max(0, Math.min(.999999, random())) * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, Math.max(1, Math.min(10, count)));
}
