import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { brandAssets, photoAssets } from "../src/constants/assets";
import { usePublishedContent } from "../src/services/content";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

export default function YouthScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { content } = usePublishedContent();
  const { events, settings } = content;
  const summerCamp = events.find((event) => event.id === "event-summer-camp-2026") ?? events[0];
  const socialLinks = [
    ["Instagram", settings.social.instagram],
    ["YouTube", settings.social.youtube],
    ["TikTok", settings.social.tiktok]
  ] as const;

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <GlassCard tone="navy">
        <View style={styles.heroRow}>
          <Image source={brandAssets.youthLogo} style={styles.youthLogo} />
          <View style={styles.flex}>
            <Text style={styles.darkKicker}>HBIC Youth</Text>
            <Text style={styles.darkTitle}>Faith, friendship, and beneficial programs</Text>
            <Text style={styles.darkBody}>Youth updates, reminders, and community activities from HBIC Calgary.</Text>
          </View>
        </View>
      </GlassCard>

      <SectionHeader title="Summer Camp" />
      <GlassCard tone="gold">
        <Image source={photoAssets.summerCamp} style={styles.image} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Register your child today</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          Summer Camp 2026 welcomes boys and girls ages 7-12 for Islamic lessons, stories, crafts, sports, leadership activities, and a positive environment with caring instructors.
        </Text>
        <View style={styles.actions}>
          <AppButton label="Contact Us" icon="mail" onPress={() => Linking.openURL(summerCamp?.registrationLink || `mailto:${settings.email}`)} style={styles.flexButton} />
          <AppButton
            label="Details"
            icon="open-outline"
            variant="secondary"
            onPress={() => router.push({ pathname: "/event-detail", params: { id: summerCamp?.id } } as never)}
            style={styles.flexButton}
          />
        </View>
      </GlassCard>

      <SectionHeader title="Program Highlights" />
      <GlassCard>
        <Image source={photoAssets.youthProgram} style={styles.image} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Youth programs and reminders</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          HBIC Youth can publish program reminders, registration updates, social clips, and volunteer calls without sharing sensitive personal details.
        </Text>
      </GlassCard>

      <SectionHeader title="Follow HBIC Youth" />
      <GlassCard>
        <View style={styles.socialGrid}>
          {socialLinks.map(([label, url]) => (
            <AppButton key={label} label={label} icon="open-outline" variant="secondary" onPress={() => Linking.openURL(url)} style={styles.socialButton} />
          ))}
        </View>
      </GlassCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  youthLogo: {
    width: 82,
    height: 82,
    borderRadius: 24
  },
  flex: {
    flex: 1
  },
  darkKicker: {
    color: "#E7C66B",
    fontWeight: "900",
    marginBottom: 4
  },
  darkTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900"
  },
  darkBody: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 20,
    marginTop: 6
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 24,
    marginBottom: spacing.md
  },
  title: {
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 6
  },
  body: {
    lineHeight: 21
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  flexButton: {
    flex: 1
  },
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  socialButton: {
    flexGrow: 1
  }
});
