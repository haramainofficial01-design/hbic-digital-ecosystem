"use client";

import { createSelfTest, memorizationLabels, normalizeSearch, parseAyahReference, passageId, repeatSequence, validAudioUrl, validMushafPageNumber, QURAN_PLAYBACK_SPEEDS, validQuranPlaybackSpeed,
  type MemorizationStatus, type MushafPage, type QuranChapter, type QuranPassage, type QuranPreferences, type QuranState, type QuranVerse } from "@hbic/shared";
import { Bookmark, ChevronLeft, ChevronRight, Pause, Play, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mushafDocument } from "../../mobile/src/quran/mushafDocument";
import { availableListeningChapters, filterListeningCatalog, listeningClient, listeningUrl, validListeningUrl, type ListeningReciter } from "../../mobile/src/services/quranListening";
import { webQuranClient } from "../lib/quranBrowser";
import { QuranReciteAssist } from "./QuranReciteAssist";
import {recitationDisplayWords} from "../../mobile/src/quran/recitationTracking";
import styles from "./QuranReader.module.css";

type Playback = { phase: "idle" | "loading" | "playing" | "paused" | "error"; key: string | null; title: string; error: string | null };
const idlePlayback: Playback = { phase: "idle", key: null, title: "", error: null };

export function useWebQuranAudio() {
  const [playback, setPlayback] = useState<Playback>(idlePlayback);
  const [speed, setSpeedState] = useState(1), [loopCurrent, setLoopState] = useState(false);
  const options = useRef({ speed: 1, loop: false });
  const player = useRef<HTMLAudioElement | null>(null), epoch = useRef(0);
  const stop = useCallback(() => {
    ++epoch.current;
    options.current.loop = false; setLoopState(false);
    if (player.current) { player.current.pause(); player.current.removeAttribute("src"); player.current.load(); player.current = null; }
    setPlayback(idlePlayback);
  }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", stop);
    return () => { document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", stop); stop(); };
  }, [stop]);
  async function playUrl(url: string, title: string, key: string | null, run: number, ended?: () => void) {
    if (run !== epoch.current) return;
    if (!validAudioUrl(url) && !validListeningUrl(url)) throw new Error("This recording source could not be verified.");
    if (player.current) { player.current.onended = null; player.current.onerror = null; player.current.pause(); player.current.removeAttribute("src"); player.current.load(); }
    const next = new Audio(url); player.current = next;
    next.playbackRate = options.current.speed; next.preservesPitch = true; next.loop = options.current.loop;
    setPlayback({ phase: "loading", title, key, error: null });
    next.onended = () => { if (run === epoch.current && player.current === next && !next.loop) { if (ended) ended(); else setPlayback(idlePlayback); } };
    next.onerror = () => { if (run === epoch.current && player.current === next) { ++epoch.current; next.pause(); setPlayback({ phase: "error", title, key, error: "This recording could not play. Please retry." }); } };
    await next.play();
    if (run === epoch.current) setPlayback({ phase: "playing", title, key, error: null }); else next.pause();
  }
  async function start(ayahs: number[], getVerse: (ayah: number) => Promise<QuranVerse>) {
    stop(); const run = epoch.current; let index = 0;
    async function advance() {
      if (run !== epoch.current) return;
      if (index >= ayahs.length) { setPlayback(idlePlayback); return; }
      setPlayback({ phase: "loading", title: `Loading reference ${index + 1} of ${ayahs.length}`, key: null, error: null });
      try {
        const verse = await getVerse(ayahs[index++]);
        if (!verse.audioUrl) throw new Error("Reference audio is unavailable for this ayah.");
        await playUrl(verse.audioUrl, `Ayah ${verse.verseKey} · ${index} of ${ayahs.length}`, verse.verseKey, run, () => void advance());
      } catch (reason) { if (run === epoch.current) { ++epoch.current; setPlayback({ phase: "error", key: null, title: "Reference recitation", error: reason instanceof Error ? reason.message : "Audio could not start." }); } }
    }
    await advance();
  }
  async function playStream(url: string, title: string) {
    stop(); const run = epoch.current;
    try { await playUrl(url, title, null, run); }
    catch (reason) { if (run === epoch.current) setPlayback({ phase: "error", key: null, title, error: reason instanceof Error ? reason.message : "Audio could not start." }); }
  }
  function pause() { player.current?.pause(); setPlayback((state) => state.phase === "playing" ? { ...state, phase: "paused" } : state); }
  async function resume() {
    const run = epoch.current;
    try { await player.current?.play(); if (run === epoch.current && player.current) setPlayback((state) => ({ ...state, phase: "playing" })); }
    catch { if (run === epoch.current) setPlayback((state) => ({ ...state, phase: "error", error: "Playback could not resume. Please retry." })); }
  }
  function setSpeed(rate: number) {
    if (!validQuranPlaybackSpeed(rate)) return;
    options.current.speed = rate;
    if (player.current) { player.current.playbackRate = rate; player.current.preservesPitch = true; }
    setSpeedState(rate);
  }
  function setLoopCurrent(value: boolean) { options.current.loop = value; if (player.current) player.current.loop = value; setLoopState(value); }
  async function replayCurrent() { if (player.current) { player.current.currentTime = 0; await resume(); } }
  return { playback, stop, start, playStream, pause, resume, speed, setSpeed, loopCurrent, setLoopCurrent, replayCurrent };
}
export type WebQuranAudio = ReturnType<typeof useWebQuranAudio>;

export function QuranPlaybackOptions({ speed, loop, onSpeed, onLoop, disabled = false }: {
  speed: number; loop: boolean; onSpeed: (rate: number) => void; onLoop: (loop: boolean) => void; disabled?: boolean;
}) {
  return <div className={styles.playbackOptions}>
    <button type="button" aria-pressed={loop} disabled={disabled} onClick={() => onLoop(!loop)}>Loop {loop ? "On" : "Off"}</button>
    <label>Speed<select aria-label="Playback speed" disabled={disabled} value={speed} onChange={event => onSpeed(Number(event.target.value))}>{QURAN_PLAYBACK_SPEEDS.map(rate => <option key={rate} value={rate}>{rate}×{rate === 1 ? " · Normal" : ""}</option>)}</select></label>
  </div>;
}

export function QuranListeningLibrary({ chapters, library, update, audio }: {
  chapters: QuranChapter[]; library: QuranState; update: (transform: (state: QuranState) => QuranState) => void; audio: WebQuranAudio;
}) {
  const [catalog, setCatalog] = useState<ListeningReciter[]>([]), [selected, setSelected] = useState<ListeningReciter | null>(null);
  const [edition, setEdition] = useState(0), [query, setQuery] = useState(""), [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null), [retry, setRetry] = useState(0);
  const restored = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null);
    void listeningClient.catalog(controller.signal).then((result) => { if (!controller.signal.aborted) setCatalog(result); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "The recording library is unavailable."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (!catalog.length || restored.current) return;
    restored.current = true; const saved = library.listening;
    const voice = saved && catalog.find((item) => item.id === saved.reciterId);
    if (voice) { setSelected(voice); setEdition(voice.editions.find((item) => item.id === saved.editionId)?.id ?? voice.editions[0].id); }
  }, [catalog, library.listening]);
  function choose(voice: ListeningReciter, editionId: number) {
    audio.stop(); setSelected(voice); setEdition(editionId); setQuery(""); setError(null);
    update((state) => ({ ...state, listening: { reciterId: voice.id, editionId } }));
  }
  const voices = useMemo(() => filterListeningCatalog(catalog, query), [catalog, query]);
  const recordings = selected ? availableListeningChapters(selected, edition, chapters)
    .filter((chapter) => normalizeSearch(`${chapter.id} ${chapter.nameSimple} ${chapter.nameArabic} ${chapter.translatedName.name}`).includes(normalizeSearch(query))) : [];
  return <div className={styles.featurePanel}>
    <h2>{selected?.name ?? "Recitation library"}</h2>
    <p>Hafs recordings from MP3Quran. Complete surah recordings use their own reciter and edition; reference ayah audio uses the reader’s reciter.</p>
    {selected ? <div className={styles.actionRow}><button onClick={() => { audio.stop(); setSelected(null); setQuery(""); }}>Choose another reciter</button>
      <label>Recording edition<select value={edition} onChange={(event) => choose(selected, Number(event.target.value))}>{selected.editions.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.chapters.length} surahs</option>)}</select></label></div> : null}
    <label className={styles.fieldLabel}>{selected ? "Find a surah" : "Find a reciter"}<input value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder={selected ? "Surah name or number" : "Reciter name"} /></label>
    {loading ? <p role="status">Loading verified recordings…</p> : null}
    {error ? <div className={styles.notice} role="alert">{error}<button onClick={() => setRetry((n) => n + 1)}>Retry</button></div> : null}
    <div className={styles.recordingList}>{selected ? recordings.map((chapter) => <button key={chapter.id} onClick={() => {
      try { void audio.playStream(listeningUrl(selected, edition, chapter.id), `${chapter.nameSimple} · ${selected.name}`); }
      catch (reason) { setError(reason instanceof Error ? reason.message : "This recording is unavailable."); }
    }}><span>{chapter.id}</span><b>{chapter.nameSimple}<small>{chapter.translatedName.name}</small></b><Play size={19} /></button>)
      : voices.map((voice, index) => <div key={voice.id}>{index === 0 || voice.group !== voices[index - 1].group ? <h3>{voice.group}</h3> : null}<button onClick={() => choose(voice, voice.editions[0].id)}><b>{voice.name}<small>{voice.editions[0].chapters.length} surahs available</small></b><ChevronRight size={19} /></button></div>)}</div>
    {!loading && !error && !(selected ? recordings : voices).length ? <p>No matching recordings. Some editions contain only a partial collection.</p> : null}
    <p className={styles.finePrint}>Recordings are streamed and credited to <a href="https://www.mp3quran.net/eng/about" target="_blank" rel="noreferrer">MP3Quran</a>. Availability follows the live catalog.</p>
  </div>;
}

export function QuranMadinahReader({ reference, bookmarks, bookmark, onOpen, onRead, play }: {
  reference: string; bookmarks: string[]; bookmark: (key: string) => void; onOpen: (key: string) => void;
  onRead: (key: string) => void; play: (key: string) => void;
}) {
  const [page, setPage] = useState<number | null>(null), [data, setData] = useState<MushafPage | null>(null);
  const [selected, setSelected] = useState(reference), [jump, setJump] = useState(""), [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null), [retry, setRetry] = useState(0), [referenceRetry, setReferenceRetry] = useState(0), [loading, setLoading] = useState(true);
  const iframe = useRef<HTMLIFrameElement>(null);
  const channel = useMemo(() => `hbic-mushaf-${page ?? 0}-${retry}`, [page, retry]);
  useEffect(() => {
    const controller = new AbortController(); setPage(null); setData(null); setReady(false); setError(null); setLoading(true); setSelected(reference);
    void webQuranClient.mushafReference(reference, controller.signal).then((result) => { if (!controller.signal.aborted) setPage(result); })
      .catch((reason) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "The verified page is unavailable."); setLoading(false); } });
    return () => controller.abort();
  }, [reference, referenceRetry]);
  useEffect(() => {
    if (page === null) return;
    const controller = new AbortController(); setData(null); setReady(false); setLoading(true); setError(null);
    void webQuranClient.readMushaf(page, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setData(result);
      if (!result.lines.some((line) => line.words.some((word) => word.key === selected))) setSelected(result.lines.flatMap((line) => line.words)[0].key);
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "The verified page is unavailable."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, retry]); // selected is updated only after the page is fetched.
  useEffect(() => {
    const message = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow || !data || !event.data || typeof event.data !== "object" || event.data.channel !== channel) return;
      const result = event.data;
      if (result.type === "ready" && result.page === data.page && result.overflow === false) { setReady(true); onRead(selected); }
      else if (result.type === "error") { setReady(false); setError("The verified page font could not load. Retry or choose Ayah View."); }
      else if (result.type === "ayah" && typeof result.key === "string" && data.lines.some((line) => line.words.some((word) => word.key === result.key))) { setSelected(result.key); onRead(result.key); }
      else if (result.type === "page" && (result.direction === -1 || result.direction === 1) && validMushafPageNumber(data.page + result.direction)) setPage(data.page + result.direction);
    };
    window.addEventListener("message", message); return () => window.removeEventListener("message", message);
  }, [channel, data, selected, onRead]);
  const html = useMemo(() => data ? mushafDocument(data, false, selected, { channel }) : "", [data, channel]); // Preserve the loaded page when an ayah is tapped.
  return <div className={styles.mushafPanel}>
    <div className={styles.pageNavigation}><button aria-label="Previous Mushaf page" disabled={page === null || page === 1 || loading} onClick={() => setPage((n) => n! - 1)}><ChevronLeft /></button><div><b>{data?.chapterNames.join(" · ") ?? "Madinah Mushaf"}</b><small>{page ? `Page ${page} of 604${data ? ` · Juz ${data.juz}` : ""}` : "Finding your page…"}</small></div><button aria-label="Next Mushaf page" disabled={page === null || page === 604 || loading} onClick={() => setPage((n) => n! + 1)}><ChevronRight /></button></div>
    {error ? <div className={styles.notice} role="alert">{error}<button onClick={() => page === null ? setReferenceRetry((n) => n + 1) : setRetry((n) => n + 1)}>Retry</button></div> : null}
    <div className={styles.mushafPage}>{data ? <iframe key={channel} ref={iframe} title={`Madinah Mushaf page ${data.page}`} srcDoc={html} sandbox="allow-scripts" referrerPolicy="no-referrer" /> : <p role="status">{loading ? "Loading verified Madinah page…" : "Madinah page unavailable."}</p>}</div>
    <p className={styles.finePrint}>{ready ? "Tap an ayah for audio, bookmarks, or meaning. Swipe to turn the page." : "The Quran page appears after its verified font has loaded."}</p>
    {ready ? <div className={styles.actionRow}><b>Ayah {selected}</b><button onClick={() => play(selected)}><Play size={16} />Listen</button><button onClick={() => bookmark(selected)} aria-pressed={bookmarks.includes(selected)}><Bookmark size={16} fill={bookmarks.includes(selected) ? "currentColor" : "none"} />{bookmarks.includes(selected) ? "Saved" : "Bookmark"}</button><button onClick={() => onOpen(selected)}>Open meaning</button></div> : null}
    <form className={styles.jumpForm} onSubmit={(event) => { event.preventDefault(); const n = Number(jump); if (validMushafPageNumber(n)) { setPage(n); setError(null); } else setError("Choose a Mushaf page between 1 and 604."); }}><label>Go to page<input type="number" min={1} max={604} value={jump} onChange={(event) => setJump(event.target.value)} placeholder="1–604" /></label><button>Go</button></form>
    <p className={styles.finePrint}>Madinah Hafs · QCF V2 · 15-line edition. Opening pages retain their special layout. Quran data and fonts: Quran Foundation.</p>
  </div>;
}

export function QuranWebPractice({ mode, chapter, preferences, getVerse, library, update, audio, startAyah }: {
  mode: "practice" | "memorize" | "test"; chapter: QuranChapter; preferences: QuranPreferences;
  getVerse: (ayah: number) => Promise<QuranVerse>; library: QuranState;
  update: (transform: (state: QuranState) => QuranState) => void; audio: WebQuranAudio; startAyah: number;
}) {
  const [from, setFrom] = useState(String(startAyah)), [to, setTo] = useState(String(Math.min(startAyah + 2, chapter.versesCount)));
  const [repeat, setRepeat] = useState(3), [repeatMode, setRepeatMode] = useState<"passage" | "ayah">("passage");
  const [hidden, setHidden] = useState(mode !== "practice"), [revealed, setRevealed] = useState(false), [hints, setHints] = useState(0);
  const [questions, setQuestions] = useState<number[]>([]), [questionIndex, setQuestionIndex] = useState(0), [temporary, setTemporary] = useState(false);
  const [reviewAyah, setReviewAyah] = useState(startAyah), [current, setCurrent] = useState<QuranVerse | null>(null), [error, setError] = useState<string | null>(null);
  const [assistBusy, setAssistBusy] = useState(false);
  const passage: QuranPassage = { chapter: chapter.id, from: Number(from), to: Number(to) };
  const valid = Number.isInteger(passage.from) && Number.isInteger(passage.to) && passage.from >= 1 && passage.to >= passage.from && passage.to <= chapter.versesCount;
  const question = questions[questionIndex], completed = Boolean(questions.length && questionIndex >= questions.length);
  const selectedAyah = mode === "test" && question ? question : valid ? Math.max(passage.from, Math.min(passage.to, reviewAyah)) : 1;
  const busy = assistBusy;
  useEffect(() => {
    let active = true; setCurrent(null); setError(null); setHints(0); setRevealed(false);
    if (valid && !completed) void getVerse(selectedAyah).then((verse) => { if (active) setCurrent(verse); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "The selected ayah is unavailable."); });
    return () => { active = false; };
  }, [getVerse, selectedAyah, valid, completed]);
  useEffect(() => { if (assistBusy) audio.stop(); }, [assistBusy, audio.stop]);
  function memorize(range: QuranPassage, status: MemorizationStatus) {
    update((state) => ({ ...state, memorization: [{ ...range, status, updatedAt: new Date().toISOString() }, ...state.memorization.filter((item) => passageId(item) !== passageId(range))].slice(0, 500) }));
  }
  function startTest() { audio.stop(); setQuestions(createSelfTest(passage)); setQuestionIndex(0); setHints(0); setRevealed(false); }
  function review(status: MemorizationStatus) { if (!question || busy) return; if (!temporary) memorize({ chapter: chapter.id, from: question, to: question }, status); audio.stop(); setQuestionIndex((n) => n + 1); }
  const showText = mode === "test" ? revealed : !hidden;
  const status = library.memorization.find((item) => passageId(item) === passageId(passage))?.status ?? "not_started";
  const words = current ? recitationDisplayWords(current.textUthmani) : [];
  return <div className={styles.featurePanel}>
    <h2>{mode === "test" ? "Test yourself" : mode === "memorize" ? "Memorization" : "Recitation practice"}</h2>
    <p>{chapter.nameSimple} · Listen, recall, and review yourself. Progress is self-reported; a teacher can help assess your recitation.</p>
    <section className={styles.practiceCard}>
      <div className={styles.actionRow}><label>From ayah<input aria-label="Practice starting ayah" type="number" min={1} max={chapter.versesCount} value={from} disabled={busy || questions.length > 0} onChange={(event) => setFrom(event.target.value)} /></label><label>To ayah<input aria-label="Practice ending ayah" type="number" min={1} max={chapter.versesCount} value={to} disabled={busy || questions.length > 0} onChange={(event) => setTo(event.target.value)} /></label></div>
      {!valid ? <p role="alert">Choose a valid range within this surah (1–{chapter.versesCount}).</p> : null}
      {mode === "test" ? <><label className={styles.checkLabel}><input type="checkbox" checked={temporary} disabled={busy || Boolean(questions.length)} onChange={(event) => setTemporary(event.target.checked)} />Temporary session · do not save my review</label><div className={styles.actionRow}><button disabled={!valid || busy} onClick={startTest}>{questions.length ? "Restart self-test" : "Start self-test"}</button>{questions.length ? <button disabled={busy} onClick={() => { audio.stop(); setQuestions([]); setQuestionIndex(0); }}>Change test range</button> : null}</div></>
        : <><div className={styles.actionRow}><label>Repeat<select value={repeat} disabled={busy} onChange={(event) => setRepeat(Number(event.target.value))}>{[1, 3, 5, 10].map((n) => <option key={n} value={n}>{n}×</option>)}</select></label><label>Repeat order<select value={repeatMode} disabled={busy} onChange={(event) => setRepeatMode(event.target.value as "passage" | "ayah")}><option value="passage">Whole passage</option><option value="ayah">Each ayah</option></select></label><button disabled={!valid || busy || !current?.audioUrl} onClick={() => void audio.start(repeatSequence(passage, repeat, repeatMode), getVerse)}>Listen and repeat</button></div><label className={styles.checkLabel}><input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} />Hide Arabic and translation for recall</label></>}
    </section>
    {completed ? <section className={styles.practiceCard}><h3>Session complete</h3><p>{questions.length} ayahs reviewed by you. {temporary ? "Your temporary reviews were not saved." : "Your self-reported reviews are saved in this browser."}</p></section>
      : mode === "test" && !questions.length ? <p>Choose a range and start a self-test. Ayahs remain concealed until you request a hint or reveal.</p>
        : <section className={styles.practiceCard}>
          <div className={styles.actionRow}><b>{mode === "test" ? `Question ${questionIndex + 1} of ${questions.length} · ${chapter.id}:${selectedAyah}` : `Ayah ${chapter.id}:${selectedAyah}`}</b>{mode !== "test" ? <><button aria-label="Previous practice ayah" disabled={!valid || busy || selectedAyah <= passage.from} onClick={() => { audio.stop(); setReviewAyah(selectedAyah - 1); }}><ChevronLeft size={17} /></button><button aria-label="Next practice ayah" disabled={!valid || busy || selectedAyah >= passage.to} onClick={() => { audio.stop(); setReviewAyah(selectedAyah + 1); }}><ChevronRight size={17} /></button></> : null}</div>
          {!current && valid && !error ? <p role="status">Loading verified ayah…</p> : null}
          {current ? <>{showText || hints ? <p className={styles.arabic} style={{ fontSize: preferences.arabicSize }} lang="ar" dir="rtl" translate="no">{showText ? current.textUthmani : words.slice(0, hints).join(" ")}</p> : <div className={styles.concealed}><b>Recite from memory</b><p>Reveal the ayah when you’re ready to review.</p></div>}
            {showText && preferences.showTranslation ? <div className={styles.translation}><small>TRANSLATION OF THE MEANING · {current.translationName}</small><p>{current.translation}</p></div> : null}
            <div className={styles.actionRow}><button onClick={() => mode === "test" ? setRevealed(true) : setHidden(!hidden)}>{mode === "test" ? "Reveal ayah" : hidden ? "Reveal" : "Hide"}</button>{mode === "test" ? <button disabled={revealed || hints >= words.length} onClick={() => setHints((n) => n + 1)}>Word hint</button> : null}<button disabled={!current.audioUrl || busy} onClick={() => void audio.start([selectedAyah], getVerse)}><Play size={16} />Listen to reference</button></div>
            {!current.audioUrl ? <p className={styles.finePrint}>Reference audio is unavailable for this ayah.</p> : null}
            {mode === "test" ? <div className={styles.actionRow}><button disabled={busy || !revealed} onClick={() => review("memorized")}>Recalled · next</button><button disabled={busy} onClick={() => review("needs_revision")}>Needs revision · next</button></div> : null}
          </> : null}
        </section>}
    {error ? <div className={styles.notice} role="alert">{error}</div> : null}
    {valid && !completed && (mode !== "test" || questions.length > 0) ? <>
      <QuranReciteAssist verse={current} concealed={!showText} stopPlayback={audio.stop} onBusyChange={setAssistBusy} testMode={mode === "test"} onRevealWord={index => setHints(n => Math.max(n,index + 1))} />
    </> : null}
    {mode !== "test" ? <section className={styles.practiceCard}><h3>My memorization progress</h3><p>{valid ? `Passage ${passageId(passage)}` : "Choose a passage to save progress."} · Self-reported and saved only in this browser.</p><div className={styles.statusChoices} role="group" aria-label="Memorization status">{(["not_started", "practising", "memorized", "needs_revision"] as const).map((item) => <button key={item} disabled={!valid || busy} aria-pressed={status === item} onClick={() => memorize(passage, item)}>{memorizationLabels[item]}</button>)}</div>
      {library.memorization.filter((item) => item.chapter === chapter.id).length ? <div className={styles.progressList}>{library.memorization.filter((item) => item.chapter === chapter.id).map((item) => <p key={passageId(item)}><b>{item.from === item.to ? `Ayah ${item.from}` : `Ayahs ${item.from}–${item.to}`}</b><span>{memorizationLabels[item.status]}</span></p>)}</div> : null}
    </section> : null}
  </div>;
}
