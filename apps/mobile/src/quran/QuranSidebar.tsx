import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { normalizeSearch, type QuranChapter } from "@hbic/shared";
import { Text, TextInput } from "../i18n/LocalizedText";
import { useAppTheme } from "../theme/ThemeProvider";
import type { QuranMode } from "./types";

const destinations: { mode: QuranMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: "home", label: "Quran Home", icon: "grid-outline" },
  { mode: "bookmarks", label: "Bookmarks", icon: "bookmark-outline" },
  { mode: "memorize", label: "Memorize", icon: "repeat-outline" },
  { mode: "test", label: "Test Yourself", icon: "sparkles-outline" },
  { mode: "challenges", label: "Community Challenges", icon: "trophy-outline" }
];

export function QuranSidebar({ chapters, chapterId, mode, onMode, onOpen }: {
  chapters: QuranChapter[]; chapterId: number; mode: QuranMode;
  onMode: (mode: QuranMode) => void; onOpen: (chapter: number, ayah?: number) => void;
}) {
  const { theme } = useAppTheme();
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const term = normalizeSearch(query);
    return chapters.filter(c => normalizeSearch(`${c.id} ${c.nameSimple} ${c.nameArabic} ${c.translatedName.name}`).includes(term));
  }, [chapters, query]);
  return <View accessibilityLabel="Quran navigation" style={[styles.sidebar, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.border }]}>
    <Text style={[styles.heading, { color: theme.colors.text }]}>Quran &amp; Recite</Text>
    {destinations.map(item => <Pressable key={item.mode} accessibilityRole="button" accessibilityState={{ selected: mode === item.mode }} onPress={() => onMode(item.mode)}
      style={({ pressed }) => [styles.destination, { backgroundColor: mode === item.mode ? theme.colors.tintSoft : "transparent", opacity: pressed ? .65 : 1 }]}>
      <Ionicons name={item.icon} size={19} color={theme.colors.teal} /><Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: "600", flex: 1 }}>{item.label}</Text>
    </Pressable>)}
    <Text style={[styles.section, { color: theme.colors.muted }]}>Surahs</Text>
    <TextInput accessibilityLabel="Find a surah in sidebar" value={query} onChangeText={setQuery} placeholder="Name or number" placeholderTextColor={theme.colors.subtle} autoCorrect={false} maxLength={100}
      style={[styles.search, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border, color: theme.colors.text }]} />
    <FlatList data={matches} keyExtractor={item => String(item.id)} keyboardShouldPersistTaps="handled" initialNumToRender={10} maxToRenderPerBatch={8} windowSize={5}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.nameSimple}, ${item.versesCount} ayahs`} accessibilityState={{ selected: mode === "read" && chapterId === item.id }} onPress={() => onOpen(item.id)}
        style={({ pressed }) => [styles.surah, { backgroundColor: mode === "read" && chapterId === item.id ? theme.colors.tintSoft : "transparent", opacity: pressed ? .65 : 1 }]}>
        <Text style={{ color: theme.colors.teal, width: 28, fontSize: 12, fontWeight: "700" }}>{item.id}</Text>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: "600" }}>{item.nameSimple}</Text><Text style={{ color: theme.colors.muted, fontSize: 11, marginTop: 4 }}>{item.translatedName.name} · {item.versesCount} ayahs</Text></View>
      </Pressable>}
      ListEmptyComponent={<Text style={{ color: theme.colors.muted, padding: 12, lineHeight: 20 }}>{chapters.length ? "No matching surahs." : "Loading surahs…"}</Text>} />
  </View>;
}
const styles = StyleSheet.create({
  sidebar: { width: 260, borderRightWidth: StyleSheet.hairlineWidth, padding: 14, gap: 4 }, heading: { fontSize: 21, fontWeight: "700", paddingVertical: 16, paddingHorizontal: 8 },
  destination: { minHeight: 48, flexDirection: "row", gap: 10, alignItems: "center", padding: 10, borderRadius: 14 }, section: { fontSize: 12, fontWeight: "700", marginTop: 20, marginBottom: 8, paddingHorizontal: 8 },
  search: { minHeight: 46, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 12, fontSize: 14, marginBottom: 10 },
  surah: { minHeight: 64, padding: 10, flexDirection: "row", alignItems: "center", borderRadius: 14, gap: 6 }
});
