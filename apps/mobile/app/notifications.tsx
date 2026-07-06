import { defaultNotificationPreferences, notificationCategories, type NotificationPreference } from "@hbic/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import {
  loadNotificationPreferences,
  registerForPushNotificationsAsync,
  saveNotificationPreferences
} from "../src/services/notifications";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

type BooleanPreferenceKey = {
  [K in keyof NotificationPreference]: NotificationPreference[K] extends boolean ? K : never;
}[keyof NotificationPreference];

const preferenceRows: { key: BooleanPreferenceKey; title: string; subtitle: string }[] = [
  { key: "prayerReminders", title: "Prayer reminders", subtitle: "Adhan reminders when enabled." },
  { key: "iqamahReminders", title: "Iqamah reminders", subtitle: "Default 10 minutes before iqamah." },
  { key: "jumuahReminders", title: "Jumu'ah reminders", subtitle: "Friday schedule and parking reminders." },
  { key: "announcements", title: "Announcements", subtitle: "General HBIC notices." },
  { key: "urgentAnnouncements", title: "Urgent notices", subtitle: "Closures, weather, safety, and important updates." },
  { key: "eventReminders", title: "Events", subtitle: "Community events and halaqah reminders." },
  { key: "programReminders", title: "Programs", subtitle: "Qur'an, classes, and regular program updates." },
  { key: "youthPrograms", title: "HBIC Youth", subtitle: "Youth reminders and program updates." },
  { key: "sistersPrograms", title: "Sisters' programs", subtitle: "Sisters' program reminders." },
  { key: "mediaUpdates", title: "Media updates", subtitle: "New clips, reminders, and recitations." },
  { key: "livestreamAlerts", title: "Livestream alerts", subtitle: "Live or newly available video notices." },
  { key: "volunteerOpportunities", title: "Volunteer calls", subtitle: "Help needed for events and Jumu'ah." },
  { key: "donationAppeals", title: "Donation appeals", subtitle: "Fundraising reminders. Off by default." }
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [preferences, setPreferences] = useState<NotificationPreference>(defaultNotificationPreferences);
  const [status, setStatus] = useState("Choose the HBIC updates you want to receive on this device.");

  useEffect(() => {
    loadNotificationPreferences().then(setPreferences);
  }, []);

  function toggle(key: BooleanPreferenceKey) {
    setPreferences((current) => {
      const next = { ...current, [key]: !current[key] };
      saveNotificationPreferences(next).catch(() => undefined);
      return next;
    });
  }

  async function register() {
    try {
      const token = await registerForPushNotificationsAsync();
      setStatus(token ? "Notifications are enabled for this device." : "Permission was not granted on this device.");
    } catch {
      setStatus("Notifications are not available on this device right now.");
    }
  }

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title="Notifications" subtitle="Prayer, iqamah, events, media, urgent notices, and local reminder preferences." />

      <GlassCard tone="navy">
        <Text style={styles.darkTitle}>Push setup</Text>
        <Text style={styles.darkBody}>{status}</Text>
        <AppButton label="Enable Notifications" icon="notifications" onPress={register} style={styles.button} />
      </GlassCard>

      <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>Preferences</Text>
        {preferenceRows.map((row) => (
          <View key={row.key} style={[styles.toggleRow, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.flex}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{row.title}</Text>
              <Text style={[styles.body, { color: theme.colors.muted }]}>{row.subtitle}</Text>
            </View>
            <Switch
              value={Boolean(preferences[row.key])}
              onValueChange={() => toggle(row.key)}
              trackColor={{ false: theme.colors.borderStrong, true: theme.colors.tintSoft }}
              thumbColor={preferences[row.key] ? theme.colors.teal : theme.colors.subtle}
            />
          </View>
        ))}
        <Text style={[styles.body, { color: theme.colors.muted, marginTop: spacing.md }]}>
          Iqamah reminder lead time: {preferences.minutesBeforeIqamah} minutes.
        </Text>
      </GlassCard>

      <SectionHeader title="Notification Types" subtitle="HBIC uses these categories for respectful community updates." />
      {notificationCategories.map((category) => (
        <GlassCard key={category.type} compact>
          <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{category.label}</Text>
          <Text style={[styles.body, { color: theme.colors.muted }]}>{category.description}</Text>
          <Text style={[styles.meta, { color: theme.colors.teal }]}>Opens {category.route} · {category.defaultAudience}</Text>
        </GlassCard>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  darkTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900"
  },
  darkBody: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 22,
    marginTop: 8
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: spacing.sm
  },
  button: {
    marginTop: spacing.md
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  flex: {
    flex: 1
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "900"
  },
  body: {
    lineHeight: 20
  },
  meta: {
    marginTop: 6,
    fontWeight: "900"
  }
});
