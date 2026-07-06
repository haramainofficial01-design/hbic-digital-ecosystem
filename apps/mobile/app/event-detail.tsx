import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { eventPhotoAssets, photoAssets } from "../src/constants/assets";
import { usePublishedContent } from "../src/services/content";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme } = useAppTheme();
  const { content } = usePublishedContent();
  const event = content.events.find((item) => item.id === id) ?? content.events[0];
  const image = eventPhotoAssets[event.image as keyof typeof eventPhotoAssets] ?? photoAssets.exterior;

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <Image source={image} style={styles.heroImage} />
      <SectionHeader title={event.title} subtitle={`${event.category} · ${event.audience}`} />
      <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>Details</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>{event.description}</Text>
      </GlassCard>
      <GlassCard tone="teal">
        <Text style={[styles.title, { color: theme.colors.text }]}>Schedule</Text>
        <DetailRow label="Date" value={event.date} />
        <DetailRow label="Time" value={event.endTime ? `${event.startTime} - ${event.endTime}` : event.startTime} />
        <DetailRow label="Location" value={event.location} />
        <DetailRow label="Led by" value={event.speaker} />
      </GlassCard>
      <View style={styles.actions}>
        <AppButton
          label={event.registrationLink ? "Register / Contact" : "Email HBIC"}
          icon="mail"
          onPress={() => Linking.openURL(event.registrationLink || `mailto:${content.settings.email}?subject=${encodeURIComponent(event.title)}`)}
          style={styles.flex}
        />
        <AppButton label="Notifications" icon="notifications" variant="secondary" onPress={() => router.push("/notifications" as never)} style={styles.flex} />
      </View>
    </AppScreen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.detailRow, { borderBottomColor: theme.colors.border }]}>
      <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroImage: {
    width: "100%",
    height: 250,
    borderRadius: 28
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8
  },
  body: {
    lineHeight: 22
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  label: {
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase"
  },
  value: {
    fontWeight: "900",
    marginTop: 3
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  flex: {
    flex: 1
  }
});
