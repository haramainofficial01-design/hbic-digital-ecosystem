"use client";

import { calculateQiblaBearing, isAlignedWithQibla, qiblaRotation } from "@hbic/shared";
import { Bookmark, BookOpen, Compass, ExternalLink, LocateFixed, Pause, Play, Search } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./QuranReader.module.css";

interface Chapter { id: number; nameSimple: string; nameArabic: string; translatedName: { name: string }; versesCount: number; revelationPlace: string }
interface Verse { id: number; verseKey: string; verseNumber: number; textUthmani: string; translation: string; translationName: string; audioUrl: string | null }
interface ChapterPayload { chapter: Chapter; verses: Verse[]; page: number; hasMore: boolean; availability: { note: string } }
const bookmarksKey = "hbic:quran:bookmarks:v1";
const lastReadKey = "hbic:quran:last-read:v1";

export function QuranReader() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterId, setChapterId] = useState(1);
  const [data, setData] = useState<ChapterPayload | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [arabicSize, setArabicSize] = useState(38);
  const [translationVisible, setTranslationVisible] = useState(true);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(bookmarksKey) ?? "[]");
      setBookmarks(Array.isArray(saved) ? saved : []);
      const last = Number(localStorage.getItem(lastReadKey));
      if (last >= 1 && last <= 114) setChapterId(last);
    } catch { /* Invalid local state does not block reading. */ }
    void fetch("/api/quran?mode=chapters").then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setChapters(body.chapters ?? []);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Surahs are unavailable."));
    return () => audio.current?.pause();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/quran?mode=chapter&chapter=${chapterId}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      if (!cancelled) {
        setData(body); setVerses(body.verses); setSearchMode(false);
        localStorage.setItem(lastReadKey, String(chapterId));
      }
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "This surah is unavailable."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [chapterId]);

  async function loadMore() {
    if (!data?.hasMore || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/quran?mode=chapter&chapter=${chapterId}&page=${data.page + 1}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setData(body); setVerses((current) => [...current, ...body.verses]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "More ayahs are unavailable."); }
    finally { setLoading(false); }
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/quran?mode=search&q=${encodeURIComponent(query.trim())}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setVerses(body.verses ?? []); setSearchMode(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Search is unavailable."); }
    finally { setLoading(false); }
  }

  function toggleBookmark(key: string) {
    const next = bookmarks.includes(key) ? bookmarks.filter((item) => item !== key) : [...bookmarks, key];
    setBookmarks(next); localStorage.setItem(bookmarksKey, JSON.stringify(next));
  }

  function play(verse: Verse) {
    if (!verse.audioUrl) return;
    if (playing === verse.verseKey) { audio.current?.pause(); setPlaying(null); return; }
    audio.current?.pause();
    const player = new Audio(verse.audioUrl);
    audio.current = player;
    player.addEventListener("ended", () => setPlaying(null), { once: true });
    player.addEventListener("error", () => setPlaying(null), { once: true });
    void player.play().then(() => setPlaying(verse.verseKey));
  }

  return <main className={styles.shell}>
    <section className={styles.hero}>
      <div><small>A QUIET PLACE TO READ</small><h1>Quran</h1><p>Read, listen, search, and continue where you left off. Prayer and iqamah remain one tap away.</p></div>
      <span lang="ar" dir="rtl" translate="no">ٱلْقُرْآنُ ٱلْكَرِيمُ</span>
    </section>
    <div className={styles.quick}><a href="#reader"><BookOpen />Read</a><a href="#qibla"><Compass />Qibla</a><a href="https://sunnah.com" target="_blank" rel="noreferrer"><ExternalLink />Hadith Library</a></div>
    <section className={`${styles.reader}${error && !verses.length ? ` ${styles.readerUnavailable}` : ""}`} id="reader">
      <aside><h2>Surahs</h2><div className={styles.chapterList}>{chapters.map((item) => <button key={item.id} className={item.id === chapterId ? styles.selected : undefined} onClick={() => { setChapterId(item.id); setQuery(""); }}><b>{item.id}</b><span>{item.nameSimple}<small>{item.translatedName?.name} · {item.versesCount} ayahs</small></span><em lang="ar" dir="rtl" translate="no">{item.nameArabic}</em></button>)}</div></aside>
      <div className={styles.reading}>
        <div className={styles.toolbar}>
          <form onSubmit={search}><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Arabic, English, or 2:255" aria-label="Search the Quran" /><button disabled={query.trim().length < 2 || loading}>Search</button></form>
          <div className={styles.controls}><button aria-label="Decrease Arabic size" onClick={() => setArabicSize((size) => Math.max(28, size - 2))}>A−</button><button aria-label="Increase Arabic size" onClick={() => setArabicSize((size) => Math.min(58, size + 2))}>A+</button><button onClick={() => setTranslationVisible((shown) => !shown)}>{translationVisible ? "Translation on" : "Translation off"}</button></div>
        </div>
        <header className={styles.chapterHeader}><small>{searchMode ? `SEARCH RESULTS FOR “${query}”` : data?.chapter.revelationPlace ?? "QURAN FOUNDATION"}</small><h2>{searchMode ? "Verified results" : data?.chapter.nameSimple ?? "Quran Reader"}</h2><p>{searchMode ? "" : data ? `${data.chapter.translatedName?.name} · ${data.chapter.versesCount} ayahs` : ""}</p></header>
        {data?.availability?.note ? <p className={styles.sourceNote}>{data.availability.note} Quran and translation supplied by Quran Foundation / Quran.com.</p> : null}
        {error ? <div className={styles.empty} role="status"><BookOpen /><b>Reader connection needed</b><p>{error}</p><small>Quran text is never generated or substituted.</small></div> : null}
        {loading && !verses.length ? <div className={styles.empty}>Loading Quran…</div> : null}
        {!error && verses.map((verse) => <article key={verse.verseKey} className={styles.verse} id={`ayah-${verse.verseKey.replace(":", "-")}`}>
          <div className={styles.verseTop}><span>{verse.verseKey}</span><div><button disabled={!verse.audioUrl} onClick={() => play(verse)} aria-label={`${playing === verse.verseKey ? "Pause" : "Play"} ayah ${verse.verseKey}`}>{playing === verse.verseKey ? <Pause size={18} /> : <Play size={18} />}</button><button onClick={() => toggleBookmark(verse.verseKey)} aria-pressed={bookmarks.includes(verse.verseKey)} aria-label={`Bookmark ayah ${verse.verseKey}`}><Bookmark size={18} fill={bookmarks.includes(verse.verseKey) ? "currentColor" : "none"} /></button></div></div>
          <p className={styles.arabic} style={{ fontSize: arabicSize }} lang="ar" dir="rtl" translate="no">{verse.textUthmani}</p>
          {translationVisible ? <div className={styles.translation}><small>TRANSLATION OF THE MEANING · {verse.translationName}</small><p>{verse.translation}</p></div> : null}
        </article>)}
        {searchMode ? <button className={styles.more} onClick={() => { setSearchMode(false); setVerses(data?.verses ?? []); setQuery(""); }}>Return to surah</button> : data?.hasMore && !error ? <button className={styles.more} disabled={loading} onClick={loadMore}>{loading ? "Loading…" : "Continue this surah"}</button> : null}
      </div>
    </section>
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
      const device = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
      if (device.requestPermission && await device.requestPermission() !== "granted") setMessage("Compass permission was denied. The static bearing will still be shown.");
      if (!navigator.geolocation) throw new Error("Location is unavailable in this browser.");
      navigator.geolocation.getCurrentPosition((position) => {
        setBearing(calculateQiblaBearing(position.coords));
        setMessage(position.coords.accuracy > 500 ? "Location accuracy is low. Try again near a window." : "Rotate your phone until the marker points upward.");
      }, () => setMessage("Location was not allowed. Use the Calgary fallback below."), { enableHighAccuracy: true, timeout: 12_000 });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Qibla is unavailable."); }
  }
  return <section className={styles.qibla} id="qibla"><div><small>PRIVATE BY DESIGN</small><h2>Find the Qibla</h2><p>{message}</p><div className={styles.qiblaButtons}><button onClick={locate}><LocateFixed size={18} />Use my location</button><button onClick={() => { setBearing(calculateQiblaBearing({ latitude: 51.0447, longitude: -114.0719 })); setHeading(null); setMessage("Static bearing for Calgary. No location was requested."); }}>Use Calgary</button></div>{bearing !== null ? <p>Qibla {bearing.toFixed(1)}° from true north · {heading === null ? "No live compass" : `Heading ${heading.toFixed(0)}°`}</p> : null}</div><div className={styles.compass} role="img" aria-label={aligned ? "Aligned with Qibla" : bearing === null ? "Qibla waiting for location" : `Qibla ${bearing.toFixed(1)} degrees from north`}><span>N</span><div className={styles.needle} style={{ transform: `rotate(${bearing === null ? 0 : heading === null ? bearing : qiblaRotation(bearing, heading)}deg)` }}><b>◆</b><i /></div><strong>{aligned ? "Aligned" : bearing === null ? "Qibla" : `${bearing.toFixed(0)}°`}</strong></div></section>;
}
