import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { radii, spacing } from "../theme/theme";
import { useAppTheme } from "../theme/ThemeProvider";

type IconName = keyof typeof Ionicons.glyphMap;

interface AppButtonProps extends PropsWithChildren {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: IconName;
  style?: ViewStyle;
}

export function AppButton({ label, onPress, variant = "primary", icon, style }: AppButtonProps) {
  const { theme } = useAppTheme();
  const isSecondary = variant === "secondary" || variant === "ghost";
  const backgroundColor =
    variant === "danger"
      ? theme.colors.danger
      : variant === "secondary"
        ? theme.colors.tintSoft
        : variant === "ghost"
          ? "transparent"
          : theme.colors.tint;
  const borderColor = variant === "ghost" ? "transparent" : theme.colors.borderStrong;
  const labelColor = isSecondary ? theme.colors.text : theme.colors.white;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor },
        pressed && styles.pressed,
        style
      ]}
    >
      <View style={styles.content}>
        {icon ? <Ionicons name={icon} size={18} color={labelColor} /> : null}
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    maxWidth: "100%"
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9
  },
  label: {
    fontWeight: "800",
    fontSize: 15
  }
});
