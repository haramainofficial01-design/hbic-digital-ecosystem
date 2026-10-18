import type { PropsWithChildren } from "react";
import { Ionicons } from "@expo/vector-icons";
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../i18n/LocalizedText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppLanguage } from "../i18n/LanguageProvider";
import { usePublishedContent } from "../services/content";
import { spacing } from "../theme/theme";
import { useAppTheme } from "../theme/ThemeProvider";
import { isMacQuranHost } from "../quran/macRuntime";
import { desktopAppLayout } from "./desktopLayout";
import { useAppViewport } from "./AppViewport";
import { BilalLauncher } from "../companion/BilalCompanion";

export function AppScreen({ children, style, onReady, onInteraction }: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  onReady?: () => void;
  onInteraction?: () => void;
}>) {
  const { theme } = useAppTheme();
  const { isRtl } = useAppLanguage();
  const { width, fontScale } = useAppViewport();
  const { lastUpdatedAt, loading, refresh, refreshError, source } = usePublishedContent();
  const isWide = width >= 768;
  const desktop = desktopAppLayout(width, isMacQuranHost, fontScale);
  const cachedAt = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;
  const showStatus = source !== "api" || Boolean(refreshError);

  return (
    <View style={[styles.gradient, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView
          onLayout={onReady}
          onTouchStart={onInteraction}
          onScrollBeginDrag={onInteraction}
          contentContainerStyle={[
            styles.content,
            isWide && styles.wideContent,
            desktop.desktop && { maxWidth: desktop.maxWidth, paddingTop: desktop.topPadding, paddingBottom: 40 },
            style
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.colors.teal} />}
        >
          <View style={[styles.inner, { direction: isRtl ? "rtl" : "ltr" }]}>
            {showStatus ? (
              <View
                accessibilityRole="alert"
                style={[
                  styles.status,
                  {
                    backgroundColor: source === "bundled-fallback" ? theme.colors.cardStrong : theme.colors.tintSoft,
                    borderColor: theme.colors.border
                  }
                ]}
              >
                <Ionicons
                  name={source === "bundled-fallback" ? "cloud-offline-outline" : "time-outline"}
                  size={19}
                  color={source === "bundled-fallback" ? theme.colors.muted : theme.colors.teal}
                />
                <View style={styles.statusCopy}>
                  <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                    {source === "bundled-fallback" ? "Current updates are temporarily unavailable" : "Showing last updated information"}
                  </Text>
                  <Text style={[styles.statusBody, { color: theme.colors.muted }]}>
                    {source === "cache" && cachedAt ? `Updated at ${cachedAt}. Pull to refresh.` : refreshError ?? "Pull to try again."}
                  </Text>
                </View>
              </View>
            ) : null}
            {children}
          </View>
        </ScrollView>
      </SafeAreaView>
      <BilalLauncher />
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  safe: {
    flex: 1
  },
  content: {
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
    padding: spacing.md,
    paddingBottom: 120
  },
  wideContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  inner: {
    width: "100%",
    gap: spacing.md
  },
  status: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  statusCopy: {
    flex: 1
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "900"
  },
  statusBody: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2
  }
});
