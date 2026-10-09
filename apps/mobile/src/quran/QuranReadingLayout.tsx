import { Pressable, View } from "react-native";
import { Text } from "../i18n/LocalizedText";
import { useAppTheme } from "../theme/ThemeProvider";
import type { QuranLibrary } from "./types";
export function QuranReadingLayout({ library, onAyahView }: { library: QuranLibrary; onAyahView?: () => void }) {
  const { theme } = useAppTheme();
  return <View accessibilityRole="radiogroup" style={{ flexDirection: "row", padding: 4, borderRadius: 18, backgroundColor: theme.colors.cardStrong, gap: 4 }}>
    {(["ayah", "madinah"] as const).map((layout) => <Pressable key={layout} accessibilityRole="radio" accessibilityState={{ checked: library.library.preferences.layout === layout }}
      accessibilityLabel={layout === "ayah" ? "Ayah View" : "Madinah 15-Line Mushaf"}
      onPress={() => { if (layout === "ayah" && onAyahView) onAyahView();
        else void library.update((s) => ({ ...s, preferences: { ...s.preferences, layout } })).catch(() => {}); }}
      style={({ pressed }) => ({ flex: 1, minHeight: 46, padding: 8, alignItems: "center", justifyContent: "center", borderRadius: 14,
        backgroundColor: library.library.preferences.layout === layout ? theme.colors.tintSoft : "transparent", opacity: pressed ? .65 : 1 })}>
      <Text style={{ color: library.library.preferences.layout === layout ? theme.colors.teal : theme.colors.muted, fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center" }}>{layout === "ayah" ? "Ayah View" : "Madinah Mushaf"}</Text>
      {layout === "madinah" ? <Text style={{ color: theme.colors.muted, fontSize: 11, marginTop: 2 }}>15-line edition</Text> : null}
    </Pressable>)}
  </View>;
}
