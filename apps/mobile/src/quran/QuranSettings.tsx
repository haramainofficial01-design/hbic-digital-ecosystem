import { Pressable, StyleSheet, Switch, View } from "react-native";
import { Text, TextInput, Alert } from "../i18n/LocalizedText";
import type { QuranResources } from "@hbic/shared";
import { normalizeSearch } from "@hbic/shared";
import { useState } from "react";
import { AppButton } from "../components/AppButton";
import { useAppTheme } from "../theme/ThemeProvider";
import { QuranSurface } from "./QuranControls";
import type { QuranLibrary } from "./types";
import { QuranReadingLayout } from "./QuranReadingLayout";
export function QuranSettings({ library, resources }: { library: QuranLibrary; resources: QuranResources | null }) {
  const { theme } = useAppTheme();
  const preferences = library.library.preferences;
  const [reciterQuery, setReciterQuery] = useState(""), [showReciters, setShowReciters] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
    {resources?.reciters.length ? <QuranSurface>
      <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "600" }}>{resources.reciters.find(r => r.id === preferences.reciter)?.name ?? "Choose a voice"}</Text>
      <Text style={{ color: theme.colors.muted, marginVertical: 10 }}>For ayah-by-ayah playback. The full-surah reciter collection is in Listen.</Text>
      <AppButton label={showReciters ? "Close voice picker" : "Change practice voice"} variant="secondary" onPress={() => setShowReciters(!showReciters)} />
      {showReciters ? <View style={{ gap: 8, marginTop: 14 }}>
        <TextInput accessibilityLabel="Find practice reciter" value={reciterQuery} onChangeText={setReciterQuery} placeholder="Find a reciter" maxLength={100} autoCorrect={false} placeholderTextColor={theme.colors.muted} style={[styles.search, { color: theme.colors.text, borderColor: theme.colors.border }]} />
        {resources.reciters.filter(r => normalizeSearch(`${r.name} ${r.style ?? ""}`).includes(normalizeSearch(reciterQuery))).slice(0, 12).map(reciter => <Pressable key={reciter.id} accessibilityRole="radio" accessibilityState={{ checked: preferences.reciter === reciter.id }} onPress={() => { save({ reciter: reciter.id }); setShowReciters(false); }} style={[styles.choice, { backgroundColor: preferences.reciter === reciter.id ? theme.colors.tintSoft : theme.colors.cardStrong }]}><Text style={{ color: theme.colors.text, fontSize: 16 }}>{reciter.name}{reciter.style ? ` · ${reciter.style}` : ""}</Text></Pressable>)}
        <Text style={{ color: theme.colors.muted }}>Search to narrow the voice list.</Text>
      </View> : null}
    </QuranSurface> : null}
    {!resources?.reciters.length ? <Text style={{ color: theme.colors.muted }}>Reciters appear after provider audio has been verified.</Text> : null}
    <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "700" }}>Translation of the meaning</Text>
    {(resources?.translations ?? []).map((translation) => <Pressable key={translation.id} accessibilityRole="radio" accessibilityState={{ checked: preferences.translation === translation.id }} onPress={() => save({ translation: translation.id })} style={[styles.choice, { backgroundColor: preferences.translation === translation.id ? theme.colors.tintSoft : theme.colors.cardStrong }]}><Text style={{ color: theme.colors.text, fontSize: 16 }}>{translation.name}</Text><Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 5 }}>{translation.language} · {translation.author}</Text></Pressable>)}
    <QuranSurface>
      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "700" }}>Practice &amp; storage</Text>
      <View style={styles.row}><Text style={{ color: theme.colors.text, flex: 1, fontSize: 16 }}>Keep my recordings</Text><Switch accessibilityLabel="Keep my recordings" value={preferences.recordingRetention === "keep"} onValueChange={keep => save({ recordingRetention: keep ? "keep" : "session" })} /></View>
      <Text style={{ color: theme.colors.muted, lineHeight: 22 }}>{preferences.recordingRetention === "keep" ? "Keep privately in My Library until you delete them." : "Review this session only. Deleted on leaving practice or backgrounding, unless you choose Keep."}</Text>
      <View style={styles.row}><Text style={{ color: theme.colors.text, flex: 1, fontSize: 16 }}>Record Recite Assist sessions</Text><Switch accessibilityLabel="Record Recite Assist sessions" value={preferences.saveAssistAudio} onValueChange={saveAssistAudio => save({ saveAssistAudio })} /></View>
      <Text style={{ color: theme.colors.muted, lineHeight: 22 }}>Off by default. Optional recordings stay on this device, with approximate word-review points. No microphone audio is uploaded.</Text>
      <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "600", marginTop: 18 }}>Recognition pace</Text>
      <View style={styles.row}>{(["efficient", "responsive"] as const).map(mode => <AppButton key={mode} label={mode === "efficient" ? "Efficient" : "Responsive"} variant={preferences.recognitionMode === mode ? "primary" : "secondary"} onPress={() => save({ recognitionMode: mode })} />)}</View>
      <Text style={{ color: theme.colors.muted, lineHeight: 22 }}>Efficient is the default and preserves overlapping word-tracking checks. Responsive checks more often. Both pause the microphone off-screen; heavy recognition may still warm your phone. Reading or listening never starts recognition.</Text>
    </QuranSurface>
    <QuranSurface><Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "700", marginBottom: 10 }}>Offline &amp; privacy</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 15, lineHeight: 24 }}>Bookmarks, reading position, preferences, self-reported memorization, possible-word flags and recordings you choose to keep are saved on this device. An account is not required for these features. Reference reciter audio is streamed, not downloaded as a library; your phone may keep temporary playback buffers. {resources?.contentSource === "tanzil" ? "Verbatim Tanzil Uthmani text is available offline. Reference audio requires a connection." : "Quran Foundation text and reference audio require a connection. Offline content downloads are not enabled until the provider’s approved sync and audio rights are verified."}</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 15, lineHeight: 24, marginTop: 10 }}>Audio pauses when you leave this section or background the app. It never resumes after an interruption without your action.</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 15, lineHeight: 24, marginTop: 10 }}>Recite Assist separately downloads about 104 MB of recognition data when you opt in. Remove it below to reclaim space; it downloads again only when you start recognition.</Text>
      <AppButton label="Remove recognition download" variant="ghost" icon="trash-outline" onPress={() => Alert.alert("Remove recognition data?", "Your personal recordings, bookmarks and word-review flags are kept. Recognition will need to download its model next time.", [{ text: "Keep", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require("./reciteAssistEngine").removeReciteAssistDownload(); setNotice("Recognition download removed. Your library is unchanged.");
        } catch (error) { setNotice(error instanceof Error ? error.message : "Download could not be removed."); }
      } }])} />
      {notice ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.muted, marginTop: 8 }}>{notice}</Text> : null}
    </QuranSurface>
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginVertical: 8 }, step: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }, choice: { padding: 16, borderRadius: 18, minHeight: 52 }, search: { borderRadius: 16, padding: 14, fontSize: 16, minHeight: 50, borderWidth: 1 } });
