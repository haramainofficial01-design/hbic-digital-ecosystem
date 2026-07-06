import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PublishedContentProvider } from "../src/services/content";
import { resolveNotificationRoute } from "../src/services/notifications";
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }} />
    </>
  );
}

function NotificationRouter() {
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = resolveNotificationRoute(response.notification.request.content.data as Record<string, unknown> | undefined);
      router.push(route as never);
    });

    return () => subscription.remove();
  }, [router]);

  return null;
}
