import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, FlatList, Pressable, StyleSheet, Text, TextInput, View, type ViewToken } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { normalizeSearch, parseAyahReference, quranAttribution, versePage, type QuranChapter, type QuranVerse } from "@hbic/shared";
import { quranClient } from "../services/quran";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppButton } from "../components/AppButton";
import { QuranIconButton, QuranMessage } from "./QuranControls";
import { QuranHome } from "./QuranHome";
import { QuranVerseRow } from "./QuranVerseRow";
import { QuranSettings } from "./QuranSettings";
import { QuranPractice } from "./QuranPractice";
import { QuranMiniPlayer } from "./QuranMiniPlayer";
import { QuranListening } from "./QuranListening";
import { QuranMushaf } from "./QuranMushaf";
import { QuranReadingLayout } from "./QuranReadingLayout";
import { QuranVoiceSearch } from "./QuranVoiceSearch";
import { resolveVoiceNavigation } from "./voiceNavigation";
import { useQuranAudio } from "./useQuranAudio";
import { useQuranLibrary } from "./useQuranLibrary";
import { useQuranReader } from "./useQuranReader";
import { useQuranTransition } from "./useQuranTransition";
import type { QuranMode } from "./types";
type Row = { kind: "chapter"; chapter: QuranChapter } | { kind: "verse"; verse: QuranVerse } | { kind: "bookmark"; key: string };
const titles: Record<QuranMode, string> = { home: "Quran & Recite", read: "Reader", listen: "Listen", search: "Search Quran", practice: "Practise", memorize: "Memorization", bookmarks: "Bookmarks", test: "Test yourself", settings: "Preferences" };
export default function QuranReaderScreen() {
  const router = useRouter(), params = useLocalSearchParams<{ chapter?: string; ayah?: string }>();
  const { theme } = useAppTheme();
  const [fontLoaded] = useFonts({ QuranNaskh: require("../../assets/fonts/NotoNaskhArabic.ttf") });
  const library = useQuranLibrary(), audio = useQuranAudio();
  const { update: updateLibrary, bookmark: toggleBookmark } = library;
  const [mode, setMode] = useState<QuranMode>("home"), [chapterId, setChapterId] = useState(1), [target, setTarget] = useState(1);
  const transition = useQuranTransition(`${mode}:${chapterId}:${library.library.preferences.layout}`);
  const [query, setQuery] = useState(""), [jump, setJump] = useState("");
  const [searchResults, setSearchResults] = useState<QuranVerse[]>([]), [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [autoListen, setAutoListen] = useState(false);
  const reader = useQuranReader(chapterId, library.library.preferences.reciter, library.library.preferences.translation);
  const { chapter: currentChapter, loadPage } = reader;
  const list = useRef<FlatList<Row>>(null), generation = useRef(0), restored = useRef(false);
  const visibleSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingJump = useRef(true);
  const viewContext = useRef({ mode, read: library.read }); viewContext.current = { mode, read: library.read };
  const [opening, setOpening] = useState<QuranVerse | null>(null);
  useEffect(() => {
    if (!library.ready || restored.current) return;
    restored.current = true;
    const ref = parseAyahReference(`${params.chapter ?? library.library.lastRead?.chapter ?? 1}:${params.ayah ?? library.library.lastRead?.ayah ?? 1}`);
    if (ref) { setChapterId(ref.chapter); setTarget(ref.ayah); if (params.chapter) setMode("read"); }
  }, [library.ready, library.library.lastRead, params.chapter, params.ayah]);
  const resources = reader.resources;
  useEffect(() => {
    if (!resources || !library.ready) return;
    const preferences = library.library.preferences;
    const reciter = resources.reciters.find((r) => r.id === preferences.reciter)?.id ?? resources.reciters[0]?.id;
    const translation = resources.translations.find((t) => t.id === preferences.translation)?.id ?? resources.translations.find((t) => t.language.toLowerCase() === "english")?.id;
    if (reciter && translation && (reciter !== preferences.reciter || translation !== preferences.translation))
      void updateLibrary((s) => ({ ...s, preferences: { ...s.preferences, reciter, translation } })).catch(() => {});
  }, [resources, library.ready, library.library.preferences, updateLibrary]);
  useEffect(() => { audio.stop(); }, [chapterId, library.library.preferences.reciter, library.library.preferences.translation]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const epoch = ++generation.current; setError(null); setBusy(false);
    if (mode !== "read" || library.library.preferences.layout === "madinah" || !currentChapter) return;
    if (target > currentChapter.versesCount) { setError("That ayah is outside this surah."); return; }
    setBusy(true);
    void loadPage(versePage(target)).catch((reason) => { if (epoch === generation.current) setError(reason instanceof Error ? reason.message : "Ayahs could not be loaded."); })
      .finally(() => { if (epoch === generation.current) setBusy(false); });
  }, [mode, currentChapter, loadPage, target, library.library.preferences.layout]);
  useEffect(() => {
    const request = new AbortController();
    if (mode !== "search") return;
    setSearchResults([]); setError(null); setSearching(false);
    if (query.trim().length < 2) return;
    const timeout = setTimeout(() => {
      setSearching(true);
      void quranClient.searchVerses(query, library.library.preferences, request.signal).then((results) => { if (!request.signal.aborted) setSearchResults(results); })
        .catch((reason) => { if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : "Search failed."); })
        .finally(() => { if (!request.signal.aborted) setSearching(false); });
    }, 350);
    return () => { clearTimeout(timeout); request.abort(); };
  }, [mode, query, library.library.preferences.reciter, library.library.preferences.translation]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pendingJump.current || mode !== "read" || !reader.verses.length) return;
    const index = reader.verses.findIndex((v) => v.verseNumber === target);
    if (index < 0) return;
    const timeout = setTimeout(() => { pendingJump.current = false; list.current?.scrollToIndex({ index, animated: false, viewPosition: .1 }); }, 150);
    return () => clearTimeout(timeout);
  }, [mode, target, reader.verses]);
  useEffect(() => {
    setOpening(null); const request = new AbortController();
    if (mode === "read" && library.library.preferences.layout !== "madinah" && chapterId !== 1 && chapterId !== 9 && target === 1 && resources)
      void quranClient.verse("1:1", library.library.preferences, request.signal).then((verse) => { if (!request.signal.aborted) setOpening(verse); }).catch(() => {});
    return () => request.abort();
  }, [mode, chapterId, target, resources, library.library.preferences.reciter, library.library.preferences.translation, library.library.preferences.layout]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (autoListen && mode === "read" && reader.chapter) {
      setAutoListen(false); void playContinuous();
    }
  }, [autoListen, mode, reader.chapter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (visibleSave.current) clearTimeout(visibleSave.current); }, [mode, chapterId, library.library.preferences.layout]);
  function open(chapter: number, ayah = 1) { pendingJump.current = true; setChapterId(chapter); setTarget(ayah); setMode("read"); setQuery(""); setError(null); }
  async function playContinuous() {
    if (!reader.chapter) return;
    await audio.start(Array.from({ length: reader.chapter.versesCount - target + 1 }, (_, i) => target + i), reader.getVerse);
  }
  const bookmark = useCallback((key: string) => { void toggleBookmark(key).catch(() => {}); }, [toggleBookmark]);
  async function play(verse: QuranVerse) {
    if (audio.playback.verse?.verseKey === verse.verseKey && audio.playback.phase === "playing") { audio.queue.pause(); return; }
    if (parseAyahReference(verse.verseKey)?.chapter !== chapterId) { await audio.start([verse.verseNumber], async () => verse); return; }
    await audio.start([verse.verseNumber], reader.getVerse);
  }
  const onVisible = useRef(({ viewableItems }: { viewableItems: ViewToken<Row>[] }) => {
    if (viewContext.current.mode !== "read") return;
    const row = viewableItems.find((entry) => entry.item.kind === "verse")?.item;
    if (row?.kind !== "verse") return;
    const ref = parseAyahReference(row.verse.verseKey)!;
    if (visibleSave.current) clearTimeout(visibleSave.current);
    visibleSave.current = setTimeout(() => { void viewContext.current.read(ref.chapter, ref.ayah).catch(() => {}); }, 700);
  }).current;
  const chapterMatches = useMemo(() => reader.chapters.filter((c) => !query || `${c.id} ${normalizeSearch(c.nameSimple)} ${normalizeSearch(c.nameArabic)} ${normalizeSearch(c.translatedName.name)}`.includes(normalizeSearch(query))), [reader.chapters, query]);
  const rows: Row[] = useMemo(() => mode === "home" ? chapterMatches.map((chapter) => ({ kind: "chapter", chapter }))
    : mode === "read" ? reader.verses.map((verse) => ({ kind: "verse", verse }))
      : mode === "search" ? searchResults.map((verse) => ({ kind: "verse", verse }))
        : mode === "bookmarks" ? library.library.bookmarks.map((key) => ({ kind: "bookmark", key })) : [], [mode, chapterMatches, reader.verses, searchResults, library.library.bookmarks]);
  const onMode = (next: QuranMode, listen = false) => { if (next === "read") pendingJump.current = true; setMode(next); setError(null); setAutoListen(listen); setQuery(""); };
  const header = <View style={styles.headerContent}>
    {mode === "home" ? <QuranHome library={library} chapters={reader.chapters} fontLoaded={fontLoaded} audioAvailable={Boolean(resources?.reciters.length)} onMode={onMode} onOpen={open} /> : null}
    {resources?.contentSource === "tanzil" && mode === "home" ? <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 21 }}>114 surahs · Verbatim Uthmani text available offline. Reference recitation and translations require approved provider access.</Text> : null}
    {mode === "home" || mode === "search" ? <View style={[styles.search, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border }]}><Ionicons name="search" size={20} color={theme.colors.teal} /><TextInput accessibilityLabel={mode === "home" ? "Find surah by name or number" : "Search Quran Arabic, English or ayah reference"} value={query} onChangeText={setQuery} maxLength={120} autoCorrect={false} placeholder={mode === "home" ? "Find a surah" : "Search Arabic, English, or 2:255"} placeholderTextColor={theme.colors.subtle} style={[styles.input, { color: theme.colors.text }]} /></View> : null}
    {mode === "search" ? <QuranVoiceSearch stopPlayback={audio.stop} onQuery={(text) => {
      const destination = resolveVoiceNavigation(text, reader.chapters);
      if (destination) open(destination.chapter, destination.ayah); else setQuery(text);
    }} /> : null}
    {mode === "read" && reader.chapter ? <View style={{ gap: 12 }}>
      <View style={styles.row}><QuranIconButton label="Previous surah" icon="chevron-back" disabled={chapterId === 1} onPress={() => open(chapterId - 1)} /><View style={styles.chapterTitle}><Text style={{ color: theme.colors.text, fontSize: 27, fontWeight: "700", textAlign: "center" }}>{reader.chapter.nameSimple}</Text><Text style={{ color: theme.colors.muted, textAlign: "center", fontSize: 13, lineHeight: 20 }}>{reader.chapter.translatedName.name} · {reader.chapter.versesCount} ayahs · {reader.chapter.revelationPlace}</Text></View><QuranIconButton label="Next surah" icon="chevron-forward" disabled={chapterId === 114} onPress={() => open(chapterId + 1)} /></View>
      <View style={[styles.search, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border }]}><TextInput value={jump} onChangeText={setJump} accessibilityLabel="Jump to ayah or surah:ayah" placeholder={`Ayah or ${chapterId}:ayah`} placeholderTextColor={theme.colors.subtle} keyboardType="numbers-and-punctuation" style={[styles.input, { color: theme.colors.text }]} /><AppButton label="Go" variant="ghost" onPress={() => { const ref = parseAyahReference(jump.includes(":") ? jump : `${chapterId}:${jump}`); if (ref) open(ref.chapter, ref.ayah); else setError("Enter a valid ayah or surah:ayah reference."); }} /></View>
      {opening ? <Text style={{ fontFamily: fontLoaded ? "QuranNaskh" : undefined, color: theme.colors.text, fontSize: 27, lineHeight: 57, writingDirection: "rtl", textAlign: "center" }}>{opening.textUthmani}</Text> : null}
      <View style={styles.row}>{resources?.reciters.length ? <AppButton label="Listen to surah" icon="headset-outline" variant="secondary" onPress={() => void playContinuous().catch(() => setError("Reference audio could not start."))} /> : null}<AppButton label="Practise" variant="secondary" icon="mic-outline" onPress={() => onMode("practice")} /></View>
      {reader.pages.length && reader.pages[0].page > 1 ? <AppButton label="Earlier ayahs" variant="ghost" onPress={() => void reader.loadPage(reader.pages[0].page - 1).catch(() => setError("Earlier ayahs could not load."))} /> : null}
    </View> : null}
    {["practice", "memorize", "test"].includes(mode) && reader.chapter ? <QuranPractice key={`${chapterId}:${mode}:${library.library.preferences.reciter}`} mode={mode} chapter={reader.chapter} getVerse={reader.getVerse} audio={audio} library={library} fontLoaded={fontLoaded} /> : null}
    {mode === "settings" ? <QuranSettings library={library} resources={resources} /> : null}
    {mode === "bookmarks" ? <><Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "700" }}>Your bookmarks</Text><Text style={{ color: theme.colors.muted, fontSize: 16 }}>Saved on this device. Tap an ayah to continue reading.</Text></> : null}
    {library.storageError ? <QuranMessage message={library.storageError} /> : null}
    {reader.error ? <QuranMessage message={reader.error} onRetry={reader.retry} /> : null}
    {error ? <QuranMessage message={error} onRetry={() => { setError(null); void reader.loadPage(versePage(target)).catch(() => setError("Quran content is unavailable. Please retry.")); }} /> : null}
    {reader.loading || busy || searching ? <ActivityIndicator color={theme.colors.teal} style={{ padding: 18 }} accessibilityLabel="Loading Quran content" /> : null}
  </View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top", "bottom"]}>
    <View style={[styles.navigation, { borderBottomColor: theme.colors.border }]}><QuranIconButton label={mode === "home" ? "Back to More" : "Quran home"} icon="chevron-back" onPress={() => { if (mode === "home") { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/more"); } else onMode("home"); }} />
      <Text numberOfLines={1} style={[styles.navTitle, { color: theme.colors.text }]}>{titles[mode]}</Text><QuranIconButton label="Search Quran" icon="search-outline" onPress={() => onMode("search")} /><QuranIconButton label="Quran preferences" icon="options-outline" onPress={() => onMode("settings")} /></View>
    <Animated.View style={[{ flex: 1 }, transition]}>
    {mode === "read" && library.library.preferences.layout !== "madinah" ? <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}><QuranReadingLayout library={library} /></View> : null}
    {mode === "listen" ? <QuranListening chapters={reader.chapters} audio={audio} library={library} />
      : mode === "read" && library.library.preferences.layout === "madinah" ? <QuranMushaf reference={`${chapterId}:${target}`} library={library} audio={audio} onOpenAyah={(key) => {
        void updateLibrary((s) => ({ ...s, preferences: { ...s.preferences, layout: "ayah" } })).then(() => { const ref = parseAyahReference(key)!; open(ref.chapter, ref.ayah); }).catch(() => {});
      }} /> : <FlatList ref={list} data={rows} key={`${mode}:${chapterId}`} style={styles.list} contentContainerStyle={styles.listContent} ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled" initialNumToRender={8} maxToRenderPerBatch={6} windowSize={5}
      keyExtractor={(row) => row.kind === "chapter" ? `chapter:${row.chapter.id}` : row.kind === "verse" ? row.verse.verseKey : row.key}
      onViewableItemsChanged={onVisible} viewabilityConfig={{ itemVisiblePercentThreshold: 30, minimumViewTime: 400 }}
      onScrollToIndexFailed={({ index, averageItemLength }) => list.current?.scrollToOffset({ offset: Math.max(0, averageItemLength * index), animated: false })}
      renderItem={({ item }) => item.kind === "verse" ? <QuranVerseRow verse={item.verse} preferences={library.library.preferences} bookmarked={library.library.bookmarks.includes(item.verse.verseKey)} playing={audio.playback.phase === "playing" && audio.playback.verse?.verseKey === item.verse.verseKey} fontLoaded={fontLoaded} onBookmark={bookmark} onPlay={(verse) => void play(verse).catch(() => setError("Audio is unavailable."))} onOpen={mode === "search" ? (key) => { const ref = parseAyahReference(key)!; open(ref.chapter, ref.ayah); } : undefined} />
        : item.kind === "chapter" ? <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.chapter.nameSimple}, ${item.chapter.versesCount} ayahs`} onPress={() => open(item.chapter.id)} style={({ pressed }) => [styles.chapterRow, { borderBottomColor: theme.colors.border, opacity: pressed ? .6 : 1 }]}><View style={[styles.number, { backgroundColor: theme.colors.tintSoft }]}><Text style={{ color: theme.colors.teal, fontSize: 15, fontWeight: "700" }}>{item.chapter.id}</Text></View><View style={{ flex: 1, minWidth: 100 }}><Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "600" }}>{item.chapter.nameSimple}</Text><Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 }}>{item.chapter.translatedName.name} · {item.chapter.versesCount} ayahs</Text></View><Text style={{ color: theme.colors.teal, fontFamily: fontLoaded ? "QuranNaskh" : undefined, fontSize: 24, lineHeight: 45, writingDirection: "rtl", maxWidth: "42%" }}>{item.chapter.nameArabic}</Text></Pressable>
          : <View style={[styles.chapterRow, { borderBottomColor: theme.colors.border }]}><Pressable accessibilityRole="button" accessibilityLabel={`Open bookmarked ayah ${item.key}`} onPress={() => { const ref = parseAyahReference(item.key)!; open(ref.chapter, ref.ayah); }} style={{ flex: 1, flexDirection: "row", alignItems: "center", minHeight: 48, gap: 14 }}><Ionicons name="bookmark" color={theme.colors.teal} size={22} /><Text style={{ color: theme.colors.text, fontSize: 17, flex: 1 }}>Ayah {item.key}</Text></Pressable><QuranIconButton label={`Remove bookmark ${item.key}`} icon="close" onPress={() => bookmark(item.key)} /></View>}
      ListEmptyComponent={!reader.loading && !busy && !reader.error && ["bookmarks", "search", "home"].includes(mode) ? <Text style={{ color: theme.colors.muted, fontSize: 16, lineHeight: 24, padding: 18 }}>{mode === "bookmarks" ? "No bookmarks yet. Save an ayah from the reader." : mode === "search" ? query.trim().length < 2 ? "Enter text or an ayah reference to search." : searching ? "Searching…" : "No matching ayahs. Try a surah name or reference." : "No matching surahs."}</Text> : null}
      ListFooterComponent={<View style={{ gap: 12, paddingVertical: 24 }}>{mode === "read" && reader.pages.at(-1)?.hasMore ? <AppButton label="Load next ayahs" variant="secondary" onPress={() => void reader.loadPage(reader.pages.at(-1)!.page + 1).catch(() => setError("More ayahs could not load."))} /> : null}<Text style={{ color: theme.colors.subtle, fontSize: 12, lineHeight: 20, textAlign: "center" }}>{resources?.contentSource === "tanzil" ? "Quran text: Tanzil Project · Uthmani 1.1 · CC BY 3.0" : quranAttribution}{"\n"}Arabic is shown exactly as supplied. Translations convey the meaning.</Text>{resources?.contentSource === "tanzil" ? <AppButton label="Tanzil source and updates" variant="ghost" icon="open-outline" onPress={() => void Linking.openURL("https://tanzil.net")} /> : null}</View>} />}
    </Animated.View>
    <QuranMiniPlayer audio={audio} reciter={resources?.reciters.find((r) => r.id === library.library.preferences.reciter)?.name ?? "Reference recitation"} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  navigation: { paddingHorizontal: 10, minHeight: 62, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  navTitle: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: "700" }, list: { flex: 1 }, listContent: { width: "100%", maxWidth: 840, alignSelf: "center", padding: 18, paddingBottom: 28 },
  headerContent: { gap: 14 }, search: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, borderRadius: 24, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: 12 }, row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 },
  chapterTitle: { flex: 1, minWidth: 150 }, chapterRow: { minHeight: 84, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 14, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  number: { minWidth: 40, minHeight: 40, borderRadius: 15, alignItems: "center", justifyContent: "center" }
});
