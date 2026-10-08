import { useCallback, useEffect, useState } from "react";
import { emptyQuranState, markRead, passageId, type QuranPassage, type MemorizationStatus, type QuranState } from "@hbic/shared";
import { quranStore } from "../services/quran";
export function useQuranLibrary() {
  const [library, setLibrary] = useState(emptyQuranState);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void quranStore.read().then((state) => { if (active) { setLibrary(state); setReady(true); } })
      .catch((error) => { if (active) setStorageError(error instanceof Error ? error.message : "Saved Quran settings are unavailable."); });
    return () => { active = false; };
  }, []);
  const update = useCallback(async (change: (state: QuranState) => QuranState) => {
    try { const next = await quranStore.update(change); setLibrary(next); setStorageError(null); return next; }
    catch (error) { setStorageError(error instanceof Error ? error.message : "Changes could not be saved."); throw error; }
  }, []);
  const bookmark = useCallback((key: string) => update((s) => ({ ...s, bookmarks: s.bookmarks.includes(key) ? s.bookmarks.filter((k) => k !== key) : [...s.bookmarks, key] })), [update]);
  const read = useCallback((chapter: number, ayah: number) => update((s) => markRead(s, chapter, ayah)), [update]);
  const memorize = useCallback((passage: QuranPassage, status: MemorizationStatus) => update((s) => ({ ...s,
    memorization: [...s.memorization.filter((p) => passageId(p) !== passageId(passage)), { ...passage, status, updatedAt: new Date().toISOString() }] })), [update]);
  return { library, ready, storageError, update, bookmark, read, memorize };
}
