import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { type AppThemeMode, spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

const themeOptions: { label: string; value: AppThemeMode; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "System", value: "system", icon: "phone-portrait" },
  { label: "Light", value: "light", icon: "sunny" },
  { label: "Dark", value: "dark", icon: "moon" }
];

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, mode, setMode } = useAppTheme();

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title="Settings" subtitle="Appearance, notifications, and language preferences." />

      <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>Appearance</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>Choose how HBIC Calgary should look on this device.</Text>
        <View style={styles.options}>
          {themeOptions.map((option) => {
            const active = mode === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                onPress={() => setMode(option.value)}
                style={[
                  styles.option,
                  {
                    backgroundColor: active ? theme.colors.tintSoft : theme.colors.cardStrong,
                    borderColor: active ? theme.colors.borderStrong : theme.colors.border
                  }
                ]}
              >
                <Ionicons name={option.icon} size={22} color={active ? theme.colors.teal : theme.colors.subtle} />
                <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard compact>
        <SettingsRow title="Notifications" subtitle="Prayer, iqamah, events, media, and urgent notices" route="/notifications" />
        <SettingsRow title="Language" subtitle="Preferred language for HBIC updates" route="/language" />
      </GlassCard>
    </AppScreen>
  );
}

function SettingsRow({ title, subtitle, route }: { title: string; subtitle: string; route: string }) {
  const router = useRouter();
  const { theme } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(route as never)} style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.subtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6
  },
  body: {
    lineHeight: 20
  },
  options: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  option: {
    flex: 1,
    minHeight: 84,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  optionLabel: {
    fontWeight: "900"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  rowTitle: {
    fontWeight: "900",
    fontSize: 16
  },
  flex: {
    flex: 1
  }
});
