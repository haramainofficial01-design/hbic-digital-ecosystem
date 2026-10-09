import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../i18n/LocalizedText";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { normalizeSearch, type QuranChapter } from "@hbic/shared";
import { AppButton } from "../components/AppButton";
import { useAppTheme } from "../theme/ThemeProvider";
import { availableListeningChapters, filterListeningCatalog, listeningClient, listeningUrl, type ListeningReciter } from "../services/quranListening";
import { QuranMessage, QuranSurface } from "./QuranControls";
import type { QuranLibrary, ReturnTypeQuranAudio } from "./types";
type Row = { type: "voice"; voice: ListeningReciter } | { type: "surah"; chapter: QuranChapter };

export function QuranListening({ chapters, audio, library }: { chapters: QuranChapter[]; audio: ReturnTypeQuranAudio; library: QuranLibrary }) {
  const { theme } = useAppTheme();
  const [reciters, setReciters] = useState<ListeningReciter[]>([]), [selected, setSelected] = useState<ListeningReciter | null>(null);
  const [editionId, setEditionId] = useState(0), [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null), [retry, setRetry] = useState(0);
  const restored = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null);
    void listeningClient.catalog(controller.signal).then((result) => { if (!controller.signal.aborted) setReciters(result); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Reciters could not load."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (restored.current || !library.ready || !reciters.length) return;
    restored.current = true;
    const saved = library.library.listening;
    const voice = saved && reciters.find((r) => r.id === saved.reciterId);
    if (voice) { setSelected(voice); setEditionId(voice.editions.find((e) => e.id === saved.editionId)?.id ?? voice.editions[0].id); }
  }, [reciters, library.ready, library.library.listening]);
  async function choose(voice: ListeningReciter, edition: number) {
    audio.stop();
    try {
      await library.update((s) => ({ ...s, listening: { reciterId: voice.id, editionId: edition } }));
      setSelected(voice); setEditionId(edition); setQuery(""); setError(null);
    } catch { setError("This reciter preference could not be saved. Please retry."); }
  }
  const voices = useMemo(() => filterListeningCatalog(reciters, query), [reciters, query]);
  const available = selected ? availableListeningChapters(selected, editionId, chapters) : [];
  const rows: Row[] = selected ? available.filter((c) => !query || normalizeSearch(`${c.id} ${c.nameSimple} ${c.nameArabic} ${c.translatedName.name}`).includes(normalizeSearch(query))).map((chapter) => ({ type: "surah", chapter }))
    : voices.map((voice) => ({ type: "voice", voice }));
  return <FlatList data={rows} key={selected?.id ?? "voices"} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
    initialNumToRender={9} maxToRenderPerBatch={6} windowSize={5} keyExtractor={(row) => row.type === "voice" ? `voice:${row.voice.id}` : `surah:${row.chapter.id}`}
    ListHeaderComponent={<View style={{ gap: 14 }}>
      <Text style={{ color: theme.colors.text, fontSize: 30, fontWeight: "700" }}>{selected?.name ?? "Recitation library"}</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 16, lineHeight: 24 }}>{selected ? "Choose an available surah. Complete-surah recordings are separate from the verse-by-verse practice voice." : "Makkah, Madinah and beloved reciters. Authentic recordings streamed from MP3Quran’s official library."}</Text>
      {selected ? <AppButton label="Choose another reciter" variant="secondary" onPress={() => { setSelected(null); setQuery(""); }} /> : null}
      {selected && selected.editions.length > 1 ? <QuranSurface>{selected.editions.map((edition) => <Pressable key={edition.id} accessibilityRole="button" accessibilityState={{ selected: edition.id === editionId }} onPress={() => void choose(selected, edition.id)} style={styles.edition}>
        <Ionicons name={edition.id === editionId ? "checkmark-circle" : "ellipse-outline"} color={theme.colors.teal} size={23} /><Text style={{ flex: 1, color: theme.colors.text, fontSize: 15 }}>{edition.name}</Text></Pressable>)}</QuranSurface> : null}
      <TextInput accessibilityLabel={selected ? "Find recording surah" : "Find a reciter"} placeholder={selected ? "Find a surah" : "Find a reciter"} value={query} onChangeText={setQuery} maxLength={100} autoCorrect={false}
        placeholderTextColor={theme.colors.subtle} style={[styles.search, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border, color: theme.colors.text }]} />
      {loading ? <ActivityIndicator color={theme.colors.teal} accessibilityLabel="Loading reciters" /> : null}
      {error ? <QuranMessage message={error} onRetry={() => setRetry((n) => n + 1)} /> : null}
    </View>}
    renderItem={({ item, index }) => {
      if (item.type === "surah") return <Pressable accessibilityRole="button" accessibilityLabel={`Play ${item.chapter.nameSimple} by ${selected?.name}`} onPress={() => {
        if (!selected) return;
        void audio.playStream(listeningUrl(selected, editionId, item.chapter.id), item.chapter.nameSimple, selected.name).catch((reason) => setError(reason instanceof Error ? reason.message : "Recording could not play."));
      }} style={[styles.row, { borderBottomColor: theme.colors.border }]}><Text style={{ color: theme.colors.teal, fontSize: 14, width: 32 }}>{item.chapter.id}</Text><View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "600" }}>{item.chapter.nameSimple}</Text><Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 5 }}>{item.chapter.translatedName.name}</Text></View><Ionicons name="play-circle-outline" size={28} color={theme.colors.teal} /></Pressable>;
      const previous = rows[index - 1];
      return <View>{!previous || previous.type === "voice" && previous.voice.group !== item.voice.group
        ? <Text style={{ color: theme.colors.teal, fontWeight: "700", fontSize: 14, marginTop: 26 }}>{item.voice.group}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={`Select reciter ${item.voice.name}`} onPress={() => void choose(item.voice, item.voice.editions[0].id)} style={[styles.row, { borderBottomColor: theme.colors.border }]}>
          <View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "600" }}>{item.voice.name}</Text><Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 5 }}>{item.voice.editions[0].chapters.length} surahs available</Text></View><Ionicons name="chevron-forward" size={22} color={theme.colors.teal} />
        </Pressable></View>;
    }}
    ListEmptyComponent={!loading && !error ? <Text style={{ color: theme.colors.muted, fontSize: 16, paddingVertical: 24 }}>No matching recordings.</Text> : null}
    ListFooterComponent={<View style={{ paddingVertical: 24, gap: 12 }}><Text style={{ color: theme.colors.subtle, fontSize: 12, lineHeight: 20 }}>Recordings: MP3Quran.net · Hafs editions only. Some reciters have a partial collection. Audio is streamed, not republished or saved here.</Text><AppButton label="About the audio source" variant="ghost" icon="open-outline" onPress={() => void Linking.openURL("https://www.mp3quran.net/eng/about")} /></View>} />;
}
const styles = StyleSheet.create({ content: { width: "100%", maxWidth: 840, alignSelf: "center", padding: 18 }, row: { flexDirection: "row", gap: 14, alignItems: "center", minHeight: 84, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth }, search: { borderRadius: 22, padding: 16, fontSize: 16, minHeight: 54, borderWidth: StyleSheet.hairlineWidth }, edition: { flexDirection: "row", gap: 12, paddingVertical: 12, alignItems: "center", minHeight: 48 } });
