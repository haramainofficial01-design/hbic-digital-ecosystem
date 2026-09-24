import { Ionicons } from "@expo/vector-icons";
import { getNextPrayerFocus } from "@hbic/shared";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "../components/AppButton";
import { GlassCard } from "../components/GlassCard";
import { NativeGlassSurface } from "../components/NativeGlassSurface";
import { PrayerHero } from "../components/PrayerHero";
import { brandAssets, photoAssets } from "../constants/assets";
import { useAppLanguage } from "../i18n/LanguageProvider";
import { usePublishedContent } from "../services/content";
import { registerForPushNotificationsAsync } from "../services/notifications";
import { radii, spacing } from "../theme/theme";
import { useAppTheme } from "../theme/ThemeProvider";
import { useOnboarding } from "./OnboardingProvider";

const pageCount = 6;

type PermissionState = "idle" | "requesting" | "enabled" | "declined" | "error";

export function OnboardingExperience() {
  const { active, initialStep, replaying, saveProgress, complete, cancelReplay } = useOnboarding();
  const { theme } = useAppTheme();
  const { language, t } = useAppLanguage();
  const { content } = usePublishedContent();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const interactionLocked = useRef(false);
  const [step, setStep] = useState(initialStep);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>("idle");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setStep(initialStep);
    requestAnimationFrame(() => pager.current?.scrollTo({ x: initialStep * width, animated: false }));
  }, [initialStep, width]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  const haptic = useCallback((kind: "selection" | "success" = "selection") => {
    const promise = kind === "success"
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.selectionAsync();
    void promise.catch(() => undefined);
  }, []);

  const goTo = useCallback((nextStep: number) => {
    if (interactionLocked.current) return;
    interactionLocked.current = true;
    const bounded = Math.max(0, Math.min(pageCount - 1, nextStep));
    setStep(bounded);
    pager.current?.scrollTo({ x: bounded * width, animated: !reduceMotion });
    void saveProgress(bounded);
    haptic();
    setTimeout(() => {
      interactionLocked.current = false;
    }, reduceMotion ? 120 : 420);
  }, [haptic, reduceMotion, saveProgress, width]);

  const finish = useCallback(() => {
    if (interactionLocked.current) return;
    interactionLocked.current = true;
    haptic("success");
    void complete().finally(() => {
      interactionLocked.current = false;
    });
  }, [complete, haptic]);

  const enableNotifications = useCallback(async () => {
    if (permissionState === "requesting") return;
    setPermissionState("requesting");
    try {
      const token = await registerForPushNotificationsAsync({ requestPermission: true });
      setPermissionState(token ? "enabled" : "declined");
      if (token) haptic("success");
    } catch {
      setPermissionState("error");
    }
  }, [haptic, permissionState]);

  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextStep = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
    if (nextStep !== step) {
      setStep(nextStep);
      void saveProgress(nextStep);
      haptic();
    }
  }, [haptic, saveProgress, step, width]);

  const announcement = content.announcements[0];
  const event = content.events[0];
  const watchFocus = getNextPrayerFocus(content.prayerTime, content.iqamahTime, now);
  const notificationStatus = useMemo(() => {
    if (permissionState === "requesting") return "Waiting for your device…";
    if (permissionState === "enabled") return "Notifications are enabled on this device.";
    if (permissionState === "declined") return "Not enabled. You can change this later in Settings.";
    if (permissionState === "error") return "Permission was handled, but registration could not finish. You can retry in Settings.";
    return "You choose whether to enable them. Nothing is requested until you tap Enable notifications.";
  }, [permissionState]);

  if (!active) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: theme.colors.background }]} accessibilityViewIsModal>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]} accessibilityLabel={`Step ${step + 1} of ${pageCount}`}>
            <View style={[styles.progressFill, { width: `${((step + 1) / pageCount) * 100}%`, backgroundColor: theme.colors.gold }]} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={replaying ? "Close introduction" : "Skip introduction"}
            onPress={replaying ? cancelReplay : finish}
            hitSlop={12}
          >
            <Text style={[styles.skip, { color: theme.colors.text }]}>{replaying ? "Close" : "Skip"}</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          contentOffset={{ x: initialStep * width, y: 0 }}
          keyboardShouldPersistTaps="handled"
          accessibilityLabel="Masjid Bilal introduction"
        >
          <OnboardingPage width={width}>
            <View style={styles.heroImageWrap}>
              <Image source={photoAssets.exterior} style={styles.heroImage} resizeMode="cover" accessibilityLabel="Hazrat Bilal Islamic Centre" />
              <View style={styles.heroScrim} />
              <Image source={brandAssets.appMark} style={styles.logo} accessibilityLabel="Masjid Bilal logo" />
            </View>
            <Kicker>HAZRAT BILAL ISLAMIC CENTRE</Kicker>
            <PageTitle>Welcome to Masjid Bilal</PageTitle>
            <PageBody>Prayer and iqamah times, Jumu&apos;ah, community updates, events, giving, and media—connected to the masjid from one trusted place.</PageBody>
          </OnboardingPage>

          <OnboardingPage width={width}>
            <Kicker>LIVE FROM THE MASJID</Kicker>
            <PageTitle>Prayer &amp; iqamah</PageTitle>
            <PageBody>The same resolved HBIC schedule powers the app, website, TV, Watch, widgets, and complications.</PageBody>
            <PrayerHero />
          </OnboardingPage>

          <OnboardingPage width={width}>
            <Kicker>COMMUNITY</Kicker>
            <PageTitle>What&apos;s happening at HBIC</PageTitle>
            <PageBody>Announcements and events update from the masjid&apos;s published content—there is no separate tutorial-only feed.</PageBody>
            <GlassCard tone="teal" style={styles.featureCard}>
              <Ionicons name="megaphone-outline" size={28} color={theme.colors.teal} />
              <Text style={[styles.cardEyebrow, { color: theme.colors.teal }]}>LATEST ANNOUNCEMENT</Text>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{announcement?.title ?? "No active announcement"}</Text>
              <Text style={[styles.cardBody, { color: theme.colors.muted }]}>{announcement?.body ?? "Published updates will appear here automatically."}</Text>
            </GlassCard>
            <GlassCard style={styles.featureCard}>
              <Ionicons name="calendar-outline" size={28} color={theme.colors.gold} />
              <Text style={[styles.cardEyebrow, { color: theme.colors.gold }]}>UPCOMING</Text>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{event?.title ?? "No upcoming event"}</Text>
              <Text style={[styles.cardBody, { color: theme.colors.muted }]}>{event ? `${event.date} · ${event.startTime} · ${event.location}` : "New events will appear after HBIC publishes them."}</Text>
            </GlassCard>
          </OnboardingPage>

          <OnboardingPage width={width}>
            <Kicker>{Platform.OS === "ios" ? "APPLE WATCH & WIDGETS" : "WEAR OS & WIDGETS"}</Kicker>
            <PageTitle>{Platform.OS === "ios" ? "At a glance" : "Your prayers. Right on your wrist."}</PageTitle>
            <PageBody>{Platform.OS === "ios" ? "See the next prayer from Apple Watch, Home Screen widgets, Lock Screen widgets, and complications." : "See the next prayer from the Wear OS app, tile, complications, and supported Android surfaces."}</PageBody>
            <View style={styles.watchStage}>
              <View style={[styles.watchBody, { borderColor: theme.colors.subtle, backgroundColor: theme.colors.deepNavy }]}>
                <Image source={brandAssets.appMark} style={styles.watchLogo} />
                <Text style={styles.watchLabel}>{watchFocus?.kind === "iqamah" ? "IQAMAH NEXT" : "UP NEXT"}</Text>
                <Text style={styles.watchPrayer}>{watchFocus ? t(watchFocus.name) : "—"}</Text>
                <Text style={styles.watchTime}>{watchFocus?.time || "—"}</Text>
                <Text style={styles.watchIqamah}>
                  {watchFocus?.kind === "iqamah"
                    ? `${t("adhan")} ${watchFocus.adhanTime}`
                    : `${t("iqamah")} ${watchFocus?.iqamahTime || "—"}`}
                </Text>
              </View>
            </View>
            <Text style={[styles.detailNote, { color: theme.colors.muted }]}>Times come from the same cached canonical schedule, with a visible stale state when fresh data is unavailable.</Text>
            {Platform.OS === "android" ? (
              <View style={styles.watchActions}>
                <AppButton
                  label="Set Up My Watch"
                  icon="watch-outline"
                  onPress={() => {
                    void Linking.openURL("market://details?id=ca.hbic.calgary.app").catch(() =>
                      Linking.openURL("https://play.google.com/store/apps/details?id=ca.hbic.calgary.app")
                    );
                  }}
                />
              </View>
            ) : null}
          </OnboardingPage>

          <OnboardingPage width={width}>
            <View style={[styles.notificationIcon, { backgroundColor: theme.colors.tintSoft }]}>
              <Ionicons name="notifications-outline" size={42} color={theme.colors.teal} />
            </View>
            <Kicker>YOUR CHOICE</Kicker>
            <PageTitle>Timely prayer reminders</PageTitle>
            <PageBody>HBIC can send prayer, iqamah, Jumu&apos;ah, urgent, event, and community updates. You can choose categories and prayer-alert sound in Settings.</PageBody>
            <Text style={[styles.permissionStatus, { color: permissionState === "error" ? theme.colors.danger : theme.colors.muted }]} accessibilityLiveRegion="polite">
              {notificationStatus}
            </Text>
            <AppButton
              label={permissionState === "enabled" ? "Notifications enabled" : permissionState === "requesting" ? "Enabling…" : "Enable notifications"}
              icon={permissionState === "enabled" ? "checkmark-circle" : "notifications"}
              disabled={permissionState === "requesting" || permissionState === "enabled"}
              onPress={() => void enableNotifications()}
            />
            <AppButton label="Not now" variant="ghost" onPress={() => goTo(5)} />
          </OnboardingPage>

          <OnboardingPage width={width} centered>
            <View style={[styles.doneIcon, { backgroundColor: theme.colors.tintSoft, borderColor: theme.colors.borderStrong }]}>
              <Ionicons name="checkmark" size={52} color={theme.colors.teal} />
            </View>
            <Kicker>ALL SET</Kicker>
            <PageTitle>Masjid Bilal is ready</PageTitle>
            <PageBody>Open the Home screen for today&apos;s prayer schedule and the latest published community information.</PageBody>
            {language === "ur" ? <Text style={[styles.detailNote, { color: theme.colors.muted }]}>{t("englishContentFallback")}</Text> : null}
          </OnboardingPage>
        </ScrollView>

        <NativeGlassSurface style={styles.controls} interactive>
          <AppButton
            label="Back"
            icon="chevron-back"
            variant="ghost"
            disabled={step === 0}
            onPress={() => goTo(step - 1)}
            style={styles.controlButton}
          />
          <Text style={[styles.stepLabel, { color: theme.colors.muted }]}>{step + 1} / {pageCount}</Text>
          <AppButton
            label={step === pageCount - 1 ? "Go to Home" : "Next"}
            icon={step === pageCount - 1 ? "home" : "chevron-forward"}
            onPress={step === pageCount - 1 ? finish : () => goTo(step + 1)}
            style={styles.controlButton}
          />
        </NativeGlassSurface>
      </SafeAreaView>
    </View>
  );
}

function OnboardingPage({ children, width, centered = false }: { children: React.ReactNode; width: number; centered?: boolean }) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={[styles.page, centered && styles.centeredPage]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {children}
    </ScrollView>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return <Text style={[styles.kicker, { color: theme.colors.gold }]}>{children}</Text>;
}

function PageTitle({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return <Text style={[styles.pageTitle, { color: theme.colors.text }]}>{children}</Text>;
}

function PageBody({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return <Text style={[styles.pageBody, { color: theme.colors.muted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000
  },
  safe: { flex: 1 },
  topBar: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden"
  },
  progressFill: { height: "100%", borderRadius: 2 },
  skip: { fontSize: 16, fontWeight: "800", paddingVertical: 8 },
  page: {
    flexGrow: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 128,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center"
  },
  centeredPage: { justifyContent: "center", alignItems: "center" },
  heroImageWrap: {
    height: 260,
    borderRadius: radii.xl,
    overflow: "hidden",
    backgroundColor: "#062238"
  },
  heroImage: { width: "100%", height: "100%" },
  heroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,24,39,0.28)" },
  logo: {
    position: "absolute",
    left: spacing.lg,
    bottom: spacing.lg,
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: "white"
  },
  kicker: { fontSize: 13, letterSpacing: 2.1, fontWeight: "900", textAlign: "center" },
  pageTitle: { fontSize: 34, lineHeight: 39, fontWeight: "900", textAlign: "center" },
  pageBody: { fontSize: 17, lineHeight: 25, textAlign: "center", maxWidth: 620, alignSelf: "center" },
  featureCard: { gap: spacing.sm },
  cardEyebrow: { fontSize: 12, letterSpacing: 1.4, fontWeight: "900" },
  cardTitle: { fontSize: 21, lineHeight: 27, fontWeight: "900" },
  cardBody: { fontSize: 15, lineHeight: 22 },
  watchStage: { alignItems: "center", paddingVertical: spacing.md },
  watchBody: {
    width: 220,
    minHeight: 250,
    borderRadius: 60,
    borderWidth: 7,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 5
  },
  watchLogo: { width: 40, height: 40, borderRadius: 12, backgroundColor: "white", marginBottom: 4 },
  watchLabel: { color: "#C6D4DB", fontSize: 11, letterSpacing: 1.5, fontWeight: "900" },
  watchPrayer: { color: "#FFFFFF", fontSize: 34, fontWeight: "900" },
  watchTime: { color: "#E7C66B", fontSize: 27, fontWeight: "900" },
  watchIqamah: { color: "#DDE8EC", fontSize: 15, fontWeight: "700" },
  watchActions: { gap: spacing.sm },
  detailNote: { fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 560 },
  notificationIcon: { width: 84, height: 84, borderRadius: 28, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  permissionStatus: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  doneIcon: { width: 110, height: 110, borderRadius: 40, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  controls: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.sm,
    minHeight: 74,
    borderRadius: 28,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    overflow: "hidden"
  },
  controlButton: { flex: 1, minHeight: 52, paddingHorizontal: spacing.sm },
  stepLabel: { fontSize: 13, fontWeight: "800", minWidth: 38, textAlign: "center" }
});
