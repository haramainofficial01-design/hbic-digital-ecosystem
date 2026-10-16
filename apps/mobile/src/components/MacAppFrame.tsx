import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useState, type PropsWithChildren } from "react";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { academyEnabled } from "../config/releaseFeatures";
import { brandAssets } from "../constants/assets";
import { Image, Text } from "../i18n/LocalizedText";
import { useAppLanguage } from "../i18n/LanguageProvider";
import { isMacQuranHost } from "../quran/macRuntime";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppViewportContext } from "./AppViewport";
import { NativeGlassSurface } from "./NativeGlassSurface";
import { macAppDestinations, macWindowLayout, selectedMacDestination } from "./macAppNavigation";

/** One persistent native-host sidebar for every Mac route, including settings,
 * Academy and the Quran workspace. Other platforms retain their navigation. */
export function MacAppFrame({ children }: PropsWithChildren) {
  const window = useWindowDimensions();
  const { theme } = useAppTheme();
  const { isRtl, translate } = useAppLanguage();
  const router = useRouter(), pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false), [opaque, setOpaque] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null), [focused, setFocused] = useState<string | null>(null);
  const [pane, setPane] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    if (!isMacQuranHost) return;
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (mounted) setOpaque(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setOpaque);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  if (!isMacQuranHost) return <>{children}</>;
  const { compact, sidebarWidth } = macWindowLayout(window.width, window.fontScale, collapsed);
  const Surface = opaque ? View : NativeGlassSurface;
  const selected = selectedMacDestination(pathname);
  const destinations = macAppDestinations.filter(item => item.href !== "/quran-academy" || academyEnabled);
  return <View style={[styles.frame, { backgroundColor: theme.colors.background, flexDirection: isRtl ? "row-reverse" : "row" }]}>
    <Surface style={[styles.sidebar, { width: sidebarWidth, marginLeft: isRtl ? 0 : 10, marginRight: isRtl ? 10 : 0, direction: isRtl ? "rtl" : "ltr", backgroundColor: opaque ? theme.colors.surfaceStrong : undefined, borderColor: theme.colors.border }]}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={[styles.brand, compact && styles.centered]}>
          <Image source={brandAssets.appMark} style={styles.mark} />
          {!compact ? <View style={styles.brandCopy}><Text style={[styles.brandTitle, { color: theme.colors.text }]}>Masjid Bilal</Text><Text style={[styles.caption, { color: theme.colors.muted }]}>Calgary</Text></View> : null}
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.navigation} accessibilityLabel={translate("Main navigation")}>
          {destinations.map(item => {
            const active = selected === item.href;
            const navigate = () => { if (!active) router.navigate(item.href as never); };
            return <Pressable key={item.href} accessibilityRole="tab" accessibilityLabel={translate(item.label)} accessibilityState={{ selected: active }}
              onPress={navigate}
              onHoverIn={() => setHovered(item.href)} onHoverOut={() => setHovered(null)}
              onFocus={() => setFocused(item.href)} onBlur={() => setFocused(null)}
              style={({ pressed }) => [styles.destination, compact && styles.centered, { backgroundColor: active || hovered === item.href ? theme.colors.tintSoft : "transparent", borderColor: focused === item.href ? theme.colors.teal : "transparent", opacity: pressed ? .7 : 1 }]}>
              <Ionicons name={item.icon} size={21} color={active ? theme.colors.teal : theme.colors.muted} />
              {!compact ? <Text style={[styles.destinationLabel, { color: active ? theme.colors.teal : theme.colors.text, textAlign: isRtl ? "right" : "left" }]}>{item.label}</Text> : null}
            </Pressable>;
          })}
        </ScrollView>
        {window.width >= 1060 && window.fontScale <= 1.4 ? <Pressable accessibilityRole="button" accessibilityLabel={translate(compact ? "Show main sidebar" : "Hide main sidebar")}
          onPress={() => setCollapsed(value => !value)}
          onFocus={() => setFocused("sidebar")} onBlur={() => setFocused(null)}
          style={[styles.destination, compact && styles.centered, { borderColor: focused === "sidebar" ? theme.colors.teal : "transparent" }]}>
          <Ionicons name="reorder-three-outline" size={21} color={theme.colors.muted} />
          {!compact ? <Text style={[styles.caption, { color: theme.colors.muted }]}>Hide main sidebar</Text> : null}
        </Pressable> : null}
      </SafeAreaView>
    </Surface>
    <View style={styles.pane} onLayout={({ nativeEvent: { layout } }) => {
      const width = Math.round(layout.width), height = Math.round(layout.height);
      if (width > 0 && height > 0) setPane(old => old?.width === width && old.height === height ? old : { width, height });
    }}>
      <AppViewportContext.Provider value={{ ...window, width: pane?.width ?? Math.max(1, window.width - sidebarWidth - 20), height: pane?.height ?? window.height }}>
        {children}
      </AppViewportContext.Provider>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  sidebar: { marginVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 24, overflow: "hidden", flexShrink: 0 },
  safe: { flex: 1 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, minHeight: 82 },
  mark: { width: 40, height: 40, borderRadius: 12 },
  brandCopy: { flex: 1, minWidth: 0 },
  brandTitle: { fontSize: 17, fontWeight: "800" },
  caption: { fontSize: 12, lineHeight: 19 },
  navigation: { padding: 8, gap: 5 },
  destination: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 13, borderWidth: 2, borderColor: "transparent" },
  destinationLabel: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 21, fontWeight: "600" },
  centered: { justifyContent: "center", paddingHorizontal: 8 },
  pane: { flex: 1, minWidth: 0, minHeight: 0 }
});
