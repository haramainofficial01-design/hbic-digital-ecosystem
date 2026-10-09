import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../src/i18n/LocalizedText";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { useOnboarding } from "../src/onboarding/OnboardingProvider";
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
  const { startReplay } = useOnboarding();

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title="Settings" subtitle="Appearance, notifications, and language preferences." />

      <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>Appearance</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>Choose how Masjid Bilal should look on this device.</Text>
        <View style={styles.options}>
          {themeOptions.map((option) => {
            const active = mode === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={`${option.label} appearance`}
                accessibilityState={{ selected: active }}
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
        <SettingsRow title="Language" subtitle="English, Urdu, Dari and Arabic" route="/language" />
        <SettingsAction title="Replay introduction" subtitle="See the Masjid Bilal app introduction again" onPress={startReplay} />
      </GlassCard>

      {Platform.OS === "android" ? (
        <>
          <SectionHeader title="Wear OS" subtitle="Masjid Bilal on compatible Android smartwatches." />
          <GlassCard compact>
            <SettingsAction
              title="Install or update the watch app"
              subtitle="Open Google Play for the native HBIC watch app, tile, and complications"
              icon="watch-outline"
              onPress={() => {
                void Linking.openURL("market://details?id=ca.hbic.calgary.app").catch(() =>
                  Linking.openURL("https://play.google.com/store/apps/details?id=ca.hbic.calgary.app")
                );
              }}
            />
            <View style={styles.watchNote}>
              <Text style={[styles.body, { color: theme.colors.muted }]}>The watch receives the same canonical HBIC prayer snapshot from your phone and can refresh directly over Wi-Fi or LTE. Wear OS is supported; other watch systems require their own HBIC app.</Text>
            </View>
          </GlassCard>
        </>
      ) : null}

      <SectionHeader title="Privacy & Legal" />
      <GlassCard compact>
        <SettingsRow title="Privacy Policy" subtitle="How Masjid Bilal handles information and your choices" route="/privacy-legal" />
      </GlassCard>
    </AppScreen>
  );
}

function SettingsAction({ title, subtitle, onPress, icon = "refresh" }: { title: string; subtitle: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  const { theme } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={subtitle} onPress={onPress} style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>{subtitle}</Text>
      </View>
      <Ionicons name={icon} size={20} color={theme.colors.subtle} />
    </Pressable>
  );
}

function SettingsRow({ title, subtitle, route }: { title: string; subtitle: string; route: string }) {
  const router = useRouter();
  const { theme } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={subtitle} onPress={() => router.push(route as never)} style={[styles.row, { borderBottomColor: theme.colors.border }]}>
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
  },
  watchNote: { paddingVertical: 14 }
});
