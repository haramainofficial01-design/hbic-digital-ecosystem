import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Text, View } from "react-native";
import { AudioModule } from "expo-audio";
import { addPcmChunkListener, isPcmRecorderAvailable, startPcmRecording, stopPcmRecording } from "@tilawi/expo-pcm-recorder";
import { overlapMerge } from "@tilawi/quran-asr";
import type { QuranVerse } from "@hbic/shared";
import { AppButton } from "../components/AppButton";
import { useAppTheme } from "../theme/ThemeProvider";
import { QuranSurface } from "./QuranControls";
import { acquireReciteAssist } from "./reciteAssistEngine";
import { ReciteAudioWindow, ReciteCompletionGuard, reciteFeedback, type ReciteFeedback } from "./reciteAssistFeedback";

/** Development only until microphone accuracy/noise qualification passes. */
export default function ReciteAssist({ verse, stopPlayback, blocked, concealed, onBusyChange, onAdvance }: { verse: QuranVerse; stopPlayback: () => void; blocked: boolean; concealed: boolean; onBusyChange: (busy: boolean) => void; onAdvance?: () => Promise<void> }) {
  const { theme } = useAppTheme();
  const [phase, setPhase] = useState<"idle" | "preparing" | "listening" | "finishing">("idle");
  const [message, setMessage] = useState("Follows recited words and flags possible word differences. Not a Tajweed assessment.");
  const [feedback, setFeedback] = useState<ReciteFeedback | null>(null);
  const mounted = useRef(true), epoch = useRef(0), busy = useRef(false);
  const window = useRef(new ReciteAudioWindow());
  const transcript = useRef<string[]>([]);
  const completion = useRef(new ReciteCompletionGuard()), advancing = useRef(false);
  const advance = useRef(onAdvance); advance.current = onAdvance;
  const verseKey = useRef(verse.verseKey); verseKey.current = verse.verseKey;
  const microphone = useRef<ReturnType<typeof addPcmChunkListener>>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null), cap = useRef<ReturnType<typeof setTimeout> | null>(null);
  const engine = useRef<Awaited<ReturnType<typeof acquireReciteAssist>> | null>(null);
  const processing = useRef<Promise<void> | null>(null);
  const text = useRef(verse.textUthmani); text.current = verse.textUthmani;
  const stop = useCallback(async () => {
    ++epoch.current;
    if (timer.current) clearInterval(timer.current); timer.current = null;
    if (cap.current) clearTimeout(cap.current); cap.current = null;
    await stopPcmRecording().catch(() => {});
    microphone.current?.remove(); microphone.current = null;
    window.current.clear(); transcript.current = [];
    completion.current.reset(); advancing.current = false;
    const held = engine.current; engine.current = null;
    await processing.current?.catch(() => {});
    if (held) await held.dispose().catch(() => {});
    busy.current = false;
    if (mounted.current) { setPhase("idle"); setMessage("Session stopped. Microphone audio was not saved or uploaded."); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener("change", (state) => { if (state !== "active") void stop(); });
    return () => { mounted.current = false; subscription.remove(); void stop(); };
  }, [stop]);
  useEffect(() => { onBusyChange(phase !== "idle"); }, [phase, onBusyChange]);
  useEffect(() => () => onBusyChange(false), [onBusyChange]);
  useEffect(() => {
    window.current.clear(); transcript.current = []; completion.current.reset(); setFeedback(null);
  }, [verse.verseKey]);
  async function start() {
    if (busy.current || blocked || !isPcmRecorderAvailable) return;
    busy.current = true; const token = ++epoch.current; setPhase("preparing"); setFeedback(null); stopPlayback();
    let held: Awaited<ReturnType<typeof acquireReciteAssist>> | null = null;
    try {
      held = await acquireReciteAssist((value) => { if (mounted.current && token === epoch.current) setMessage(value); });
      if (!mounted.current || token !== epoch.current || AppState.currentState !== "active") { await held.dispose(); return; }
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error("Microphone permission was declined. Reading, reference audio and self-tests still work.");
      if (!mounted.current || token !== epoch.current || AppState.currentState !== "active") { await held.dispose(); return; }
      engine.current = held; window.current.clear();
      microphone.current = addPcmChunkListener((samples) => { if (token === epoch.current && !advancing.current) window.current.append(samples); });
      await startPcmRecording(16_000, 100);
      if (token !== epoch.current || !mounted.current || AppState.currentState !== "active") { await stop(); return; }
      setPhase("listening"); setMessage("Listening on this device. Unclear audio stays ungraded.");
      const analyze = () => {
        if (processing.current || advancing.current || token !== epoch.current || !engine.current) return;
        const pcm = window.current.snapshot(), key = verseKey.current;
        processing.current = held!.recognize(pcm).then((result) => {
          if (mounted.current && token === epoch.current && key === verseKey.current) {
            const incoming = reciteFeedback(text.current, result.text, result.quality);
            if (incoming.status === "uncertain") { completion.current.reset(); setFeedback(incoming); return; }
            const merged = overlapMerge(transcript.current, result.text.trim().split(/\s+/));
            if (merged.length > 240) { setMessage("Please stop and begin a new short passage."); return; }
            transcript.current = merged;
            const assessment = reciteFeedback(text.current, merged.join(" "), result.quality);
            setFeedback(assessment);
            if (completion.current.observe(assessment)) {
              if (!advance.current) {
                void stop().then(() => { if (mounted.current) setMessage("Selected ayah reached. Reveal and review your recitation; no score was assigned."); });
                return;
              }
              advancing.current = true; setMessage("Opening the next ayah…");
              void advance.current().then(() => {
                if (mounted.current && token === epoch.current) {
                  window.current.clear(); transcript.current = []; completion.current.reset();
                  setMessage("Listening on this device. Unclear audio stays ungraded.");
                }
              }).catch(() => {
                if (mounted.current && token === epoch.current) { completion.current.reset(); setMessage("Next ayah could not load. Stop and retry; no progress was graded."); }
              }).finally(() => { advancing.current = false; });
            }
          }
        }).catch(() => { if (mounted.current && token === epoch.current) setMessage("Recognition is unavailable. Tap Stop, then retry in a quiet place."); })
          .finally(() => { pcm.fill(0); processing.current = null; });
      };
      timer.current = setInterval(analyze, 2500);
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
    <Text style={{ color: theme.colors.gold, fontSize: 12, marginTop: 6 }}>DEVELOPMENT · NOT A VERIFIED RECITATION ASSESSMENT</Text>
    <Text style={{ color: theme.colors.muted, fontSize: 15, lineHeight: 23, marginVertical: 12 }}>{message}</Text>
    {!isPcmRecorderAvailable ? <Text style={{ color: theme.colors.muted }}>This development build does not contain the recognition microphone module yet.</Text> : <AppButton label={phase === "idle" ? "Start Recite Assist" : phase === "preparing" ? "Cancel preparation" : "Stop Recite Assist"} icon={phase === "idle" ? "mic-outline" : "stop-circle-outline"} disabled={blocked} onPress={() => {
      if (phase !== "idle") { void stop(); return; }
      Alert.alert("On-device recitation practice", "First use downloads about 104 MB of verified model data from Hugging Face. Microphone audio stays in memory on this device, is erased when stopped, and is never uploaded. This development feature may miss mistakes. It does not assess Tajweed.", [{ text: "Not now", style: "cancel" }, { text: "Continue", onPress: () => void start() }]);
    }} />}
    {feedback ? <View style={{ marginTop: 16, gap: 10 }}><Text style={{ color: theme.colors.muted, fontSize: 14 }}>{feedback.status === "uncertain" ? "Couldn’t hear clearly enough—no mistake marked." : feedback.status === "possible_difference" ? "Possible word difference. Reveal and review with the reference." : "Following the recited words."}</Text>
      {!concealed ? <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>{feedback.words.map((word, i) => <Text key={i} style={{ fontSize: 25, lineHeight: 49, writingDirection: "rtl", paddingHorizontal: 4, borderRadius: 5,
        color: word.state === "matched" ? theme.colors.teal : theme.colors.text, backgroundColor: word.state === "possible_difference" ? theme.colors.tintSoft : "transparent" }}>{word.text}</Text>)}</View> : <Text style={{ color: theme.colors.muted, fontSize: 14 }}>Text stays hidden until you choose Reveal.</Text>}
      <Text style={{ color: theme.colors.subtle, fontSize: 12 }}>On-device model: Tilawi / Muhammad Dur, CC BY 4.0. Quran text: Tanzil, CC BY 3.0. No numerical recitation score.</Text></View> : null}
  </QuranSurface>;
}
