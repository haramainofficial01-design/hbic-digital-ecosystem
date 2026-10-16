import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getIqamahForPrayer, getNextPrayerFocus, prayerOrder, type PrayerName } from "@hbic/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../i18n/LocalizedText";
import { useAppLanguage } from "../i18n/LanguageProvider";
import { usePublishedContent } from "../services/content";
import { useAppTheme } from "../theme/ThemeProvider";
import { GlassCard } from "./GlassCard";
import { useAppViewport } from "./AppViewport";

type PrayerIconName = keyof typeof MaterialCommunityIcons.glyphMap;

const prayerIcons: Record<PrayerName, PrayerIconName> = {
  fajr: "weather-sunset-up",
  sunrise: "weather-sunny",
  dhuhr: "white-balance-sunny",
  asr: "weather-partly-cloudy",
  maghrib: "weather-sunset-down",
  isha: "weather-night"
};

export function PrayerTimesList({
  compact = false,
  maxItems,
  highlightedPrayer
}: {
  compact?: boolean;
  maxItems?: number;
  highlightedPrayer?: Exclude<PrayerName, "sunrise">;
}) {
  const { theme } = useAppTheme();
  const { t } = useAppLanguage();
  const { content, source } = usePublishedContent();
  const { width, fontScale } = useAppViewport();
  const [tableWidth, setTableWidth] = useState<number | null>(null);
  const stacked = (tableWidth ?? width - 64) < 330 || fontScale > 1.4;
  const next = getNextPrayerFocus(content.prayerTime, content.iqamahTime);
  const rows = typeof maxItems === "number" ? prayerOrder.slice(0, maxItems) : prayerOrder;

  return (
    <GlassCard compact={compact} style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={[styles.heading, { color: theme.colors.text }]}>{compact ? t("prayerTimes") : t("todaySchedule")}</Text>
          {!compact ? <Text style={[styles.headingSub, { color: theme.colors.muted }]}>Masjid Bilal · Calgary</Text> : null}
        </View>
        {!compact && source === "api" ? (
          <View style={[styles.liveDot, { backgroundColor: theme.colors.teal }]} accessibilityLabel="Current published times" />
        ) : null}
      </View>

      <View onLayout={({ nativeEvent: { layout } }) => {
        const measured = Math.round(layout.width);
        if (measured > 0) setTableWidth(previous => previous === measured ? previous : measured);
      }}>
      {!stacked ? <View style={[styles.columnHeader, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.columnLabel, styles.nameColumn, styles.nameColumnLabel, { color: theme.colors.subtle }]}>{t("prayer")}</Text>
        <Text style={[styles.columnLabel, { color: theme.colors.subtle }]}>{t("adhan")}</Text>
        <Text style={[styles.columnLabel, { color: theme.colors.subtle }]}>{t("iqamah")}</Text>
      </View> : null}

      {rows.map((name) => {
        const dataAvailable = source !== "bundled-fallback";
        const iqamah = dataAvailable ? getIqamahForPrayer(name, content.iqamahTime) : undefined;
        const isNext = name === next?.name;
        const isHighlighted = name === highlightedPrayer;
        return (
          <View
            key={name}
            accessibilityLabel={`${t(name)}. ${t("adhan")}, ${dataAvailable ? content.prayerTime[name] : t("unavailable")}. ${t("iqamah")}, ${iqamah ?? t("noIqamah")}.${isHighlighted ? " Opened from prayer alert." : ""}`}
            style={[
              styles.row,
              stacked && styles.stackedRow,
              { borderBottomColor: theme.colors.border },
              isNext && { backgroundColor: theme.colors.tintSoft, borderLeftColor: theme.colors.teal },
              isHighlighted && { backgroundColor: theme.colors.cardStrong, borderLeftColor: theme.colors.gold }
            ]}
          >
            <View style={[styles.nameColumn, stacked && styles.stackedName]}>
              <View style={styles.nameRow}>
                <MaterialCommunityIcons
                  name={prayerIcons[name]}
                  size={20}
                  color={isHighlighted ? theme.colors.warningText : isNext ? theme.colors.teal : theme.colors.subtle}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <Text style={[styles.name, { color: theme.colors.text }]}>{t(name)}</Text>
              </View>
              {isNext ? <Text style={[styles.nextLabel, { color: theme.colors.teal }]}>{t("nextPrayer")}</Text> : null}
              {isHighlighted ? <Text style={[styles.nextLabel, { color: theme.colors.warningText }]}>Prayer alert</Text> : null}
            </View>
            {stacked ? <View style={styles.stackedTimes}>
              <View style={styles.stackedTime}><Text style={[styles.stackedTimeLabel, { color: theme.colors.subtle }]}>{t("adhan")}</Text><Text style={[styles.stackedTimeValue, { color: theme.colors.text }]}>{dataAvailable ? content.prayerTime[name] : "--"}</Text></View>
              <View style={styles.stackedTime}><Text style={[styles.stackedTimeLabel, { color: theme.colors.subtle }]}>{t("iqamah")}</Text><Text style={[styles.stackedTimeValue, styles.iqamah, { color: iqamah ? theme.colors.teal : theme.colors.subtle }]}>{iqamah ?? "—"}</Text></View>
            </View> : <>
              <Text style={[styles.time, { color: theme.colors.text }]}>{dataAvailable ? content.prayerTime[name] : "--"}</Text>
              <Text style={[styles.time, styles.iqamah, { color: iqamah ? theme.colors.teal : theme.colors.subtle }]}>{iqamah ?? "—"}</Text>
            </>}
          </View>
        );
      })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 14
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12
  },
  heading: {
    fontSize: 18,
    fontWeight: "900"
  },
  headingCopy: { flex: 1, minWidth: 0 },
  headingSub: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 5
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    paddingBottom: 8
  },
  columnLabel: {
    width: 78,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  nameColumn: {
    flex: 1,
    minWidth: 0
  },
  nameColumnLabel: {
    paddingLeft: 17,
    textAlign: "left"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 62,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
    borderRadius: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  name: {
    fontWeight: "900",
    fontSize: 16,
    flexShrink: 1
  },
  nextLabel: {
    marginTop: 3,
    marginLeft: 17,
    fontSize: 10,
    fontWeight: "900"
  },
  time: {
    width: 78,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "800"
  },
  iqamah: {
    fontWeight: "900"
  },
  stackedRow: { flexDirection: "column", alignItems: "stretch", gap: 10 },
  stackedName: { flex: 0 },
  stackedTimes: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  stackedTime: { flex: 1, minWidth: 70, gap: 3 },
  stackedTimeLabel: { fontSize: 10, fontWeight: "800" },
  stackedTimeValue: { fontSize: 15, fontWeight: "800" }
});
