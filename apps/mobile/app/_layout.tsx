import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LanguageProvider } from "../src/i18n/LanguageProvider";
import { OnboardingExperience } from "../src/onboarding/OnboardingExperience";
import { OnboardingProvider, useOnboarding } from "../src/onboarding/OnboardingProvider";
import { PublishedContentProvider, usePublishedContent } from "../src/services/content";
import {
  ensureNotificationChannelsAsync,
  loadNotificationPreferences,
  recordRemoteNotificationReceivedAsync,
  refreshPushRegistrationAsync,
  resolveNotificationDestination
} from "../src/services/notifications";
import { ThemeProvider, useAppTheme } from "../src/theme/ThemeProvider";
import { MacAppFrame } from "../src/components/MacAppFrame";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <OnboardingProvider>
            <PublishedContentProvider>
              <AppShell />
            </PublishedContentProvider>
          </OnboardingProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { theme, resolvedMode } = useAppTheme();
  const { active: onboardingActive } = useOnboarding();
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  return (
    <>
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
      {!onboardingActive ? <NotificationRouter /> : null}
      <MacAppFrame><Stack
        initialRouteName="(tabs)"
        screenOptions={{
          headerShown: false,
          animation: reduceMotion ? "none" : "fade_from_bottom",
          contentStyle: { backgroundColor: theme.colors.background }
        }}
      /></MacAppFrame>
      <OnboardingExperience />
    </>
  );
}

function NotificationRouter() {
  const router = useRouter();
  const { refresh } = usePublishedContent();
  const handledIdentifier = useRef<string | null>(null);

  function refreshRegistration() {
    void loadNotificationPreferences()
      .then((preferences) => refreshPushRegistrationAsync(preferences))
      .catch((error) => {
        if (__DEV__) console.warn("Masjid Bilal push registration could not be refreshed.", error);
      });
  }

  useEffect(() => {
    function openNotification(response: Notifications.NotificationResponse | null) {
      if (!response || handledIdentifier.current === response.notification.request.identifier) return;
      handledIdentifier.current = response.notification.request.identifier;
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const destination = resolveNotificationDestination(data);
      if (data?.type === "contentUpdate" || typeof data?.contentVersion === "number") void refresh();
      router.push(destination as never);
    }

    void Notifications.getLastNotificationResponseAsync().then(openNotification);
    void ensureNotificationChannelsAsync();
    refreshRegistration();
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown> | undefined;
      void recordRemoteNotificationReceivedAsync(data);
      if (data?.type === "contentUpdate" || typeof data?.contentVersion === "number") void refresh();
    });
    const tokenSubscription = Notifications.addPushTokenListener(() => {
      refreshRegistration();
    });

    return () => {
      subscription.remove();
      receivedSubscription.remove();
      tokenSubscription.remove();
    };
  }, [refresh, router]);

  return null;
}
