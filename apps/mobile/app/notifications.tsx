import {
  createWidgetPrayerSnapshot,
  notificationCategories,
  type AdhanPrayerName,
  type NotificationPreference,
  type PrayerAlertSound,
  type PrayerReminderMinutes
} from "@hbic/shared";
import { useAudioPlayer } from "expo-audio";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { Text } from "../src/i18n/LocalizedText";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { usePublishedContent } from "../src/services/content";
import {
  adhanAudioStatus,
  getNotificationDiagnosticsAsync,
  loadNotificationSettings,
  openNotificationSystemSettingsAsync,
  reconcilePrayerNotificationsAsync,
  registerForPushNotificationsAsync,
  removePushRegistrationAsync,
  saveNotificationSettings,
  schedulePrayerNotificationTestAsync,
  type NotificationDiagnostics,
  type NotificationSettings
} from "../src/services/notifications";
import { radii, spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

type BooleanPreferenceKey = {
  [K in keyof NotificationPreference]: NotificationPreference[K] extends boolean ? K : never;
}[keyof NotificationPreference];

const prayers: { key: AdhanPrayerName; label: string }[] = [
  { key: "fajr", label: "Fajr" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" }
];

const remoteRows: { key: BooleanPreferenceKey; title: string; subtitle: string }[] = [
  { key: "announcements", title: "Announcements", subtitle: "General Masjid Bilal notices." },
  { key: "urgentAnnouncements", title: "Urgent notices", subtitle: "Closures, weather, safety, and important updates." },
  { key: "eventReminders", title: "Events", subtitle: "Confirmed community events and halaqah updates." },
  { key: "programReminders", title: "Programs", subtitle: "Qur'an, classes, and regular program updates." },
  { key: "youthPrograms", title: "HBIC Youth", subtitle: "Youth program updates and registration notices." },
  { key: "sistersPrograms", title: "Sisters' programs", subtitle: "Sisters' program updates and reminders." },
  { key: "mediaUpdates", title: "Media updates", subtitle: "New public clips and recitations." },
  { key: "volunteerOpportunities", title: "Volunteer calls", subtitle: "Help needed for confirmed events and services." },
  { key: "donationAppeals", title: "Donation appeals", subtitle: "Optional fundraising updates. Off by default." }
];

const soundOptions: { value: PrayerAlertSound; title: string; subtitle: string }[] = [
  { value: "adhan", title: "Adhan", subtitle: "Plays a short Adhan at prayer time." },
  { value: "notification", title: "Notification sound", subtitle: "Uses the normal device notification tone." },
  { value: "silent", title: "Silent", subtitle: "Shows the alert without prayer audio." }
];

const reminderOptions: PrayerReminderMinutes[] = [0, 5, 10, 15];
export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { content, source, lastUpdatedAt } = usePublishedContent();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [diagnostics, setDiagnostics] = useState<NotificationDiagnostics | null>(null);
  const [status, setStatus] = useState("Prayer alerts are optional and remain off until you choose to enable them.");
  const [busy, setBusy] = useState(false);
  const adhanPreviewPlayer = useAudioPlayer(require("../assets/audio/adhan_madinah_marwan_qassas_short.wav"));

  const selectedPrayerCount = useMemo(
    () => settings ? prayers.filter((prayer) => settings.prayer.prayers[prayer.key]).length : 0,
    [settings]
  );

  async function refreshDiagnostics() {
    const next = await getNotificationDiagnosticsAsync();
    setDiagnostics(next);
    return next;
  }

  useEffect(() => {
    void Promise.all([loadNotificationSettings(), getNotificationDiagnosticsAsync()])
      .then(([nextSettings, nextDiagnostics]) => {
        setSettings(nextSettings);
        setDiagnostics(nextDiagnostics);
      })
      .catch(() => setStatus("Notification status could not be loaded. Please try again."));
  }, []);

  async function persist(next: NotificationSettings, reconcile = false) {
    setSettings(next);
    await saveNotificationSettings(next);
    if (reconcile) {
      const snapshot = createWidgetPrayerSnapshot(content, new Date(), {
        cached: source === "cache",
        refreshedAt: lastUpdatedAt
      });
      await reconcilePrayerNotificationsAsync(snapshot);
    }
    await refreshDiagnostics();
  }

  async function enableNotifications() {
    if (!settings) return;
    setBusy(true);
    try {
      const token = await registerForPushNotificationsAsync({ preferences: settings.remote });
      if (!token) {
        const current = await refreshDiagnostics();
        setStatus(current.canAskAgain
          ? "Notifications were not enabled. You can choose Enable Notifications when ready."
          : "Notifications are disabled in system settings. Open settings to allow alerts.");
        return;
      }
      const snapshot = createWidgetPrayerSnapshot(content, new Date(), {
        cached: source === "cache",
        refreshedAt: lastUpdatedAt
      });
      await reconcilePrayerNotificationsAsync(snapshot);
      await refreshDiagnostics();
      setStatus("Notifications are enabled. Your selected prayer alerts have been reconciled on this device.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Notification setup could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeRemoteRegistration() {
    setBusy(true);
    try {
      await removePushRegistrationAsync();
      await refreshDiagnostics();
      setStatus("This device was removed from remote community notifications. Local prayer choices remain on this device.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "This device could not be removed right now.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePrayerMaster() {
    if (!settings) return;
    const enabled = !settings.prayer.enabled;
    const next = { ...settings, prayer: { ...settings.prayer, enabled } };
    try {
      await persist(next, true);
      setStatus(enabled
        ? "Prayer alerts selected. Enable system notifications above if permission is still off."
        : "Prayer alerts are off and Masjid Bilal prayer notifications were removed from the local schedule.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Prayer alert preferences could not be updated.");
    }
  }

  async function togglePrayer(prayer: AdhanPrayerName) {
    if (!settings) return;
    const next: NotificationSettings = {
      ...settings,
      prayer: {
        ...settings.prayer,
        prayers: { ...settings.prayer.prayers, [prayer]: !settings.prayer.prayers[prayer] }
      }
    };
    await persist(next, true).catch((error) => setStatus(error instanceof Error ? error.message : "Prayer choice could not be saved."));
  }

  async function chooseSound(sound: PrayerAlertSound) {
    if (!settings || (sound === "adhan" && !adhanAudioStatus.available)) return;
    const next = { ...settings, prayer: { ...settings.prayer, sound } };
    await persist(next, true).catch((error) => setStatus(error instanceof Error ? error.message : "Sound choice could not be saved."));
  }

  async function chooseReminder(reminderMinutes: PrayerReminderMinutes) {
    if (!settings) return;
    const next = { ...settings, prayer: { ...settings.prayer, reminderMinutes } };
    await persist(next, true).catch((error) => setStatus(error instanceof Error ? error.message : "Reminder choice could not be saved."));
  }

  async function toggleJumuah() {
    if (!settings) return;
    const next = { ...settings, prayer: { ...settings.prayer, jumuahReminders: !settings.prayer.jumuahReminders } };
    await persist(next, true).catch((error) => setStatus(error instanceof Error ? error.message : "Jumu'ah choice could not be saved."));
  }

  async function toggleRemote(key: BooleanPreferenceKey) {
    if (!settings) return;
    const next = { ...settings, remote: { ...settings.remote, [key]: !settings.remote[key] } };
    setSettings(next);
    try {
      await saveNotificationSettings(next);
      if (diagnostics?.remoteRegistration === "registered") {
        await registerForPushNotificationsAsync({ requestPermission: false, preferences: next.remote });
      }
      await refreshDiagnostics();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Community notification preference could not be saved.");
    }
  }

  async function refreshSchedule() {
    if (!settings) return;
    setBusy(true);
    try {
      const snapshot = createWidgetPrayerSnapshot(content, new Date(), {
        cached: source === "cache",
        refreshedAt: lastUpdatedAt
      });
      const result = await reconcilePrayerNotificationsAsync(snapshot);
      await refreshDiagnostics();
      setStatus(result.plan.status === "ready"
        ? `${result.scheduledCount} prayer alerts are scheduled from the current canonical Calgary timetable.`
        : result.plan.status === "disabled"
          ? "Prayer alerts are off. No Masjid Bilal prayer alerts are scheduled."
          : "The current snapshot is not safe to replace your existing local schedule. Existing verified alerts were preserved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The prayer schedule could not be refreshed.");
    } finally {
      setBusy(false);
    }
  }

  async function testPrayerAlert() {
    if (!settings) return;
    setBusy(true);
    try {
      const current = await refreshDiagnostics();
      if (current.permission === "denied" || current.permission === "not-determined") {
        setStatus("Enable notifications first, then run the prayer alert test.");
        return;
      }
      await schedulePrayerNotificationTestAsync(settings.prayer.sound);
      await refreshDiagnostics();
      setStatus("A clearly labelled Test Prayer Alert is scheduled in about 7 seconds.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The test prayer alert could not be scheduled.");
    } finally {
      setBusy(false);
    }
  }

  async function previewAdhan() {
    try {
      await adhanPreviewPlayer.seekTo(0);
      adhanPreviewPlayer.play();
      setStatus("Playing the Adhan preview. Device volume and Silent Mode still apply.");
    } catch {
      setStatus("The Adhan preview could not play. Check device volume and try again.");
    }
  }

  if (!settings) {
    return (
      <AppScreen>
        <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
        <SectionHeader title="Notifications" subtitle="Loading notification controls…" />
      </AppScreen>
    );
  }

  const permissionEnabled = diagnostics?.permission === "authorized" || diagnostics?.permission === "provisional";

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title="Prayer Notifications" subtitle="Reliable local prayer alerts and optional community updates, under your control." />

      <GlassCard tone="navy" style={styles.permissionCard}>
        <Text style={styles.darkEyebrow}>STAY CONNECTED TO PRAYER</Text>
        <Text style={styles.darkTitle}>Optional alerts when it is time for Salah</Text>
        <Text style={styles.darkBody}>
          Masjid Bilal schedules prayer alerts on this device using absolute Calgary prayer times. Silent Mode, Focus, Do Not Disturb, and system settings can still silence them.
        </Text>
        <View style={styles.buttonStack}>
          <AppButton
            label={busy ? "Checking…" : permissionEnabled ? "Notifications Enabled" : "Enable Notifications"}
            icon={permissionEnabled ? "checkmark-circle" : "notifications"}
            onPress={enableNotifications}
            disabled={busy || permissionEnabled}
            accessibilityHint="Requests standard alert, sound, and badge permission after this explanation"
          />
          {!permissionEnabled && diagnostics?.canAskAgain ? (
            <AppButton label="Not Now" variant="ghost" onPress={() => setStatus("No permission was requested. Prayer alerts remain off until you choose otherwise.")} />
          ) : null}
          {!permissionEnabled || diagnostics?.permission === "denied" ? (
            <AppButton label="Open System Settings" icon="settings" variant="secondary" onPress={() => openNotificationSystemSettingsAsync()} />
          ) : null}
        </View>
        <Text accessibilityRole="alert" style={styles.status}>{status}</Text>
      </GlassCard>

      <GlassCard>
        <ToggleRow
          title="Prayer notifications"
          subtitle={`Master control · ${selectedPrayerCount} prayers selected`}
          value={settings.prayer.enabled}
          onChange={togglePrayerMaster}
        />
        <Text style={[styles.explainer, { color: theme.colors.muted }]}>Prayer times remain tied to Masjid Bilal in Calgary even if you travel to another timezone.</Text>
        <View style={styles.prayerGrid}>
          {prayers.map((prayer) => (
            <Pressable
              key={prayer.key}
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.prayer.prayers[prayer.key], disabled: !settings.prayer.enabled }}
              accessibilityLabel={`${prayer.label} prayer alert`}
              disabled={!settings.prayer.enabled}
              onPress={() => togglePrayer(prayer.key)}
              style={[
                styles.prayerChoice,
                {
                  backgroundColor: settings.prayer.prayers[prayer.key] ? theme.colors.tintSoft : theme.colors.cardStrong,
                  borderColor: settings.prayer.prayers[prayer.key] ? theme.colors.borderStrong : theme.colors.border,
                  opacity: settings.prayer.enabled ? 1 : 0.55
                }
              ]}
            >
              <Text style={[styles.choiceLabel, { color: theme.colors.text }]}>{prayer.label}</Text>
              <Text style={[styles.choiceState, { color: settings.prayer.prayers[prayer.key] ? theme.colors.teal : theme.colors.subtle }]}>
                {settings.prayer.prayers[prayer.key] ? "On" : "Off"}
              </Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      <SectionHeader title="Sound" subtitle="Choose the sound used only at the actual published Adhan time." />
      <GlassCard>
        {soundOptions.map((option) => {
          const disabled = option.value === "adhan" && !adhanAudioStatus.available;
          return (
            <ChoiceRow
              key={option.value}
              title={option.title}
              subtitle={disabled ? `${option.subtitle} ${adhanAudioStatus.status}.` : option.subtitle}
              selected={settings.prayer.sound === option.value}
              disabled={disabled}
              onPress={() => chooseSound(option.value)}
            />
          );
        })}
        <View style={[styles.buttonStack, styles.topGap]}>
          <AppButton label="Preview Adhan" icon="play" variant="secondary" onPress={previewAdhan} />
        </View>
      </GlassCard>

      <SectionHeader title="Reminders" subtitle="Pre-prayer reminders use a normal notification tone, never the Adhan recording." />
      <GlassCard>
        <View accessibilityRole="radiogroup" style={styles.segmentedRow}>
          {reminderOptions.map((minutes) => {
            const selected = settings.prayer.reminderMinutes === minutes;
            return (
              <Pressable
                key={minutes}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={minutes === 0 ? "No pre-prayer reminder" : `${minutes} minutes before prayer`}
                onPress={() => chooseReminder(minutes)}
                style={[
                  styles.segment,
                  {
                    backgroundColor: selected ? theme.colors.tintSoft : theme.colors.cardStrong,
                    borderColor: selected ? theme.colors.borderStrong : theme.colors.border
                  }
                ]}
              >
                <Text style={[styles.segmentLabel, { color: selected ? theme.colors.teal : theme.colors.text }]}>{minutes === 0 ? "Off" : `${minutes}m`}</Text>
              </Pressable>
            );
          })}
        </View>
        <ToggleRow
          title="Jumu'ah reminders"
          subtitle="Separate Friday reminder preference; never treated as a regular Dhuhr Adhan."
          value={settings.prayer.jumuahReminders}
          onChange={toggleJumuah}
        />
      </GlassCard>

      <SectionHeader title="System Status" subtitle="What this device currently permits and has scheduled." />
      <GlassCard>
        <DiagnosticRow label="Notifications" value={diagnostics?.permission ?? "checking"} />
        <DiagnosticRow label="Sound permission" value={diagnostics?.soundPermission ?? "checking"} />
        <DiagnosticRow label="Prayer alerts" value={String(diagnostics?.scheduledPrayerAlerts ?? 0)} />
        <DiagnosticRow label="Next scheduled" value={formatDate(diagnostics?.nextScheduledAlert)} />
        <DiagnosticRow label="Schedule revision" value={diagnostics?.scheduleRevision ? compact(diagnostics.scheduleRevision) : "none"} />
        <DiagnosticRow label="Service date" value={diagnostics?.serviceDate ?? "none"} />
        <DiagnosticRow label="Last reconciliation" value={formatDate(diagnostics?.lastScheduleReconciliation)} />
        <DiagnosticRow label="Reconciliation result" value={diagnostics?.lastScheduleResult ?? "none"} />
        <DiagnosticRow label="Push registration" value={diagnostics?.remoteRegistration ?? "checking"} />
        {diagnostics?.maskedExpoToken ? <DiagnosticRow label="Expo token" value={diagnostics.maskedExpoToken} /> : null}
        {diagnostics?.androidChannelId ? <DiagnosticRow label="Android channel" value={diagnostics.androidChannelId} /> : null}
        {diagnostics?.androidChannelSound ? <DiagnosticRow label="Channel sound" value={diagnostics.androidChannelSound} /> : null}
        <DiagnosticRow label="Adhan audio" value={diagnostics?.adhanAudio ?? adhanAudioStatus.status} />
        <View style={styles.buttonStack}>
          <AppButton label="Test Prayer Notification" icon="notifications" onPress={testPrayerAlert} disabled={busy} />
          <AppButton label="Refresh Notification Schedule" icon="refresh" variant="secondary" onPress={refreshSchedule} disabled={busy} />
          <AppButton label="Open System Settings" icon="settings" variant="secondary" onPress={() => openNotificationSystemSettingsAsync()} />
          {diagnostics?.androidChannelId ? (
            <AppButton label="Open Prayer Channel" icon="options" variant="secondary" onPress={() => openNotificationSystemSettingsAsync(diagnostics.androidChannelId)} />
          ) : null}
        </View>
      </GlassCard>

      <SectionHeader title="Community Updates" subtitle="Remote messages for announcements, events, cancellations, and important changes." />
      <GlassCard>
        {remoteRows.map((row) => (
          <ToggleRow
            key={row.key}
            title={row.title}
            subtitle={row.subtitle}
            value={Boolean(settings.remote[row.key])}
            onChange={() => toggleRemote(row.key)}
          />
        ))}
        <View style={styles.buttonStack}>
          {diagnostics?.remoteRegistration === "registered" ? (
            <AppButton label="Remove Remote Registration" icon="notifications-off" variant="danger" onPress={removeRemoteRegistration} disabled={busy} />
          ) : (
            <AppButton label="Enable Community Notifications" icon="notifications" onPress={enableNotifications} disabled={busy} />
          )}
        </View>
      </GlassCard>

      <SectionHeader title="Notification Categories" subtitle="Remote categories available to authorized Masjid Bilal administrators." />
      {notificationCategories.map((category) => (
        <GlassCard key={category.type} compact>
          <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{category.label}</Text>
          <Text style={[styles.body, { color: theme.colors.muted }]}>{category.description}</Text>
        </GlassCard>
      ))}
    </AppScreen>
  );
}

function ToggleRow({ title, subtitle, value, onChange }: { title: string; subtitle: string; value: boolean; onChange: () => void }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.toggleRow, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>{subtitle}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.borderStrong, true: theme.colors.tintSoft }}
        thumbColor={value ? theme.colors.teal : theme.colors.subtle}
      />
    </View>
  );
}

function ChoiceRow({ title, subtitle, selected, disabled, onPress }: { title: string; subtitle: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choiceRow, { borderBottomColor: theme.colors.border, opacity: disabled ? 0.55 : 1 }]}
    >
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, { borderColor: selected ? theme.colors.teal : theme.colors.borderStrong }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: theme.colors.teal }]} /> : null}
      </View>
    </Pressable>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.diagnosticRow, { borderBottomColor: theme.colors.border }]}>
      <Text style={[styles.diagnosticLabel, { color: theme.colors.muted }]}>{label}</Text>
      <Text selectable style={[styles.diagnosticValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

function formatDate(value?: string) {
  if (!value) return "none";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function compact(value: string) {
  return value.length > 28 ? `${value.slice(0, 17)}…${value.slice(-8)}` : value;
}

const styles = StyleSheet.create({
  permissionCard: {
    gap: spacing.sm
  },
  darkEyebrow: {
    color: "#E7C66B",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1
  },
  darkTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 31
  },
  darkBody: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 22
  },
  status: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: spacing.xs
  },
  explainer: {
    lineHeight: 20,
    marginTop: spacing.sm
  },
  prayerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  prayerChoice: {
    minWidth: 92,
    flexGrow: 1,
    minHeight: 70,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm
  },
  choiceLabel: {
    fontSize: 16,
    fontWeight: "900"
  },
  choiceState: {
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 68,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 72,
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
    lineHeight: 20,
    marginTop: 3
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  segmentedRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  segment: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  segmentLabel: {
    fontWeight: "900"
  },
  diagnosticRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  diagnosticLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800"
  },
  diagnosticValue: {
    flex: 1.35,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right"
  },
  buttonStack: {
    gap: spacing.sm,
    marginTop: spacing.md
  },
  topGap: {
    marginTop: spacing.md
  }
});
