import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4
  },
  title: {
    fontSize: 22,
    fontWeight: "900"
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20
  }
});
