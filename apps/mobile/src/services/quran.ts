import AsyncStorage from "@react-native-async-storage/async-storage";

const base = (process.env.EXPO_PUBLIC_API_URL || "https://hbic.ca").replace(/\/$/, "");
const bookmarksKey = "hbic:quran:bookmarks:v1";
const lastReadKey = "hbic:quran:last-read:v1";

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
  pageNumber: number;
  juzNumber: number;
  textUthmani: string;
  translation: string;
  translationName: string;
  audioUrl: string | null;
}

async function request<T>(query: string): Promise<T> {
  const response = await fetch(`${base}/api/quran?${query}`);
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.message ?? "Quran content is unavailable.");
  return body as T;
}

export async function listChapters() {
  return (await request<{ chapters: QuranChapter[] }>("mode=chapters")).chapters;
}
export async function readChapter(id: number, page = 1) {
  return request<{ chapter: QuranChapter; verses: QuranVerse[]; page: number; hasMore: boolean; availability: { note: string } }>(`mode=chapter&chapter=${id}&page=${page}`);
}
export async function readJuz(id: number, page = 1) {
  return request<{ juz: number; verses: QuranVerse[]; page: number; hasMore: boolean }>(`mode=juz&juz=${id}&page=${page}`);
}
export async function readMushafPage(id: number) {
  return request<{ mushafPage: number; verses: QuranVerse[]; hasMore: false }>(`mode=mushaf-page&page=${id}`);
}
export async function readAyah(key: string) {
  return (await request<{ verse: QuranVerse }>(`mode=ayah&key=${encodeURIComponent(key)}`)).verse;
}
export async function searchVerses(query: string) {
  return (await request<{ verses: QuranVerse[] }>(`mode=search&q=${encodeURIComponent(query.trim())}`)).verses;
}
export async function loadBookmarks(): Promise<string[]> {
  try {
    const value = JSON.parse(await AsyncStorage.getItem(bookmarksKey) ?? "[]");
    return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string") : [];
  } catch { return []; }
}
export async function saveBookmarks(keys: string[]) { await AsyncStorage.setItem(bookmarksKey, JSON.stringify(keys)); }
export async function loadLastRead() {
  const value = Number(await AsyncStorage.getItem(lastReadKey));
  return Number.isInteger(value) && value >= 1 && value <= 114 ? value : 1;
}
export async function saveLastRead(id: number) { await AsyncStorage.setItem(lastReadKey, String(id)); }
