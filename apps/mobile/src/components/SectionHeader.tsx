import { StyleSheet, View } from "react-native";
import { Text } from "../i18n/LocalizedText";
import { useAppTheme } from "../theme/ThemeProvider";

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.wrap}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 5
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20
  }
});
