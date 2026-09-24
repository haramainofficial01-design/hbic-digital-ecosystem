import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { getPublicEvents, isVisibleItem } from "@hbic/shared";
import { AppButton } from "../../src/components/AppButton";
import { AppScreen } from "../../src/components/AppScreen";
import { EventCard } from "../../src/components/EventCard";
import { GlassCard } from "../../src/components/GlassCard";
import { PrayerHero } from "../../src/components/PrayerHero";
import { PrayerTimesList } from "../../src/components/PrayerTimesList";
import { WhiteDaysNotice } from "../../src/components/WhiteDaysNotice";
import { SectionHeader } from "../../src/components/SectionHeader";
import { brandAssets, photoAssets } from "../../src/constants/assets";
import { usePublishedContent } from "../../src/services/content";
import { spacing } from "../../src/theme/theme";
import { useAppTheme } from "../../src/theme/ThemeProvider";

const etransferEmail = "bilalislamiccentrecalgary@gmail.com";

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { content } = usePublishedContent();
  const announcements = content.announcements.filter(isVisibleItem);
  const events = getPublicEvents(content);
  const { donationCategories, mediaItems, settings } = content;
  const announcement = announcements.find((item) => item.pinned) ?? announcements[0];
  const summerCamp = events.find((event) => event.id === "event-summer-camp-2026") ?? events.find((event) => event.featured) ?? events[0];
  const nextEvent = events.find((event) => event.id !== summerCamp?.id) ?? events[0];
  const featuredMedia = mediaItems.find((item) => item.visible && item.featured) ?? mediaItems.find((item) => item.visible);

  return (
    <AppScreen>
      <ImageBackground source={photoAssets.exterior} resizeMode="cover" style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient colors={theme.gradients.hero} style={StyleSheet.absoluteFill} />
        <Image source={brandAssets.appMark} style={styles.logo} />
        <Text style={styles.heroTitle}>Masjid Bilal</Text>
        <Text style={styles.heroSub}>Prayer, learning, youth programs, and community services in Calgary.</Text>
      </ImageBackground>

      <PrayerHero />
      <WhiteDaysNotice />
      <AppButton label="Hijri Calendar" icon="calendar-outline" variant="secondary" onPress={() => router.push("/hijri-calendar" as never)} />

      <SectionHeader title="Today at Masjid Bilal" subtitle="A quick glance. Open Prayer for the full adhan, iqamah, and Jumu'ah schedule." />
      <PrayerTimesList compact maxItems={3} />
      {announcement ? (
        <GlassCard compact tone={announcement.urgent ? "gold" : "light"}>
          <Text style={[styles.cardKicker, { color: announcement.urgent ? theme.colors.navy : theme.colors.teal }]}>
            {announcement.urgent ? "Urgent announcement" : "Announcement"}
          </Text>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{announcement.title}</Text>
          <Text style={[styles.body, { color: theme.colors.muted }]} numberOfLines={3}>{announcement.body}</Text>
        </GlassCard>
      ) : (
        <GlassCard compact>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>No new announcements</Text>
          <Text style={[styles.body, { color: theme.colors.muted }]}>Check back for the latest Masjid Bilal updates.</Text>
        </GlassCard>
      )}
      <AppButton label="Full Prayer & Iqamah" icon="time" variant="secondary" onPress={() => router.push("/prayer" as never)} />

      <GlassCard tone="gold">
        <Image source={photoAssets.summerCamp} style={styles.spotlightImage} />
        <Text style={[styles.cardKicker, { color: theme.colors.navy }]}>Summer Camp 2026</Text>
        <Text style={[styles.spotlightTitle, { color: theme.colors.text }]}>{summerCamp?.title ?? "Register your child today"}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]} numberOfLines={4}>
          {summerCamp?.summary ?? summerCamp?.description ?? "A safe, engaging summer of faith, friendship, Qur'an, stories, crafts, sports, and beneficial activities."}
        </Text>
        <View style={styles.rowButtons}>
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

      <SectionHeader title="Upcoming" subtitle="Current programs and gatherings." />
      {nextEvent ? (
        <EventCard event={nextEvent} compact onPress={() => router.push({ pathname: "/event-detail", params: { id: nextEvent.id } } as never)} />
      ) : null}

      <SectionHeader title="Community Media" />
      <Pressable accessibilityRole="button" onPress={() => router.push("/media" as never)}>
        <GlassCard>
          <Image source={photoAssets.taraweehPoster} style={styles.mediaImage} />
          <Text style={[styles.cardKicker, { color: theme.colors.teal }]}>{featuredMedia?.type ?? "Community Media"}</Text>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{featuredMedia?.title ?? "Taraweeh 2025 Recitation"}</Text>
          <Text style={[styles.body, { color: theme.colors.muted }]}>Watch a beautiful Ramadan recitation moment from Masjid Bilal.</Text>
          <AppButton label="Watch on Media Page" icon="play-circle" variant="secondary" onPress={() => router.push("/media" as never)} style={styles.button} />
        </GlassCard>
      </Pressable>

      <GlassCard tone="teal">
        <Text style={[styles.cardKicker, { color: theme.colors.teal }]}>Support the masjid</Text>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{donationCategories[0]?.title ?? "Support Masjid Bilal"}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          Donate by card or PayPal, or use e-transfer: {etransferEmail}.
        </Text>
        <AppButton label="Donate" icon="heart" onPress={() => Linking.openURL(settings.donationUrl)} style={styles.button} />
      </GlassCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 292,
    borderRadius: 34,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: spacing.lg
  },
  heroImage: {
    width: "100%",
    height: "100%"
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    marginBottom: spacing.md
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 0
  },
  heroSub: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6
  },
  cardKicker: {
    fontWeight: "900",
    marginBottom: 6
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6
  },
  spotlightTitle: {
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 8
  },
  body: {
    lineHeight: 21
  },
  spotlightImage: {
    width: "100%",
    height: 220,
    borderRadius: 22,
    marginBottom: spacing.md
  },
  mediaImage: {
    width: "100%",
    height: 176,
    borderRadius: 22,
    marginBottom: spacing.md
  },
  button: {
    marginTop: spacing.md
  },
  rowButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  flexButton: {
    flex: 1
  }
});
