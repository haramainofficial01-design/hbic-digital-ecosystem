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
        ? "#092639"
        : "#062238"
      : tone === "gold"
        ? theme.mode === "dark"
          ? "#292715"
          : "#FFFAEA"
        : tone === "teal"
          ? theme.mode === "dark"
            ? "#103944"
            : "#EDF8FA"
          : tone === "danger"
            ? theme.mode === "dark"
              ? "#40242C"
              : "#FFF2F2"
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
      <View pointerEvents="none" style={[styles.highlight, { backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.82)" }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
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
  }
});
