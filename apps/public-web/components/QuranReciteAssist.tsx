"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import {Mic, Pause, Play, Square} from "lucide-react";
import type {QuranVerse} from "@hbic/shared";
import {ReciteAudioWindow, type ReciteFeedback} from "../../mobile/src/quran/reciteAssistFeedback";
import {RecitationTracker, type RecitationObservation} from "../../mobile/src/quran/recitationTracking";
import styles from "./QuranReader.module.css";

interface WorkerMessage {type: "ready" | "progress" | "error" | "observation"; message?: string; observation?: RecitationObservation; request?: number}
export function QuranReciteAssist({verse, concealed, blocked = false, stopPlayback, onBusyChange}: {
  verse: QuranVerse | null; concealed: boolean; blocked?: boolean; stopPlayback?: () => void; onBusyChange?: (busy: boolean) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "preparing" | "listening" | "paused">("idle");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("Optional on-device word tracking. Can miss or misidentify words; not a Tajweed or pronunciation assessment.");
  const [feedback, setFeedback] = useState<ReciteFeedback | null>(null);
  const [available, setAvailable] = useState(false);
  const scope = useRef(0), mounted = useRef(true), busy = useRef(false);
  const selected = useRef(verse); selected.current = verse;
  const worker = useRef<Worker | null>(null), stream = useRef<MediaStream | null>(null), context = useRef<AudioContext | null>(null);
  const processor = useRef<AudioWorkletNode | null>(null), ticker = useRef<ReturnType<typeof setInterval> | null>(null), cap = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useRef(new ReciteAudioWindow()), tracker = useRef(new RecitationTracker());
  const inFlight = useRef(false), analyzed = useRef(-1);
  const captureEpoch = useRef(0);
  const stopCapture = useCallback(() => {
    ++captureEpoch.current;
    if (ticker.current) clearInterval(ticker.current); ticker.current = null;
    if (processor.current) {processor.current.port.onmessage = null; processor.current.port.close(); processor.current.disconnect();} processor.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    const previous = context.current; context.current = null;
    void previous?.close().catch(() => {});
    audio.current.clear(); tracker.current.reset(); analyzed.current = -1;
    if (mounted.current) setFeedback(null);
  }, []);
  const stop = useCallback(() => {
    ++scope.current; busy.current = false;
    stopCapture(); worker.current?.terminate(); worker.current = null; inFlight.current = false;
    if (cap.current) clearTimeout(cap.current); cap.current = null;
    if (mounted.current) {setPhase("idle"); setMessage("Stopped. Microphone audio was erased, not saved or uploaded.");}
  }, [stopCapture]);
  useEffect(() => {
    mounted.current = true;
    setAvailable(Boolean(window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === "function" && typeof window.AudioWorkletNode === "function" && typeof window.Worker === "function" && crypto.subtle));
    const hide = () => {if (document.hidden) stop();};
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", stop);
    return () => {mounted.current = false; document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", stop); stop();};
  }, [stop]);
  useEffect(() => {onBusyChange?.(phase !== "idle");}, [phase, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  useEffect(() => {stop(); setFeedback(null);}, [verse?.verseKey, stop]);

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
      if (token === scope.current && captureId === captureEpoch.current) audio.current.append(Array.from(data));
      data.fill(0);
    };
    // A silent sink keeps capture live without playing the parent's voice.
    const mute = ac.createGain(); mute.gain.value = 0; source.connect(node); node.connect(mute); mute.connect(ac.destination);
    await ac.resume();
    if (token !== scope.current || captureId !== captureEpoch.current) return;
    setPhase("listening"); setMessage("Listening privately on this device. Unclear words stay ungraded.");
    ticker.current = setInterval(() => {
      if (inFlight.current || token !== scope.current || captureId !== captureEpoch.current || !worker.current) return;
      const snapshot = audio.current.snapshotWithTimeline();
      if (snapshot.endSample <= analyzed.current || snapshot.pcm.length < 16000) {snapshot.pcm.fill(0); return;}
      analyzed.current = snapshot.endSample; inFlight.current = true;
      worker.current.postMessage({type: "recognize", pcm: snapshot.pcm.buffer, startSample: snapshot.startSample, request: captureEpoch.current}, [snapshot.pcm.buffer]);
    }, 2500);
  }
  async function start() {
    if (busy.current || blocked || !consent || !verse || !available) return;
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
        inFlight.current = false;
        if (data.type === "error" && (data.request === undefined || data.request === captureEpoch.current)) {stop(); setMessage(data.message ?? "Recognition is unavailable. Please retry.");}
        if (data.type === "observation" && data.observation && selected.current && stream.current && data.request === captureEpoch.current) {
          const result = tracker.current.observe(selected.current.textUthmani, data.observation); setFeedback(result);
          setMessage(result.status === "uncertain" ? "Couldn’t hear clearly enough—no mistake marked." : result.status === "possible_difference" ? "Possible word difference. Reveal and review with the reference." : "Following the recited words. This is not a score.");
        }
      };
      await capture(token);
      if (token !== scope.current || !mounted.current || !stream.current || document.hidden) return;
      cap.current = setTimeout(stop, 120000);
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
    <small>EARLY PREVIEW · NOT A VERIFIED ASSESSMENT</small><h3>Recite Assist</h3>
    <p>Can miss or misidentify words. Always review with the Quran reference or a qualified teacher. No Tajweed or pronunciation assessment.</p>
    {!available ? <p>On-device recognition is unavailable in this browser. Use the HBIC app, or continue with reading, listening and self-tests.</p> : <>
      <label className={styles.consent}><input type="checkbox" checked={consent} disabled={phase !== "idle"} onChange={e => setConsent(e.target.checked)} />I understand this is experimental. Download the verified model; microphone audio stays on this device and is erased when stopped.</label>
      <div className={styles.controls}><button disabled={blocked || (!consent && phase === "idle") || !verse} onClick={() => phase === "idle" ? void start() : stop()}>{phase === "idle" ? <Mic size={17} /> : <Square size={17} />}{phase === "idle" ? "Start Recite Assist" : phase === "preparing" ? "Cancel preparation" : "Stop Recite Assist"}</button>
      {phase === "listening" || phase === "paused" ? <button onClick={() => void togglePause()}>{phase === "paused" ? <Play size={17} /> : <Pause size={17} />}{phase === "paused" ? "Resume" : "Pause"}</button> : null}</div>
    </>}
    <p role="status" aria-live="polite">{message}</p>
    {feedback && !concealed ? <p lang="ar" dir="rtl" translate="no" className={styles.assistWords}>{feedback.words.map((word, index) => <span key={index} data-state={word.state}>{word.text} </span>)}</p> : feedback ? <p>The passage stays hidden until you choose Reveal.</p> : null}
    <small>Model: <a href="https://huggingface.co/muhdur/tilawi-fastconformer-quran" target="_blank" rel="noreferrer">Tilawi / Muhammad Dur</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Reference text: Quran Foundation. No recitation score.</small>
  </section>;
}
