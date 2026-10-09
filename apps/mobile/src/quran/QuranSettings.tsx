import { Pressable, StyleSheet, Switch, View } from "react-native";
import { Text } from "../i18n/LocalizedText";
import type { QuranResources } from "@hbic/shared";
import { useAppTheme } from "../theme/ThemeProvider";
import { QuranSurface } from "./QuranControls";
import type { QuranLibrary } from "./types";
import { QuranReadingLayout } from "./QuranReadingLayout";
export function QuranSettings({ library, resources }: { library: QuranLibrary; resources: QuranResources | null }) {
  const { theme } = useAppTheme();
  const preferences = library.library.preferences;
  const save = (change: Partial<typeof preferences>) => void library.update((s) => ({ ...s, preferences: { ...s.preferences, ...change } })).catch(() => {});
  return <View style={{ gap: 14 }}>
    <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "700" }}>Reading preferences</Text>
    <QuranReadingLayout library={library} />
    <QuranSurface>
      {(["arabicSize", "translationSize"] as const).map((key) => <View key={key} style={styles.row}><Text style={{ color: theme.colors.text, flex: 1, fontSize: 16 }}>{key === "arabicSize" ? "Arabic size" : "Translation size"} · {preferences[key]}</Text>
        {[-2, 2].map((delta) => <Pressable key={delta} accessibilityRole="button" accessibilityLabel={`${delta > 0 ? "Increase" : "Decrease"} ${key === "arabicSize" ? "Arabic" : "translation"} size`} onPress={() => save({ [key]: preferences[key] + delta })} style={styles.step}><Text style={{ color: theme.colors.teal, fontSize: 22 }}>{delta > 0 ? "A+" : "A−"}</Text></Pressable>)}
      </View>)}
      <View style={styles.row}><Text style={{ color: theme.colors.text, flex: 1, fontSize: 16 }}>Show translation</Text><Switch value={preferences.showTranslation} onValueChange={(showTranslation) => save({ showTranslation })} /></View>
    </QuranSurface>
    <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "700" }}>Reference reciter</Text>
    {(resources?.reciters ?? []).map((reciter) => <Pressable key={reciter.id} accessibilityRole="radio" accessibilityState={{ checked: preferences.reciter === reciter.id }} onPress={() => save({ reciter: reciter.id })} style={[styles.choice, { backgroundColor: preferences.reciter === reciter.id ? theme.colors.tintSoft : theme.colors.cardStrong }]}><Text style={{ color: theme.colors.text, fontSize: 16 }}>{reciter.name}{reciter.style ? ` · ${reciter.style}` : ""}</Text></Pressable>)}
    {!resources?.reciters.length ? <Text style={{ color: theme.colors.muted }}>Reciters appear after provider audio has been verified.</Text> : null}
    <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "700" }}>Translation of the meaning</Text>
    {(resources?.translations ?? []).map((translation) => <Pressable key={translation.id} accessibilityRole="radio" accessibilityState={{ checked: preferences.translation === translation.id }} onPress={() => save({ translation: translation.id })} style={[styles.choice, { backgroundColor: preferences.translation === translation.id ? theme.colors.tintSoft : theme.colors.cardStrong }]}><Text style={{ color: theme.colors.text, fontSize: 16 }}>{translation.name}</Text><Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 5 }}>{translation.language} · {translation.author}</Text></Pressable>)}
    <QuranSurface><Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "700", marginBottom: 10 }}>Offline &amp; privacy</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 15, lineHeight: 24 }}>Bookmarks, reading position, preferences, self-reported memorization and your recordings are saved on this device. An account is not required. {resources?.contentSource === "tanzil" ? "Verbatim Tanzil Uthmani text is available offline. Translations and reference audio are not included in this content edition." : "Quran Foundation text and reference audio require a connection. Offline content downloads are not enabled until the provider’s approved sync and audio rights are verified."}</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 15, lineHeight: 24, marginTop: 10 }}>Audio pauses when you leave this section or background the app. It never resumes after an interruption without your action.</Text>
    </QuranSurface>
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginVertical: 8 }, step: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }, choice: { padding: 16, borderRadius: 18, minHeight: 52 } });
