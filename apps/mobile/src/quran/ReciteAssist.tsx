import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { Text, Alert } from "../i18n/LocalizedText";

import { AudioModule } from "expo-audio";
import { addPcmChunkListener, isPcmRecorderAvailable, startPcmRecording, stopPcmRecording } from "@tilawi/expo-pcm-recorder";
import { parseAyahReference, type QuranVerse, type QuranRecording, type QuranRecordingMarker } from "@hbic/shared";
import { Directory, File, Paths } from "expo-file-system";
import { AppButton } from "../components/AppButton";
import { useAppTheme } from "../theme/ThemeProvider";
import { QuranSurface } from "./QuranControls";
import { acquireReciteAssist } from "./reciteAssistEngine";
import { ReciteAudioWindow, ReciteCompletionGuard, type ReciteFeedback } from "./reciteAssistFeedback";
import { RecitationTracker } from "./recitationTracking";
import { quranRecordingPermission } from "./recordingPermission";
import { containsVoiceEnergy, ReciteInferenceBudget, ReciteUtteranceTail } from "./reciteInferenceBudget";
import { PcmReviewWriter } from "./pcmReview";
import { OwnedPcmCapture } from "./ownedPcmCapture";

/** Explicit early preview; never a verified recitation/Tajweed assessment. */
export interface ReciteAssistHandle { toggleRecording: () => boolean }
interface ReciteAssistProps { verse: QuranVerse; stopPlayback: () => void; blocked: boolean; concealed: boolean; fontLoaded: boolean; onBusyChange: (busy: boolean) => void; onAdvance?: (signal: AbortSignal) => Promise<void>; recognitionMode?: "efficient" | "responsive"; onReview?: (key: string, attemptId: string, feedback: ReciteFeedback) => void; saveAudio?: boolean; onRecording?: (recording: QuranRecording, allowSessionReview: boolean) => Promise<void>; testMode?: boolean; onRevealWord?: (index: number) => void }
export default forwardRef<ReciteAssistHandle, ReciteAssistProps>(function ReciteAssist({ verse, stopPlayback, blocked, concealed, fontLoaded, onBusyChange, onAdvance, recognitionMode = "efficient", onReview, saveAudio = false, onRecording, testMode = false, onRevealWord }, ref) {
  const { theme } = useAppTheme();
  const [phase, setPhase] = useState<"idle" | "preparing" | "listening" | "pausing" | "paused" | "resuming">("idle");
  const [message, setMessage] = useState("Follows recited words and flags possible word differences. Not a Tajweed assessment.");
  const [feedback, setFeedback] = useState<ReciteFeedback | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [heard, setHeard] = useState("");
  const review = useRef<{ started: number; observations: number; unclear: number; differences: number; reached: number } | null>(null);
  const mounted = useRef(true), epoch = useRef(0), busy = useRef(false);
  const permissionDialog = useRef(false);
  const [audioWindow] = useState(() => new ReciteAudioWindow());
  const window = useRef(audioWindow);
  const [pcmCapture] = useState(() => new OwnedPcmCapture());
  const tracker = useRef(new RecitationTracker()), lastAnalyzed = useRef(-1);
  const completion = useRef(new ReciteCompletionGuard()), advancing = useRef(false);
  const automaticFromKey = useRef<string | null>(null);
  const pendingAdvance = useRef<AbortController | null>(null), stopping = useRef<Promise<void> | null>(null);
  const advance = useRef(onAdvance); advance.current = onAdvance;
  const verseKey = useRef(verse.verseKey); verseKey.current = verse.verseKey;
  const microphone = useRef<ReturnType<typeof addPcmChunkListener>>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null), cap = useRef<ReturnType<typeof setTimeout> | null>(null);
  const engine = useRef<Awaited<ReturnType<typeof acquireReciteAssist>> | null>(null);
  const processing = useRef<Promise<void> | null>(null);
  const text = useRef(verse.textUthmani); text.current = verse.textUthmani;
  const reviewCallback = useRef(onReview); reviewCallback.current = onReview;
  const attempt = useRef("");
  const savedAudio = useRef<{ writer: PcmReviewWriter; record: QuranRecording } | null>(null);
  const storageWarning = useRef<string | null>(null);
  const recordingCallback = useRef(onRecording); recordingCallback.current = onRecording;
  const stop = useCallback(() => {
    if (stopping.current) return stopping.current;
    if (!busy.current && !engine.current && !savedAudio.current) return Promise.resolve();
    const allowSessionReview = mounted.current && AppState.currentState === "active";
    ++epoch.current;
    pendingAdvance.current?.abort(); pendingAdvance.current = null;
    automaticFromKey.current = null;
    if (timer.current) clearInterval(timer.current); timer.current = null;
    if (cap.current) clearTimeout(cap.current); cap.current = null;
    microphone.current?.remove(); microphone.current = null;
    window.current.clear(); tracker.current.reset(); lastAnalyzed.current = -1;
    completion.current.reset(); advancing.current = false;
    const held = engine.current; engine.current = null;
    stopping.current = (async () => {
      await pcmCapture.stop(stopPcmRecording).catch(() => {});
      await processing.current?.catch(() => {});
      const clip = savedAudio.current; savedAudio.current = null;
      if (clip) {
        try {
          const durationMillis = clip.writer.finish();
          if (durationMillis > 0 && recordingCallback.current) await recordingCallback.current({ ...clip.record, durationMillis,
            markers: clip.record.markers?.filter(marker => marker.offsetMillis <= durationMillis) }, allowSessionReview);
          else clip.writer.discard();
        } catch {
          try { clip.writer.discard(); } catch { /* A storage failure must never retain the microphone/model lease. */ }
          storageWarning.current = "The private recording could not be saved. Reading and word review remain available.";
        }
      }
      if (held) await held.dispose().catch(() => {});
      busy.current = false;
      if (mounted.current) {
        const result = review.current;
        if (result) setSummary(`${Math.ceil((Date.now() - result.started) / 1000)} seconds · ${result.reached} ayahs reached · ${result.observations} listening observations. ${result.unclear} unclear; ${result.differences} with possible word differences. Review with the reference; no score was assigned.${storageWarning.current ? ` ${storageWarning.current}` : ""}`);
        setPhase("idle"); setMessage(storageWarning.current ?? (clip ? "Session stopped. Review audio was handled by your private recording preference and was not uploaded." : "Session stopped. Microphone audio was not saved or uploaded."));
      }
      review.current = null;
    })().finally(() => { stopping.current = null; });
    return stopping.current;
  }, [pcmCapture]);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener("change", (state) => { if (state !== "active" && !permissionDialog.current) void stop(); });
    return () => { mounted.current = false; subscription.remove(); void stop(); };
  }, [stop]);
  useEffect(() => { onBusyChange(phase !== "idle"); }, [phase, onBusyChange]);
  useEffect(() => () => onBusyChange(false), [onBusyChange]);
  useEffect(() => {
    // Keep bounded capture across an automatic next-ayah fetch: the reciter
    // may already be saying its opening while canonical text is loading.
    // Manual navigation still starts a fresh passage/timeline.
    const automatic = automaticFromKey.current !== null && automaticFromKey.current !== verse.verseKey;
    automaticFromKey.current = null;
    if (!automatic) window.current.clear();
    tracker.current.reset(); lastAnalyzed.current = -1; completion.current.reset(); setFeedback(null); setHeard("");
    attempt.current = `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }, [verse.verseKey]);
  async function capture(held: Awaited<ReturnType<typeof acquireReciteAssist>>, token: number) {
    window.current.clear(); tracker.current.reset(); lastAnalyzed.current = -1; completion.current.reset(); setFeedback(null);
    automaticFromKey.current = null;
    const budget = new ReciteInferenceBudget(recognitionMode === "efficient" ? 2500 : 2000);
    const tail = new ReciteUtteranceTail();
    let recentVoice = false;
    attempt.current = `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    microphone.current = addPcmChunkListener((samples) => { if (token === epoch.current) {
      window.current.append(samples); const voiced = containsVoiceEnergy(samples); recentVoice ||= voiced;
      tail.append(window.current.endSample, voiced);
      if (savedAudio.current) {
        try { savedAudio.current.writer.append(samples); }
        catch {
          try { savedAudio.current.writer.discard(); } catch { /* Continue tracking even when storage is unavailable. */ }
          savedAudio.current = null;
          storageWarning.current = "Local recording stopped because storage was unavailable. Word review continues.";
          if (mounted.current) setMessage(storageWarning.current);
        }
      }
    } });
    await pcmCapture.start(() => startPcmRecording(16_000, 200));
    if (token !== epoch.current || !mounted.current || AppState.currentState !== "active") { await stop(); return; }
    setPhase("listening"); setMessage("Listening on this device. Unclear audio stays ungraded.");
    const analyze = () => {
      if (processing.current || advancing.current || token !== epoch.current || !engine.current) return;
      const finishing = !recentVoice && tail.pending(window.current.endSample);
      if (!budget.ready(Date.now(), window.current.endSample, recentVoice, finishing)) return;
      const captured = window.current.snapshotWithTimeline(), {pcm, startSample, endSample} = captured, key = verseKey.current;
      // No inference merely because a timer fired. A stopped/stale recorder
      // must not keep burning CPU or count the same audio as new evidence.
      if (endSample <= lastAnalyzed.current || pcm.length < 16_000) {pcm.fill(0); return;}
      lastAnalyzed.current = endSample;
      tail.analyzed(recentVoice); recentVoice = false; budget.started(endSample); const startedAt = Date.now();
      processing.current = held.recognize(pcm, startSample).then((result) => {
        if (!mounted.current || token !== epoch.current || key !== verseKey.current) return;
        if (result.text.trim()) setHeard(result.text);
        const observed = parseAyahReference(key);
        if (savedAudio.current && observed?.chapter === savedAudio.current.record.chapter) savedAudio.current.record.to = observed.ayah;
        if (review.current) review.current.observations++;
        const assessment = tracker.current.observe(text.current, result);
        if (assessment.status === "uncertain") {
          if (review.current) review.current.unclear++;
          completion.current.reset(); setFeedback(assessment); return;
        }
        if (assessment.differences.length && review.current) review.current.differences++;
        if (assessment.status === "possible_difference") {
          reviewCallback.current?.(key, attempt.current, assessment);
          const clip = savedAudio.current;
          if (clip) for (const difference of assessment.differences) {
            const markers = clip.record.markers!;
            if (markers.length < 100 && !markers.some(m => m.key === key && m.kind === difference.kind && m.wordIndex === difference.index)) {
              const marker: QuranRecordingMarker = { key, kind: difference.kind, wordIndex: difference.index, offsetMillis: Math.max(0, clip.writer.durationMillis - (endSample - startSample) / 16) };
              markers.push(marker);
            }
          }
        }
        setFeedback(assessment);
        if (completion.current.observe(assessment, endSample)) {
          reviewCallback.current?.(key, attempt.current, { ...assessment, stableComplete: true });
          if (review.current) review.current.reached++;
          const reached = parseAyahReference(key); if (savedAudio.current && reached?.chapter === savedAudio.current.record.chapter) savedAudio.current.record.to = reached.ayah;
          if (!advance.current) {
            void stop().then(() => { if (mounted.current) setMessage("Selected ayah reached. Reveal and review your recitation; no score was assigned."); });
            return;
          }
          const controller = new AbortController(); pendingAdvance.current = controller;
          automaticFromKey.current = verseKey.current;
          advancing.current = true; setMessage("Opening the next ayah…");
          void advance.current(controller.signal).then(() => {
            if (mounted.current && token === epoch.current && !controller.signal.aborted) {
              tracker.current.reset(); lastAnalyzed.current = -1; completion.current.reset();
              setMessage("Listening on this device. Unclear audio stays ungraded.");
            }
          }).catch(() => {
            automaticFromKey.current = null;
            if (mounted.current && token === epoch.current && !controller.signal.aborted) { completion.current.reset(); setMessage("Next ayah could not load. Stop and retry; no progress was graded."); }
          }).finally(() => { if (pendingAdvance.current === controller) { pendingAdvance.current = null; advancing.current = false; } });
        }
      }).catch(() => { if (mounted.current && token === epoch.current) setMessage("Recognition is unavailable. Tap Stop, then retry in a quiet place."); })
        .finally(() => { pcm.fill(0); budget.finished(Date.now(), Date.now() - startedAt); processing.current = null; });
    };
    timer.current = setInterval(analyze, 500);
  }
  async function pause() {
    if (phase !== "listening") return;
    ++epoch.current; setPhase("pausing");
    pendingAdvance.current?.abort(); pendingAdvance.current = null; advancing.current = false;
    automaticFromKey.current = null;
    if (timer.current) clearInterval(timer.current); timer.current = null;
    microphone.current?.remove(); microphone.current = null;
    await pcmCapture.stop(stopPcmRecording).catch(() => {});
    await processing.current?.catch(() => {});
    window.current.clear(); tracker.current.reset(); lastAnalyzed.current = -1; completion.current.reset();
    if (mounted.current && engine.current) { setPhase("paused"); setMessage("Paused. The microphone is off. Resume from the current ayah."); }
  }
  async function resume() {
    if (phase !== "paused" || !engine.current || stopping.current) return;
    setPhase("resuming"); const token = ++epoch.current;
    try { await capture(engine.current, token); }
    catch { await stop(); if (mounted.current) setMessage("Microphone could not resume. Tap Start to retry."); }
  }
  async function start(recordAudio = saveAudio) {
    if (busy.current || blocked || !isPcmRecorderAvailable) return;
    busy.current = true; const token = ++epoch.current; storageWarning.current = null; setPhase("preparing"); setFeedback(null); setSummary(null); setHeard(""); stopPlayback();
    let held: Awaited<ReturnType<typeof acquireReciteAssist>> | null = null;
    try {
      const permission = await quranRecordingPermission(AudioModule, {
        isActive: () => AppState.currentState === "active", subscribe: (check) => AppState.addEventListener("change", check)
      }, (waiting) => { permissionDialog.current = waiting; });
      if (!permission.granted) throw new Error("Microphone permission was declined. Reading, reference audio and self-tests still work.");
      if (!mounted.current || token !== epoch.current || AppState.currentState !== "active") return;
      held = await acquireReciteAssist((value) => { if (mounted.current && token === epoch.current) setMessage(value); });
      if (!mounted.current || token !== epoch.current || AppState.currentState !== "active") { await held.dispose(); return; }
      engine.current = held;
      if (recordAudio && onRecording) {
        const ref = parseAyahReference(verseKey.current)!;
        const dir = new Directory(Paths.cache, "quran-session"); dir.create({ intermediates: true, idempotent: true });
        const id = `quran-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, file = new File(dir, `${id}.wav`);
        file.create(); const handle = file.open();
        savedAudio.current = { writer: new PcmReviewWriter({ write: bytes => handle.writeBytes(bytes), seek: offset => { handle.offset = offset; }, close: () => handle.close(), remove: () => { if (file.exists) file.delete(); } }),
          record: { id, uri: file.uri, chapter: ref.chapter, from: ref.ayah, to: ref.ayah, createdAt: new Date().toISOString(), durationMillis: 1, markers: [] } };
      }
      review.current = { started: Date.now(), observations: 0, unclear: 0, differences: 0, reached: 0 };
      await capture(held, token);
      if (token !== epoch.current || !mounted.current) return;
      cap.current = setTimeout(() => { void stop(); }, 120_000);
    } catch (error) {
      await stop();
      if (held) await held.dispose();
      if (mounted.current) setMessage(error instanceof Error ? error.message : "On-device recognition is unavailable.");
    }
  }
  function requestStart(recordAudio = saveAudio) {
    if (busy.current) { void stop(); return true; }
    if (blocked || !isPcmRecorderAvailable) return false;
    Alert.alert(testMode ? "Start recitation test?" : "Start word tracking?", `First use downloads about 104 MB of verified recognition data. ${recordAudio ? "A private review recording will follow your recording retention setting." : "Audio stays in memory and is erased when stopped."} Audio is never uploaded. Word recognition can miss or misidentify words; no Tajweed or pronunciation grade is assigned.`, [{text: "Not now", style: "cancel"}, {text: "Start", onPress: () => void start(recordAudio)}]);
    return true;
  }
  useImperativeHandle(ref, () => ({toggleRecording: () => requestStart(true)}));
  return <QuranSurface>
    <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "700" }}>{testMode ? "Recitation Test" : "Recite Assist"}</Text>
    <Text style={{ color: theme.colors.teal, fontSize: 14, marginTop: 6 }}>Ayah {verse.verseKey}</Text>
    <Text style={{ color: theme.mode === "light" ? "#795500" : theme.colors.gold, fontSize: 12, fontWeight: "600", marginTop: 6 }}>EARLY PREVIEW · NOT A VERIFIED RECITATION ASSESSMENT</Text>
    <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 22, marginTop: 8 }}>Can miss or misidentify words. Always review with the Quran reference or a qualified teacher. No Tajweed or pronunciation assessment.</Text>
    <Text style={{ color: theme.colors.muted, fontSize: 15, lineHeight: 23, marginVertical: 12 }}>{message}</Text>
    {!isPcmRecorderAvailable ? <Text style={{ color: theme.colors.muted }}>On-device recognition is unavailable on this device. Reading, listening and self-tests remain available.</Text> : <AppButton label={phase === "idle" ? testMode ? "Start Recitation Test" : "Start Recite Assist" : phase === "preparing" ? "Cancel preparation" : "Stop Recitation"} icon={phase === "idle" ? "mic-outline" : "stop-circle-outline"} disabled={blocked} onPress={() => requestStart()} />}
    {heard && !concealed ? <View style={{marginTop: 12}}><Text style={{color: theme.colors.muted, fontSize: 12}}>Recognized speech · may contain transcription errors</Text><Text accessibilityLabel="Recognized speech" style={{color: theme.colors.text, textAlign: "right", writingDirection: "rtl", fontSize: 18, marginTop: 6}}>{heard}</Text></View> : null}
    {feedback?.differences.map((difference, index) => <View key={`${difference.kind}:${difference.index}:${index}`} style={{marginTop: 10}}>
      <Text style={{color: theme.colors.gold, fontWeight: "600"}}>Possible {difference.kind === "omission" ? "skipped word" : difference.kind === "substitution" ? "different word" : difference.kind === "repetition" ? "repeated word" : "extra word"}{difference.index !== null ? ` · Word ${difference.index + 1}` : ""}</Text>
      {difference.index !== null && onRevealWord ? <AppButton label="Show correction hint" variant="secondary" onPress={() => onRevealWord(difference.index!)} /> : null}
    </View>)}
    {phase === "listening" || phase === "paused" || phase === "pausing" || phase === "resuming" ? <View style={{ marginTop: 10 }}><AppButton variant="secondary"
      label={phase === "paused" ? "Resume Recite Assist" : phase === "resuming" ? "Resuming…" : phase === "pausing" ? "Pausing…" : "Pause Recite Assist"}
      icon={phase === "paused" ? "play-outline" : "pause-outline"} disabled={phase === "pausing" || phase === "resuming"}
      onPress={() => void (phase === "paused" ? resume() : pause())} /></View> : null}
    {summary ? <View style={{ marginTop: 16 }}><Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "700" }}>Session review</Text><Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 22, marginTop: 6 }}>{summary}</Text></View> : null}
    {feedback ? <View style={{ marginTop: 16, gap: 10 }}><Text style={{ color: theme.colors.muted, fontSize: 14 }}>{feedback.status === "uncertain" ? feedback.followingIndex !== undefined ? "Following your voice; the rest is still uncertain." : "Couldn’t hear clearly enough—no mistake marked." : feedback.status === "possible_difference" ? "Possible word difference. Reveal and review with the reference." : "Following the recited words."}</Text>
      {!concealed ? <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>{feedback.words.map((word, i) => <Text key={i} style={{ fontSize: 25, lineHeight: 49, writingDirection: "rtl", paddingHorizontal: 4, borderRadius: 5,
        fontFamily: fontLoaded ? "QuranNaskh" : undefined, color: word.state === "matched" ? theme.colors.teal : theme.colors.text,
        borderBottomWidth: 2, borderBottomColor: feedback.followingIndex === i ? theme.colors.teal : "transparent",
        backgroundColor: word.state === "possible_difference" ? theme.colors.tintSoft : "transparent" }}>{word.text}</Text>)}</View> : <Text style={{ color: theme.colors.muted, fontSize: 14 }}>Text stays hidden until you choose Reveal.</Text>}
      <Text style={{ color: theme.colors.subtle, fontSize: 12 }}>On-device model: Tilawi / Muhammad Dur, CC BY 4.0. Quran text: Tanzil, CC BY 3.0. No numerical recitation score.</Text></View> : null}
  </QuranSurface>;
});
