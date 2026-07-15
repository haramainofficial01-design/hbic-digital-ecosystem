import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PublishedContentProvider } from "../src/services/content";
import { refreshPushRegistrationAsync, resolveNotificationRoute } from "../src/services/notifications";
import { ThemeProvider, useAppTheme } from "../src/theme/ThemeProvider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PublishedContentProvider>
          <AppShell />
        </PublishedContentProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { theme, resolvedMode } = useAppTheme();

  return (
    <>
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
      <NotificationRouter />
      <Stack
        initialRouteName="(tabs)"
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
          contentStyle: { backgroundColor: theme.colors.background }
        }}
      />
    </>
  );
}

function NotificationRouter() {
  const router = useRouter();
  const handledIdentifier = useRef<string | null>(null);

  useEffect(() => {
    function openNotification(response: Notifications.NotificationResponse | null) {
      if (!response || handledIdentifier.current === response.notification.request.identifier) return;
      handledIdentifier.current = response.notification.request.identifier;
      const route = resolveNotificationRoute(response.notification.request.content.data as Record<string, unknown> | undefined);
      router.push(route as never);
    }

    void Notifications.getLastNotificationResponseAsync().then(openNotification);
    void refreshPushRegistrationAsync().catch(() => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    const tokenSubscription = Notifications.addPushTokenListener(() => {
      void refreshPushRegistrationAsync().catch(() => undefined);
    });

    return () => {
      subscription.remove();
      tokenSubscription.remove();
    };
  }, [router]);

  return null;
}
