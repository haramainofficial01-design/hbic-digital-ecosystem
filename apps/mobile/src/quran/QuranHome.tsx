import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../i18n/LocalizedText";
import type { QuranChapter } from "@hbic/shared";
import { useAppTheme } from "../theme/ThemeProvider";
import { QuranSurface } from "./QuranControls";
import type { QuranLibrary, QuranMode } from "./types";
const actions: { mode: QuranMode; title: string; detail: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: "read", title: "Read", detail: "A calm reader", icon: "book-outline" },
  { mode: "listen", title: "Listen", detail: "Reciter library", icon: "headset-outline" },
  { mode: "practice", title: "Practise", detail: "Record & replay", icon: "mic-outline" },
  { mode: "memorize", title: "Memorize", detail: "Listen & repeat", icon: "repeat-outline" },
  { mode: "test", title: "Test yourself", detail: "Recall & reveal", icon: "sparkles-outline" },
  { mode: "search", title: "Search", detail: "Find an ayah", icon: "search-outline" },
  { mode: "bookmarks", title: "Bookmarks", detail: "Your saved ayahs", icon: "bookmark-outline" },
  { mode: "review", title: "My Library", detail: "Recordings & word review", icon: "albums-outline" },
  { mode: "challenges", title: "Community Challenges", detail: "Optional seasonal rankings", icon: "trophy-outline" }
];
export function QuranHome({ library, chapters, onMode, onOpen, fontLoaded, audioAvailable }: {
  library: QuranLibrary; chapters: QuranChapter[]; onMode: (mode: QuranMode, listen?: boolean) => void;
  onOpen: (chapter: number, ayah: number) => void; fontLoaded: boolean; audioAvailable: boolean;
}) {
  const { theme } = useAppTheme();
  const state = library.library;
  const last = chapters.find((c) => c.id === state.lastRead?.chapter);
  return <View style={styles.content}>
    <View style={styles.welcome}>
      <Text style={{ color: theme.colors.teal, fontFamily: fontLoaded ? "QuranNaskh" : undefined, fontSize: 37, lineHeight: 64, textAlign: "center", writingDirection: "rtl" }}>القرآن الكريم</Text>
      <Text style={[styles.title, { color: theme.colors.text }]}>Quran &amp; Recite</Text>
      <Text style={[styles.body, { color: theme.colors.muted }]}>Read, listen, memorize, and strengthen your connection with the Quran.</Text>
    </View>
    {state.lastRead ? <Pressable accessibilityRole="button" accessibilityLabel={`Continue reading ${last?.nameSimple ?? `surah ${state.lastRead.chapter}`} ayah ${state.lastRead.ayah}`} onPress={() => onOpen(state.lastRead!.chapter, state.lastRead!.ayah)}>
      <QuranSurface style={{ backgroundColor: theme.colors.navy }}><Text style={{ color: theme.colors.gold, fontSize: 13, fontWeight: "700" }}>Continue reading</Text>
        <View style={styles.row}><View style={{ flex: 1 }}><Text style={{ color: theme.colors.white, fontSize: 25, fontWeight: "700", marginTop: 8 }}>{last?.nameSimple ?? `Surah ${state.lastRead.chapter}`}</Text>
          <Text style={{ color: "#CAD8DF", fontSize: 15, marginTop: 6 }}>Ayah {state.lastRead.ayah}{last ? ` of ${last.versesCount}` : ""}</Text></View>
          <Ionicons name="arrow-forward-circle" size={38} color={theme.colors.gold} /></View>
      </QuranSurface>
    </Pressable> : null}
    <View style={styles.grid}>{actions.map((action) => <Pressable key={action.title} accessibilityRole="button" accessibilityLabel={action.title} accessibilityHint={action.detail} onPress={() => onMode(action.mode)}
      style={({ pressed }) => [styles.action, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border, opacity: pressed ? .72 : 1 }]}>
      <Ionicons name={action.icon} size={25} color={theme.colors.teal} />
      <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "700", marginTop: 12 }}>{action.title}</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{action.mode === "memorize" && !audioAvailable ? "Recall & review" : action.detail}</Text>
    </Pressable>)}</View>
    {state.recent.length ? <View><Text style={[styles.heading, { color: theme.colors.text }]}>Recently opened</Text>
      <View style={styles.row}>{state.recent.slice(0, 4).map((id) => <Pressable key={id} accessibilityRole="button" onPress={() => onOpen(id, 1)} style={[styles.recent, { backgroundColor: theme.colors.tintSoft }]}><Text style={{ color: theme.colors.teal, fontSize: 14 }}>{chapters.find((c) => c.id === id)?.nameSimple ?? `Surah ${id}`}</Text></Pressable>)}</View>
    </View> : null}
    {state.memorization.length ? <View><Text style={[styles.heading, { color: theme.colors.text }]}>Revision · self-reported</Text>
      {state.memorization.filter((p) => p.status === "needs_revision").slice(0, 5).map((p) => <Pressable key={`${p.chapter}:${p.from}-${p.to}`} accessibilityRole="button" onPress={() => { onOpen(p.chapter, p.from); onMode("memorize"); }} style={styles.revision}><Text style={{ color: theme.colors.text, fontSize: 15 }}>{chapters.find((c) => c.id === p.chapter)?.nameSimple ?? `Surah ${p.chapter}`} · Ayahs {p.from}–{p.to}</Text><Ionicons name="chevron-forward" size={18} color={theme.colors.teal} /></Pressable>)}
    </View> : null}
    <Text style={[styles.heading, { color: theme.colors.text }]}>Browse surahs</Text>
  </View>;
}
const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 10 }, welcome: { alignItems: "center", paddingTop: 12, paddingBottom: 10 },
  title: { fontSize: 34, fontWeight: "700", lineHeight: 42, textAlign: "center" }, body: { fontSize: 16, lineHeight: 24, textAlign: "center", marginTop: 10, maxWidth: 360 },
  heading: { fontSize: 20, fontWeight: "700", marginBottom: 10 }, row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, action: { flexBasis: "45%", flexGrow: 1, minWidth: 125, padding: 16, borderRadius: 21, borderWidth: StyleSheet.hairlineWidth },
  recent: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 22 }, revision: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 }
});
