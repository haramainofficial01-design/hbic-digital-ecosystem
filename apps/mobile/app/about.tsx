import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { brandAssets, photoAssets } from "../src/constants/assets";
import { usePublishedContent } from "../src/services/content";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

export default function AboutScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { content } = usePublishedContent();
  const { settings } = content;

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <GlassCard tone="navy">
        <Image source={brandAssets.appMark} style={styles.logo} />
        <Text style={styles.darkTitle}>Masjid Bilal</Text>
        <Text style={styles.darkBody}>A community masjid app for prayer times, iqamah updates, programs, donations, media, and contact information.</Text>
      </GlassCard>

      <SectionHeader title="About Hazrat Bilal Islamic Centre" />
      <GlassCard>
        <Image source={photoAssets.prayerHall} style={styles.image} />
        <Text style={[styles.title, { color: theme.colors.text }]}>{settings.masjidName}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          Masjid Bilal serves the local community through prayer services, Qur'an learning, youth programs, reminders, community gatherings, volunteer support, and beneficial media.
        </Text>
      </GlassCard>

      <GlassCard tone="gold">
        <Text style={[styles.title, { color: theme.colors.text }]}>Community information</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          For current services, program details, receipts, or office questions, contact the centre directly using the information in this app.
        </Text>
      </GlassCard>

      <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>Connect</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>{settings.address}</Text>
        <AppButton label="Visit Website" icon="globe" onPress={() => Linking.openURL(settings.website)} style={styles.button} />
      </GlassCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 86,
    height: 86,
    borderRadius: 24,
    marginBottom: spacing.md
  },
  darkTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900"
  },
  darkBody: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 22,
    marginTop: 8
  },
  image: {
    width: "100%",
    height: 190,
    borderRadius: 22,
    marginBottom: spacing.md
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6
  },
  body: {
    lineHeight: 21
  },
  button: {
    marginTop: spacing.md
  }
});
