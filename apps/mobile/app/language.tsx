import { Ionicons } from "@expo/vector-icons";
import { supportedLanguages } from "@hbic/shared";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../src/i18n/LocalizedText";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { useAppLanguage } from "../src/i18n/LanguageProvider";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

const languages = supportedLanguages.map(language => ({ ...language, subtitle: language.code === "en" ? "English" : language.code === "ur" ? "اردو" : language.code === "fa-AF" ? "دری افغانستان" : "العربية" }));

export default function LanguageScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { language, setLanguage, t } = useAppLanguage();

  return (
    <AppScreen>
      <AppButton label={t("back")} icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title={t("language")} subtitle={t("languageSubtitle")} />
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
              onPress={() => void setLanguage(item.code)}
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
        <Text style={[styles.title, { color: theme.colors.text }]}>{t("preferenceSaved")}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          {t("englishContentFallback")}
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
