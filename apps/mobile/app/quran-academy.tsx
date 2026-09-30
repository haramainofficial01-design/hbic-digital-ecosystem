import * as Linking from "expo-linking";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import { AppButton } from "../src/components/AppButton";
import { academyEnabled } from "../src/config/releaseFeatures";
import { reconcileAcademyCashReminders } from "../src/services/academyReminders";
import { registerForPushNotificationsAsync } from "../src/services/notifications";
import { useAppTheme } from "../src/theme/ThemeProvider";

const academyUrl = "https://hbic.ca/quran-academy";
const academyPushPreferenceFile = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}academy-push-opt-in.txt` : null;

async function academyPushOptedIn() {
  if (!academyPushPreferenceFile) return false;
  try { return (await FileSystem.readAsStringAsync(academyPushPreferenceFile)).trim() === "yes"; }
  catch { return false; }
}

async function saveAcademyPushOptIn(value: boolean) {
  if (academyPushPreferenceFile) await FileSystem.writeAsStringAsync(academyPushPreferenceFile, value ? "yes" : "no");
}

/**
 * The production website and app share one Academy registration, billing and
 * pass flow. The earlier native screen is preserved outside Expo Router while
 * its Firebase/Hermes sign-in crash is repaired; it must not reach families.
 */
export default function QuranAcademyScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const webView = useRef<WebView>(null);
  const academyPushToken = useRef<string | null>(null);
  const checkoutActive = useRef(false);
  const [error, setError] = useState(false);

  function reportPushResult(message: string) {
    webView.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent("hbicAcademyPushResult", {detail:${JSON.stringify({ message })}})); true;`);
  }

  async function updateAcademyDevice(idToken: string, requestPermission: boolean) {
    if (!requestPermission && !(await academyPushOptedIn())) return;
    try {
      const pushToken = await registerForPushNotificationsAsync({ requestPermission });
      if (!pushToken) {
        if (requestPermission) reportPushResult("Notifications are off. Enable them in your phone settings to receive Academy updates.");
        return;
      }
      const response = await fetch("https://hbic.ca/api/academy/device", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ token: pushToken, platform: Platform.OS, reminderDelivery: "server" })
      });
      if (!response.ok) throw new Error("Academy device registration failed");
      academyPushToken.current = pushToken;
      await saveAcademyPushOptIn(true);
      await reconcileAcademyCashReminders(null);
      if (requestPermission) reportPushResult("Academy app updates are enabled on this device.");
    } catch {
      if (requestPermission) reportPushResult("App updates could not be enabled. Please try again.");
    }
  }

  async function removeAcademyDevice(idToken: string) {
    try {
      const pushToken = academyPushToken.current ?? (await academyPushOptedIn() ? await registerForPushNotificationsAsync({ requestPermission: false }) : null);
      if (pushToken) await fetch("https://hbic.ca/api/academy/device", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ token: pushToken })
      });
    } catch { /* Signing out still clears local Academy reminders. */ }
    academyPushToken.current = null;
    await saveAcademyPushOptIn(false);
    await reconcileAcademyCashReminders(null);
  }

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const source = new URL(event.nativeEvent.url);
      if (source.protocol !== "https:" || !["hbic.ca", "www.hbic.ca"].includes(source.hostname) || source.pathname !== "/quran-academy") return;
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; token?: string };
      if (typeof message.token !== "string" || message.token.length < 100 || message.token.length > 5000) return;
      if (message.type === "academy-session") void updateAcademyDevice(message.token, false);
      if (message.type === "academy-enable-updates") void updateAcademyDevice(message.token, true);
      if (message.type === "academy-sign-out") void removeAcademyDevice(message.token);
    } catch { /* Ignore invalid or unrelated WebView messages. */ }
  }

  function allowNavigation(url: string) {
    if (url === "about:blank") return true;
    try {
      const target = new URL(url);
      if (target.protocol === "https:" && (target.hostname === "hbic.ca" || target.hostname === "www.hbic.ca")) {
        checkoutActive.current = false;
        return true;
      }
      if (target.protocol === "https:" && (target.hostname === "checkout.stripe.com" || checkoutActive.current)) {
        checkoutActive.current = true;
        return true;
      }
      if (["https:", "tel:", "mailto:"].includes(target.protocol)) void Linking.openURL(url);
    } catch { /* Invalid links are never opened. */ }
    return false;
  }

  if (!academyEnabled) return <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}><View style={styles.fallback}><Text style={{ color: theme.colors.text }}>Quran Academy is not available in this build.</Text><AppButton label="Back" onPress={() => router.back()} /></View></SafeAreaView>;

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]} edges={["top", "bottom"]}>
    <View style={[styles.toolbar, { borderColor: theme.colors.border }]}>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <Text style={[styles.title, { color: theme.colors.text }]}>Quran Academy</Text>
      <AppButton label="Refresh" icon="refresh" variant="ghost" onPress={() => { setError(false); webView.current?.reload(); }} />
    </View>
    <Text style={[styles.note, { color: theme.colors.muted }]}>Register, manage tuition and show your Academy pass here. Card payment opens secure Stripe Checkout; HBIC never sees your card number.</Text>
    {error ? <View style={styles.fallback}><Text style={{ color: theme.colors.text }}>The Academy page could not load here.</Text><AppButton label="Try again" onPress={() => { setError(false); webView.current?.reload(); }} /><AppButton label="Open hbic.ca" variant="ghost" onPress={() => void Linking.openURL(academyUrl)} /></View> :
      <WebView ref={webView} source={{ uri: academyUrl }} originWhitelist={["https://*"]}
        javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled
        // Firebase Auth loads a background iframe on its own auth domain.
        // Only route top-frame links; opening that iframe in Safari shows a
        // blank page and interrupts the parent registration flow.
        onShouldStartLoadWithRequest={(request) => request.isTopFrame === false || allowNavigation(request.url)}
        onMessage={handleMessage}
        onOpenWindow={(event) => { const url = event.nativeEvent.targetUrl; if (url) void Linking.openURL(url); }}
        onError={() => setError(true)}
        startInLoadingState renderLoading={() => <ActivityIndicator size="large" color={theme.colors.teal} style={styles.loader} />}
        style={styles.webview} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { minHeight: 60, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  title: { fontSize: 16, fontWeight: "800" },
  note: { fontSize: 12, lineHeight: 17, paddingHorizontal: 16, paddingVertical: 8 },
  webview: { flex: 1 },
  loader: { flex: 1 },
  fallback: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 }
});
