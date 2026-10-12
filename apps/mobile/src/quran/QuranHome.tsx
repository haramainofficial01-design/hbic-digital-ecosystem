import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "../i18n/LocalizedText";
import type { QuranChapter } from "@hbic/shared";
import { useAppTheme } from "../theme/ThemeProvider";
import { QuranSurface } from "./QuranControls";
import type { QuranLibrary, QuranMode } from "./types";
const actions: { mode: QuranMode; title: string; detail: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: "practice", title: "Practise", detail: "Record & replay", icon: "mic-outline" },
  { mode: "memorize", title: "Memorize", detail: "Listen & repeat", icon: "repeat-outline" },
  { mode: "test", title: "Test yourself", detail: "Recall & reveal", icon: "sparkles-outline" },
  { mode: "bookmarks", title: "Bookmarks", detail: "Your saved ayahs", icon: "bookmark-outline" },
  { mode: "review", title: "My Library", detail: "Recordings & word review", icon: "albums-outline" },
  { mode: "challenges", title: "Community Challenges", detail: "Optional seasonal rankings", icon: "trophy-outline" }
];
export function QuranHome({ library, chapters, onMode, onOpen, fontLoaded, audioAvailable }: {
  library: QuranLibrary; chapters: QuranChapter[]; onMode: (mode: QuranMode, listen?: boolean) => void;
  onOpen: (chapter: number, ayah: number) => void; fontLoaded: boolean; audioAvailable: boolean;
}) {
  const { theme } = useAppTheme();
  const expanded = useWindowDimensions().width >= 1000;
  const state = library.library;
  const resume = state.lastRead ?? { chapter: 1, ayah: 1 };
  const last = chapters.find((c) => c.id === resume.chapter);
  return <View style={styles.content}>
    <View style={styles.welcome}>
      <Text style={{ color: theme.colors.teal, fontFamily: fontLoaded ? "QuranNaskh" : undefined, fontSize: 27, lineHeight: 44, textAlign: "center", writingDirection: "rtl" }}>القرآن الكريم</Text>
      <Text style={[styles.title, { color: theme.colors.text }]}>Quran &amp; Recite</Text>
      <Text style={[styles.body, { color: theme.colors.muted }]}>A quiet place to read. A personal space to practise.</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${state.lastRead ? "Continue reading" : "Start reading"} ${last?.nameSimple ?? `surah ${resume.chapter}`} ayah ${resume.ayah}`} onPress={() => onOpen(resume.chapter, resume.ayah)}>
      <QuranSurface style={{ backgroundColor: theme.colors.navy }}><Text style={{ color: theme.colors.gold, fontSize: 13, fontWeight: "700" }}>{state.lastRead ? "Continue reading" : "Start reading"}</Text>
        <View style={styles.row}><View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: theme.colors.white, fontSize: 25, fontWeight: "700", marginTop: 8 }}>{last?.nameSimple ?? `Surah ${resume.chapter}`}</Text>
          <Text style={{ color: "#CAD8DF", fontSize: 15, marginTop: 6 }}>Ayah {resume.ayah}{last ? ` of ${last.versesCount}` : ""}</Text></View>
          <Ionicons name="arrow-forward-circle" size={38} color={theme.colors.gold} /></View>
      </QuranSurface>
    </Pressable>
    <View style={[styles.sections, expanded && styles.expanded]}>{[{ title: "Practice", modes: ["practice", "memorize", "test"] }, { title: "Your collection", modes: ["bookmarks", "review", "challenges"] }].map(section => <View key={section.title} style={{ flex: 1, minWidth: 0 }}>
      <Text style={[styles.heading, { color: theme.colors.text }]}>{section.title}</Text>
      <View style={styles.collection}>{actions.filter(action => section.modes.includes(action.mode)).map(action => <Pressable key={action.title} accessibilityRole="button" accessibilityLabel={action.title} accessibilityHint={action.detail} onPress={() => onMode(action.mode)}
        style={({ pressed }) => [styles.action, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border, opacity: pressed ? .72 : 1 }]}>
        <View style={[styles.actionIcon, { backgroundColor: theme.colors.tintSoft }]}><Ionicons name={action.icon} size={23} color={theme.colors.teal} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "600" }}>{action.title}</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{action.mode === "memorize" && !audioAvailable ? "Recall & review" : action.detail}</Text></View>
        <Ionicons name="chevron-forward" size={17} color={theme.colors.muted} />
      </Pressable>)}</View>
    </View>)}</View>
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
  title: { fontSize: 28, fontWeight: "700", lineHeight: 36, textAlign: "center" }, body: { fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 8, maxWidth: 360 },
  heading: { fontSize: 20, fontWeight: "700", marginBottom: 10 }, row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  collection: { gap: 8 }, action: { minHeight: 76, padding: 13, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 12 },
  sections: { gap: 16 }, expanded: { flexDirection: "row" },
  actionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  recent: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 22 }, revision: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 }
});
