import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { AppButton } from "../src/components/AppButton";
import { useAppTheme } from "../src/theme/ThemeProvider";

const adminOrigin = "https://hbic-calgary-admin.vercel.app";

/** Reuse the responsive, approved-account admin product without sharing app credentials. */
export default function AdminDashboardScreen() {
  const router = useRouter();
  const webView = useRef<WebView>(null);
  const { theme } = useAppTheme();
  const [error, setError] = useState(false);

  function allowNavigation(url: string) {
    if (url === "about:blank" || url === adminOrigin || url.startsWith(`${adminOrigin}/`) || url.startsWith(`${adminOrigin}?`)) return true;
    try {
      const target = new URL(url);
      if (["https:", "tel:", "mailto:"].includes(target.protocol)) void Linking.openURL(url);
    } catch { /* Ignore invalid or unsafe navigation. */ }
    return false;
  }

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]} edges={["top", "bottom"]}>
    <View style={[styles.toolbar, { borderColor: theme.colors.border }]}>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <Text style={[styles.title, { color: theme.colors.text }]}>Staff admin</Text>
      <AppButton label="Reload" icon="refresh" variant="ghost" onPress={() => { setError(false); webView.current?.reload(); }} />
    </View>
    <Text style={[styles.note, { color: theme.colors.muted }]}>Authorized HBIC staff only. Sign in securely on the admin page; your password is not shared with the app.</Text>
    {error ? <View style={styles.fallback}><Text style={{ color: theme.colors.text }}>The admin dashboard could not load here.</Text><AppButton label="Open secure admin website" onPress={() => void Linking.openURL(adminOrigin)} /></View> :
      <WebView ref={webView} source={{ uri: adminOrigin }} originWhitelist={["https://*"]}
        javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled
        onShouldStartLoadWithRequest={(request) => request.isTopFrame === false || allowNavigation(request.url)}
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
  loader: { flex: 1, justifyContent: "center" },
  fallback: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 }
});
