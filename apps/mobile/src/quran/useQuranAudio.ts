import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { QuranAudioQueue, type QuranPlayback } from "./audioQueue";
import type { QuranVerse } from "@hbic/shared";
import { validListeningUrl } from "../services/quranListening";

export function useQuranAudio() {
  const player = useAudioPlayer(null, { updateInterval: 750 });
  const status = useAudioPlayerStatus(player);
  const [playback, setPlayback] = useState<QuranPlayback>({ phase: "idle", verse: null, index: 0, count: 0, error: null });
  const [externalPlayback, setExternalPlayback] = useState<{ kind: "recording" | "chapter"; title: string; subtitle: string } | null>(null);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const local = useRef(false);
  const command = useRef(0);
  const safePause = useCallback(() => {
    try { player.pause(); }
    catch (error) {
      // Expo owns disposal. Its cleanup can release the shared object before
      // navigation/fast-refresh cleanup invalidates our pending queue.
      if (!(error instanceof Error) || !/shared object|NativeSharedObjectNotFound/i.test(error.message)) throw error;
    }
  }, [player]);
  const queue = useMemo(() => new QuranAudioQueue({ replace: (uri) => player.replace({ uri }), play: () => player.play(),
    pause: safePause, seekTo: (seconds) => player.seekTo(seconds) }, setPlayback), [player, safePause]);
  const lastFinished = useRef(false);
  useEffect(() => {
    if (status.didJustFinish && !lastFinished.current) {
      if (local.current) { local.current = false; setExternalPlayback(null); }
      else void queue.finished();
    }
    lastFinished.current = status.didJustFinish;
    if (!status.didJustFinish && !local.current && status.isLoaded && !status.isBuffering
      && !status.playing && status.currentTime > 0 && queue.snapshot().phase === "playing") queue.interrupted();
  }, [status.didJustFinish, status.isLoaded, status.isBuffering, status.playing, status.currentTime, queue]);
  useFocusEffect(useCallback(() => {
    const subscription = AppState.addEventListener("change", (state) => { if (state !== "active") { ++command.current; if (local.current) safePause(); else queue.interrupted(); } });
    return () => { ++command.current; queue.stop(); local.current = false; setExternalPlayback(null); subscription.remove(); };
  }, [queue, safePause]));
  useEffect(() => {
    if (playback.phase !== "playing" || (status.isLoaded && !status.isBuffering)) return;
    const timeout = setTimeout(() => queue.fail("Audio could not load. Check your connection, then tap Play to retry."), 20_000);
    return () => clearTimeout(timeout);
  }, [playback.phase, playback.verse?.verseKey, status.isLoaded, status.isBuffering, queue]);
  useEffect(() => {
    if (!externalPlayback || (status.isLoaded && !status.isBuffering)) return;
    const timeout = setTimeout(() => { safePause(); setExternalError("Audio could not load. Check your connection, then select it again to retry."); }, 20_000);
    return () => clearTimeout(timeout);
  }, [externalPlayback, status.isLoaded, status.isBuffering, safePause]);
  async function prepare() {
    local.current = false; setExternalPlayback(null); setExternalError(null);
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: false,
      interruptionMode: "doNotMix", shouldRouteThroughEarpiece: false });
  }
  async function playRecording(uri: string) {
    if (!uri.startsWith("file://")) throw new Error("Recording is not stored on this device.");
    const epoch = ++command.current; queue.stop(); await prepare();
    if (epoch !== command.current || AppState.currentState !== "active") return;
    local.current = true; setExternalPlayback({ kind: "recording", title: "Your local recording", subtitle: "Private · on this device" });
    player.replace({ uri }); player.play();
  }
  async function playStream(uri: string, title: string, subtitle: string) {
    if (!validListeningUrl(uri)) throw new Error("The recording source could not be verified.");
    const epoch = ++command.current; queue.stop(); await prepare();
    if (epoch !== command.current || AppState.currentState !== "active") return;
    local.current = true; setExternalPlayback({ kind: "chapter", title, subtitle });
    player.replace({ uri }); player.play();
  }
  return { queue, playback, status, prepare, playRecording, playStream, externalPlayback, externalError, expanded, setExpanded,
    async start(sequence: number[], load: (ayah: number) => Promise<QuranVerse>) {
      const epoch = ++command.current; queue.stop(); await prepare();
      if (epoch === command.current && AppState.currentState === "active") await queue.start(sequence, load);
    },
    async togglePause() { if (local.current) { if (player.playing) player.pause(); else player.play(); }
      else if (queue.snapshot().phase === "playing") queue.pause(); else await queue.resume(); },
    stop() { ++command.current; queue.stop(); local.current = false; setExternalPlayback(null); setExternalError(null); },
    setSpeed(rate: number) { player.setPlaybackRate(rate, "high"); },
    seek(seconds: number) { return player.seekTo(Math.max(0, Math.min(status.duration, seconds))); } };
}
