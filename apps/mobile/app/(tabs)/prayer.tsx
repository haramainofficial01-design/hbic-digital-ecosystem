import { useLocalSearchParams, useRouter } from "expo-router";
import { getEffectiveJumuahDoorNotice, type AdhanPrayerName } from "@hbic/shared";
import { StyleSheet, View } from "react-native";
import { Text } from "../../src/i18n/LocalizedText";
import { AppButton } from "../../src/components/AppButton";
import { AppScreen } from "../../src/components/AppScreen";
import { GlassCard } from "../../src/components/GlassCard";
import { PrayerHero } from "../../src/components/PrayerHero";
import { PrayerTimesList } from "../../src/components/PrayerTimesList";
import { DesktopColumns } from "../../src/components/DesktopColumns";
import { SectionHeader } from "../../src/components/SectionHeader";
import { usePublishedContent } from "../../src/services/content";
import { spacing } from "../../src/theme/theme";
import { useAppTheme } from "../../src/theme/ThemeProvider";

export default function PrayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prayer?: string | string[] }>();
  const { theme } = useAppTheme();
  const { content } = usePublishedContent();
  const requestedPrayer = Array.isArray(params.prayer) ? params.prayer[0] : params.prayer;
  const highlightedPrayer = requestedPrayer && ["fajr", "dhuhr", "asr", "maghrib", "isha"].includes(requestedPrayer)
    ? requestedPrayer as AdhanPrayerName
    : undefined;
  const { eidSchedule, jumuahSchedule, ramadanSchedule, settings } = content;
  const jumuahDoorNotice = getEffectiveJumuahDoorNotice(
    jumuahSchedule,
    new Date(),
    content.featureFlags.jumuahDoorNoticeEnabled
  );
  const jumuahSupportingNotices = Array.from(
    new Set(
      [jumuahDoorNotice?.parkingNotice, jumuahDoorNotice?.capacityNotice, jumuahSchedule.notes].filter(
        (notice): notice is string => Boolean(notice && notice !== jumuahDoorNotice?.body)
      )
    )
  );

  return (
    <AppScreen>
      <SectionHeader title="Prayer & Iqamah" subtitle="Today’s adhan, iqamah, and Jumu'ah times for Masjid Bilal." />
      <PrayerHero focusPrayer={highlightedPrayer} />
      <DesktopColumns>
      <PrayerTimesList highlightedPrayer={highlightedPrayer} />

      <GlassCard tone="gold">
        <Text style={[styles.title, { color: theme.colors.text }]}>Jumu'ah schedule</Text>
        <View style={styles.jumuahGrid}>
          <ScheduleCell label="First khutbah" value={jumuahSchedule.firstKhutbahTime} />
          <ScheduleCell label="Second khutbah" value={jumuahSchedule.secondKhutbahTime} />
        </View>
        {jumuahDoorNotice ? (
          <Text accessibilityRole="text" style={[styles.doorsNotice, { color: theme.colors.text }]}>
            {jumuahDoorNotice.body}
          </Text>
        ) : null}
        {jumuahSupportingNotices.map((notice) => (
          <Text style={[styles.note, { color: theme.colors.muted }]} key={notice}>{notice}</Text>
        ))}
      </GlassCard>
      </DesktopColumns>

      {settings.ramadanMode ? (
        <GlassCard tone="navy">
          <Text style={styles.darkTitle}>Ramadan mode</Text>
          <Text style={styles.darkBody}>
            Suhoor ends {ramadanSchedule.suhoorEnd}. Iftar {ramadanSchedule.iftar}. Taraweeh {ramadanSchedule.taraweeh}.
          </Text>
        </GlassCard>
      ) : null}

      {settings.eidMode ? (
        <GlassCard tone="teal">
          <Text style={[styles.title, { color: theme.colors.text }]}>{eidSchedule.eidName}</Text>
          <Text style={[styles.note, { color: theme.colors.muted }]}>
            {eidSchedule.prayerTimes.join(" and ")} at {eidSchedule.location}
          </Text>
        </GlassCard>
      ) : null}

      <GlassCard tone="teal">
        <Text style={[styles.title, { color: theme.colors.text }]}>Prayer reminders</Text>
        <Text style={[styles.note, { color: theme.colors.muted }]}>
          Choose adhan, iqamah, Jumu'ah, and urgent announcement notifications from one simple settings screen.
        </Text>
        <AppButton label="Notification Settings" icon="notifications" onPress={() => router.push("/notifications" as never)} style={styles.button} />
      </GlassCard>
    </AppScreen>
  );
}

function ScheduleCell({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.scheduleCell, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border }]}>
      <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.colors.teal }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: spacing.sm
  },
  darkTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: spacing.sm
  },
  darkBody: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 22
  },
  jumuahGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  scheduleCell: {
    width: "48%",
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.sm,
    justifyContent: "center"
  },
  label: {
    fontWeight: "800",
    fontSize: 12
  },
  value: {
    fontWeight: "900",
    fontSize: 19,
    marginTop: 4
  },
  note: {
    lineHeight: 21
  },
  doorsNotice: {
    fontWeight: "900",
    lineHeight: 21,
    marginBottom: spacing.xs
  },
  button: {
    marginTop: spacing.md
  }
});
