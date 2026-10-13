"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import {Mic, Pause, Play, Square, Trash2} from "lucide-react";
import {QURAN_PLAYBACK_SPEEDS, validQuranPlaybackSpeed, type QuranVerse} from "@hbic/shared";
import {createBrowserRecording, recordingExtension, type BrowserRecordingState} from "../lib/quranBrowserRecording";
import {ReciteAudioWindow, type ReciteFeedback} from "../../mobile/src/quran/reciteAssistFeedback";
import {RecitationTracker, type RecitationObservation} from "../../mobile/src/quran/recitationTracking";
import {containsVoiceEnergy, ReciteInferenceBudget, ReciteUtteranceTail} from "../../mobile/src/quran/reciteInferenceBudget";
import styles from "./QuranReader.module.css";

interface WorkerMessage {type: "ready" | "progress" | "error" | "observation"; message?: string; observation?: RecitationObservation; request?: number}
export function QuranReciteAssist({verse, concealed, blocked = false, stopPlayback, onBusyChange, onRevealWord, testMode = false}: {
  verse: QuranVerse | null; concealed: boolean; blocked?: boolean; stopPlayback?: () => void; onBusyChange?: (busy: boolean) => void; onRevealWord?: (index: number) => void; testMode?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "preparing" | "listening" | "paused">("idle");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("Optional on-device word tracking. Can miss or misidentify words; not a Tajweed or pronunciation assessment.");
  const [feedback, setFeedback] = useState<ReciteFeedback | null>(null);
  const [available, setAvailable] = useState(false);
  const [heard, setHeard] = useState("");
  const [saveRecording, setSaveRecording] = useState(false);
  const [recordingAvailable, setRecordingAvailable] = useState(false);
  const [recording, setRecording] = useState<BrowserRecordingState>({phase: "idle", url: null, mimeType: null, error: null});
  const [reviewSpeed, setReviewSpeed] = useState(1), [reviewLoop, setReviewLoop] = useState(false);
  const reviewAudio = useRef<HTMLAudioElement>(null);
  const reviewSession = useRef<ReturnType<typeof createBrowserRecording> | null>(null);
  const shouldRecord = useRef(false);
  const scope = useRef(0), mounted = useRef(true), busy = useRef(false);
  const selected = useRef(verse); selected.current = verse;
  const worker = useRef<Worker | null>(null), stream = useRef<MediaStream | null>(null), context = useRef<AudioContext | null>(null);
  const processor = useRef<AudioWorkletNode | null>(null), ticker = useRef<ReturnType<typeof setInterval> | null>(null), cap = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useRef(new ReciteAudioWindow()), tracker = useRef(new RecitationTracker());
  const inFlight = useRef(false), analyzed = useRef(-1);
  const captureEpoch = useRef(0);
  const budget = useRef(new ReciteInferenceBudget()), tail = useRef(new ReciteUtteranceTail());
  const voiced = useRef(false), startedAt = useRef(0);
  const stopCapture = useCallback((save = false) => {
    ++captureEpoch.current;
    if (save) reviewSession.current?.stop(); else reviewSession.current?.erase();
    if (ticker.current) clearInterval(ticker.current); ticker.current = null;
    if (processor.current) {processor.current.port.onmessage = null; processor.current.port.close(); processor.current.disconnect();} processor.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    const previous = context.current; context.current = null;
    void previous?.close().catch(() => {});
    audio.current.clear(); tracker.current.reset(); analyzed.current = -1; inFlight.current = false;
    tail.current.reset(); budget.current = new ReciteInferenceBudget(); voiced.current = false;
    if (mounted.current) setFeedback(null);
  }, []);
  const stop = useCallback((save = false) => {
    ++scope.current; busy.current = false;
    stopCapture(save); worker.current?.terminate(); worker.current = null; inFlight.current = false;
    if (cap.current) clearTimeout(cap.current); cap.current = null;
    if (mounted.current) {setPhase("idle"); setHeard(""); setMessage(save && shouldRecord.current ? "Stopped. Review your private recording below. Nothing was uploaded." : "Stopped. Microphone audio was erased, not saved or uploaded.");}
  }, [stopCapture]);
  useEffect(() => {
    mounted.current = true;
    setAvailable(Boolean(window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === "function" && typeof window.AudioWorkletNode === "function" && typeof window.Worker === "function" && crypto.subtle));
    const canRecord = typeof MediaRecorder !== "undefined"; setRecordingAvailable(canRecord);
    if (canRecord) reviewSession.current = createBrowserRecording({
      // Supported recognition always supplies its existing stream. Browsers
      // without a worker/worklet retain explicitly labeled audio-only fallback.
      getUserMedia: () => navigator.mediaDevices.getUserMedia({audio: true, video: false}),
      recorder: shared => {const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type)); return new MediaRecorder(shared, mimeType ? {mimeType} : undefined);},
      createUrl: blob => URL.createObjectURL(blob), revokeUrl: url => URL.revokeObjectURL(url), isVisible: () => !document.hidden,
    }, state => {if (mounted.current) setRecording(state);});
    const hide = () => {if (document.hidden) stop();};
    const leave = () => stop();
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", leave);
    return () => {mounted.current = false; document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", leave); reviewAudio.current?.pause(); stop(); reviewSession.current?.dispose(); reviewSession.current = null;};
  }, [stop]);
  const recordingBusy = recording.phase === "preparing" || recording.phase === "recording";
  useEffect(() => {onBusyChange?.(phase !== "idle" || recordingBusy);}, [phase, recordingBusy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  useEffect(() => {stop(); setFeedback(null);}, [verse?.verseKey, stop]);
  useEffect(() => {setReviewLoop(false);}, [recording.url]);
  useEffect(() => {if (reviewAudio.current) {reviewAudio.current.playbackRate = reviewSpeed; reviewAudio.current.preservesPitch = true; reviewAudio.current.loop = reviewLoop;}}, [reviewSpeed, reviewLoop, recording.url]);

  async function capture(token: number) {
    const captureId = ++captureEpoch.current;
    const acquired = await navigator.mediaDevices.getUserMedia({audio: {channelCount: 1, sampleRate: 16000, echoCancellation: false, autoGainControl: false, noiseSuppression: false}, video: false});
    if (!mounted.current || token !== scope.current || captureId !== captureEpoch.current || document.hidden) {acquired.getTracks().forEach(track => track.stop()); return;}
    stream.current = acquired;
    acquired.getAudioTracks().forEach(track => track.addEventListener("ended", () => {if (token === scope.current && captureId === captureEpoch.current) stop();}, {once: true}));
    const ac = new AudioContext(); context.current = ac;
    await ac.audioWorklet.addModule("/quran-runtime/pcm-worklet.js");
    if (token !== scope.current || captureId !== captureEpoch.current || document.hidden || ac.state === "closed") {
      acquired.getTracks().forEach(track => track.stop()); void ac.close().catch(() => {}); return;
    }
    const source = ac.createMediaStreamSource(acquired), node = new AudioWorkletNode(ac, "hbic-quran-capture");
    processor.current = node;
    node.port.onmessage = ({data}: MessageEvent<Float32Array>) => {
      if (token === scope.current && captureId === captureEpoch.current) {
        const samples = Array.from(data); audio.current.append(samples);
        const energy = containsVoiceEnergy(samples); voiced.current ||= energy; tail.current.append(audio.current.endSample, energy);
      }
      data.fill(0);
    };
    // A silent sink keeps capture live without playing the parent's voice.
    const mute = ac.createGain(); mute.gain.value = 0; source.connect(node); node.connect(mute); mute.connect(ac.destination);
    await ac.resume();
    if (token !== scope.current || captureId !== captureEpoch.current) return;
    if (shouldRecord.current) await reviewSession.current?.start(acquired);
    if (token !== scope.current || captureId !== captureEpoch.current) return;
    setPhase("listening"); setMessage("Listening privately on this device. Unclear words stay ungraded.");
    ticker.current = setInterval(() => {
      if (inFlight.current || token !== scope.current || captureId !== captureEpoch.current || !worker.current) return;
      const finishing = !voiced.current && tail.current.pending(audio.current.endSample);
      if (!budget.current.ready(Date.now(), audio.current.endSample, voiced.current, finishing)) return;
      const snapshot = audio.current.snapshotWithTimeline();
      if (snapshot.endSample <= analyzed.current || snapshot.pcm.length < 16000) {snapshot.pcm.fill(0); return;}
      analyzed.current = snapshot.endSample; inFlight.current = true;
      tail.current.analyzed(voiced.current); voiced.current = false; budget.current.started(snapshot.endSample); startedAt.current = Date.now();
      worker.current.postMessage({type: "recognize", pcm: snapshot.pcm.buffer, startSample: snapshot.startSample, request: captureEpoch.current}, [snapshot.pcm.buffer]);
    }, 500);
  }
  async function start() {
    if (busy.current || blocked || !consent || !verse || !available) return;
    reviewAudio.current?.pause(); reviewSession.current?.erase(); shouldRecord.current = saveRecording && recordingAvailable;
    busy.current = true; const token = ++scope.current; stopPlayback?.(); setPhase("preparing"); setFeedback(null);
    setMessage("Preparing verified recognition data. First use downloads approximately 89 MB plus the browser runtime.");
    try {
      const next = new Worker(new URL("../lib/quranReciteWorker.ts", import.meta.url)); worker.current = next;
      await new Promise<void>((resolve, reject) => {
        next.onerror = () => reject(new Error("This browser could not start the recognition worker."));
        next.onmessage = ({data}: MessageEvent<WorkerMessage>) => {
          if (token !== scope.current || !mounted.current) return;
          if (data.type === "progress") setMessage(data.message ?? "Preparing recognition…");
          if (data.type === "ready") resolve();
          if (data.type === "error") reject(new Error(data.message));
        };
        next.postMessage({type: "prepare", origin: location.origin});
      });
      if (token !== scope.current || document.hidden || !mounted.current) return;
      next.onerror = () => {if (token === scope.current) {stop(); setMessage("Recognition stopped unexpectedly. Reading and self-tests still work.");}};
      next.onmessage = ({data}: MessageEvent<WorkerMessage>) => {
        if (token !== scope.current || !mounted.current) return;
        if (data.request !== undefined && data.request !== captureEpoch.current) return;
        inFlight.current = false;
        if (data.request === captureEpoch.current) budget.current.finished(Date.now(), Date.now() - startedAt.current);
        if (data.type === "error" && (data.request === undefined || data.request === captureEpoch.current)) {stop(); setMessage(data.message ?? "Recognition is unavailable. Please retry.");}
        if (data.type === "observation" && data.observation && selected.current && stream.current && data.request === captureEpoch.current) {
          if (data.observation.text.trim()) setHeard(data.observation.text);
          const result = tracker.current.observe(selected.current.textUthmani, data.observation); setFeedback(result);
          setMessage(result.status === "uncertain" ? result.followingIndex !== undefined ? "Following your voice; the rest is still uncertain." : "Couldn’t hear clearly enough—no mistake marked." : result.status === "possible_difference" ? "Possible word difference. Reveal and review with the reference." : "Following the recited words. This is not a score.");
        }
      };
      await capture(token);
      if (token !== scope.current || !mounted.current || !stream.current || document.hidden) return;
      cap.current = setTimeout(() => stop(true), 120000);
    } catch (error) {
      if (token !== scope.current || !mounted.current) return;
      stop(); setMessage(error instanceof Error ? error.message : "Microphone or recognition is unavailable. Reading and self-tests still work.");
    }
  }
  async function togglePause() {
    if (phase === "listening") {stopCapture(); setPhase("paused"); setMessage("Paused. Microphone off. Resume from this ayah.");}
    else if (phase === "paused") {
      setPhase("preparing");
      const token = scope.current, captureId = captureEpoch.current + 1;
      try {await capture(token);} catch {if (token === scope.current && captureId === captureEpoch.current) {stop(); setMessage("Microphone could not resume. Please retry.");}}
    }
  }
  return <section className={styles.assist} aria-label="Recite Assist preview">
    <small>EARLY PREVIEW · NOT A VERIFIED ASSESSMENT</small><h3>{testMode ? "Recitation Test" : "Recite Assist"}</h3>
    <p>Can miss or misidentify words. Always review with the Quran reference or a qualified teacher. No Tajweed or pronunciation assessment.</p>
    {!available ? <><p>On-device recognition is unavailable in this browser. Reading, listening and self-tests remain available.</p>
      {recordingAvailable ? <><label className={styles.consent}><input type="checkbox" checked={consent} disabled={recordingBusy} onChange={e => setConsent(e.target.checked)} />Allow private recording. No upload; leaving or backgrounding this page deletes it.</label>
        <button disabled={blocked || !verse || !consent || recording.phase === "preparing"} onClick={() => {reviewAudio.current?.pause(); stopPlayback?.(); if (recording.phase === "recording") reviewSession.current?.stop(); else void reviewSession.current?.start();}}>{recording.phase === "preparing" ? "Waiting for microphone…" : recording.phase === "recording" ? "Stop & Review" : "Record Only"}</button><p>Audio-only fallback · no automatic word tracking or corrections.</p></> : null}</> : <>
      <label className={styles.consent}><input type="checkbox" checked={consent} disabled={phase !== "idle"} onChange={e => setConsent(e.target.checked)} />I understand this is experimental. Download the verified model; microphone audio stays on this device. No audio is uploaded.</label>
      {recordingAvailable ? <label className={styles.consent}><input type="checkbox" checked={saveRecording} disabled={phase !== "idle"} onChange={e => setSaveRecording(e.target.checked)} />Keep a private recording for review in this browser. Leaving or backgrounding this page deletes it; download only if you choose.</label> : null}
      <div className={styles.controls}><button disabled={blocked || (!consent && phase === "idle") || !verse} onClick={() => phase === "idle" ? void start() : stop(phase !== "preparing")}>{phase === "idle" ? <Mic size={17} /> : <Square size={17} />}{phase === "idle" ? testMode ? "Start Recitation Test" : saveRecording ? "Recite & Record" : "Start Recitation" : phase === "preparing" ? "Cancel preparation" : "Stop & Review"}</button>
      {phase === "listening" || phase === "paused" ? <button onClick={() => void togglePause()}>{phase === "paused" ? <Play size={17} /> : <Pause size={17} />}{phase === "paused" ? "Resume" : "Pause"}</button> : null}</div>
    </>}
    <p role="status" aria-live="polite">{message}</p>
    {recording.error ? <p role="alert">{recording.error} Word tracking can continue without saving audio.</p> : null}
    {recording.url ? <div className={styles.localRecording}><audio ref={reviewAudio} src={recording.url} controls preload="metadata" aria-label={`Your recitation of ${verse?.verseKey ?? "the selected ayah"}`} onPlay={() => {if (busy.current || recordingBusy || blocked) reviewAudio.current?.pause(); else stopPlayback?.();}} />
      <div className={styles.actionRow}><label>Review speed<select aria-label="Recording playback speed" value={reviewSpeed} onChange={e => {const rate = Number(e.target.value); if (validQuranPlaybackSpeed(rate)) setReviewSpeed(rate);}}>{QURAN_PLAYBACK_SPEEDS.map(rate => <option key={rate} value={rate}>{rate}×</option>)}</select></label><button aria-pressed={reviewLoop} onClick={() => setReviewLoop(v => !v)}>{reviewLoop ? "Loop On" : "Loop Off"}</button><button onClick={() => {reviewAudio.current?.pause(); reviewSession.current?.erase();}}><Trash2 size={16} />Delete recording</button><a href={recording.url} download={`quran-${verse?.verseKey.replace(":", "-") ?? "recitation"}.${recordingExtension(recording.mimeType ?? "")}`}>Download to my device</a></div></div> : null}
    <small>{available ? "Sessions stop after two minutes. Pause releases the microphone and discards the unfinished recording." : "Audio-only recordings stop after five minutes."}</small>
    {heard && !concealed ? <div><small>Recognized speech · may contain transcription errors</small><p lang="ar" dir="rtl" translate="no" aria-label="Recognized speech">{heard}</p></div> : null}
    {feedback?.differences.map((difference,index) => <div key={`${difference.kind}:${difference.index}:${index}`}><p>Possible {difference.kind === "omission" ? "skipped word" : difference.kind === "substitution" ? "different word" : difference.kind === "repetition" ? "repeated word" : "extra word"}{difference.index !== null ? ` · Word ${difference.index + 1}` : ""}</p>{difference.index !== null && onRevealWord ? <button onClick={() => onRevealWord(difference.index!)}>Show correction hint</button> : null}</div>)}
    {feedback && !concealed ? <p lang="ar" dir="rtl" translate="no" className={styles.assistWords}>{feedback.words.map((word, index) => <span key={index} data-state={word.state} aria-current={feedback.followingIndex === index ? "location" : undefined}>{word.text} </span>)}</p> : feedback ? <p>The passage stays hidden until you choose Reveal.</p> : null}
    <small>Model: <a href="https://huggingface.co/muhdur/tilawi-fastconformer-quran" target="_blank" rel="noreferrer">Tilawi / Muhammad Dur</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Reference text: Quran Foundation. No recitation score.</small>
  </section>;
}
