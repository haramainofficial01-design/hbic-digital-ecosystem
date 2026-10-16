import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { parseAyahReference, type QuranRecording, type QuranMistake } from "@hbic/shared";
import { Text, Alert } from "../i18n/LocalizedText";
import { AppButton } from "../components/AppButton";
import { useAppTheme } from "../theme/ThemeProvider";
import { QuranSurface } from "./QuranControls";
import type { QuranLibrary, ReturnTypeQuranAudio } from "./types";
import { localRecordingPath } from "./localRecordingPath";
import { recentReviewItems, recordingReviewPoints, reviewMarkerPageSize } from "./reviewLibraryPresentation";

const kinds = { omission: "Possible skipped word", substitution: "Possible word difference", repetition: "Possible repeated word", extra_word: "Possible extra word" };
const clock = (millis: number) => `${Math.floor(millis / 60000)}:${String(Math.floor(millis / 1000) % 60).padStart(2, "0")}`;
type Row = { kind: "recording"; item: QuranRecording } | { kind: "mistake"; item: QuranMistake };

export function QuranReviewLibrary({ library, audio, onPractise }: { library: QuranLibrary; audio: ReturnTypeQuranAudio; onPractise: (chapter: number, ayah: number) => void }) {
  const { theme } = useAppTheme();
  const [tab, setTab] = useState<"recordings" | "mistakes">("recordings"), [error, setError] = useState<string | null>(null);
  const [visiblePoints, setVisiblePoints] = useState<Record<string, number>>({});
  const rows: Row[] = useMemo(() => tab === "recordings" ? recentReviewItems(library.library.recordings).map(item => ({ kind: "recording", item }))
    : recentReviewItems(library.library.mistakes).map(item => ({ kind: "mistake", item })), [tab, library.library.recordings, library.library.mistakes]);
  async function deleteRecording(item: QuranRecording) {
    audio.stop();
    await FileSystem.deleteAsync(localRecordingPath(item, FileSystem.documentDirectory), { idempotent: true });
    await library.update(s => ({ ...s, recordings: s.recordings.filter(record => record.id !== item.id) }));
  }
  const text = { color: theme.colors.muted, fontSize: 14, lineHeight: 22 };
  return <FlatList data={rows} keyExtractor={row => row.item.id} initialNumToRender={5} maxToRenderPerBatch={4} windowSize={5}
    contentContainerStyle={{ padding: 18, gap: 10, paddingBottom: 24, maxWidth: 840, width: "100%", alignSelf: "center" }}
    ListHeaderComponent={<View style={{ gap: 14 }}><Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "700" }}>My Library</Text>
      <Text style={text}>Your recordings and word review, privately on this device.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}><AppButton label={`Recordings (${library.library.recordings.length})`} variant={tab === "recordings" ? "primary" : "secondary"} onPress={() => setTab("recordings")} />
        <AppButton label={`Word review (${library.library.mistakes.length})`} variant={tab === "mistakes" ? "primary" : "secondary"} onPress={() => setTab("mistakes")} /></View>
      {tab === "mistakes" ? <Text style={text}>Possible differences, not verified mistakes. Three separate clear, complete attempts clear a flag. You can dismiss a wrong flag.</Text> : <Text style={text}>Only recordings you chose to keep. Reciter audio streams separately.</Text>}
      {error ? <Text accessibilityRole="alert" style={{ ...text, color: theme.colors.danger }}>{error}</Text> : null}
    </View>}
    ListEmptyComponent={<QuranSurface><Text style={text}>{tab === "recordings" ? "No kept recordings yet. Choose whether to keep audio from the practice screen." : "No possible-word flags to review."}</Text></QuranSurface>}
    renderItem={({ item: row }) => row.kind === "recording" ? <QuranSurface>
      <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "700" }}>Surah {row.item.chapter} · Ayahs {row.item.from}–{row.item.to}</Text>
      <Text style={text}>{new Date(row.item.createdAt).toLocaleDateString()} · {clock(row.item.durationMillis)}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}><AppButton label="Play recording" icon="play-outline" variant="secondary" onPress={() => { try { void audio.playRecording(localRecordingPath(row.item, FileSystem.documentDirectory)).catch(() => setError("This recording is no longer available on this device.")); } catch { setError("This recording is no longer available on this device."); } }} />
        <AppButton label="Delete recording" icon="trash-outline" variant="ghost" onPress={() => Alert.alert("Delete this recording?", "Only this private recording and its review markers will be removed. Reciter recordings and your other sessions are unaffected.", [{ text: "Keep", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void deleteRecording(row.item).catch(error => setError(error.message)) }])} /></View>
      {row.item.markers?.length ? <View style={{ gap: 8, marginTop: 14 }}>
        <AppButton label={visiblePoints[row.item.id] ? "Hide review points" : "Show review points"} variant="ghost" icon="bookmark-outline" onPress={() => setVisiblePoints(previous => {
          const next = { ...previous }; if (next[row.item.id]) delete next[row.item.id]; else next[row.item.id] = reviewMarkerPageSize; return next;
        })} />
        {visiblePoints[row.item.id] ? <><Text style={text}>Approximate review points · listen around the marked time</Text>{recordingReviewPoints(row.item, visiblePoints[row.item.id]).markers.map((marker, index) => <AppButton key={`${marker.key}:${marker.kind}:${index}`} label={`${clock(marker.offsetMillis)} · ${marker.key} · ${kinds[marker.kind]}`} variant="ghost"
          onPress={() => { try { void audio.playRecording(localRecordingPath(row.item, FileSystem.documentDirectory), marker.offsetMillis / 1000).catch(() => setError("This review point could not play.")); } catch { setError("This review point could not play."); } }} />)}
          {recordingReviewPoints(row.item, visiblePoints[row.item.id]).remaining ? <AppButton label="More review points" variant="ghost" onPress={() => setVisiblePoints(previous => ({ ...previous, [row.item.id]: recordingReviewPoints(row.item, previous[row.item.id]).next }))} /> : null}
        </> : null}</View> : null}
    </QuranSurface> : <QuranSurface>
      <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "700" }}>Ayah {row.item.key}{row.item.wordIndex === null ? "" : ` · Word ${row.item.wordIndex + 1}`}</Text>
      <Text style={{ ...text, color: theme.colors.danger, fontWeight: "700" }}>{kinds[row.item.kind]}</Text>
      <Text style={text}>{new Date(row.item.lastDetectedAt).toLocaleDateString()} · {row.item.cleanPasses}/3</Text>
      <View accessibilityLabel={`${row.item.cleanPasses} of 3 clean attempts`} style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>{[0, 1, 2].map(index => <View key={index} style={{ height: 5, width: 25, borderRadius: 3, backgroundColor: index < row.item.cleanPasses ? theme.colors.teal : theme.colors.borderStrong }} />)}</View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}><AppButton label="Practise this ayah" variant="secondary" onPress={() => { const ref = parseAyahReference(row.item.key)!; onPractise(ref.chapter, ref.ayah); }} />
        <AppButton label="Dismiss flag" variant="ghost" onPress={() => Alert.alert("Dismiss this possible-word flag?", "The recognition preview can misidentify words. This removes only the review flag, not any recording.", [{ text: "Keep", style: "cancel" }, { text: "Dismiss", onPress: () => void library.update(s => ({ ...s, mistakes: s.mistakes.filter(m => m.id !== row.item.id) })).catch(() => setError("Flag could not be removed.")) }])} /></View>
    </QuranSurface>} />;
}
