import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Text, View } from "react-native";
import { AudioModule } from "expo-audio";
import { addPcmChunkListener, isPcmRecorderAvailable, startPcmRecording, stopPcmRecording } from "@tilawi/expo-pcm-recorder";
import type { QuranVerse } from "@hbic/shared";
import { AppButton } from "../components/AppButton";
import { useAppTheme } from "../theme/ThemeProvider";
import { QuranSurface } from "./QuranControls";
import { acquireReciteAssist } from "./reciteAssistEngine";
import { ReciteAudioWindow, ReciteCompletionGuard, type ReciteFeedback } from "./reciteAssistFeedback";
import { RecitationTracker } from "./recitationTracking";
import { quranRecordingPermission } from "./recordingPermission";

/** Development only until microphone accuracy/noise qualification passes. */
export default function ReciteAssist({ verse, stopPlayback, blocked, concealed, fontLoaded, onBusyChange, onAdvance }: { verse: QuranVerse; stopPlayback: () => void; blocked: boolean; concealed: boolean; fontLoaded: boolean; onBusyChange: (busy: boolean) => void; onAdvance?: (signal: AbortSignal) => Promise<void> }) {
  const { theme } = useAppTheme();
  const [phase, setPhase] = useState<"idle" | "preparing" | "listening" | "pausing" | "paused" | "resuming">("idle");
  const [message, setMessage] = useState("Follows recited words and flags possible word differences. Not a Tajweed assessment.");
  const [feedback, setFeedback] = useState<ReciteFeedback | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const review = useRef<{ started: number; observations: number; unclear: number; differences: number; reached: number } | null>(null);
  const mounted = useRef(true), epoch = useRef(0), busy = useRef(false);
  const permissionDialog = useRef(false);
  const window = useRef(new ReciteAudioWindow());
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
  const stop = useCallback(() => {
    if (stopping.current) return stopping.current;
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
      await stopPcmRecording().catch(() => {});
      await processing.current?.catch(() => {});
      if (held) await held.dispose().catch(() => {});
      busy.current = false;
      if (mounted.current) {
        const result = review.current;
        if (result) setSummary(`${Math.ceil((Date.now() - result.started) / 1000)} seconds · ${result.reached} ayahs reached · ${result.observations} listening observations. ${result.unclear} unclear; ${result.differences} with possible word differences. Review with the reference; no score was assigned.`);
        setPhase("idle"); setMessage("Session stopped. Microphone audio was not saved or uploaded.");
      }
      review.current = null;
    })().finally(() => { stopping.current = null; });
    return stopping.current;
  }, []);
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
    tracker.current.reset(); lastAnalyzed.current = -1; completion.current.reset(); setFeedback(null);
  }, [verse.verseKey]);
  async function capture(held: Awaited<ReturnType<typeof acquireReciteAssist>>, token: number) {
    window.current.clear(); tracker.current.reset(); lastAnalyzed.current = -1; completion.current.reset(); setFeedback(null);
    automaticFromKey.current = null;
    microphone.current = addPcmChunkListener((samples) => { if (token === epoch.current) window.current.append(samples); });
    await startPcmRecording(16_000, 100);
    if (token !== epoch.current || !mounted.current || AppState.currentState !== "active") { await stop(); return; }
    setPhase("listening"); setMessage("Listening on this device. Unclear audio stays ungraded.");
    const analyze = () => {
      if (processing.current || advancing.current || token !== epoch.current || !engine.current) return;
      const captured = window.current.snapshotWithTimeline(), {pcm, startSample, endSample} = captured, key = verseKey.current;
      // No inference merely because a timer fired. A stopped/stale recorder
      // must not keep burning CPU or count the same audio as new evidence.
      if (endSample <= lastAnalyzed.current || pcm.length < 16_000) {pcm.fill(0); return;}
      lastAnalyzed.current = endSample;
      processing.current = held.recognize(pcm, startSample).then((result) => {
        if (!mounted.current || token !== epoch.current || key !== verseKey.current) return;
        if (review.current) review.current.observations++;
        const assessment = tracker.current.observe(text.current, result);
        if (assessment.status === "uncertain") {
          if (review.current) review.current.unclear++;
          completion.current.reset(); setFeedback(assessment); return;
        }
        if (assessment.differences.length && review.current) review.current.differences++;
        setFeedback(assessment);
        if (completion.current.observe(assessment, endSample)) {
          if (review.current) review.current.reached++;
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
        .finally(() => { pcm.fill(0); processing.current = null; });
    };
    timer.current = setInterval(analyze, 2500);
  }
  async function pause() {
    if (phase !== "listening") return;
    ++epoch.current; setPhase("pausing");
    pendingAdvance.current?.abort(); pendingAdvance.current = null; advancing.current = false;
    automaticFromKey.current = null;
    if (timer.current) clearInterval(timer.current); timer.current = null;
    microphone.current?.remove(); microphone.current = null;
    await stopPcmRecording().catch(() => {});
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
  async function start() {
    if (busy.current || blocked || !isPcmRecorderAvailable) return;
    busy.current = true; const token = ++epoch.current; setPhase("preparing"); setFeedback(null); setSummary(null); stopPlayback();
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
  return <QuranSurface>
    <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "700" }}>Recite Assist</Text>
    <Text style={{ color: theme.colors.teal, fontSize: 14, marginTop: 6 }}>Ayah {verse.verseKey}</Text>
    <Text style={{ color: theme.colors.gold, fontSize: 12, marginTop: 6 }}>EARLY PREVIEW · NOT A VERIFIED RECITATION ASSESSMENT</Text>
    <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 22, marginTop: 8 }}>Can miss or misidentify words. Always review with the Quran reference or a qualified teacher. No Tajweed or pronunciation assessment.</Text>
    <Text style={{ color: theme.colors.muted, fontSize: 15, lineHeight: 23, marginVertical: 12 }}>{message}</Text>
    {!isPcmRecorderAvailable ? <Text style={{ color: theme.colors.muted }}>On-device recognition is unavailable on this device. Reading, listening and self-tests remain available.</Text> : <AppButton label={phase === "idle" ? "Start Recite Assist" : phase === "preparing" ? "Cancel preparation" : "Stop Recite Assist"} icon={phase === "idle" ? "mic-outline" : "stop-circle-outline"} disabled={blocked} onPress={() => {
      if (phase !== "idle") { void stop(); return; }
      Alert.alert("Try Recite Assist preview?", "First use downloads about 104 MB of verified model data from Hugging Face. Microphone audio stays in memory on this device, is erased when stopped, and is never uploaded. This early preview misses many mistakes and may misidentify words. Always review with the reference or a qualified teacher. It does not assess Tajweed or pronunciation.", [{ text: "Not now", style: "cancel" }, { text: "Continue", onPress: () => void start() }]);
    }} />}
    {phase === "listening" || phase === "paused" || phase === "pausing" || phase === "resuming" ? <View style={{ marginTop: 10 }}><AppButton variant="secondary"
      label={phase === "paused" ? "Resume Recite Assist" : phase === "resuming" ? "Resuming…" : phase === "pausing" ? "Pausing…" : "Pause Recite Assist"}
      icon={phase === "paused" ? "play-outline" : "pause-outline"} disabled={phase === "pausing" || phase === "resuming"}
      onPress={() => void (phase === "paused" ? resume() : pause())} /></View> : null}
    {summary ? <View style={{ marginTop: 16 }}><Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "700" }}>Session review</Text><Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 22, marginTop: 6 }}>{summary}</Text></View> : null}
    {feedback ? <View style={{ marginTop: 16, gap: 10 }}><Text style={{ color: theme.colors.muted, fontSize: 14 }}>{feedback.status === "uncertain" ? "Couldn’t hear clearly enough—no mistake marked." : feedback.status === "possible_difference" ? "Possible word difference. Reveal and review with the reference." : "Following the recited words."}</Text>
      {!concealed ? <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>{feedback.words.map((word, i) => <Text key={i} style={{ fontSize: 25, lineHeight: 49, writingDirection: "rtl", paddingHorizontal: 4, borderRadius: 5,
        fontFamily: fontLoaded ? "QuranNaskh" : undefined, color: word.state === "matched" ? theme.colors.teal : theme.colors.text, backgroundColor: word.state === "possible_difference" ? theme.colors.tintSoft : "transparent" }}>{word.text}</Text>)}</View> : <Text style={{ color: theme.colors.muted, fontSize: 14 }}>Text stays hidden until you choose Reveal.</Text>}
      <Text style={{ color: theme.colors.subtle, fontSize: 12 }}>On-device model: Tilawi / Muhammad Dur, CC BY 4.0. Quran text: Tanzil, CC BY 3.0. No numerical recitation score.</Text></View> : null}
  </QuranSurface>;
}
