import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { AccessibilityInfo, FlatList, Pressable as NativePressable, ScrollView, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { normalizeSearch, type QuranChapter } from "@hbic/shared";
import { Text, TextInput } from "../i18n/LocalizedText";
import { NativeGlassSurface } from "../components/NativeGlassSurface";
import { useAppTheme } from "../theme/ThemeProvider";
import { QuranIconButton } from "./QuranControls";
import { quranPrimaryMode } from "./workspaceLayout";
import type { QuranMode } from "./types";

function Pressable({ onPress, disabled, ...props }: Omit<PressableProps, "onPress" | "onAccessibilityTap"> & { onPress: () => void }) {
  // Native accessibility activation is an explicit event, not a mouse gesture.
  return <NativePressable {...props} disabled={disabled} onPress={onPress} onAccessibilityTap={disabled ? undefined : onPress} />;
}

function MacGlass({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { theme } = useAppTheme();
  const [opaque, setOpaque] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (active) setOpaque(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setOpaque);
    return () => { active = false; subscription.remove(); };
  }, []);
  const Surface = opaque ? View : NativeGlassSurface;
  return <Surface style={[style, opaque && { backgroundColor: theme.colors.surface }]}>{children}</Surface>;
}

const destinations = [
  { mode: "read", label: "Read", icon: "book-outline" },
  { mode: "listen", label: "Listen", icon: "headset-outline" },
  { mode: "practice", label: "Practise", icon: "mic-outline" },
  { mode: "review", label: "Library", icon: "albums-outline" },
  { mode: "bookmarks", label: "Bookmarks", icon: "bookmark-outline" },
  { mode: "memorize", label: "Memorize", icon: "repeat-outline" },
  { mode: "test", label: "Test yourself", icon: "sparkles-outline" },
  { mode: "challenges", label: "Community Challenges", icon: "trophy-outline" }
] as const;

export function QuranMacSidebar({ chapters, chapterId, mode, onMode, onOpen, onBack }: {
  chapters: QuranChapter[]; chapterId: number; mode: QuranMode; onMode: (mode: QuranMode) => void;
  onOpen: (chapter: number, ayah?: number) => void; onBack: () => void;
}) {
  const { theme } = useAppTheme();
  const [query, setQuery] = useState(""), [surahs, setSurahs] = useState(true);
  const matches = useMemo(() => surahs ? chapters.filter(chapter => normalizeSearch(`${chapter.id} ${chapter.nameSimple} ${chapter.nameArabic}`).includes(normalizeSearch(query))) : [], [chapters, query, surahs]);
  const selected = (item: typeof destinations[number]) => item.mode === mode || item.mode === quranPrimaryMode(mode) && !["bookmarks", "memorize", "test"].includes(mode);
  return <MacGlass style={[styles.sidebar, { borderColor: theme.colors.border }]}>
    <FlatList accessibilityLabel="Mac Quran sidebar" data={matches} keyExtractor={chapter => String(chapter.id)} initialNumToRender={8} maxToRenderPerBatch={6} windowSize={5}
      ListHeaderComponent={<View style={{ gap: 3 }}>
        <View style={styles.brand}><Ionicons name="book-outline" size={25} color={theme.colors.teal} /><View><Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "700" }}>Quran</Text><Text style={{ color: theme.colors.muted, fontSize: 11 }}>Masjid Bilal</Text></View></View>
        {destinations.map((item, index) => <View key={item.mode}>
          {index === 4 ? <Text style={[styles.section, { color: theme.colors.muted }]}>My Practice</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: selected(item) }} onPress={() => onMode(item.mode)}
            style={({ pressed }) => [styles.destination, { backgroundColor: selected(item) ? theme.colors.tintSoft : "transparent", opacity: pressed ? .65 : 1 }]}>
            <Ionicons name={item.icon} size={18} color={selected(item) ? theme.colors.teal : theme.colors.muted} />
            <Text style={{ flex: 1, color: selected(item) ? theme.colors.teal : theme.colors.text, fontSize: 13, fontWeight: selected(item) ? "700" : "500" }}>{item.label}</Text>
          </Pressable>
        </View>)}
        <Pressable accessibilityRole="button" accessibilityLabel={surahs ? "Hide surahs" : "Show surahs"} onPress={() => setSurahs(value => !value)} style={[styles.destination, { marginTop: 12 }]}>
          <Text style={{ flex: 1, color: theme.colors.muted, fontSize: 12, fontWeight: "700" }}>Surahs</Text><Ionicons name={surahs ? "chevron-down" : "chevron-forward"} size={14} color={theme.colors.muted} />
        </Pressable>
        {surahs ? <TextInput accessibilityLabel="Find a surah in sidebar" value={query} onChangeText={setQuery} placeholder="Find a surah" autoCorrect={false} maxLength={100} placeholderTextColor={theme.colors.muted}
          style={[styles.filter, { color: theme.colors.text, backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border }]} /> : null}
      </View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.nameSimple}, ${item.versesCount} ayahs`} accessibilityState={{ selected: mode === "read" && item.id === chapterId }} onPress={() => onOpen(item.id)}
        style={({ pressed }) => [styles.destination, { backgroundColor: mode === "read" && item.id === chapterId ? theme.colors.tintSoft : "transparent", opacity: pressed ? .65 : 1 }]}>
        <Text style={{ color: theme.colors.muted, fontSize: 11, width: 23 }}>{item.id}</Text><Text numberOfLines={1} style={{ flex: 1, color: theme.colors.text, fontSize: 13 }}>{item.nameSimple}</Text>
      </Pressable>} />
    <Pressable accessibilityRole="button" accessibilityLabel="Back to Masjid Bilal" onPress={onBack} style={[styles.destination, { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <Ionicons name="chevron-back" size={16} color={theme.colors.muted} /><Text style={{ color: theme.colors.muted, fontSize: 12 }}>Masjid Bilal</Text>
    </Pressable>
  </MacGlass>;
}

export function QuranMacToolbar({ title, chapter, mode, focused, sidebar, inspector, canSidebar, canInspect, onSidebar, onInspector, onFocus, onMode, onBack }: {
  title: string; chapter?: QuranChapter; mode: QuranMode; focused: boolean; sidebar: boolean; inspector: boolean; canSidebar: boolean; canInspect: boolean;
  onSidebar: () => void; onInspector: () => void; onFocus: () => void; onMode: (mode: QuranMode) => void; onBack: () => void;
}) {
  const { theme } = useAppTheme();
  return <MacGlass style={[styles.toolbar, { borderColor: theme.colors.border }]}>
    <QuranIconButton label="Back to Masjid Bilal" icon="chevron-back" onPress={onBack} />
    {!focused && canSidebar ? <QuranIconButton label={sidebar ? "Hide Quran sidebar" : "Show Quran sidebar"} icon="albums-outline" active={sidebar} onPress={onSidebar} /> : null}
    <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 8 }}><Text numberOfLines={1} style={{ color: theme.colors.text, fontSize: 15, fontWeight: "700" }}>{title}</Text>
      {mode === "read" && chapter ? <Text numberOfLines={1} style={{ color: theme.colors.muted, fontSize: 11, marginTop: 2 }}>{chapter.nameSimple}</Text> : null}</View>
    {mode === "read" ? <QuranIconButton label={focused ? "Leave focus" : "Focus reading"} icon={focused ? "contract-outline" : "expand-outline"} onPress={onFocus} /> : null}
    {!focused ? <>
      <QuranIconButton label="Search Quran" icon="search-outline" onPress={() => onMode("search")} />
      <QuranIconButton label="Quran preferences" icon="options-outline" onPress={() => onMode("settings")} />
      {mode === "read" && canInspect ? <QuranIconButton label={inspector ? "Hide reading inspector" : "Show reading inspector"} icon="reader-outline" active={inspector} onPress={onInspector} /> : null}
    </> : null}
  </MacGlass>;
}

export function QuranMacCompactNavigation({ mode, onMode }: { mode: QuranMode; onMode: (mode: QuranMode) => void }) {
  const { theme } = useAppTheme();
  const subtools = quranPrimaryMode(mode) === "practice" ? destinations.filter(item => ["memorize", "test"].includes(item.mode))
    : quranPrimaryMode(mode) === "review" ? destinations.filter(item => item.mode === "bookmarks") : [];
  return <View><View style={styles.compact}>{destinations.slice(0, 4).map(item => <Pressable key={item.mode} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: quranPrimaryMode(mode) === item.mode }} onPress={() => onMode(item.mode)}
    style={[styles.destination, { flex: 1, justifyContent: "center", backgroundColor: quranPrimaryMode(mode) === item.mode ? theme.colors.tintSoft : "transparent" }]}><Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: "600" }}>{item.label}</Text></Pressable>)}</View>
    {subtools.length ? <View style={styles.compact}>{subtools.map(item => <Pressable key={item.mode} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: mode === item.mode }} onPress={() => onMode(item.mode)} style={[styles.destination, { flex: 1, justifyContent: "center", backgroundColor: mode === item.mode ? theme.colors.tintSoft : "transparent" }]}><Text style={{ color: theme.colors.text, fontSize: 12 }}>{item.label}</Text></Pressable>)}</View> : null}</View>;
}

export function QuranMacInspector({ chapter, ayah, bookmarked, reciter, canListen, onBookmark, onMode, onListen, onOpen }: {
  chapter: QuranChapter; ayah: number; bookmarked: boolean; reciter?: string; canListen: boolean; onBookmark: () => void;
  onMode: (mode: QuranMode) => void; onListen: () => void; onOpen: (chapter: number, ayah?: number) => void;
}) {
  const { theme } = useAppTheme();
  const action = (label: string, icon: keyof typeof Ionicons.glyphMap, onPress: () => void) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.destination, { backgroundColor: theme.colors.cardStrong }]}>
    <Ionicons name={icon} size={18} color={theme.colors.teal} /><Text style={{ flex: 1, color: theme.colors.text, fontSize: 13 }}>{label}</Text></Pressable>;
  return <ScrollView accessibilityLabel="Mac reading inspector" style={[styles.inspector, { borderLeftColor: theme.colors.border, backgroundColor: theme.colors.surface }]} contentContainerStyle={{ padding: 18, gap: 10 }}>
    <Text style={[styles.section, { color: theme.colors.muted, marginTop: 0 }]}>Reading Companion</Text>
    <Text style={{ color: theme.colors.text, fontSize: 22, lineHeight: 30, fontWeight: "700" }}>{chapter.nameSimple}</Text>
    <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{chapter.translatedName.name} · {chapter.versesCount} ayahs</Text>
    <Text style={{ color: theme.colors.teal, fontSize: 12, marginBottom: 6 }}>Starting ayah {chapter.id}:{ayah}</Text>
    {action(bookmarked ? `Remove bookmark for ${chapter.id}:${ayah}` : `Bookmark ${chapter.id}:${ayah}`, "bookmark-outline", onBookmark)}
    {canListen ? action("Listen from here", "headset-outline", onListen) : null}
    {action("Practise this surah", "mic-outline", () => onMode("practice"))}
    {action("Test this surah", "sparkles-outline", () => onMode("test"))}
    <Text style={[styles.section, { color: theme.colors.muted }]}>Reference Recitation</Text>
    <Text style={{ color: theme.colors.text, fontSize: 13, lineHeight: 20 }}>{reciter ?? "Choose a reciter"}</Text>
    {action("Choose another reciter", "person-outline", () => onMode("listen"))}
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
      <QuranIconButton label="Previous surah" icon="chevron-back" disabled={chapter.id <= 1} onPress={() => onOpen(chapter.id - 1)} />
      <QuranIconButton label="Next surah" icon="chevron-forward" disabled={chapter.id >= 114} onPress={() => onOpen(chapter.id + 1)} />
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  sidebar: { width: 224, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, margin: 8, marginRight: 0, padding: 10, overflow: "hidden" },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, paddingVertical: 14 },
  destination: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10 },
  section: { fontSize: 11, fontWeight: "700", marginTop: 16, marginBottom: 6, paddingHorizontal: 8 },
  filter: { minHeight: 36, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, marginBottom: 8 },
  toolbar: { minHeight: 62, margin: 8, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 6, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  inspector: { width: 240, flexGrow: 0, borderLeftWidth: StyleSheet.hairlineWidth, marginTop: 8, marginBottom: 8, marginRight: 8, borderRadius: 18 },
  compact: { flexDirection: "row", paddingHorizontal: 12, gap: 6, paddingBottom: 8 }
});
