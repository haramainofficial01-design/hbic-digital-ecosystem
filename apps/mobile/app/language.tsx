import { Ionicons } from "@expo/vector-icons";
import type { LanguageCode } from "@hbic/shared";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

const languageFile = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}hbic-language.txt` : "";
const languages: { code: LanguageCode; label: string; subtitle: string }[] = [
  { code: "en", label: "English", subtitle: "Default app language" },
  { code: "ur", label: "Urdu", subtitle: "Preferred language for future Masjid Bilal updates" }
];

export default function LanguageScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [language, setLanguage] = useState<LanguageCode>("en");

  useEffect(() => {
    async function loadLanguage() {
      if (!languageFile) return;
      try {
        const info = await FileSystem.getInfoAsync(languageFile);
        if (!info.exists) return;
        const saved = (await FileSystem.readAsStringAsync(languageFile)).trim();
        if (saved === "en" || saved === "ur") setLanguage(saved);
      } catch {
        setLanguage("en");
      }
    }
    loadLanguage();
  }, []);

  async function choose(code: LanguageCode) {
    setLanguage(code);
    if (!languageFile) return;
    try {
      await FileSystem.writeAsStringAsync(languageFile, code);
    } catch {
      // Language still changes for this session if local persistence is unavailable.
    }
  }

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title="Language" subtitle="Choose your preferred language for Masjid Bilal updates." />
      <GlassCard>
        {languages.map((item) => {
          const active = language === item.code;
          return (
            <Pressable
              key={item.code}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityHint={item.subtitle}
              accessibilityState={{ selected: active }}
              onPress={() => choose(item.code)}
              style={[styles.row, { borderBottomColor: theme.colors.border }]}
            >
              <View style={[styles.iconBubble, { backgroundColor: active ? theme.colors.tintSoft : theme.colors.cardStrong }]}>
                <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={24} color={active ? theme.colors.teal : theme.colors.subtle} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{item.label}</Text>
                <Text style={[styles.body, { color: theme.colors.muted }]}>{item.subtitle}</Text>
              </View>
            </Pressable>
          );
        })}
      </GlassCard>
      <GlassCard tone="gold">
        <Text style={[styles.title, { color: theme.colors.text }]}>Preference saved</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          Masjid Bilal can use this preference for future app updates and community communication options.
        </Text>
      </GlassCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  flex: {
    flex: 1
  },
  title: {
    fontSize: 17,
    fontWeight: "900"
  },
  body: {
    lineHeight: 20,
    marginTop: 2
  }
});
