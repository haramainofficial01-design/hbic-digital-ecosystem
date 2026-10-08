import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { QuranPassage, QuranRecording } from "@hbic/shared";

export function useQuranRecording(passage: QuranPassage, onSave: (recording: QuranRecording) => Promise<unknown>, stopPlayback: () => void) {
  const [phase, setPhase] = useState<"idle" | "preparing" | "recording" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const context = useRef<{ passage: QuranPassage; started: number } | null>(null);
  const busy = useRef(false);
  const active = useRef(true), generation = useRef(0);
  const endRef = useRef<() => Promise<void>>(async () => {});
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 }, (status) => {
    if (status.hasError) setError("Recording was interrupted. Please try again.");
    if (status.isFinished && context.current && !busy.current) void endRef.current();
  });
  const saveRef = useRef(onSave); saveRef.current = onSave;
  const stop = useCallback(async () => {
    const session = context.current;
    if (!session || busy.current) return;
    busy.current = true; setPhase("saving");
    try {
      if (recorder.isRecording) await recorder.stop();
      const uri = recorder.uri;
      if (!uri || !FileSystem.documentDirectory) throw new Error("This recording could not be saved.");
      const dir = `${FileSystem.documentDirectory}quran-practice/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const id = `quran-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const destination = `${dir}${id}.m4a`;
      await FileSystem.copyAsync({ from: uri, to: destination });
      try {
        await saveRef.current({ ...session.passage, id, uri: destination, createdAt: new Date().toISOString(),
          durationMillis: Math.max(1, Math.min(300000, Date.now() - session.started)) });
      } catch (reason) { await FileSystem.deleteAsync(destination, { idempotent: true }); throw reason; }
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Recording could not be saved."); }
    finally { context.current = null; busy.current = false; setPhase("idle"); await setAudioModeAsync({ allowsRecording: false }).catch(() => {}); }
  }, [recorder]);
  endRef.current = stop;
  useEffect(() => {
    active.current = true;
    const subscription = AppState.addEventListener("change", (state) => { if (state !== "active") { ++generation.current; void stop(); } });
    // Invalidate pending permission/preparation work before releasing the recorder.
    return () => { active.current = false; ++generation.current; subscription.remove(); if (context.current) void stop(); }; // eslint-disable-line react-hooks/exhaustive-deps
  }, [stop]);
  async function start() {
    if (busy.current || context.current) return;
    busy.current = true; setError(null); setPhase("preparing"); stopPlayback();
    const epoch = ++generation.current;
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!active.current || epoch !== generation.current || AppState.currentState !== "active") throw new Error("Recording cancelled. Tap Record again when you return.");
      if (!permission.granted) throw new Error(permission.canAskAgain
        ? "Microphone access was declined. You can still listen and practise without recording."
        : "Enable microphone access in your phone Settings to record. Listening still works.");
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "doNotMix" });
      await recorder.prepareToRecordAsync();
      if (!active.current || epoch !== generation.current || AppState.currentState !== "active") throw new Error("Recording cancelled. Tap Record again when you return.");
      context.current = { passage: { ...passage }, started: Date.now() };
      recorder.record({ forDuration: 300 }); setPhase("recording");
    } catch (reason) { context.current = null; if (active.current) { setPhase("idle"); setError(reason instanceof Error ? reason.message : "Microphone recording is unavailable."); }
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {}); }
    finally { busy.current = false; }
  }
  return { phase, error, start, stop };
}
