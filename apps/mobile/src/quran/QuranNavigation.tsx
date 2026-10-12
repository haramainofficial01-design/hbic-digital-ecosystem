import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../i18n/LocalizedText";
import { NativeGlassSurface } from "../components/NativeGlassSurface";
import { useAppTheme } from "../theme/ThemeProvider";
import type { QuranMode } from "./types";
import { quranPrimaryMode } from "./workspaceLayout";

const primary = [
  { mode: "read", label: "Read", icon: "book-outline" },
  { mode: "listen", label: "Listen", icon: "headset-outline" },
  { mode: "practice", label: "Practise", icon: "mic-outline" },
  { mode: "review", label: "Library", icon: "albums-outline" }
] as const;
const practice = [{ mode: "practice", label: "Recite" }, { mode: "memorize", label: "Memorize" }, { mode: "test", label: "Test yourself" }] as const;
const collection = [{ mode: "review", label: "My Library" }, { mode: "bookmarks", label: "Bookmarks" }] as const;

export function QuranNavigation({ mode, onMode }: { mode: QuranMode; onMode: (mode: QuranMode) => void }) {
  const { theme } = useAppTheme();
  const [reduceTransparency, setReduceTransparency] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (mounted) setReduceTransparency(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparency);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  const group = quranPrimaryMode(mode);
  const secondary = group === "practice" ? practice : group === "review" ? collection : [];
  const Surface = reduceTransparency ? View : NativeGlassSurface;
  return <View style={styles.container}>
    <Surface style={[styles.primary, { borderColor: theme.colors.border }, reduceTransparency && { backgroundColor: theme.colors.surface }]}>
      {primary.map(item => <Pressable key={item.mode} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: group === item.mode }} onPress={() => onMode(item.mode)}
        style={({ pressed }) => [styles.tab, { backgroundColor: group === item.mode ? theme.colors.tintSoft : "transparent", opacity: pressed ? .65 : 1 }]}>
        <Ionicons name={item.icon} size={20} color={group === item.mode ? theme.colors.teal : theme.colors.muted} />
        <Text style={{ color: group === item.mode ? theme.colors.teal : theme.colors.muted, fontSize: 12, fontWeight: "600" }}>{item.label}</Text>
      </Pressable>)}
    </Surface>
    {secondary.length ? <View accessibilityRole="tablist" style={styles.secondary}>{secondary.map(item => <Pressable key={item.mode} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: mode === item.mode }} onPress={() => onMode(item.mode)}
      style={({ pressed }) => [styles.option, { backgroundColor: mode === item.mode ? theme.colors.tintSoft : "transparent", opacity: pressed ? .65 : 1 }]}>
      <Text style={{ color: mode === item.mode ? theme.colors.teal : theme.colors.muted, fontSize: 13, fontWeight: "600", textAlign: "center" }}>{item.label}</Text>
    </Pressable>)}</View> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  primary: { flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, padding: 4, gap: 4, borderRadius: 20, overflow: "hidden" },
  tab: { flex: 1, minWidth: 0, minHeight: 52, borderRadius: 16, justifyContent: "center", alignItems: "center", paddingVertical: 7, gap: 4 },
  secondary: { flexDirection: "row", gap: 4 },
  option: { flex: 1, minHeight: 44, borderRadius: 14, justifyContent: "center", paddingHorizontal: 6, paddingVertical: 8 }
});
