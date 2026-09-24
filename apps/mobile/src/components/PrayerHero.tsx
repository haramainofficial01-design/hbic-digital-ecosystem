import {
  congregationalPrayerOrder,
  formatCountdown,
  getIqamahForPrayer,
  getNextPrayerFocus,
  getPrayerCelestialPosition,
  isJumuahWindow,
  resolveHijriDate,
  type PrayerName
} from "@hbic/shared";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { brandAssets } from "../constants/assets";
import { useAppLanguage } from "../i18n/LanguageProvider";
import { usePublishedContent } from "../services/content";
import { spacing } from "../theme/theme";
import { useAppTheme } from "../theme/ThemeProvider";
import { GlassCard } from "./GlassCard";

type CongregationalPrayer = Exclude<PrayerName, "sunrise">;

const prayerPalettes: Record<CongregationalPrayer, { surface: string; border: string; accent: string; softAccent: string }> = {
  fajr: { surface: "#112B4B", border: "rgba(177,211,255,0.34)", accent: "#B9D7FF", softAccent: "#D9E8FF" },
  dhuhr: { surface: "#075465", border: "rgba(119,226,222,0.35)", accent: "#F0D483", softAccent: "#C6F3EF" },
  asr: { surface: "#164664", border: "rgba(240,205,126,0.36)", accent: "#F2D58C", softAccent: "#C4E4F2" },
  maghrib: { surface: "#453442", border: "rgba(242,183,120,0.36)", accent: "#F2B778", softAccent: "#F5D8C4" },
  isha: { surface: "#071D31", border: "rgba(184,215,233,0.3)", accent: "#BBD8E9", softAccent: "#D5E7F1" }
};

const prayerMoments: Record<CongregationalPrayer, { en: string; ur: string }> = {
  fajr: { en: "A quiet beginning", ur: "ایک پُرسکون آغاز" },
  dhuhr: { en: "Pause and return", ur: "توقف کریں اور لوٹ آئیں" },
  asr: { en: "Carry the day with care", ur: "دن کو خیر کے ساتھ آگے بڑھائیں" },
  maghrib: { en: "Close the day with gratitude", ur: "دن کا اختتام شکر کے ساتھ" },
  isha: { en: "End the day in peace", ur: "دن کا اختتام سکون کے ساتھ" }
};

export function PrayerHero({ focusPrayer }: { focusPrayer?: CongregationalPrayer }) {
  const { theme } = useAppTheme();
  const { language, t } = useAppLanguage();
  const { content, loading, source } = usePublishedContent();
  const [now, setNow] = useState(() => new Date());
  const [selectedPrayer, setSelectedPrayer] = useState<CongregationalPrayer | null>(null);
  const [showBlessing, setShowBlessing] = useState(false);
  const jumuahActive = isJumuahWindow(content.prayerTime, now);
  const next = getNextPrayerFocus(content.prayerTime, content.iqamahTime, now);
  const focusedPrayer = selectedPrayer ?? next?.name;
  const focusedAdhan = focusedPrayer ? content.prayerTime[focusedPrayer] : undefined;
  const focusedIqamah = focusedPrayer ? getIqamahForPrayer(focusedPrayer, content.iqamahTime) : undefined;
  const hijri = content.featureFlags.hijriDateEnabled ? resolveHijriDate(now, content.hijriSettings) : null;
  const basePalette = prayerPalettes[focusedPrayer ?? "isha"];
  const palette = jumuahActive
    ? { ...basePalette, surface: "#142B55", border: "rgba(228,196,112,0.42)", accent: "#E4C470", softAccent: "#F2E5BD" }
    : basePalette;
  const celestial = getPrayerCelestialPosition(content.prayerTime, now);
  const sunLeft = `${6 + celestial.progress * 88}%` as `${number}%`;
  const sunTop = `${64 - celestial.altitude * 40}%` as `${number}%`;
  const dateLabel = new Intl.DateTimeFormat(language === "ur" ? "ur-PK" : "en-CA", {
    timeZone: "America/Edmonton",
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(now);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (focusPrayer) setSelectedPrayer(focusPrayer);
  }, [focusPrayer]);

  if (source === "bundled-fallback" || !next || !focusedPrayer || !focusedAdhan) {
    return (
      <GlassCard tone="navy" style={styles.card}>
        <View style={styles.topRow}>
          <Image source={brandAssets.appMark} style={[styles.logo, { backgroundColor: theme.colors.white }]} accessibilityLabel="Masjid Bilal logo" />
          <View style={styles.flex}>
            <Text style={styles.kicker}>{loading ? t("loading") : t("prayerTimes")}</Text>
            <Text style={styles.unavailableTitle}>{loading ? "Getting today's times" : "Temporarily unavailable"}</Text>
          </View>
        </View>
        <Text style={styles.unavailableBody}>{loading ? "Please wait a moment." : "Pull down to try again."}</Text>
      </GlassCard>
    );
  }

  const isLiveNext = selectedPrayer === null;

  return (
    <GlassCard tone="navy" style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View
        pointerEvents="none"
        style={[styles.celestial, { left: sunLeft, top: sunTop, opacity: celestial.visibility * 0.68 }]}
      >
        <View style={styles.sunAura} />
        <View style={styles.sunCore}><View style={styles.sunHighlight} /></View>
      </View>
      <View style={[styles.accentLine, { backgroundColor: palette.accent }]} />
      {jumuahActive ? (
        <View style={styles.jumuahBadge} accessibilityLabel="Jumu'ah Mubarak">
          <Text style={styles.jumuahArabic}>جُمُعَة مُبَارَكَة</Text>
          <Text style={styles.jumuahEnglish}>JUMU&apos;AH MUBARAK</Text>
        </View>
      ) : null}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Masjid Bilal logo"
            accessibilityHint="Long press for a message"
            onLongPress={() => setShowBlessing(true)}
          >
            <Image source={brandAssets.appMark} style={[styles.logo, { backgroundColor: theme.colors.white }]} />
          </Pressable>
          <View>
            <Text style={styles.brandName}>Masjid Bilal</Text>
            <Text style={styles.date}>{dateLabel}</Text>
          </View>
        </View>
        {hijri ? (
          <Text
            style={styles.hijri}
            accessibilityLabel={`Hijri date, ${hijri.label}${content.featureFlags.whiteDaysEnabled && hijri.isWhiteDay ? ", White Day, voluntary fasting reminder" : ""}`}
          >
            {hijri.label}{content.featureFlags.whiteDaysEnabled && hijri.isWhiteDay ? ` · ${t("whiteDay")}` : ""}
          </Text>
        ) : null}
      </View>
      {showBlessing ? (
        <Text style={[styles.blessing, { color: palette.softAccent }]}>May your day carry barakah.</Text>
      ) : null}

      <View style={styles.prayerHeading}>
        <Text style={[styles.kicker, { color: palette.softAccent }]}>{isLiveNext ? t("nextPrayer") : t("prayerTimes")}</Text>
        <Text style={styles.title}>{t(focusedPrayer)}</Text>
        <Text style={[styles.countdown, { color: palette.accent }]} numberOfLines={1} adjustsFontSizeToFit>
          {isLiveNext ? `${formatCountdown(next.date, now)} to ${next.kind}` : dateLabel}
        </Text>
        <Text style={styles.prayerMoment}>{prayerMoments[focusedPrayer][language]}</Text>
      </View>

      <View
        style={styles.timePanel}
        accessibilityLabel={`${t(focusedPrayer)}. ${t("adhan")}, ${focusedAdhan}. ${t("iqamah")}, ${focusedIqamah ?? t("unavailable")}.`}
      >
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>{t("adhan")}</Text>
          <Text style={styles.timeValue}>{focusedAdhan}</Text>
        </View>
        <View style={styles.timeDivider} />
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>{t("iqamah")}</Text>
          <Text style={[styles.timeValue, { color: palette.accent }]}>{focusedIqamah ?? "--"}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorContent}
        style={styles.selector}
        accessibilityLabel="Prayer selector"
      >
        <PrayerSelectorButton
          label={language === "ur" ? "اب" : "Now"}
          selected={selectedPrayer === null}
          accent={palette.accent}
          onPress={() => setSelectedPrayer(null)}
        />
        {congregationalPrayerOrder.map((name) => (
          <PrayerSelectorButton
            key={name}
            label={t(name)}
            selected={selectedPrayer === name}
            accent={prayerPalettes[name].accent}
            onPress={() => setSelectedPrayer(name)}
          />
        ))}
      </ScrollView>
    </GlassCard>
  );
}

function PrayerSelectorButton({
  label,
  selected,
  accent,
  onPress
}: {
  label: string;
  selected: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Show ${label} prayer times`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectorButton,
        selected && { backgroundColor: "rgba(255,255,255,0.18)", borderColor: accent },
        pressed && styles.selectorPressed
      ]}
    >
      <Text style={[styles.selectorLabel, selected && { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    paddingTop: spacing.lg
  },
  accentLine: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4
  },
  celestial: {
    position: "absolute",
    width: 44,
    height: 44,
    marginLeft: -22,
    marginTop: -22,
    alignItems: "center",
    justifyContent: "center"
  },
  sunAura: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "rgba(255,205,105,0.08)"
  },
  sunCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,250,220,0.82)",
    backgroundColor: "#FFDB78",
    shadowColor: "#FFCE69",
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 }
  },
  sunHighlight: {
    position: "absolute",
    top: 4,
    left: 6,
    width: 10,
    height: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.84)",
    borderRadius: 8,
    transform: [{ rotate: "-18deg" }]
  },
  jumuahBadge: {
    alignSelf: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(228,196,112,0.42)",
    backgroundColor: "rgba(255,255,255,0.07)"
  },
  jumuahArabic: {
    color: "#F2E5BD",
    fontSize: 14,
    fontWeight: "700"
  },
  jumuahEnglish: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 2
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 13
  },
  brandName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  date: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2
  },
  hijri: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "700",
    maxWidth: "42%",
    textAlign: "right"
  },
  blessing: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    marginTop: -8
  },
  prayerHeading: {
    alignItems: "center"
  },
  kicker: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase"
  },
  title: {
    color: "#FFFFFF",
    fontSize: 35,
    fontWeight: "900",
    marginTop: 4
  },
  countdown: {
    fontSize: 21,
    fontWeight: "900",
    marginTop: 4
  },
  prayerMoment: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5
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
  timePanel: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    paddingVertical: 14
  },
  timeBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8
  },
  timeLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  timeValue: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    marginTop: 4
  },
  timeDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  selector: {
    marginHorizontal: -4,
    borderRadius: 18,
    backgroundColor: "rgba(3,24,39,0.3)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)"
  },
  selectorContent: {
    padding: 5,
    gap: 3
  },
  selectorButton: {
    minWidth: 52,
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  selectorPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }]
  },
  selectorLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    fontWeight: "900"
  }
});
