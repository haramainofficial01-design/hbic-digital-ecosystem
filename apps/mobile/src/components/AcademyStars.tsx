import { useEffect, useState } from "react";
import { AppState, Linking, StyleSheet, View, useWindowDimensions } from "react-native";
import { academyStarMonthLabel, getAcademyStarMonths, type AcademyStarMonth } from "@hbic/shared";
import { Text, Image } from "../i18n/LocalizedText";
import { useAppLanguage } from "../i18n/LanguageProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppButton } from "./AppButton";

const origin = (process.env.EXPO_PUBLIC_API_URL || "https://hbic.ca").replace(/\/$/, "");
export function AcademyStars({ months, onRegister }: { months: AcademyStarMonth[]; onRegister: () => void }) {
  const { theme } = useAppTheme(), { language } = useAppLanguage(), { width } = useWindowDimensions();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const at = Math.min(...months.map(row => Date.parse(row.photosUntil || "")).filter(at => at > Date.now()));
    const timer = Number.isFinite(at) ? setTimeout(() => setNow(new Date()), Math.min(2_147_483_647, at - Date.now() + 30)) : undefined;
    const subscription = AppState.addEventListener("change", state => { if (state === "active") setNow(new Date()); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [months, now]);
  const rows = getAcademyStarMonths(months, now);
  if (!rows.length) return null;
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.text }]}>Star of the Month</Text>
    <Text style={[styles.academy, { color: theme.colors.muted }]}>HBIC Qur’an Academy</Text>
    {rows.map(row => <View key={row.month} style={styles.month}>
      <Text accessibilityRole="header" style={[styles.monthTitle, { color: theme.colors.teal }]}>{academyStarMonthLabel(row.month, language)}</Text>
      <View style={[styles.students, width >= 700 && styles.wide]}>{row.winners.map(w => <View key={w.side} style={styles.student}>
        <Text style={[styles.name, { color: theme.colors.text }]}>{w.name}</Text>
        {w.photoUrl ? <Image source={{ uri: `${origin}${w.photoUrl}` }} style={[styles.photo, { backgroundColor: theme.colors.cardStrong }]} resizeMode="cover" accessibilityLabel={`${w.name}, Star of the Month`} /> : null}
      </View>)}</View>
      {row.highlightUrl ? <AppButton label="Watch the class celebration" icon="play-circle-outline" variant="secondary" onPress={() => void Linking.openURL(row.highlightUrl!)} /> : null}
    </View>)}
    <AppButton label="Register for HBIC Qur’an Academy" icon="school-outline" onPress={onRegister} />
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 8, paddingVertical: 16 }, title: { fontSize: 30, lineHeight: 37, fontWeight: "800" },
  academy: { fontSize: 15, lineHeight: 22 }, month: { gap: 16, marginTop: 12, marginBottom: 16 },
  monthTitle: { fontSize: 20, lineHeight: 27, fontWeight: "700" }, students: { gap: 24 }, wide: { flexDirection: "row" },
  student: { flex: 1, minWidth: 0, gap: 10 }, name: { fontSize: 23, lineHeight: 30, fontWeight: "700" },
  photo: { width: "100%", aspectRatio: 6 / 7, borderRadius: 16 }
});
