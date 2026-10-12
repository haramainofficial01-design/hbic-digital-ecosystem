import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { QuranAudioQueue, type QuranPlayback } from "./audioQueue";
import { validQuranPlaybackSpeed, type QuranVerse } from "@hbic/shared";
import { validListeningUrl } from "../services/quranListening";

export function useQuranAudio() {
  // Stream provider audio. Progress belongs only to the mini-player, not the
  // Quran screen/Arabic list: each native clock tick must not redraw the reader.
  const player = useAudioPlayer(null, { updateInterval: 1000, downloadFirst: false });
  const [loadState, setLoadState] = useState({ isLoaded: false, isBuffering: false });
  const previousLoad = useRef(loadState);
  const [playback, setPlayback] = useState<QuranPlayback>({ phase: "idle", verse: null, index: 0, count: 0, error: null });
  const [externalPlayback, setExternalPlayback] = useState<{ kind: "recording" | "chapter"; title: string; subtitle: string } | null>(null);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [loopCurrent, setLoopState] = useState(false);
  const options = useRef({ speed: 1, loop: false });
  const applyOptions = useCallback(() => {
    player.loop = options.current.loop;
    player.shouldCorrectPitch = true;
    player.setPlaybackRate(options.current.speed, "high");
  }, [player]);
  const local = useRef(false);
  const explicitPause = useRef(false);
  const command = useRef(0);
  const cancelLoad = useRef<(() => void) | null>(null);
  const invalidate = useCallback(() => { cancelLoad.current?.(); cancelLoad.current = null; return ++command.current; }, []);
  const safePause = useCallback(() => {
    try { player.pause(); }
    catch (error) {
      // Expo owns disposal. Its cleanup can release the shared object before
      // navigation/fast-refresh cleanup invalidates our pending queue.
      if (!(error instanceof Error) || !/shared object|NativeSharedObjectNotFound/i.test(error.message)) throw error;
    }
  }, [player]);
  const queue = useMemo(() => new QuranAudioQueue({ replace: (uri) => { player.replace({ uri }); applyOptions(); }, play: () => player.play(),
    pause: safePause, seekTo: (seconds) => player.seekTo(seconds) }, setPlayback), [player, safePause, applyOptions]);
  const lastFinished = useRef(false);
  useEffect(() => {
    const subscription = player.addListener("playbackStatusUpdate", (status) => {
    // Android's native audio lifecycle can resume a previously paused player
    // on foreground/audio-focus gain. Keep the user's interruption pause until
    // an explicit Play/Resume/Next command, including for full-surah streams.
    if (explicitPause.current && status.playing) { safePause(); return; }
    if (previousLoad.current.isLoaded !== status.isLoaded || previousLoad.current.isBuffering !== status.isBuffering) {
      previousLoad.current = { isLoaded: status.isLoaded, isBuffering: status.isBuffering };
      setLoadState(previousLoad.current);
    }
    if (status.didJustFinish && !lastFinished.current && !options.current.loop) {
      if (local.current) { local.current = false; setExternalPlayback(null); }
      else void queue.finished();
    }
    lastFinished.current = status.didJustFinish;
    if (!status.didJustFinish && !local.current && status.isLoaded && !status.isBuffering
      && !status.playing && status.currentTime > 0 && queue.snapshot().phase === "playing") queue.interrupted();
    });
    return () => subscription.remove();
  }, [player, queue, safePause]);
  useFocusEffect(useCallback(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") { explicitPause.current = true; invalidate(); if (local.current) safePause(); else queue.interrupted(); }
      else if (explicitPause.current) safePause();
    });
    return () => { explicitPause.current = true; invalidate(); queue.stop(); local.current = false; options.current.loop = false; setLoopState(false); setExternalPlayback(null); subscription.remove(); };
  }, [queue, safePause, invalidate]));
  useEffect(() => {
    if (playback.phase !== "playing" || (loadState.isLoaded && !loadState.isBuffering)) return;
    const timeout = setTimeout(() => queue.fail("Audio could not load. Check your connection, then tap Play to retry."), 20_000);
    return () => clearTimeout(timeout);
  }, [playback.phase, playback.verse?.verseKey, loadState.isLoaded, loadState.isBuffering, queue]);
  useEffect(() => {
    if (!externalPlayback || (loadState.isLoaded && !loadState.isBuffering)) return;
    const timeout = setTimeout(() => { safePause(); setExternalError("Audio could not load. Check your connection, then select it again to retry."); }, 20_000);
    return () => clearTimeout(timeout);
  }, [externalPlayback, loadState.isLoaded, loadState.isBuffering, safePause]);
  const prepare = useCallback(async () => {
    local.current = false; setExternalPlayback(null); setExternalError(null);
    options.current.loop = false; setLoopState(false);
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: false,
      interruptionMode: "doNotMix", shouldRouteThroughEarpiece: false });
  }, []);
  const playRecording = useCallback(async (uri: string, startSeconds = 0) => {
    if (!uri.startsWith("file://")) throw new Error("Recording is not stored on this device.");
    const epoch = invalidate(); queue.stop(); await prepare();
    if (epoch !== command.current || AppState.currentState !== "active") return;
    explicitPause.current = false;
    local.current = true; setExternalPlayback({ kind: "recording", title: "Your local recording", subtitle: "Private · on this device" });
    player.replace({ uri }); applyOptions();
    if (startSeconds > 0) {
      await new Promise<void>((resolve, reject) => {
        const finish = (error?: Error) => { clearTimeout(timeout); subscription.remove(); cancelLoad.current = null; if (error) reject(error); else resolve(); };
        const timeout = setTimeout(() => finish(new Error("Recording did not load.")), 10000);
        const subscription = player.addListener("playbackStatusUpdate", status => {
          if (epoch !== command.current) finish(new Error("Playback cancelled."));
          else if (status.isLoaded) finish();
        });
        cancelLoad.current = () => finish(new Error("Playback cancelled."));
        if (player.isLoaded) finish();
      });
      if (epoch !== command.current) return;
      await player.seekTo(Math.max(0, Math.min(player.duration, startSeconds)));
    }
    if (epoch === command.current) player.play();
  }, [queue, prepare, player, invalidate, applyOptions]);
  const playStream = useCallback(async (uri: string, title: string, subtitle: string) => {
    if (!validListeningUrl(uri)) throw new Error("The recording source could not be verified.");
    const epoch = invalidate(); queue.stop(); await prepare();
    if (epoch !== command.current || AppState.currentState !== "active") return;
    explicitPause.current = false;
    local.current = true; setExternalPlayback({ kind: "chapter", title, subtitle });
    player.replace({ uri }); applyOptions(); player.play();
  }, [queue, prepare, player, invalidate, applyOptions]);
  const start = useCallback(async (sequence: number[], load: (ayah: number) => Promise<QuranVerse>) => {
      const epoch = invalidate(); queue.stop(); await prepare();
      if (epoch === command.current && AppState.currentState === "active") { explicitPause.current = false; await queue.start(sequence, load); }
  }, [queue, prepare, invalidate]);
  const togglePause = useCallback(async () => {
    if (AppState.currentState !== "active") return;
    if (local.current) { explicitPause.current = player.playing; if (player.playing) player.pause(); else player.play(); }
    else if (queue.snapshot().phase === "playing") { explicitPause.current = true; queue.pause(); }
    else { explicitPause.current = false; await queue.resume(); }
  }, [player, queue]);
  const navigate = useCallback(async (action: "next" | "previous" | "replay") => {
    if (AppState.currentState !== "active") return;
    explicitPause.current = false; await queue[action]();
  }, [queue]);
  const stop = useCallback(() => {
    explicitPause.current = true; invalidate(); queue.stop(); local.current = false; options.current.loop = false;
    try { player.loop = false; } catch (error) { if (!(error instanceof Error) || !/shared object|NativeSharedObjectNotFound/i.test(error.message)) throw error; }
    setLoopState(false); setExternalPlayback(null); setExternalError(null);
  }, [queue, invalidate, player]);
  const setSpeed = useCallback((rate: number) => {
    if (!validQuranPlaybackSpeed(rate)) return;
    options.current.speed = rate; applyOptions(); setSpeedState(rate);
  }, [applyOptions]);
  const setLoopCurrent = useCallback((value: boolean) => { options.current.loop = value; player.loop = value; setLoopState(value); }, [player]);
  const seek = useCallback((seconds: number) => player.seekTo(Math.max(0, Math.min(player.duration, seconds))), [player]);
  const replayCurrent = useCallback(async () => {
    if (AppState.currentState !== "active") return;
    if (!local.current) { explicitPause.current = false; await queue.replay(); return; }
    const epoch = command.current;
    await player.seekTo(0);
    if (epoch === command.current && AppState.currentState === "active") { explicitPause.current = false; player.play(); }
  }, [queue, player]);
  return useMemo(() => ({ queue, playback, player, prepare, playRecording, playStream, externalPlayback, externalError, expanded, setExpanded,
    start, togglePause, navigate, stop, setSpeed, speed, loopCurrent, setLoopCurrent, replayCurrent, seek }), [queue, playback, player, prepare, playRecording, playStream, externalPlayback, externalError, expanded, start, togglePause, navigate, stop, setSpeed, speed, loopCurrent, setLoopCurrent, replayCurrent, seek]);
}
