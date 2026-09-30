import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { listChapters, loadBookmarks, loadLastRead, readChapter, saveBookmarks, saveLastRead, searchVerses, type QuranChapter, type QuranVerse } from "../src/services/quran";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";
import { quranReaderAvailable } from "../src/config/releaseFeatures";

export default function QuranScreen() {
  return quranReaderAvailable ? <QuranReaderScreen /> : <QuranMaintenanceScreen />;
}

function QuranMaintenanceScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <GlassCard tone="navy">
        <Text style={styles.arabicTitle}>ٱلْقُرْآنُ ٱلْكَرِيمُ</Text>
        <Text style={[styles.maintenanceTitle, { color: theme.colors.white }]}>Quran &amp; Recite</Text>
        <Text style={styles.heroBody}>Under maintenance — please check back soon.</Text>
      </GlassCard>
      <GlassCard>
        <Text style={[styles.maintenanceBody, { color: theme.colors.text }]}>This is temporary. Prayer and iqamah times remain available as usual.</Text>
        <AppButton label="Hadith Library on Sunnah.com" icon="open-outline" variant="secondary" accessibilityHint="Opens the external Sunnah.com website" onPress={() => void Linking.openURL("https://sunnah.com")} />
      </GlassCard>
    </AppScreen>
  );
}

function QuranReaderScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [chapters, setChapters] = useState<QuranChapter[]>([]);
  const [chapterId, setChapterId] = useState(1);
  const [chapter, setChapter] = useState<QuranChapter | null>(null);
  const [verses, setVerses] = useState<QuranVerse[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const player = useAudioPlayer(null);
  const audioStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    void Promise.all([listChapters(), loadBookmarks(), loadLastRead()])
      .then(([items, keys, last]) => { setChapters(items); setBookmarks(keys); setChapterId(last); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Quran content is unavailable."));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void readChapter(chapterId).then((result) => {
      setChapter(result.chapter);
      setVerses(result.verses);
      setPage(1);
      setHasMore(result.hasMore);
      setSearchMode(false);
      void saveLastRead(chapterId);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "This surah is unavailable."))
      .finally(() => setLoading(false));
  }, [chapterId]);

  useEffect(() => { if (audioStatus.didJustFinish) setPlayingKey(null); }, [audioStatus.didJustFinish]);

  async function search() {
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try { setVerses(await searchVerses(query)); setSearchMode(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Search is unavailable."); }
    finally { setLoading(false); }
  }

  async function more() {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const result = await readChapter(chapterId, page + 1);
      setVerses((current) => [...current, ...result.verses]);
      setPage(result.page);
      setHasMore(result.hasMore);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "More ayahs could not be loaded."); }
    finally { setLoading(false); }
  }

  function toggleBookmark(key: string) {
    const next = bookmarks.includes(key) ? bookmarks.filter((item) => item !== key) : [...bookmarks, key];
    setBookmarks(next);
    void saveBookmarks(next);
  }

  function play(verse: QuranVerse) {
    if (!verse.audioUrl) return;
    if (playingKey === verse.verseKey && audioStatus.playing) { player.pause(); setPlayingKey(null); return; }
    player.replace({ uri: verse.audioUrl });
    player.play();
    setPlayingKey(verse.verseKey);
  }

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title="Quran" subtitle="A calm place to read, listen, search, and continue." />
      <GlassCard tone="navy">
        <Text style={styles.arabicTitle}>ٱلْقُرْآنُ ٱلْكَرِيمُ</Text>
        <Text style={styles.heroBody}>Verified Quran text and translations from Quran Foundation / Quran.com.</Text>
        <View style={styles.actions}>
          <AppButton label="Qibla" icon="compass" onPress={() => router.push("/qibla" as never)} style={styles.action} />
          <AppButton label="Hadith Library" icon="open-outline" variant="secondary" onPress={() => Linking.openURL("https://sunnah.com")} style={styles.action} />
        </View>
      </GlassCard>
      <View style={[styles.search, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border }]}>
        <Ionicons name="search" size={20} color={theme.colors.teal} />
        <TextInput value={query} onChangeText={setQuery} onSubmitEditing={search} returnKeyType="search" placeholder="Search Arabic, English, or 2:255" placeholderTextColor={theme.colors.subtle} style={[styles.input, { color: theme.colors.text }]} accessibilityLabel="Search the Quran" />
        <Pressable onPress={search} disabled={query.trim().length < 2 || loading} style={[styles.searchButton, { backgroundColor: theme.colors.teal }]}><Text style={styles.searchText}>Search</Text></Pressable>
      </View>
      {!searchMode ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chapterStrip}>
          {chapters.map((item) => <Pressable key={item.id} onPress={() => setChapterId(item.id)} style={[styles.chapterPill, { borderColor: item.id === chapterId ? theme.colors.gold : theme.colors.border, backgroundColor: theme.colors.card }]}>
            <Text style={[styles.chapterArabic, { color: theme.colors.gold }]}>{item.nameArabic}</Text>
            <Text style={[styles.chapterName, { color: theme.colors.text }]}>{item.id}. {item.nameSimple}</Text>
            <Text style={[styles.chapterMeta, { color: theme.colors.muted }]}>{item.versesCount} ayahs</Text>
          </Pressable>)}
        </ScrollView>
      ) : <AppButton label="Return to surah" icon="arrow-back" variant="secondary" onPress={() => { setSearchMode(false); setQuery(""); void readChapter(chapterId).then((result) => setVerses(result.verses)); }} />}
      {!searchMode && chapter ? <GlassCard tone="gold" style={styles.chapterHeader}>
        <Text style={[styles.chapterMeta, { color: theme.colors.muted }]}>{chapter.revelationPlace} · {chapter.versesCount} ayahs</Text>
        <Text style={[styles.currentChapter, { color: theme.colors.text }]}>{chapter.nameSimple}</Text>
        <Text style={[styles.chapterArabic, { color: theme.colors.gold }]}>{chapter.nameArabic}</Text>
      </GlassCard> : null}
      {error ? <GlassCard tone="teal"><Text style={[styles.error, { color: theme.colors.text }]}>{error}</Text><Text style={[styles.errorNote, { color: theme.colors.muted }]}>Prayer and iqamah remain available. Quran text is never generated or substituted.</Text></GlassCard> : null}
      {!error && verses.map((verse) => <GlassCard key={verse.verseKey}>
        <View style={styles.verseTop}>
          <Text style={[styles.verseKey, { color: theme.colors.teal }]}>{verse.verseKey}</Text>
          <View style={styles.verseActions}>
            <Pressable disabled={!verse.audioUrl} onPress={() => play(verse)} accessibilityLabel={`${playingKey === verse.verseKey ? "Pause" : "Play"} ayah ${verse.verseKey}`}><Ionicons name={playingKey === verse.verseKey && audioStatus.playing ? "pause-circle" : "play-circle"} size={30} color={verse.audioUrl ? theme.colors.teal : theme.colors.subtle} /></Pressable>
            <Pressable onPress={() => toggleBookmark(verse.verseKey)} accessibilityLabel={`Bookmark ayah ${verse.verseKey}`}><Ionicons name={bookmarks.includes(verse.verseKey) ? "bookmark" : "bookmark-outline"} size={24} color={bookmarks.includes(verse.verseKey) ? theme.colors.gold : theme.colors.subtle} /></Pressable>
          </View>
        </View>
        <Text selectable style={[styles.ayah, { color: theme.colors.text }]}>{verse.textUthmani}</Text>
        <Text style={[styles.translationLabel, { color: theme.colors.gold }]}>TRANSLATION OF THE MEANING</Text>
        <Text style={[styles.translation, { color: theme.colors.muted }]}>{verse.translation}</Text>
        <Text style={[styles.source, { color: theme.colors.subtle }]}>{verse.translationName}</Text>
      </GlassCard>)}
      {loading ? <ActivityIndicator size="large" color={theme.colors.teal} style={styles.loader} /> : null}
      {!searchMode && hasMore && !error ? <AppButton label="Continue this surah" icon="chevron-down" variant="secondary" disabled={loading} onPress={more} /> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  maintenanceTitle: { fontSize: 30, fontWeight: "800", marginTop: 12, marginBottom: 8 },
  maintenanceBody: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
  arabicTitle: { color: "#E7C66B", fontSize: 36, lineHeight: 58, fontWeight: "700", textAlign: "right" },
  heroBody: { color: "rgba(255,255,255,.75)", fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  action: { flexGrow: 1 },
  search: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 28, paddingLeft: 16, paddingRight: 6 },
  input: { flex: 1, minWidth: 0, fontSize: 14 },
  searchButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 14, borderRadius: 20 },
  searchText: { color: "white", fontWeight: "900" },
  chapterStrip: { gap: 10, paddingRight: 16 },
  chapterPill: { width: 166, minHeight: 108, borderWidth: 1, borderRadius: 18, padding: 14 },
  chapterArabic: { fontSize: 24, lineHeight: 35, textAlign: "right", fontWeight: "700" },
  chapterName: { fontWeight: "900", fontSize: 14, marginTop: 3 },
  chapterMeta: { fontSize: 11, marginTop: 3 },
  chapterHeader: { alignItems: "center", paddingVertical: 22 },
  currentChapter: { fontSize: 34, fontWeight: "900", marginTop: 6 },
  verseTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  verseActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  verseKey: { fontSize: 14, fontWeight: "900" },
  ayah: { fontSize: 30, lineHeight: 62, textAlign: "right", writingDirection: "rtl", marginVertical: 24 },
  translationLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  translation: { fontSize: 16, lineHeight: 25, marginTop: 8 },
  source: { fontSize: 11, marginTop: 8 },
  error: { fontSize: 16, fontWeight: "900" },
  errorNote: { lineHeight: 20, marginTop: 8 },
  loader: { marginVertical: 24 }
});
