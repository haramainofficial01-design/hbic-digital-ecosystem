import { Ionicons } from "@expo/vector-icons";
import { bilalTourSteps } from "@hbic/shared";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../i18n/LocalizedText";
import { useAppLanguage } from "../i18n/LanguageProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { NativeGlassSurface } from "../components/NativeGlassSurface";

export function BilalTourCard({ step, onNext, onSkip }: { step: number; onNext(): void; onSkip(): void }) {
  const { theme } = useAppTheme(), { isRtl, translate: t } = useAppLanguage(), item = bilalTourSteps[step];
  const c = theme.colors;
  return <View style={styles.host}>
    <NativeGlassSurface style={[styles.badge, { borderColor: c.borderStrong }]}><Ionicons name={step === 0 ? "chatbubble-ellipses-outline" : step === 1 ? "link-outline" : "shield-checkmark-outline"} size={34} color={c.tint} /></NativeGlassSurface>
    <View style={[styles.dots, { flexDirection: isRtl ? "row-reverse" : "row" }]} accessibilityLabel={`${step + 1} / ${bilalTourSteps.length}`}>
      {bilalTourSteps.map((_, index) => <View key={index} style={[styles.dot, { width: index === step ? 26 : 7, backgroundColor: index === step ? c.tint : c.borderStrong }]} />)}
    </View>
    <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>{item.title}</Text>
    <Text style={[styles.body, { color: c.text }]}>{item.body}</Text>
    <View style={[styles.preview, { backgroundColor: c.tintSoft, borderColor: c.border }]}><Text style={[styles.detail, { color: c.muted }]}>{item.detail}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={t(step === 2 ? "Let’s begin" : "Next")} onPress={onNext} style={[styles.primary, { backgroundColor: c.tint, flexDirection: isRtl ? "row-reverse" : "row" }]}><Text style={{ color: c.onTint, fontSize: 15, fontWeight: "700" }}>{step === 2 ? "Let’s begin" : "Next"}</Text><Ionicons name={isRtl ? "arrow-back" : "arrow-forward"} size={18} color={c.onTint} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t("Skip tour")} onPress={onSkip} style={styles.skip}><Text style={{ color: c.muted, fontSize: 13 }}>Skip tour</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  host: { padding: 25, gap: 16, width: "100%" }, badge: { alignSelf: "center", height: 76, width: 76, alignItems: "center", justifyContent: "center", borderRadius: 25, borderWidth: 1 },
  dots: { justifyContent: "center", alignItems: "center", gap: 6 }, dot: { height: 7, borderRadius: 4 },
  title: { fontSize: 27, fontWeight: "700", lineHeight: 35, textAlign: "center" }, body: { fontSize: 16, lineHeight: 25, textAlign: "center" },
  preview: { padding: 16, borderRadius: 19, borderWidth: 1 }, detail: { fontSize: 13, lineHeight: 22, textAlign: "center" },
  primary: { minHeight: 50, padding: 14, borderRadius: 17, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 }, skip: { minHeight: 44, alignItems: "center", justifyContent: "center" }
});
