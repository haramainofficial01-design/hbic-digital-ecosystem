import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { radii, spacing } from "../theme/theme";
import { useAppTheme } from "../theme/ThemeProvider";

interface GlassCardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  tone?: "light" | "navy" | "gold" | "teal" | "danger";
  compact?: boolean;
}

export function GlassCard({ children, style, tone = "light", compact = false }: GlassCardProps) {
  const { theme } = useAppTheme();
  const backgroundColor =
    tone === "navy"
      ? theme.mode === "dark"
        ? "rgba(9,38,57,0.92)"
        : "rgba(6,34,56,0.96)"
      : tone === "gold"
        ? theme.mode === "dark"
          ? "rgba(55,45,18,0.62)"
          : "rgba(255,250,234,0.9)"
        : tone === "teal"
          ? theme.mode === "dark"
            ? "rgba(12,78,87,0.5)"
            : "rgba(237,248,250,0.92)"
          : tone === "danger"
            ? theme.mode === "dark"
              ? "rgba(90,28,32,0.62)"
              : "rgba(255,242,242,0.95)"
            : theme.colors.card;

  return (
    <View
      style={[
        styles.card,
        compact && styles.compact,
        {
          backgroundColor,
          borderColor: theme.colors.border
        },
        style
      ]}
    >
      <View pointerEvents="none" style={[styles.innerEdge, { borderColor: theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.68)" }]} />
      <View style={[styles.highlight, { backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.82)" }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    elevation: 2,
    overflow: "hidden"
  },
  compact: {
    padding: spacing.sm,
    borderRadius: radii.md
  },
  highlight: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.82)"
  },
  innerEdge: {
    position: "absolute",
    inset: 1,
    borderRadius: radii.lg - 1,
    borderWidth: StyleSheet.hairlineWidth
  }
});
