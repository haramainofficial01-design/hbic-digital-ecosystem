import AsyncStorage from "@react-native-async-storage/async-storage";
import { createQuranClient } from "./quranClient";
import { createQuranStore } from "./quranStorage";
import { createTanzilClient } from "./quranTanzil";
export type { QuranChapter, QuranVerse, QuranPage, QuranResources, QuranState } from "@hbic/shared";
export const quranContentSource = process.env.EXPO_PUBLIC_QURAN_CONTENT_SOURCE === "tanzil" ? "tanzil" : "qf";
export const quranClient = quranContentSource === "tanzil"
  ? createTanzilClient(() => require("../../assets/quran/tanzil-uthmani.json"))
  : createQuranClient(process.env.EXPO_PUBLIC_API_URL || "https://hbic.ca");
export const quranStore = createQuranStore(AsyncStorage);
export const { listChapters, readChapter, searchVerses } = quranClient;
// Compatibility helpers retain the existing web/mobile bookmark conventions.
export async function loadBookmarks() { return (await quranStore.read()).bookmarks; }
export async function saveBookmarks(bookmarks: string[]) { await quranStore.update((s) => ({ ...s, bookmarks })); }
export async function loadLastRead() { return (await quranStore.read()).lastRead?.chapter ?? 1; }
export async function saveLastRead(chapter: number) { await quranStore.update((s) => ({ ...s, lastRead: { chapter, ayah: 1 } })); }
