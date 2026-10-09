import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { Text } from "../src/i18n/LocalizedText";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { useAppLanguage } from "../src/i18n/LanguageProvider";
import { usePublishedContent } from "../src/services/content";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

export default function HalalRestaurantsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useAppLanguage();
  const { content } = usePublishedContent();
  const directoryUrl = `${content.settings.website.replace(/\/$/, "")}/halal-restaurants`;

  return (
    <AppScreen>
      <AppButton label={t("back")} icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title={t("halalRestaurants")} subtitle={t("halalComingSoon")} />
      <GlassCard tone="navy">
        <Text style={styles.darkTitle}>{t("carefulReview")}</Text>
        <Text style={styles.darkBody}>
          Listings will use clear verification information, addresses, cuisine details, and convenient map links. No restaurants are published until their records are reviewed.
        </Text>
      </GlassCard>
      <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t("restaurantOwner")}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          Request private consideration for the upcoming directory. Submission is not verification, endorsement, or automatic publication.
        </Text>
        <AppButton label={t("openInterestForm")} icon="open-outline" variant="secondary" onPress={() => Linking.openURL(`${directoryUrl}#restaurant-interest`)} style={styles.button} />
      </GlassCard>
      <GlassCard tone="gold">
        <Text style={[styles.title, { color: theme.colors.text }]}>{t("directoryUpdates")}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>Join the update list or learn how verification statuses will be presented.</Text>
        <AppButton label={t("openDirectoryPreview")} icon="restaurant" onPress={() => Linking.openURL(directoryUrl)} style={styles.button} />
      </GlassCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  darkTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  darkBody: { color: "rgba(255,255,255,0.82)", lineHeight: 22, marginTop: 8 },
  title: { fontSize: 19, fontWeight: "900" },
  body: { lineHeight: 21, marginTop: 6 },
  button: { marginTop: spacing.md }
});
