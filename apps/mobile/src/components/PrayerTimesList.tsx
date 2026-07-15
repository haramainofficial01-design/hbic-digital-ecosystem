import { getIqamahForPrayer, getNextPrayer, prayerLabels, prayerOrder } from "@hbic/shared";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";
import { usePublishedContent } from "../services/content";
import { GlassCard } from "./GlassCard";

export function PrayerTimesList({ compact = false, maxItems }: { compact?: boolean; maxItems?: number }) {
  const { theme } = useAppTheme();
  const { content, loading, source } = usePublishedContent();
  const next = getNextPrayer(content.prayerTime);
  const rows = typeof maxItems === "number" ? prayerOrder.slice(0, maxItems) : prayerOrder;

  return (
    <GlassCard compact={compact}>
      {rows.map((name) => {
        const dataAvailable = source !== "bundled-fallback";
        const iqamah = dataAvailable ? getIqamahForPrayer(name, content.iqamahTime) : undefined;
        const isNext = name === next.name;
        return (
          <View key={name} style={[styles.row, { borderBottomColor: theme.colors.border }, isNext && { backgroundColor: theme.colors.tintSoft }]}>
            <View>
              <Text style={[styles.name, { color: theme.colors.text }]}>{prayerLabels[name]}</Text>
              <Text style={[styles.sub, { color: theme.colors.subtle }]}>
                {!dataAvailable ? (loading ? "Loading" : "Unavailable") : name === "sunrise" ? "No iqamah" : isNext ? "Next prayer" : "Adhan and iqamah"}
              </Text>
            </View>
            <View style={styles.times}>
              <Text style={[styles.adhan, { color: theme.colors.text }]}>{dataAvailable ? content.prayerTime[name] : "--"}</Text>
              {iqamah ? <Text style={[styles.iqamah, { color: theme.colors.teal }]}>{iqamah}</Text> : null}
            </View>
          </View>
        );
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: {
    fontWeight: "900",
    fontSize: 16
  },
  sub: {
    marginTop: 2,
    fontSize: 12
  },
  times: {
    alignItems: "flex-end",
    gap: 4
  },
  adhan: {
    fontWeight: "800"
  },
  iqamah: {
    fontWeight: "900"
  }
});
