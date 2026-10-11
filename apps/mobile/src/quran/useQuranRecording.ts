import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { QuranPassage, QuranRecording } from "@hbic/shared";
import { quranRecordingPermission } from "./recordingPermission";
import { recordingMessage } from "./recordingMessage";

export function useQuranRecording(passage: QuranPassage, onSave: (recording: QuranRecording) => Promise<unknown>, stopPlayback: () => void, keepAfterSession = true) {
  const [phase, setPhase] = useState<"idle" | "preparing" | "recording" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const context = useRef<{ passage: QuranPassage; started: number; keep: boolean } | null>(null);
  const [temporary, setTemporary] = useState<QuranRecording | null>(null);
  const temporaryRef = useRef<QuranRecording | null>(null);
  const busy = useRef(false);
  const active = useRef(true), generation = useRef(0);
  const permissionDialog = useRef(false);
  const endRef = useRef<() => Promise<void>>(async () => {});
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 }, (status) => {
    if (status.hasError) setError("Recording was interrupted. Please try again.");
    if (status.isFinished && context.current && !busy.current) void endRef.current();
  });
  const saveRef = useRef(onSave); saveRef.current = onSave;
  const eraseTemporary = useCallback(async () => {
    const old = temporaryRef.current;
    if (old?.uri.startsWith(`${FileSystem.cacheDirectory}quran-session/`)) await FileSystem.deleteAsync(old.uri, { idempotent: true });
    if (temporaryRef.current === old) {
      temporaryRef.current = null;
      if (active.current) setTemporary(null);
    }
  }, []);
  const accept = useCallback(async (record: QuranRecording, keep: boolean, allowSessionReview = true) => {
    const reviewGeneration = generation.current;
    const base = keep ? FileSystem.documentDirectory : FileSystem.cacheDirectory;
    if (!base) throw new Error("Recording storage is unavailable.");
    const dir = `${base}${keep ? "quran-practice" : "quran-session"}/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const extension = record.uri.endsWith(".wav") ? "wav" : "m4a";
    const destination = `${dir}${record.id}.${extension}`;
    if (destination !== record.uri) await FileSystem.copyAsync({ from: record.uri, to: destination });
    const saved = { ...record, uri: destination };
    try {
      if (keep) await saveRef.current(saved);
      else if (allowSessionReview && reviewGeneration === generation.current && active.current && AppState.currentState === "active") {
        await eraseTemporary();
        if (reviewGeneration === generation.current && active.current && AppState.currentState === "active") {
          temporaryRef.current = saved; setTemporary(saved);
        } else { await FileSystem.deleteAsync(destination, { idempotent: true }); }
      } else { await FileSystem.deleteAsync(destination, { idempotent: true }); }
    } catch (reason) { await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => {}); throw reason; }
    if (record.uri !== destination) await FileSystem.deleteAsync(record.uri, { idempotent: true });
  }, [eraseTemporary]);
  const stop = useCallback(async () => {
    const session = context.current;
    if (!session || busy.current) return;
    const allowSessionReview = active.current && AppState.currentState === "active";
    busy.current = true; if (active.current) setPhase("saving");
    try {
      // Android may have natively PAUSED before the JS background event. Stop
      // that owned session too, or the native lifecycle can restart it later.
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri || !FileSystem.documentDirectory) throw new Error("This recording could not be saved.");
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || info.isDirectory || info.size < 64) throw new Error("The recording file is empty.");
      const id = `quran-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await accept({ ...session.passage, id, uri, createdAt: new Date().toISOString(),
        durationMillis: Math.max(1, Math.min(300000, Date.now() - session.started)) }, session.keep, allowSessionReview);
    } catch (reason) { if (active.current) setError(recordingMessage(reason, "save")); }
    finally { context.current = null; busy.current = false; if (active.current) setPhase("idle"); await setAudioModeAsync({ allowsRecording: false }).catch(() => {}); }
  }, [recorder, accept]);
  endRef.current = stop;
  useEffect(() => {
    active.current = true;
    const subscription = AppState.addEventListener("change", (state) => { if (state !== "active" && !permissionDialog.current) { ++generation.current; void stop(); void eraseTemporary().catch(() => {}); } });
    // Invalidate pending permission/preparation work before releasing the recorder.
    // This is an async-command generation, not a DOM ref: invalidate its
    // current value on teardown rather than a stale value captured at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { active.current = false; ++generation.current; subscription.remove(); if (context.current) void stop(); void eraseTemporary().catch(() => {}); };
  }, [stop, eraseTemporary]);
  async function start() {
    if (busy.current || context.current) return;
    busy.current = true; setError(null); setPhase("preparing"); stopPlayback();
    const epoch = ++generation.current;
    try {
      const permission = await quranRecordingPermission(AudioModule, {
        isActive: () => AppState.currentState === "active", subscribe: (check) => AppState.addEventListener("change", check)
      }, (waiting) => { permissionDialog.current = waiting; });
      if (!active.current || epoch !== generation.current || AppState.currentState !== "active") throw new Error("Recording cancelled. Tap Record again when you return.");
      if (!permission.granted) throw new Error(permission.canAskAgain
        ? "Microphone access was declined. You can still listen and practise without recording."
        : "Enable microphone access in your phone Settings to record. Listening still works.");
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "doNotMix" });
      await recorder.prepareToRecordAsync();
      if (!active.current || epoch !== generation.current || AppState.currentState !== "active") throw new Error("Recording cancelled. Tap Record again when you return.");
      await eraseTemporary();
      context.current = { passage: { ...passage }, started: Date.now(), keep: keepAfterSession };
      recorder.record({ forDuration: 300 }); setPhase("recording");
    } catch (reason) { context.current = null; if (active.current) { setPhase("idle"); setError(recordingMessage(reason, "start")); }
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {}); }
    finally { busy.current = false; }
  }
  return { phase, error, start, stop, temporary, eraseTemporary, accept,
    async keepTemporary() {
      const record = temporaryRef.current; if (!record) return;
      await accept(record, true); temporaryRef.current = null; if (active.current) setTemporary(null);
    } };
}
