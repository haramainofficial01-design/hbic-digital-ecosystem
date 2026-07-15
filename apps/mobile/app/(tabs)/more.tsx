import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../src/components/AppButton";
import { AdaptiveGrid } from "../../src/components/AdaptiveGrid";
import { AppScreen } from "../../src/components/AppScreen";
import { GlassCard } from "../../src/components/GlassCard";
import { SectionHeader } from "../../src/components/SectionHeader";
import { brandAssets } from "../../src/constants/assets";
import { usePublishedContent } from "../../src/services/content";
import { spacing } from "../../src/theme/theme";
import { useAppTheme } from "../../src/theme/ThemeProvider";

type IconName = keyof typeof Ionicons.glyphMap;

const menuItems: { title: string; subtitle: string; icon: IconName; route: string }[] = [
  { title: "Programs", subtitle: "Qur'an, classes, sisters, and community support", icon: "book", route: "/programs" },
  { title: "HBIC Youth", subtitle: "Youth programs, socials, and summer camp", icon: "sparkles", route: "/youth" },
  { title: "Media", subtitle: "Taraweeh clip, social media, and community moments", icon: "play-circle", route: "/media" },
  { title: "Contact", subtitle: "Call, email, directions, and masjid address", icon: "call", route: "/contact" },
  { title: "About", subtitle: "Mission, services, and community information", icon: "information-circle", route: "/about" },
  { title: "Notifications", subtitle: "Prayer, iqamah, event, and media alerts", icon: "notifications", route: "/notifications" },
  { title: "Language", subtitle: "Preferred language for Masjid Bilal updates", icon: "language", route: "/language" },
  { title: "Settings", subtitle: "Theme and app preferences", icon: "settings", route: "/settings" }
];

export default function MoreScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { content } = usePublishedContent();
  const { settings } = content;

  return (
    <AppScreen>
      <SectionHeader title="More" subtitle="Services, media, youth, contact, settings, and notification preferences." />

      <GlassCard tone="navy">
        <View style={styles.brandRow}>
          <Image source={brandAssets.appMark} style={styles.logo} />
          <View style={styles.flex}>
            <Text style={styles.darkTitle}>Masjid Bilal</Text>
            <Text style={styles.darkBody}>{settings.address}</Text>
          </View>
        </View>
        <View style={styles.rowButtons}>
          <AppButton label="Call" icon="call" onPress={() => Linking.openURL(`tel:${settings.phone}`)} style={styles.flexButton} />
          <AppButton label="Directions" icon="navigate" variant="secondary" onPress={() => router.push("/contact" as never)} style={styles.flexButton} />
        </View>
      </GlassCard>

      <AdaptiveGrid>
        {menuItems.map((item) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            accessibilityHint={item.subtitle}
            onPress={() => router.push(item.route as never)}
          >
            <GlassCard compact>
              <View style={styles.menuRow}>
                <View style={[styles.iconBubble, { backgroundColor: theme.colors.tintSoft }]}>
                  <Ionicons name={item.icon} size={22} color={theme.colors.teal} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.menuTitle, { color: theme.colors.text }]}>{item.title}</Text>
                  <Text style={[styles.menuSub, { color: theme.colors.muted }]} numberOfLines={2}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.subtle} />
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </AdaptiveGrid>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  logo: {
    width: 74,
    height: 74,
    borderRadius: 22
  },
  flex: {
    flex: 1
  },
  darkTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 22
  },
  darkBody: {
    color: "rgba(255,255,255,0.78)",
    lineHeight: 20,
    marginTop: 4
  },
  rowButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  flexButton: {
    flex: 1
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: "900"
  },
  menuSub: {
    lineHeight: 19,
    marginTop: 2
  }
});
