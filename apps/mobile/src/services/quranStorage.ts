import { emptyQuranState, normalizeQuranState, parseAyahReference, type QuranState } from "@hbic/shared";
export interface QuranStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
export const quranStateKey = "hbic:quran:state:v2";
export function createQuranStore(storage: QuranStorage) {
  let current: QuranState | null = null;
  let loading: Promise<QuranState> | null = null;
  let writes: Promise<unknown> = Promise.resolve();
  async function read(): Promise<QuranState> {
    if (current) return current;
    if (loading) return loading;
    loading = (async () => {
      const raw = await storage.getItem(quranStateKey);
      if (raw) {
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { throw new Error("Saved Quran data could not be read. Your original data has been preserved."); }
        if ((parsed as { version?: number })?.version !== 2) throw new Error("This Quran data needs a newer app. Your saved data has been preserved.");
        return current = normalizeQuranState(parsed);
      }
      const result = emptyQuranState();
      const [bookmarks, last] = await Promise.all([storage.getItem("hbic:quran:bookmarks:v1"), storage.getItem("hbic:quran:last-read:v1")]);
      try {
        const keys = JSON.parse(bookmarks ?? "[]");
        if (Array.isArray(keys)) result.bookmarks = keys.filter((k): k is string => typeof k === "string" && parseAyahReference(k)?.key === k);
      } catch { /* Preserve the legacy raw value; never delete it. */ }
      const chapter = Number(last);
      if (Number.isInteger(chapter) && chapter >= 1 && chapter <= 114) result.lastRead = { chapter, ayah: 1 };
      const migrated = normalizeQuranState(result);
      await storage.setItem(quranStateKey, JSON.stringify(migrated));
      return current = migrated;
    })().finally(() => { loading = null; });
    return loading;
  }
  async function update(change: (state: QuranState) => QuranState): Promise<QuranState> {
    const job = writes.catch(() => undefined).then(async () => {
      const next = normalizeQuranState(change(await read()));
      await storage.setItem(quranStateKey, JSON.stringify(next));
      current = next;
      return next;
    });
    writes = job;
    return job;
  }
  return { read, update };
}
