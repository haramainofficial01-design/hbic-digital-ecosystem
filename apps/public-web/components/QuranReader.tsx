"use client";

import { calculateQiblaBearing, emptyQuranState, isAlignedWithQibla, markRead, normalizeSearch, parseAyahReference, qiblaRotation, versePage,
  type QuranChapter, type QuranPage, type QuranResources, type QuranState, type QuranVerse } from "@hbic/shared";
import { Bookmark, BookOpen, ChevronLeft, ChevronRight, Compass, ExternalLink, LocateFixed, Pause, Play, Search, Square, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { approvedWebQuranResources, restoreWebQuranState, webQuranClient, webQuranStorageKey } from "../lib/quranBrowser";
import { QuranListeningLibrary, QuranMadinahReader, QuranWebPractice, useWebQuranAudio } from "./QuranReaderTools";
import styles from "./QuranReader.module.css";

type QuranMode = "read" | "listen" | "practice" | "memorize" | "test" | "bookmarks";
const modes: { id: QuranMode; label: string }[] = [{ id: "read", label: "Read" }, { id: "listen", label: "Listen" }, { id: "practice", label: "Practise" }, { id: "memorize", label: "Memorization" }, { id: "test", label: "Test yourself" }, { id: "bookmarks", label: "Bookmarks" }];

export function QuranReader() {
  const [chapters, setChapters] = useState<QuranChapter[]>([]), [resources, setResources] = useState<QuranResources | null>(null);
  const [chapterId, setChapterId] = useState(1), [target, setTarget] = useState(1), [jump, setJump] = useState("");
  const [data, setData] = useState<QuranPage | null>(null), [verses, setVerses] = useState<QuranVerse[]>([]);
  const [library, setLibrary] = useState<QuranState>(emptyQuranState), [ready, setReady] = useState(false);
  const [mode, setMode] = useState<QuranMode>("read");
  const [query, setQuery] = useState("");
  const [chapterQuery, setChapterQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false), [searchTitle, setSearchTitle] = useState("");
  const [loading, setLoading] = useState(false), [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null), [storageError, setStorageError] = useState<string | null>(null), [retry, setRetry] = useState(0), [navigationRevision, setNavigationRevision] = useState(0);
  const requestEpoch = useRef(0), searchRequest = useRef<AbortController | null>(null), loadRequest = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null), audio = useWebQuranAudio();
  const { preferences, bookmarks } = library;
  const currentChapter = chapters.find((item) => item.id === chapterId) ?? data?.chapter;
  const matchingChapters = useMemo(() => {
    const term = normalizeSearch(chapterQuery);
    return chapters.filter((item) => normalizeSearch(`${item.id} ${item.nameSimple} ${item.nameArabic} ${item.translatedName.name}`).includes(term));
  }, [chapters, chapterQuery]);
  const update = useCallback((transform: (state: QuranState) => QuranState) => setLibrary((state) => transform(state)), []);
  const onRead = useCallback((key: string) => { const ref = parseAyahReference(key); if (ref) update((state) => markRead(state, ref.chapter, ref.ayah)); }, [update]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(webQuranStorageKey);
      const state = restoreWebQuranState(saved ? JSON.parse(saved) : null, saved ? undefined : JSON.parse(localStorage.getItem("hbic:quran:bookmarks:v1") ?? "[]"), saved ? undefined : Number(localStorage.getItem("hbic:quran:last-read:v1")));
      setLibrary(state);
      if (state.lastRead) { setChapterId(state.lastRead.chapter); setTarget(state.lastRead.ayah); }
    } catch { setStorageError("Browser storage is unavailable. You can read, but changes may not be saved."); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(webQuranStorageKey, JSON.stringify({ ...library, recordings: [] })); }
    catch { setStorageError("Your browser could not save this change. Reading and listening still work."); }
  }, [ready, library]);
  useEffect(() => {
    const controller = new AbortController(); setCatalogError(null);
    void Promise.allSettled([webQuranClient.listChapters(controller.signal), webQuranClient.resources(controller.signal)]).then((results) => {
      if (controller.signal.aborted) return;
      const [chapterResult, resourceResult] = results;
      if (chapterResult.status === "fulfilled") setChapters(chapterResult.value);
      else setCatalogError(chapterResult.reason instanceof Error ? chapterResult.reason.message : "The surah index is unavailable.");
      if (resourceResult.status === "fulfilled") setResources(approvedWebQuranResources(resourceResult.value));
      else setCatalogError(resourceResult.reason instanceof Error ? resourceResult.reason.message : "The Quran resource catalog is unavailable.");
    });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (!resources || !ready) return;
    const reciter = resources.reciters.find((item) => item.id === preferences.reciter)?.id ?? resources.reciters[0]?.id;
    const translation = resources.translations.find((item) => item.id === preferences.translation)?.id ?? resources.translations[0]?.id;
    if (reciter && translation && (reciter !== preferences.reciter || translation !== preferences.translation))
      update((state) => ({ ...state, preferences: { ...state.preferences, reciter, translation } }));
  }, [resources, ready, preferences.reciter, preferences.translation, update]);
  useEffect(() => {
    if (!ready || !resources?.reciters.some((item) => item.id === preferences.reciter) || !resources.translations.some((item) => item.id === preferences.translation)) return;
    const controller = new AbortController(); const run = ++requestEpoch.current;
    searchRequest.current?.abort(); loadRequest.current?.abort(); loadRequest.current = controller;
    setLoading(true); setData(null); setVerses([]); setError(null); setSearchMode(false);
    void webQuranClient.readChapter(chapterId, versePage(target), preferences, controller.signal).then((body) => {
      if (controller.signal.aborted || run !== requestEpoch.current) return;
      setData(body); setVerses(body.verses);
    }).catch((reason) => { if (!controller.signal.aborted && run === requestEpoch.current) setError(reason instanceof Error ? reason.message : "This surah is unavailable."); })
      .finally(() => { if (!controller.signal.aborted && run === requestEpoch.current) setLoading(false); });
    return () => controller.abort();
  }, [chapterId, target, preferences.reciter, preferences.translation, ready, resources, retry, navigationRevision]);
  useEffect(() => { audio.stop(); }, [chapterId, mode, preferences.reciter, preferences.translation, audio.stop]);
  useEffect(() => {
    searchRequest.current?.abort(); setSearching(false);
    return () => searchRequest.current?.abort();
  }, [mode, chapterId]);
  useEffect(() => {
    if (mode !== "read" || searchMode || preferences.layout !== "ayah" || !verses.length) return;
    const id = `ayah-${chapterId}-${target}`;
    const frame = requestAnimationFrame(() => { if (target !== 1) document.getElementById(id)?.scrollIntoView({ block: "center", behavior: "auto" }); });
    return () => cancelAnimationFrame(frame);
  }, [mode, chapterId, target, searchMode, preferences.layout, Boolean(verses.length)]);
  useEffect(() => {
    if (mode !== "read" || searchMode || preferences.layout !== "ayah" || !list.current || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const visible = new Map<Element, IntersectionObserverEntry>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) { if (entry.isIntersecting) visible.set(entry.target, entry); else visible.delete(entry.target); }
      const first = [...visible.values()].sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top)[0];
      if (timer) clearTimeout(timer);
      if (first) timer = setTimeout(() => { const key = first.target.getAttribute("data-ayah"); if (key) onRead(key); }, 700);
    }, { rootMargin: "-130px 0px -35% 0px", threshold: 0 });
    list.current.querySelectorAll("[data-ayah]").forEach((node) => observer.observe(node));
    return () => { observer.disconnect(); if (timer) clearTimeout(timer); };
  }, [mode, verses, searchMode, preferences.layout, onRead]);
  const getVerse = useCallback((ayah: number) => webQuranClient.verse(`${chapterId}:${ayah}`, { reciter: preferences.reciter, translation: preferences.translation }), [chapterId, preferences.reciter, preferences.translation]);
  function open(chapter: number, ayah = 1) {
    const destination = chapters.find((item) => item.id === chapter);
    if (destination && destination.versesCount < ayah) { setError("That ayah is outside this surah."); return; }
    ++requestEpoch.current; searchRequest.current?.abort(); loadRequest.current?.abort(); audio.stop();
    setChapterId(chapter); setTarget(ayah); setMode("read"); setQuery(""); setSearchMode(false); setError(null); setJump("");
    setNavigationRevision((n) => n + 1);
  }
  function openKey(key: string) { const ref = parseAyahReference(key); if (ref) open(ref.chapter, ref.ayah); }
  function changeMode(next: QuranMode) { if (next === "read") { open(chapterId, target); return; } audio.stop(); setMode(next); setQuery(""); setSearchMode(false); setError(null); }
  async function loadMore() {
    if (!data?.hasMore || loading) return;
    const controller = new AbortController(); loadRequest.current = controller; const run = requestEpoch.current; setLoading(true);
    try {
      const body = await webQuranClient.readChapter(chapterId, data.page + 1, preferences, controller.signal);
      if (run === requestEpoch.current && !controller.signal.aborted) { setData(body); setVerses((current) => [...current, ...body.verses]); }
    } catch (reason) { if (run === requestEpoch.current && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "More ayahs are unavailable."); }
    finally { if (run === requestEpoch.current && !controller.signal.aborted) setLoading(false); }
  }
  async function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2 || query.trim().length > 120) return;
    audio.stop(); searchRequest.current?.abort(); const controller = new AbortController(); searchRequest.current = controller;
    ++requestEpoch.current; loadRequest.current?.abort(); setLoading(false); setSearching(true); setError(null);
    try {
      const result = await webQuranClient.searchVerses(query, preferences, controller.signal);
      if (!controller.signal.aborted) { setVerses(result); setSearchMode(true); setSearchTitle(query.trim()); }
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Search is unavailable."); }
    finally { if (!controller.signal.aborted) setSearching(false); }
  }
  function toggleBookmark(key: string) {
    if (parseAyahReference(key)?.key !== key) return;
    update((state) => ({ ...state, bookmarks: state.bookmarks.includes(key) ? state.bookmarks.filter((item) => item !== key) : [...state.bookmarks, key].slice(0, 1000) }));
  }
  function play(verse: QuranVerse) {
    if (!verse.audioUrl) return;
    if (audio.playback.key === verse.verseKey && audio.playback.phase === "playing") audio.pause();
    else void audio.start([verse.verseNumber], async () => verse);
  }
  function setPreference(change: Partial<QuranState["preferences"]>) { update((state) => ({ ...state, preferences: { ...state.preferences, ...change } })); }
  const connectionError = catalogError ?? error;
  return <main className={styles.shell}>
    <section className={styles.hero}>
      <div><small>A QUIET PLACE TO READ</small><h1>Quran &amp; Recite</h1><p>Read the Madinah Mushaf, listen to authentic recitations, and practise at your own pace.</p></div>
      <span lang="ar" dir="rtl" translate="no">ٱلْقُرْآنُ ٱلْكَرِيمُ</span>
    </section>
    <div className={styles.quick}><a href="#reader"><BookOpen />Read</a><a href="#qibla"><Compass />Qibla</a><a href="https://sunnah.com" target="_blank" rel="noreferrer"><ExternalLink />Hadith Library</a></div>
    <section className={styles.reader} id="reader">
      <aside aria-label="Surah navigation">
        <h2>Surahs</h2>
        {library.lastRead ? <button className={styles.resumeReading} onClick={() => open(library.lastRead!.chapter, library.lastRead!.ayah)}>Continue at {library.lastRead.chapter}:{library.lastRead.ayah}</button> : null}
        <label className={styles.mobileSurahPicker}>Choose a surah<select aria-label="Choose a surah" value={chapterId} disabled={!chapters.length} onChange={(event) => open(Number(event.target.value))}>{chapters.length ? chapters.map((item) => <option key={item.id} value={item.id}>{item.id}. {item.nameSimple} · {item.nameArabic}</option>) : <option value={chapterId}>{catalogError ? "Surah index unavailable" : "Loading surahs…"}</option>}</select></label>
        <label className={styles.surahSearch}>Find a surah<input type="search" value={chapterQuery} maxLength={100} onChange={(event) => setChapterQuery(event.target.value)} placeholder="Name or number" /></label>
        <div className={styles.chapterList}>{matchingChapters.map((item) => <button key={item.id} className={item.id === chapterId ? styles.selected : undefined} aria-current={item.id === chapterId ? "true" : undefined} onClick={() => open(item.id)}><b>{item.id}</b><span>{item.nameSimple}<small>{item.translatedName?.name} · {item.versesCount} ayahs</small></span><em lang="ar" dir="rtl" translate="no">{item.nameArabic}</em></button>)}{chapters.length && !matchingChapters.length ? <p className={styles.surahStatus} role="status">No matching surahs. Try a name or number.</p> : !chapters.length ? <p className={styles.surahStatus} role="status">{catalogError ? "Surah index unavailable. Retry the connection in the reader." : "Loading surahs…"}</p> : null}</div>
      </aside>
      <div className={styles.reading}>
        <nav className={styles.modeNavigation} aria-label="Quran tools">{modes.map((item) => <button key={item.id} aria-pressed={mode === item.id} onClick={() => changeMode(item.id)}>{item.label}{item.id === "bookmarks" && bookmarks.length ? ` (${bookmarks.length})` : ""}</button>)}</nav>
        <details className={styles.preferences}><summary>Reading and reference audio preferences</summary><div className={styles.preferenceGrid}>
          <label>Reference reciter<select aria-label="Reference reciter" value={preferences.reciter} disabled={!resources?.reciters.length} onChange={(event) => setPreference({ reciter: Number(event.target.value) })}>{resources?.reciters.length ? resources.reciters.map((item) => <option key={item.id} value={item.id}>{item.name}{item.style ? ` · ${item.style}` : ""}</option>) : <option value={preferences.reciter}>Reciter catalog unavailable</option>}</select></label>
          <label>Translation of the meaning<select aria-label="Quran translation" value={preferences.translation} disabled={!resources?.translations.length} onChange={(event) => setPreference({ translation: Number(event.target.value) })}>{resources?.translations.length ? resources.translations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>) : <option value={preferences.translation}>Approved translation unavailable</option>}</select></label>
          <div className={styles.controls}><button aria-label="Decrease Arabic size" onClick={() => setPreference({ arabicSize: Math.max(24, preferences.arabicSize - 2) })}>A−</button><button aria-label="Increase Arabic size" onClick={() => setPreference({ arabicSize: Math.min(48, preferences.arabicSize + 2) })}>A+</button><button onClick={() => setPreference({ showTranslation: !preferences.showTranslation })}>{preferences.showTranslation ? "Translation on" : "Translation off"}</button></div>
          <p className={styles.finePrint}>Only Saheeh International or The Clear Quran is offered when available in the approved catalog. Reference reciters must have working verse recordings.</p>
        </div></details>
        {storageError ? <p className={styles.notice} role="status">{storageError}</p> : null}
        {connectionError ? <div className={styles.empty} role="alert"><BookOpen /><b>Reader connection needed</b><p>{connectionError}</p><small>Quran text is never generated or substituted.</small><button onClick={() => setRetry((n) => n + 1)}>Retry connection</button></div> : null}
        {mode === "listen" ? <QuranListeningLibrary chapters={chapters} library={library} update={update} audio={audio} /> : null}
        {["practice", "memorize", "test"].includes(mode) ? currentChapter ? <QuranWebPractice key={`${mode}:${chapterId}`} mode={mode as "practice" | "memorize" | "test"} chapter={currentChapter} preferences={preferences} getVerse={getVerse} library={library} update={update} audio={audio} startAyah={Math.min(target, currentChapter.versesCount)} /> : <div className={styles.empty}>Load the surah index to start practising.</div> : null}
        {mode === "bookmarks" ? <div className={styles.featurePanel}><h2>Your bookmarks</h2><p>Saved in this browser. Choose an ayah to continue reading.</p>{bookmarks.map((key) => <div className={styles.bookmarkRow} key={key}><button onClick={() => openKey(key)}><Bookmark size={18} />Ayah {key}</button><button onClick={() => toggleBookmark(key)} aria-label={`Remove bookmark ${key}`}><Trash2 size={17} /></button></div>)}{!bookmarks.length ? <p>No bookmarks yet. Save an ayah from the reader.</p> : null}</div> : null}
        {mode === "read" ? <>
        <div className={styles.toolbar}><form role="search" aria-label="Quran search" onSubmit={search}><Search size={18} aria-hidden="true" /><input value={query} maxLength={120} onChange={(event) => setQuery(event.target.value)} placeholder="Arabic, English, or 2:255" aria-label="Search the Quran" /><button disabled={query.trim().length < 2 || searching || !resources}>{searching ? "Searching…" : "Search"}</button></form></div>
        <div className={styles.readingNavigation}><button aria-label="Previous surah" disabled={chapterId === 1} onClick={() => open(chapterId - 1)}><ChevronLeft size={18} /></button><form onSubmit={(event) => { event.preventDefault(); const ref = parseAyahReference(jump.includes(":") || jump.includes("：") ? jump : `${chapterId}:${jump}`); if (ref) open(ref.chapter, ref.ayah); else setError("Enter a valid ayah or surah:ayah reference."); }}><input value={jump} onChange={(event) => setJump(event.target.value)} placeholder="Go to ayah or 2:255" aria-label="Jump to ayah" maxLength={10} /><button>Go</button></form><button aria-label="Next surah" disabled={chapterId === 114} onClick={() => open(chapterId + 1)}><ChevronRight size={18} /></button></div>
        <div className={styles.layoutChoice} role="group" aria-label="Reading layout"><button aria-pressed={preferences.layout === "ayah"} onClick={() => setPreference({ layout: "ayah" })}>Ayah View</button><button aria-pressed={preferences.layout === "madinah"} onClick={() => setPreference({ layout: "madinah" })}>Madinah · 15 lines</button></div>
        <header className={styles.chapterHeader}><small>{searchMode ? `SEARCH RESULTS FOR “${searchTitle}”` : currentChapter?.revelationPlace ?? "QURAN FOUNDATION"}</small><h2>{searchMode ? "Verified results" : currentChapter?.nameSimple ?? "Quran Reader"}</h2><p>{searchMode ? "" : currentChapter ? `${currentChapter.translatedName?.name} · ${currentChapter.versesCount} ayahs` : ""}</p></header>
        {data?.availability?.note ? <p className={styles.sourceNote}>{data.availability.note} Quran and translation supplied by Quran Foundation / Quran.com.</p> : null}
        {preferences.layout === "madinah" && !searchMode ? <QuranMadinahReader reference={`${chapterId}:${target}`} bookmarks={bookmarks} bookmark={toggleBookmark} onRead={onRead} onOpen={(key) => { setPreference({ layout: "ayah" }); openKey(key); }} play={(key) => { const ref = parseAyahReference(key); if (ref) void audio.start([ref.ayah], () => webQuranClient.verse(key, preferences)); }} /> : <>
          {(loading && !verses.length) || searching ? <div className={styles.empty} role="status">{searching ? "Searching verified Quran content…" : "Loading Quran…"}</div> : null}
          {!searchMode && verses[0]?.verseNumber > 1 ? <button className={styles.more} onClick={() => open(chapterId, Math.max(1, verses[0].verseNumber - 50))}>Earlier ayahs</button> : null}
          {!searchMode && currentChapter && verses.length ? <div className={styles.actionRow}><button onClick={() => void audio.start(Array.from({ length: currentChapter.versesCount - target + 1 }, (_, i) => target + i), getVerse)}><Play size={16} />Listen from ayah {target}</button><button onClick={() => changeMode("practice")}>Practise this surah</button></div> : null}
          <div ref={list}>{verses.map((verse) => <article key={verse.verseKey} className={styles.verse} id={`ayah-${verse.verseKey.replace(":", "-")}`} data-ayah={verse.verseKey}>
            <div className={styles.verseTop}><span>{verse.verseKey}</span><div>{searchMode ? <button onClick={() => openKey(verse.verseKey)} aria-label={`Open ayah ${verse.verseKey}`}><BookOpen size={18} /></button> : null}<button disabled={!verse.audioUrl} onClick={() => play(verse)} aria-label={`${audio.playback.key === verse.verseKey && audio.playback.phase === "playing" ? "Pause" : "Play"} ayah ${verse.verseKey}`}>{audio.playback.key === verse.verseKey && audio.playback.phase === "playing" ? <Pause size={18} /> : <Play size={18} />}</button><button onClick={() => toggleBookmark(verse.verseKey)} aria-pressed={bookmarks.includes(verse.verseKey)} aria-label={`Bookmark ayah ${verse.verseKey}`}><Bookmark size={18} fill={bookmarks.includes(verse.verseKey) ? "currentColor" : "none"} /></button></div></div>
            <p className={styles.arabic} style={{ fontSize: preferences.arabicSize }} lang="ar" dir="rtl" translate="no">{verse.textUthmani}</p>
            {preferences.showTranslation ? <div className={styles.translation}><small>TRANSLATION OF THE MEANING · {verse.translationName}</small><p>{verse.translation}</p></div> : null}
          </article>)}</div>
          {searchMode && !verses.length ? <p className={styles.sourceNote}>No matching ayahs. Try another phrase or a surah:ayah reference.</p> : null}
        </>}
        {searchMode ? <button className={styles.more} onClick={() => open(chapterId, target)}>Return to surah</button> : preferences.layout === "ayah" && data?.hasMore ? <button className={styles.more} disabled={loading} onClick={loadMore}>{loading ? "Loading…" : "Continue this surah"}</button> : null}
        <p className={styles.finePrint}>Arabic is displayed exactly as supplied by Quran Foundation. Translations convey the meaning.</p>
        </> : null}
      </div>
    </section>
    {audio.playback.phase !== "idle" ? <div className={styles.audioPlayer} role="region" aria-label="Quran audio player"><div><b>{audio.playback.title}</b><small role="status">{audio.playback.error ?? (audio.playback.phase === "loading" ? "Preparing audio…" : audio.playback.phase === "paused" ? "Paused" : "Playing")}</small></div>{audio.playback.phase === "playing" ? <button aria-label="Pause recitation" onClick={audio.pause}><Pause size={20} /></button> : audio.playback.phase === "paused" ? <button aria-label="Resume recitation" onClick={() => void audio.resume()}><Play size={20} /></button> : null}<button aria-label="Stop recitation" onClick={audio.stop}><Square size={19} /></button></div> : null}
    <QiblaFinder />
  </main>;
}

function QiblaFinder() {
  const [bearing, setBearing] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [message, setMessage] = useState("Your location stays on this device and is used only to calculate Qibla.");
  const aligned = bearing !== null && heading !== null && isAlignedWithQibla(bearing, heading);
  useEffect(() => {
    if (bearing === null) return;
    const onOrientation = (event: DeviceOrientationEvent) => {
      const ios = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof ios === "number") setHeading(ios);
      else if (event.absolute && typeof event.alpha === "number") setHeading((360 - event.alpha) % 360);
    };
    window.addEventListener("deviceorientation", onOrientation, true);
    return () => window.removeEventListener("deviceorientation", onOrientation, true);
  }, [bearing]);
  async function locate() {
    try {
      const device = window.DeviceOrientationEvent as (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> }) | undefined;
      if (device?.requestPermission && await device.requestPermission() !== "granted") setMessage("Compass permission was denied. The static bearing will still be shown.");
      if (!navigator.geolocation) throw new Error("Location is unavailable in this browser.");
      navigator.geolocation.getCurrentPosition((position) => {
        setBearing(calculateQiblaBearing(position.coords));
        setMessage(position.coords.accuracy > 500 ? "Location accuracy is low. Try again near a window." : "Rotate your phone until the marker points upward.");
      }, () => setMessage("Location was not allowed. Use the Calgary fallback below."), { enableHighAccuracy: true, timeout: 12_000 });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Qibla is unavailable."); }
  }
  return <section className={styles.qibla} id="qibla"><div><small>PRIVATE BY DESIGN</small><h2>Find the Qibla</h2><p>{message}</p><div className={styles.qiblaButtons}><button onClick={locate}><LocateFixed size={18} />Use my location</button><button onClick={() => { setBearing(calculateQiblaBearing({ latitude: 51.0447, longitude: -114.0719 })); setHeading(null); setMessage("Static bearing for Calgary. No location was requested."); }}>Use Calgary</button></div>{bearing !== null ? <p>Qibla {bearing.toFixed(1)}° from true north · {heading === null ? "No live compass" : `Heading ${heading.toFixed(0)}°`}</p> : null}</div><div className={styles.compass} role="img" aria-label={aligned ? "Aligned with Qibla" : bearing === null ? "Qibla waiting for location" : `Qibla ${bearing.toFixed(1)} degrees from north`}><span>N</span><div className={styles.needle} style={{ transform: `rotate(${bearing === null ? 0 : heading === null ? bearing : qiblaRotation(bearing, heading)}deg)` }}><b>◆</b><i /></div><strong>{aligned ? "Aligned" : bearing === null ? "Qibla" : `${bearing.toFixed(0)}°`}</strong></div></section>;
}
