import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { versePage, type QuranChapter, type QuranPage, type QuranResources, type QuranVerse } from "@hbic/shared";
import { quranClient } from "../services/quran";
export function useQuranReader(chapterId: number, reciter: number, translation: number) {
  const [chapters, setChapters] = useState<QuranChapter[]>([]), [resources, setResources] = useState<QuranResources | null>(null);
  const [pages, setPages] = useState<QuranPage[]>([]), [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null), [attempt, setAttempt] = useState(0);
  const generation = useRef(0), controller = useRef(new AbortController());
  const loaded = useRef(new Map<number, QuranPage>()), pending = useRef(new Map<number, Promise<QuranPage>>());
  useEffect(() => {
    const boot = new AbortController(); setLoading(true); setError(null);
    void Promise.all([quranClient.listChapters(boot.signal), quranClient.resources(boot.signal)])
      .then(([items, catalog]) => { if (!boot.signal.aborted) { setChapters(items); setResources(catalog); } })
      .catch((reason) => { if (!boot.signal.aborted) setError(reason instanceof Error ? reason.message : "Quran provider is unavailable."); })
      .finally(() => { if (!boot.signal.aborted) setLoading(false); });
    return () => boot.abort();
  }, [attempt]);
  useEffect(() => {
    ++generation.current; controller.current.abort();
    const request = new AbortController(); controller.current = request;
    loaded.current.clear(); pending.current.clear(); setPages([]);
    // This counter deliberately invalidates asynchronous loads on cleanup.
    return () => { request.abort(); ++generation.current; }; // eslint-disable-line react-hooks/exhaustive-deps
  }, [chapterId, reciter, translation]);
  const loadPage = useCallback(async (page: number): Promise<QuranPage> => {
    if (loaded.current.has(page)) return loaded.current.get(page)!;
    if (pending.current.has(page)) return pending.current.get(page)!;
    const epoch = generation.current; const signal = controller.current.signal;
    const promise = quranClient.readChapter(chapterId, page, { reciter, translation }, signal).then((result) => {
      if (epoch !== generation.current || signal.aborted) throw new Error("Quran request cancelled.");
      loaded.current.set(page, result); setPages([...loaded.current.values()].sort((a, b) => a.page - b.page));
      return result;
    }).finally(() => { if (epoch === generation.current) pending.current.delete(page); });
    pending.current.set(page, promise); return promise;
  }, [chapterId, reciter, translation]);
  const getVerse = useCallback(async (ayah: number): Promise<QuranVerse> => {
    const result = await loadPage(versePage(ayah));
    const found = result.verses.find((v) => v.verseNumber === ayah);
    if (!found) throw new Error("The provider did not return that ayah.");
    return found;
  }, [loadPage]);
  const verses = useMemo(() => pages.flatMap((p) => p.verses), [pages]);
  return { chapters, resources, pages, verses, loading, error, getVerse, loadPage,
    chapter: chapters.find((c) => c.id === chapterId) ?? null,
    retry() { quranClient.clearContentCache(); setAttempt((n) => n + 1); } };
}
