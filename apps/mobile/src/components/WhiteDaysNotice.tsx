import { getWhiteDaysRemainingThisWeek } from "@hbic/shared";
import { useRouter } from "expo-router";
import { useVisibleClock } from "../services/useVisibleClock";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePublishedContent } from "../services/content";
import { spacing } from "../theme/theme";
import { useAppTheme } from "../theme/ThemeProvider";
import { GlassCard } from "./GlassCard";

const dateLabel = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Edmonton",
  weekday: "short",
  month: "short",
  day: "numeric"
});

export function WhiteDaysNotice() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { content } = usePublishedContent();
  const now = useVisibleClock(60_000);

  if (!content.featureFlags.hijriDateEnabled || !content.featureFlags.whiteDaysEnabled) return null;

  const days = getWhiteDaysRemainingThisWeek(now, content.hijriSettings, "America/Edmonton");
  if (!days.length) return null;

  const month = days[0].hijriDate.month;
  const dates = days.map(({ gregorianDate }) => dateLabel.format(new Date(`${gregorianDate}T12:00:00Z`))).join(" · ");

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`White Days this week, ${dates}. Open Hijri calendar.`} onPress={() => router.push("/hijri-calendar" as never)}>
      <GlassCard tone="teal" compact>
        <View style={styles.row}>
          <View style={[styles.moon, { backgroundColor: theme.colors.tintSoft }]}><Text style={[styles.moonText, { color: theme.colors.teal }]}>☾</Text></View>
          <View style={styles.copy}>
            <Text style={[styles.eyebrow, { color: theme.colors.teal }]}>COMING UP THIS WEEK</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>White Days · {month}</Text>
            <Text style={[styles.dates, { color: theme.colors.muted }]}>{dates}</Text>
          </View>
          <Text style={[styles.chevron, { color: theme.colors.teal }]}>›</Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  moon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  moonText: { fontSize: 31, lineHeight: 38 },
  copy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { fontSize: 17, fontWeight: "900", marginTop: 2 },
  dates: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  chevron: { fontSize: 30 }
});
