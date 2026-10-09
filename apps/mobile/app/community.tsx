import * as Linking from "expo-linking";
import {
  getCurrentDailyBenefit,
  getPublishedLocalServices,
  getPublishedNewMuslimResources,
  getPublicVolunteerOpportunities,
  getUpcomingWhiteDays,
  resolveHijriDate
} from "@hbic/shared";
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

export default function CommunityScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { language, t } = useAppLanguage();
  const { content } = usePublishedContent();
  const email = content.settings.email;
  const flags = content.featureFlags;
  const hijri = flags.hijriDateEnabled ? resolveHijriDate(new Date(), content.hijriSettings) : null;
  const upcomingWhiteDays = flags.whiteDaysEnabled
    ? getUpcomingWhiteDays(new Date(), content.hijriSettings)
    : [];
  const newMuslimResources = getPublishedNewMuslimResources(content.newMuslimResources);
  const localServices = getPublishedLocalServices(content.localMuslimServices);
  const dailyBenefit = getCurrentDailyBenefit(content.dailyBenefits);
  const volunteerOpportunities = getPublicVolunteerOpportunities(content.volunteerOpportunities);

  return (
    <AppScreen>
      <AppButton label={t("back")} icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title={t("community")} subtitle={t("communityIntro")} />
      {hijri ? (
        <GlassCard tone="navy">
          <Text accessibilityLabel={`Hijri date, ${hijri.label}`} style={styles.darkTitle}>{hijri.label}</Text>
          <Text style={styles.darkBody}>{flags.whiteDaysEnabled && hijri.isWhiteDay ? `${t("whiteDay")}. ${t("voluntaryFasting")}` : t("todayHijri")}</Text>
        </GlassCard>
      ) : null}
      {upcomingWhiteDays.length > 0 ? (
        <GlassCard>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t("upcomingWhiteDays")}</Text>
          <Text style={[styles.body, { color: theme.colors.muted }]}>{t("voluntaryFastingDays")}</Text>
          {upcomingWhiteDays.map(({ gregorianDate, hijriDate }) => (
            <Text
              key={gregorianDate}
              accessibilityLabel={`${hijriDate.label}, ${gregorianDate}`}
              style={[styles.whiteDayRow, { color: theme.colors.text }]}
            >
              {hijriDate.label} · {gregorianDate}
            </Text>
          ))}
        </GlassCard>
      ) : null}
      <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t("whatsHappening")}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>{t("currentProgramsDescription")}</Text>
        <AppButton label={t("viewEvents")} icon="calendar" variant="secondary" onPress={() => router.push("/(tabs)/events" as never)} style={styles.button} />
      </GlassCard>
      <GlassCard tone="gold">
        <Text style={[styles.title, { color: theme.colors.text }]}>{t("jumuahInformation")}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>{t("currentJumuahDescription")}</Text>
        <AppButton label={t("viewJumuah")} icon="time" variant="secondary" onPress={() => router.push("/(tabs)/prayer" as never)} style={styles.button} />
      </GlassCard>
      {flags.newMuslimResourcesEnabled && newMuslimResources.length ? <GlassCard tone="navy">
        <Text style={styles.darkTitle}>{t("newMuslimResources")}</Text>
        {newMuslimResources.map((resource) => (
          <Text key={resource.id} style={styles.darkBody}>
            {language === "ur" && resource.titleUr ? resource.titleUr : resource.title}
            {" · "}
            {language === "ur" && resource.summaryUr ? resource.summaryUr : resource.summary}
          </Text>
        ))}
        <AppButton label={t("contactMasjid")} icon="mail" onPress={() => Linking.openURL(`mailto:${email}?subject=${encodeURIComponent("New Muslim resources")}`)} style={styles.button} />
      </GlassCard> : null}
      {flags.localServicesEnabled && localServices.length ? <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t("localMuslimServices")}</Text>
        {localServices.map((service) => (
          <Text key={service.id} style={[styles.body, { color: theme.colors.muted }]}>
            {service.title} · {service.summary}
          </Text>
        ))}
        <AppButton label={t("contactMasjid")} icon="mail" variant="secondary" onPress={() => router.push("/contact" as never)} style={styles.button} />
      </GlassCard> : null}
      {flags.volunteerEnabled && volunteerOpportunities.length ? <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t("volunteer")}</Text>
        {volunteerOpportunities.map((opportunity) => (
          <Text key={opportunity.id} style={[styles.body, { color: theme.colors.muted }]}>
            {opportunity.title} · {opportunity.description}
          </Text>
        ))}
        <AppButton label={t("volunteerInterest")} icon="hand-left" variant="secondary" onPress={() => Linking.openURL(`mailto:${email}?subject=${encodeURIComponent("Volunteer with Masjid Bilal")}`)} style={styles.button} />
      </GlassCard> : null}
      {flags.askMasjidEnabled && content.askMasjidSettings.enabled ? <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t("askMasjid")}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>{t("privateQuestionDescription")}</Text>
        <AppButton label={t("openPrivateForm")} icon="chatbubble-ellipses" variant="secondary" onPress={() => Linking.openURL("https://hbic.ca/community#ask-masjid")} style={styles.button} />
      </GlassCard> : null}
      {flags.dailyBenefitEnabled && dailyBenefit ? <GlassCard tone="gold">
        <Text style={[styles.title, { color: theme.colors.text }]}>{t("dailyBenefit")}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          {language === "ur" && dailyBenefit.titleUr ? dailyBenefit.titleUr : dailyBenefit.title}
        </Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          {language === "ur" && dailyBenefit.bodyUr ? dailyBenefit.bodyUr : dailyBenefit.body}
        </Text>
      </GlassCard> : null}
      {flags.halalComingSoonEnabled ? <GlassCard tone="gold">
        <Text style={[styles.title, { color: theme.colors.text }]}>{t("halalRestaurants")}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>{t("halalComingSoon")}</Text>
        <AppButton label={t("exploreComingSoon")} icon="restaurant" variant="secondary" onPress={() => router.push("/halal-restaurants" as never)} style={styles.button} />
      </GlassCard> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  darkTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  darkBody: { color: "rgba(255,255,255,0.82)", lineHeight: 22, marginTop: 8 },
  title: { fontSize: 19, fontWeight: "900" },
  body: { lineHeight: 21, marginTop: 6 },
  whiteDayRow: { fontSize: 14, fontWeight: "700", marginTop: 8 },
  button: { marginTop: spacing.md }
});
