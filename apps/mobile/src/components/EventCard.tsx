import { publicEventImagePath, type EventItem } from "@hbic/shared";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, Image } from "../i18n/LocalizedText";
import { eventPhotoAssets } from "../constants/assets";
import { spacing } from "../theme/theme";
import { useAppTheme } from "../theme/ThemeProvider";
import { GlassCard } from "./GlassCard";

export function EventCard({ event, onPress, compact = false }: { event: EventItem; onPress?: () => void; compact?: boolean }) {
  const { theme } = useAppTheme();
  const parsedDate = new Date(event.date);
  const hasCalendarDate = !Number.isNaN(parsedDate.getTime());
  const dateLabel = hasCalendarDate
    ? parsedDate.toLocaleDateString("en-CA", { month: "short" })
    : event.date.includes("July-August")
      ? "Summer"
      : event.date.split(" ")[0];
  const dayLabel = hasCalendarDate ? String(parsedDate.getDate()) : event.date.match(/\d{4}/)?.[0] ?? "";
  const timeLabel = event.endTime ? `${event.startTime} - ${event.endTime}` : event.startTime;
  const imagePath = event.image ? publicEventImagePath(event.image) : undefined;
  const image = event.image ? eventPhotoAssets[event.image as keyof typeof eventPhotoAssets] ?? { uri: imagePath?.startsWith("https://") ? imagePath : `https://hbic.ca${imagePath}` } : undefined;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `${event.title}, ${event.date}, ${timeLabel}` : undefined}
      accessibilityHint={onPress ? "Opens event details" : undefined}
      disabled={!onPress}
    >
      <GlassCard tone={event.category === "Youth" ? "gold" : "light"} style={styles.card}>
        {image && (event.id === "event-quran-academy" || event.lifecycle === "completed") ? <Image source={image} resizeMode="contain" style={{ width: "100%", aspectRatio: 4 / 5, borderRadius: 16, marginBottom: 14 }} /> : null}
        <View style={styles.row}>
          <View style={[styles.datePill, { backgroundColor: theme.colors.navy }]}>
            <Text style={[styles.month, { color: theme.colors.gold }]} numberOfLines={1}>{dateLabel}</Text>
            <Text style={styles.day} numberOfLines={1} adjustsFontSizeToFit>{dayLabel || "Event"}</Text>
          </View>
          <View style={styles.copy}>
            <View style={styles.categoryRow}>
              <Text style={[styles.category, { color: theme.colors.teal }]}>{event.lifecycle === "completed" ? "Completed" : event.category}</Text>
              {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.colors.subtle} /> : null}
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={compact ? 1 : 2}>{event.title}</Text>
            <Text style={[styles.description, { color: theme.colors.muted }]} numberOfLines={compact ? 2 : 3}>{event.description}</Text>
            <Text style={[styles.meta, { color: theme.colors.teal }]} numberOfLines={compact ? 1 : 2}>
              {event.lifecycle === "completed" ? event.date : timeLabel} · {event.location}
            </Text>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm
  },
  row: {
    flexDirection: "row",
    gap: spacing.md
  },
  datePill: {
    width: 62,
    minHeight: 76,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  month: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  day: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900"
  },
  copy: {
    flex: 1,
    gap: 4
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  category: {
    fontWeight: "900",
    fontSize: 12
  },
  title: {
    fontWeight: "900",
    fontSize: 18
  },
  description: {
    lineHeight: 19
  },
  meta: {
    fontWeight: "800",
    marginTop: 4
  }
});
