import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { AppButton } from "../src/components/AppButton";
import { academyEnabled } from "../src/config/releaseFeatures";
import { useAppTheme } from "../src/theme/ThemeProvider";

const academyUrl = "https://hbic.ca/quran-academy";

/**
 * The production website and app share one Academy registration, billing and
 * pass flow. The earlier native screen is preserved outside Expo Router while
 * its Firebase/Hermes sign-in crash is repaired; it must not reach families.
 */
export default function QuranAcademyScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const webView = useRef<WebView>(null);
  const checkoutActive = useRef(false);
  const [error, setError] = useState(false);

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
        onShouldStartLoadWithRequest={(request) => allowNavigation(request.url)}
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
