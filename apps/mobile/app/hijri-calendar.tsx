import { dateStringInTimeZone, resolveHijriDate } from "@hbic/shared";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../src/i18n/LocalizedText";
import { useVisibleClock } from "../src/services/useVisibleClock";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { usePublishedContent } from "../src/services/content";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";
import { useAppLanguage } from "../src/i18n/LanguageProvider";

const timeZone = "America/Edmonton";
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function calendarDays(year: number, month: number) {
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leading = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return [...Array<null>(leading).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
}

function calgaryMonth(date: Date) {
  const [year, month] = dateStringInTimeZone(date, timeZone).split("-").map(Number);
  return { year, month: month - 1 };
}

export default function HijriCalendarScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { language } = useAppLanguage();
  const monthName = useMemo(() => new Intl.DateTimeFormat(language === "en" ? "en-CA" : language === "ur" ? "ur-PK" : language, { month: "long", year: "numeric", timeZone: "UTC" }), [language]);
  const { content } = usePublishedContent();
  const [viewedMonth, setViewedMonth] = useState(() => calgaryMonth(new Date()));
  const lastCalgaryMonth = useRef(calgaryMonth(new Date()));
  const now = useVisibleClock(30_000, (fresh) => {
      const month = calgaryMonth(fresh);
      const previous = lastCalgaryMonth.current;
      if (month.year !== previous.year || month.month !== previous.month) {
        setViewedMonth((view) => view.year === previous.year && view.month === previous.month ? month : view);
        lastCalgaryMonth.current = month;
      }
  });
  const today = dateStringInTimeZone(now, timeZone);
  const days = useMemo(() => calendarDays(viewedMonth.year, viewedMonth.month), [viewedMonth]);
  const hijriDates = days.map((day) => day === null ? null : resolveHijriDate(
    new Date(Date.UTC(viewedMonth.year, viewedMonth.month, day, 12)),
    content.hijriSettings,
    timeZone
  ));
  const first = hijriDates.find(Boolean);
  const last = [...hijriDates].reverse().find(Boolean);
  const hijriRange = first && last
    ? first.month === last.month && first.year === last.year
      ? `${first.month} ${first.year} AH`
      : `${first.month} – ${last.month} ${last.year} AH`
    : "Hijri dates unavailable";

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(viewedMonth.year, viewedMonth.month + delta, 1));
    setViewedMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  }

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title="Hijri Calendar" subtitle="Gregorian and Hijri dates together, using Masjid Bilal’s approved calendar adjustment." />
      <GlassCard tone="navy">
        <View style={styles.monthHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} style={styles.arrow}><Text style={styles.arrowText}>‹</Text></Pressable>
          <View style={styles.monthCopy}>
            <Text style={styles.monthTitle}>{monthName.format(new Date(Date.UTC(viewedMonth.year, viewedMonth.month, 1)))}</Text>
            <Text style={styles.hijriRange}>{hijriRange}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shiftMonth(1)} style={styles.arrow}><Text style={styles.arrowText}>›</Text></Pressable>
        </View>
        <View style={styles.grid}>
          {weekDays.map((day) => <View key={day} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>)}
          {days.map((day, index) => {
            const hijri = hijriDates[index];
            const key = day === null ? `blank-${index}` : `${viewedMonth.year}-${viewedMonth.month}-${day}`;
            const gregorianDate = day === null ? "" : `${viewedMonth.year}-${String(viewedMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = gregorianDate === today;
            const isWhiteDay = Boolean(content.featureFlags.whiteDaysEnabled && hijri?.isWhiteDay);
            return (
              <View key={key} style={[styles.cell, styles.dateCell, isToday && { backgroundColor: theme.colors.teal }, isWhiteDay && !isToday && { backgroundColor: "rgba(231,198,107,.2)" }]} accessibilityLabel={day === null ? undefined : `${gregorianDate}, ${hijri?.label ?? "Hijri date unavailable"}${isWhiteDay ? ", White Day" : ""}`}>
                {day !== null ? <><Text style={[styles.gregorianDay, isToday && styles.todayText]}>{day}</Text><Text style={[styles.hijriDay, isToday && styles.todayText]}>{hijri?.day ?? "—"}</Text>{isWhiteDay ? <View style={[styles.whiteDayDot, isToday && { backgroundColor: "#fff" }]} /> : null}</> : null}
              </View>
            );
          })}
        </View>
        <View style={styles.legend}><View style={styles.whiteDayDot} /><Text style={styles.legendText}>White Days (13th–15th Hijri)</Text></View>
      </GlassCard>
      <Text style={[styles.note, { color: theme.colors.muted }]}>Hijri dates can vary by local moon sighting. The calendar follows the same approved adjustment and date overrides shown elsewhere in the app.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingBottom: spacing.lg },
  arrow: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.22)" },
  arrowText: { color: "white", fontSize: 29, lineHeight: 33 },
  monthCopy: { flex: 1, alignItems: "center" },
  monthTitle: { color: "white", fontSize: 22, fontWeight: "900", textAlign: "center" },
  hijriRange: { color: "#E7C66B", fontSize: 13, textAlign: "center", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.2857%", minHeight: 44, alignItems: "center", justifyContent: "center" },
  weekday: { color: "rgba(255,255,255,.55)", fontSize: 11, fontWeight: "900" },
  dateCell: { minHeight: 65, borderRadius: 14 },
  gregorianDay: { color: "white", fontSize: 16, fontWeight: "900" },
  hijriDay: { color: "rgba(255,255,255,.6)", fontSize: 11, marginTop: 2 },
  todayText: { color: "white" },
  whiteDayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#E7C66B", marginTop: 4 },
  legend: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: spacing.md, justifyContent: "center" },
  legendText: { color: "rgba(255,255,255,.66)", fontSize: 12 },
  note: { lineHeight: 20, fontSize: 13, paddingHorizontal: spacing.sm }
});
