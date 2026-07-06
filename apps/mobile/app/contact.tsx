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

export default function ContactScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { content } = usePublishedContent();
  const { settings } = content;
  const encodedAddress = encodeURIComponent(settings.address);

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title="Contact" subtitle="Reach HBIC Calgary, get directions, and find the masjid address." />
      <Image source={photoAssets.exterior} style={styles.image} />

      <GlassCard tone="teal">
        <Text style={[styles.title, { color: theme.colors.text }]}>{settings.masjidName}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>{settings.address}</Text>
        <View style={styles.grid}>
          <AppButton label="Call" icon="call" onPress={() => Linking.openURL(`tel:${settings.phone}`)} style={styles.flexButton} />
          <AppButton label="Email" icon="mail" variant="secondary" onPress={() => Linking.openURL(`mailto:${settings.email}`)} style={styles.flexButton} />
          <AppButton label="Google Maps" icon="navigate" variant="secondary" onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodedAddress}`)} style={styles.flexButton} />
          <AppButton label="Apple Maps" icon="map" variant="secondary" onPress={() => Linking.openURL(`http://maps.apple.com/?q=${encodedAddress}`)} style={styles.flexButton} />
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>Qibla</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          For qibla guidance at the masjid, follow the prayer hall direction and ask HBIC staff if you need help.
        </Text>
      </GlassCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: 220,
    borderRadius: 28
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6
  },
  body: {
    lineHeight: 21
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  flexButton: {
    width: "48%",
    flexGrow: 1
  }
});
