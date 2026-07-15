import { formatCountdown, getIqamahForPrayer, getNextPrayer } from "@hbic/shared";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { brandAssets } from "../constants/assets";
import { usePublishedContent } from "../services/content";
import { spacing } from "../theme/theme";
import { useAppTheme } from "../theme/ThemeProvider";
import { GlassCard } from "./GlassCard";

export function PrayerHero() {
  const { theme } = useAppTheme();
  const { content, loading, source } = usePublishedContent();
  const [now, setNow] = useState(() => new Date());
  const next = getNextPrayer(content.prayerTime, now);
  const iqamah = getIqamahForPrayer(next.name, content.iqamahTime);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  if (source === "bundled-fallback") {
    return (
      <GlassCard tone="navy" style={styles.card}>
        <View style={styles.topRow}>
          <Image source={brandAssets.appMark} style={[styles.logo, { backgroundColor: theme.colors.white }]} accessibilityLabel="Masjid Bilal logo" />
          <View style={styles.flex}>
            <Text style={styles.kicker}>{loading ? "Loading" : "Prayer times"}</Text>
            <Text style={styles.unavailableTitle}>{loading ? "Getting today's times" : "Temporarily unavailable"}</Text>
          </View>
        </View>
        <Text style={styles.unavailableBody}>{loading ? "Please wait a moment." : "Pull down to try again."}</Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard tone="navy" style={styles.card}>
      <View style={styles.topRow}>
        <Image source={brandAssets.appMark} style={[styles.logo, { backgroundColor: theme.colors.white }]} accessibilityLabel="Masjid Bilal logo" />
        <View style={styles.flex}>
          <Text style={styles.kicker}>Next prayer</Text>
          <Text style={styles.title}>{next.label}</Text>
        </View>
      </View>
      <Text style={styles.countdown} numberOfLines={1} adjustsFontSizeToFit>{formatCountdown(next.date, now)}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Adhan {next.time}</Text>
        {iqamah ? <Text style={[styles.iqamah, { color: theme.colors.navy, backgroundColor: theme.colors.gold }]}>Iqamah {iqamah}</Text> : <Text style={styles.meta}>No iqamah</Text>}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 16
  },
  kicker: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: "700"
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900"
  },
  countdown: {
    color: "#E7C66B",
    fontSize: 48,
    fontWeight: "900"
  },
  flex: {
    flex: 1
  },
  unavailableTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2
  },
  unavailableBody: {
    color: "rgba(255,255,255,0.78)",
    lineHeight: 21
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  meta: {
    color: "rgba(255,255,255,0.78)",
    fontWeight: "700"
  },
  iqamah: {
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: "900"
  }
});
