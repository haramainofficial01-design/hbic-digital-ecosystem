import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text } from "../i18n/LocalizedText";
import { spacing } from "../theme/theme";
import { useAppTheme } from "../theme/ThemeProvider";
import { GlassCard } from "./GlassCard";

type IconName = keyof typeof Ionicons.glyphMap;

export function EmptyState({ title, message, icon = "calendar-outline" }: { title: string; message: string; icon?: IconName }) {
  const { theme } = useAppTheme();

  return (
    <GlassCard compact>
      <View accessibilityRole="text" style={styles.row}>
        <View style={[styles.icon, { backgroundColor: theme.colors.tintSoft }]}>
          <Ionicons name={icon} size={22} color={theme.colors.teal} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.colors.muted }]}>{message}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: "900"
  },
  message: {
    lineHeight: 19,
    marginTop: 2
  }
});
