import { lazy, Suspense, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from "react-native";
import { Text, TextInput, Alert } from "../i18n/LocalizedText";

import * as FileSystem from "expo-file-system/legacy";
import { createSelfTest, memorizationLabels, passageId, repeatSequence, type QuranChapter, type QuranPassage, type QuranVerse, type MemorizationStatus } from "@hbic/shared";
import { AppButton } from "../components/AppButton";
import { useAppTheme } from "../theme/ThemeProvider";
import { QuranMessage, QuranSurface } from "./QuranControls";
import { useQuranRecording } from "./useQuranRecording";
import type { QuranLibrary, QuranMode, ReturnTypeQuranAudio } from "./types";
// Expo's ES2015 compilation target needs a lazy require rather than import().
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReciteAssist = lazy<typeof import("./ReciteAssist").default>(() => Promise.resolve({ default: require("./ReciteAssist").default }));
// Explicit release opt-in: recognition is an early preview, never a certified
// assessment. Development builds retain their separate diagnostic switch.
const assistEnabled = process.env.EXPO_PUBLIC_RECITE_ASSIST_ENABLED === "true"
  || (__DEV__ && process.env.EXPO_PUBLIC_RECITE_ASSIST_DEVELOPMENT === "true");

export function QuranPractice({ mode, chapter, getVerse, audio, library, fontLoaded }: {
  mode: QuranMode; chapter: QuranChapter; getVerse: (ayah: number) => Promise<QuranVerse>;
  audio: ReturnTypeQuranAudio; library: QuranLibrary; fontLoaded: boolean;
}) {
  const { theme } = useAppTheme();
  const [from, setFrom] = useState("1"), [to, setTo] = useState(String(Math.min(3, chapter.versesCount)));
  const [repeat, setRepeat] = useState(3), [repeatMode, setRepeatMode] = useState<"passage" | "ayah">("passage");
  const [hidden, setHidden] = useState(mode !== "practice"), [revealed, setRevealed] = useState(false);
  const [questions, setQuestions] = useState<number[]>([]), [questionIndex, setQuestionIndex] = useState(0);
  const [hints, setHints] = useState(0), [temporary, setTemporary] = useState(false);
  const [reviewAyah, setReviewAyah] = useState(1);
  const [assistBusy, setAssistBusy] = useState(false);
  const [current, setCurrent] = useState<QuranVerse | null>(null), [error, setError] = useState<string | null>(null);
  const passage: QuranPassage = { chapter: chapter.id, from: Number(from), to: Number(to) };
  const valid = Number.isInteger(passage.from) && Number.isInteger(passage.to) && passage.from >= 1 && passage.to >= passage.from && passage.to <= chapter.versesCount;
  const question = questions[questionIndex];
  const selectedAyah = mode === "test" && question ? question : valid ? Math.max(passage.from, Math.min(passage.to, reviewAyah)) : 1;
  const recordingPassage = mode === "test" && question ? { chapter: chapter.id, from: question, to: question } : passage;
  const recording = useQuranRecording(recordingPassage, (record) => library.update((s) => {
    if (s.recordings.length >= 100) throw new Error("You have 100 recordings. Delete an older recording before saving another.");
    return { ...s, recordings: [record, ...s.recordings] };
  }), audio.stop);
  const recordingBusy = recording.phase !== "idle";
  const practiceBusy = recordingBusy || assistBusy;
  useEffect(() => {
    let active = true; setError(null);
    // Retain the assist component and its microphone lease while a sequential
    // next ayah is fetched. Canonical text below is hidden until it matches.
    if (valid) void getVerse(selectedAyah).then((verse) => { if (active) setCurrent(verse); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Ayah unavailable."); });
    return () => { active = false; };
  }, [getVerse, selectedAyah, valid]);
  async function listen(single = false) {
    if (!valid || recordingBusy || assistBusy) return;
    try { await audio.start(single ? [selectedAyah] : repeatSequence(passage, repeat, repeatMode), getVerse); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Playback is unavailable."); }
  }
  function startTest() { audio.stop(); setQuestions(createSelfTest(passage)); setQuestionIndex(0); setHints(0); setRevealed(false); }
  async function reviewed(status: MemorizationStatus) {
    if (!question || recordingBusy || assistBusy) return;
    if (!temporary) {
      try { await library.memorize({ chapter: chapter.id, from: question, to: question }, status); }
      catch { setError("Your self-review could not be saved. Please retry."); return; }
    }
    audio.stop(); setHints(0); setRevealed(false); setQuestionIndex((n) => n + 1);
  }
  const textStyle = { color: theme.colors.text, fontSize: 16, lineHeight: 24 };
  const displayVerse = current?.verseNumber === selectedAyah ? current : null;
  const memorizationStatus = library.library.memorization.find((p) => passageId(p) === passageId(passage))?.status ?? "not_started";
  const showText = mode === "test" ? revealed : !hidden;
  const records = library.library.recordings.filter((r) => r.chapter === chapter.id);
  return <View style={styles.content}>
    <Text style={[styles.title, { color: theme.colors.text }]}>{mode === "test" ? "Test yourself" : mode === "memorize" ? "Memorization" : "Recitation practice"}</Text>
    <Text style={{ ...textStyle, color: theme.colors.muted }}>{chapter.nameSimple} · {chapter.versesCount} ayahs</Text>
    <Text style={{ ...textStyle, color: theme.colors.muted }}>{assistEnabled ? "Listen, practise aloud, and review yourself. Recite Assist is an optional early preview: it can miss or misidentify words and is not a verified assessment." : "Listen, practise aloud, and review yourself. Automatic word feedback is not available in this release."} No Tajweed scores.</Text>
    {mode === "test" && questions.length ? <QuranSurface>
      <Text style={textStyle}>Ayahs {passage.from}–{passage.to} · {temporary ? "Temporary review" : "Saved self-review"}</Text>
      <AppButton label="Change test range" variant="ghost" disabled={practiceBusy} onPress={() => { audio.stop(); setQuestions([]); setQuestionIndex(0); setHints(0); setRevealed(false); }} />
    </QuranSurface> : <QuranSurface>
      <View style={styles.row}>
        <View style={styles.flex}><Text style={textStyle}>From ayah</Text><TextInput accessibilityLabel="Practice starting ayah" keyboardType="number-pad" value={from} editable={!practiceBusy} onChangeText={(v) => { setFrom(v); setQuestions([]); }} style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} /></View>
        <View style={styles.flex}><Text style={textStyle}>To ayah</Text><TextInput accessibilityLabel="Practice ending ayah" keyboardType="number-pad" value={to} editable={!practiceBusy} onChangeText={(v) => { setTo(v); setQuestions([]); }} style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} /></View>
      </View>
      {!valid ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger, marginTop: 8 }}>Choose a valid range within this surah.</Text> : null}
      {mode === "test" ? <>
        <View style={styles.row}><Text style={[textStyle, styles.flex]}>Temporary session · don’t save review</Text><Switch value={temporary} disabled={Boolean(questions.length)} onValueChange={setTemporary} /></View>
        <AppButton label={questions.length ? "Restart self-test" : "Start self-test"} icon="sparkles-outline" disabled={!valid || practiceBusy} onPress={startTest} />
      </> : <>
        <Text style={[textStyle, { marginTop: 14 }]}>Repeat count</Text>
        <View style={styles.row}>{[1, 3, 5, 10].map((n) => <Pressable key={n} accessibilityRole="button" accessibilityState={{ selected: repeat === n }} onPress={() => setRepeat(n)} style={[styles.option, { backgroundColor: repeat === n ? theme.colors.tintSoft : theme.colors.surface }]}><Text style={textStyle}>{n}×</Text></Pressable>)}</View>
        <View style={styles.row}>{(["passage", "ayah"] as const).map((choice) => <Pressable key={choice} accessibilityRole="button" accessibilityState={{ selected: repeatMode === choice }} onPress={() => setRepeatMode(choice)} style={[styles.option, { backgroundColor: repeatMode === choice ? theme.colors.tintSoft : theme.colors.surface }]}><Text style={textStyle}>{choice === "passage" ? "Whole passage" : "Each ayah"}</Text></Pressable>)}</View>
        <AppButton label="Listen and repeat" icon="repeat" disabled={!valid || practiceBusy || !current?.audioUrl} onPress={() => void listen()} />
        {!current?.audioUrl ? <Text style={{ ...textStyle, color: theme.colors.muted }}>Reference audio is unavailable in this content edition. You can still record, recall and review the authentic Arabic text.</Text> : null}
        <View style={styles.row}><Text style={[textStyle, styles.flex]}>Hide Arabic and translation for recall</Text><Switch value={hidden} onValueChange={setHidden} /></View>
      </>}
    </QuranSurface>}
    {questions.length && questionIndex >= questions.length ? <QuranSurface><Text style={[styles.title, { color: theme.colors.text }]}>Session complete</Text><Text style={textStyle}>{questions.length} passages reviewed by you. This is not an automatic recitation assessment.</Text></QuranSurface> : <QuranSurface>
      <Text style={{ color: theme.colors.teal, fontWeight: "700", marginBottom: 12 }}>{mode === "test" && question ? `Question ${questionIndex + 1} of ${questions.length} · ${chapter.id}:${question}` : `Passage ${passageId(passage)}`}</Text>
      {mode !== "test" && valid ? <View style={styles.row}><AppButton label="Previous ayah" variant="ghost" disabled={practiceBusy || selectedAyah <= passage.from} onPress={() => setReviewAyah(selectedAyah - 1)} /><Text style={textStyle}>Ayah {selectedAyah}</Text><AppButton label="Next ayah" variant="ghost" disabled={practiceBusy || selectedAyah >= passage.to} onPress={() => setReviewAyah(selectedAyah + 1)} /></View> : null}
      {!displayVerse && !error ? <ActivityIndicator color={theme.colors.teal} /> : null}
      {displayVerse ? <>
        {showText || hints > 0 ? <Text selectable style={[styles.arabic, { color: theme.colors.text, fontFamily: fontLoaded ? "QuranNaskh" : undefined, fontSize: library.library.preferences.arabicSize,
          lineHeight: library.library.preferences.arabicSize * 2.1 }]}>{showText ? displayVerse.textUthmani : displayVerse.textUthmani.trim().split(/\s+/).slice(0, hints).join(" ")}</Text>
          : <View style={[styles.hidden, { backgroundColor: theme.colors.tintSoft }]}><Text style={[textStyle, { textAlign: "center" }]}>Recite from memory</Text><Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: 8 }}>Reveal the ayah when you’re ready to review.</Text></View>}
        {showText && library.library.preferences.showTranslation ? <Text style={textStyle}>{displayVerse.translation}</Text> : null}
        {showText ? <Text style={{ color: theme.colors.subtle, fontSize: 12, marginTop: 12 }}>{displayVerse.translationName}</Text> : null}
        <View style={styles.row}>
          <AppButton label={mode === "test" ? "Reveal ayah" : hidden ? "Reveal" : "Hide"} variant="secondary" icon="eye-outline" onPress={() => mode === "test" ? setRevealed(true) : setHidden(!hidden)} />
          {mode === "test" ? <AppButton label="Word hint" variant="secondary" disabled={revealed || hints >= displayVerse.textUthmani.trim().split(/\s+/).length} onPress={() => setHints((n) => n + 1)} /> : null}
          <AppButton label="Listen to reference" variant="secondary" icon="headset-outline" disabled={!displayVerse.audioUrl || practiceBusy} onPress={() => void listen(true)} />
        </View>
        {mode === "test" && question ? <View style={styles.row}>
          <AppButton label="Recalled · next" variant="secondary" disabled={practiceBusy || !revealed} onPress={() => void reviewed("memorized")} />
          <AppButton label="Needs revision · next" variant="secondary" disabled={practiceBusy} onPress={() => void reviewed("needs_revision")} />
        </View> : null}
      </> : null}
    </QuranSurface>}
    {error ? <QuranMessage message={error} /> : null}
    {assistEnabled && current && valid ? <Suspense fallback={<ActivityIndicator />}><ReciteAssist verse={current} stopPlayback={audio.stop} blocked={recordingBusy} concealed={!showText} fontLoaded={fontLoaded} onBusyChange={setAssistBusy}
      onAdvance={mode !== "test" && selectedAyah < passage.to ? async (signal) => {
        const next = selectedAyah + 1; const verse = await getVerse(next);
        if (signal.aborted) return;
        setCurrent(verse); setReviewAyah(next);
      } : undefined} /></Suspense> : null}
    <QuranSurface>
      <Text style={[styles.subtitle, { color: theme.colors.text }]}>Listen to your own recitation</Text>
      <Text style={{ ...textStyle, color: theme.colors.muted }}>Microphone is used only after you tap Record. Recordings stay on this device. Maximum five minutes; recording stops when you leave the app.</Text>
      <AppButton label={recording.phase === "recording" ? "Stop and save recording" : recording.phase === "saving" ? "Saving recording…" : recording.phase === "preparing" ? "Preparing microphone…" : "Record my recitation"}
        icon={recording.phase === "recording" ? "stop-circle-outline" : "mic-outline"} disabled={!valid || assistBusy || (recordingBusy && recording.phase !== "recording")}
        onPress={() => void (recording.phase === "recording" ? recording.stop() : recording.start())} />
      {recording.error ? <Text accessibilityRole="alert" style={{ ...textStyle, color: theme.colors.danger }}>{recording.error}</Text> : null}
      {records.map((item) => <View key={item.id} style={styles.record}>
        <Text style={textStyle}>Ayahs {item.from}–{item.to} · {new Date(item.createdAt).toLocaleDateString()} · {Math.ceil(item.durationMillis / 1000)}s</Text>
        <View style={styles.row}><AppButton label="Play recording" icon="play-outline" variant="secondary" disabled={practiceBusy} onPress={() => void audio.playRecording(item.uri).catch(() => setError("Recording is no longer on this device."))} />
          <AppButton label="Delete recording" icon="trash-outline" variant="ghost" disabled={practiceBusy} onPress={() => Alert.alert("Delete this recording?", "It will be removed from this device.", [
            { text: "Keep", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => {
              audio.stop(); void (async () => { await library.update((s) => ({ ...s, recordings: s.recordings.filter((r) => r.id !== item.id) }));
                const dir = `${FileSystem.documentDirectory}quran-practice/`;
                if (item.uri.startsWith(dir)) await FileSystem.deleteAsync(item.uri, { idempotent: true });
              })().catch(() => setError("Recording could not be deleted. Please retry."));
            } }
          ])} /></View>
      </View>)}
    </QuranSurface>
    {mode !== "test" ? <QuranSurface><Text style={[styles.subtitle, { color: theme.colors.text }]}>My Memorization Progress</Text><Text style={{ ...textStyle, color: theme.colors.muted }}>Self-reported. A teacher can help assess your recitation.</Text>
      <View style={styles.row}>{(["not_started", "practising", "memorized", "needs_revision"] as const).map((status) => <Pressable key={status} accessibilityRole="radio" accessibilityLabel={memorizationLabels[status]}
        accessibilityState={{ checked: memorizationStatus === status, disabled: !valid || practiceBusy }} disabled={!valid || practiceBusy}
        onPress={() => void library.memorize(passage, status).catch(() => setError("Progress could not be saved. Please try again."))}
        style={({ pressed }) => ({ minHeight: 50, minWidth: "43%", flexGrow: 1, padding: 12, borderRadius: 17, borderWidth: 1,
          borderColor: memorizationStatus === status ? theme.colors.teal : theme.colors.borderStrong,
          backgroundColor: memorizationStatus === status ? theme.colors.tintSoft : theme.colors.surface, opacity: !valid || practiceBusy ? .5 : pressed ? .65 : 1 })}>
        <Text style={{ color: memorizationStatus === status ? theme.colors.teal : theme.colors.text, textAlign: "center", fontSize: 15, lineHeight: 22, fontWeight: "700" }}>{memorizationStatus === status ? "✓ " : ""}{memorizationLabels[status]}</Text>
      </Pressable>)}</View>
    </QuranSurface> : null}
  </View>;
}
const styles = StyleSheet.create({
  content: { gap: 10 }, title: { fontSize: 28, fontWeight: "700", lineHeight: 36 }, subtitle: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginVertical: 8 }, flex: { flex: 1, minWidth: 100 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, marginTop: 8, fontSize: 18 },
  option: { minHeight: 44, padding: 12, borderRadius: 14 }, arabic: { textAlign: "right", writingDirection: "rtl", marginVertical: 14 },
  hidden: { padding: 30, borderRadius: 18, marginVertical: 8 }, record: { paddingVertical: 14 }
});
