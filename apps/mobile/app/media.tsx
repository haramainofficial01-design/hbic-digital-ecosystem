import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { photoAssets } from "../src/constants/assets";
import { usePublishedContent } from "../src/services/content";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

export default function MediaScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { content } = usePublishedContent();
  const { mediaItems, settings } = content;
  const featured = mediaItems.find((item) => item.featured && item.visible) ?? mediaItems[0];
  const mediaPageUrl = `${settings.website.replace(/\/$/, "")}/media`;
  const socialLinks = [
    ["Instagram", settings.social.instagram],
    ["YouTube", settings.social.youtube],
    ["TikTok", settings.social.tiktok]
  ] as const;

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title="Media" subtitle="Qur'an recitations, program highlights, community moments, and HBIC Youth updates." />

      <SectionHeader title="Featured Recitation" />
      <GlassCard tone="navy">
        <Image source={photoAssets.taraweehPoster} style={styles.featuredImage} />
        <Text style={styles.darkKicker}>{featured?.type ?? "Community Media"} · {featured?.year ?? 2025}</Text>
        <Text style={styles.darkTitle}>{featured?.title ?? "Taraweeh 2025 Recitation"}</Text>
        <Text style={styles.darkBody}>{featured?.description ?? "A beautiful Ramadan recitation moment from HBIC."}</Text>
        <Text style={styles.darkBody}>
          Open the Media page for HBIC Youth links, recitation highlights, and community media updates.
        </Text>
        <AppButton label="Open Media Page" icon="play-circle" onPress={() => Linking.openURL(mediaPageUrl)} style={styles.button} />
      </GlassCard>

      <SectionHeader title="HBIC Social Media" />
      <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>Follow HBIC Youth</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          Follow HBIC Youth for more reminders, clips, and program updates.
        </Text>
        <View style={styles.socialGrid}>
          {socialLinks.map(([label, url]) => (
            <AppButton key={label} label={label} icon="open-outline" variant="secondary" onPress={() => Linking.openURL(url)} style={styles.socialButton} />
          ))}
        </View>
      </GlassCard>

      <SectionHeader title="Youth & Program Highlights" />
      <GlassCard>
        <Image source={photoAssets.youthProgram} style={styles.image} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Programs to revisit and share</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          HBIC shares beneficial reminders, Qur'an reflections, youth highlights, and community program moments across its public platforms.
        </Text>
      </GlassCard>

      <SectionHeader title="Community Moments" />
      <GlassCard>
        <Image source={photoAssets.communityJumuah} style={styles.image} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Respectful community media</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          Media is presented cleanly: no autoplay audio, no distracting effects over Qur'an recitation, and no private personal details.
        </Text>
      </GlassCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  featuredImage: {
    width: "100%",
    height: 210,
    borderRadius: 24,
    marginBottom: spacing.md
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 22,
    marginBottom: spacing.md
  },
  darkKicker: {
    color: "#E7C66B",
    fontWeight: "900",
    marginBottom: 6
  },
  darkTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    marginBottom: 8
  },
  darkBody: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 22,
    marginTop: 8
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
  },
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  socialButton: {
    flexGrow: 1
  }
});
