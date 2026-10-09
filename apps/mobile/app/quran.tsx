import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { Text } from "../src/i18n/LocalizedText";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { useAppTheme } from "../src/theme/ThemeProvider";
import { quranEnabled, quranReaderAvailable } from "../src/config/releaseFeatures";
import QuranReaderScreen from "../src/quran/QuranReaderScreen";

export default function QuranScreen() {
  // Debug builds may develop against authorized prelive access; store builds
  // still need both existing production release approvals.
  return quranReaderAvailable || (__DEV__ && quranEnabled) ? <QuranReaderScreen /> : <QuranMaintenanceScreen />;
}
function QuranMaintenanceScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  return <AppScreen>
    <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
    <GlassCard tone="navy">
      <Text style={styles.arabic}>ٱلْقُرْآنُ ٱلْكَرِيمُ</Text>
      <Text style={[styles.title, { color: theme.colors.white }]}>Quran &amp; Recite</Text>
      <Text style={styles.body}>Under maintenance — please check back soon.</Text>
    </GlassCard>
    <GlassCard>
      <Text style={[styles.note, { color: theme.colors.text }]}>This is temporary. Prayer and iqamah times remain available as usual.</Text>
      <AppButton label="Hadith Library on Sunnah.com" icon="open-outline" variant="secondary" accessibilityHint="Opens the external Sunnah.com website" onPress={() => void Linking.openURL("https://sunnah.com")} />
    </GlassCard>
  </AppScreen>;
}
const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "800", marginTop: 12, marginBottom: 8 },
  note: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
  arabic: { color: "#E7C66B", fontSize: 36, lineHeight: 58, fontWeight: "700", textAlign: "right" },
  body: { color: "rgba(255,255,255,.75)", fontSize: 14, lineHeight: 21, marginTop: 10 }
});
