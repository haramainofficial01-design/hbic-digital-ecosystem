import { normalizeQuranState, parseAyahReference, type QuranResources, type QuranState } from "@hbic/shared";
import { createQuranClient } from "../../mobile/src/services/quranClient";

// This client contains only provider validation and fetch logic, not native code.
export const webQuranClient = createQuranClient("");
export const webQuranStorageKey = "hbic:quran:web:v2";

export function approvedWebQuranResources(resources: QuranResources): QuranResources {
  return { ...resources, translations: resources.translations.filter((item) => /^english$/i.test(item.language)
    && (/^saheeh international$/i.test(item.name) || /clear quran/i.test(item.name))) };
}

export function restoreWebQuranState(value: unknown, legacyBookmarks?: unknown, legacyChapter?: unknown): QuranState {
  const state = normalizeQuranState(value);
  // Mobile recording paths must never become playable URLs in the browser.
  state.recordings = [];
  if (!value && Array.isArray(legacyBookmarks)) state.bookmarks = [...new Set(legacyBookmarks
    .filter((key): key is string => typeof key === "string" && parseAyahReference(key)?.key === key))].slice(0, 1000);
  if (!value && Number.isInteger(legacyChapter) && Number(legacyChapter) >= 1 && Number(legacyChapter) <= 114)
    state.lastRead = { chapter: Number(legacyChapter), ayah: 1 };
  return state;
}
