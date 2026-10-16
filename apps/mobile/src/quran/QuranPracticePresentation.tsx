import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type PropsWithChildren } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import { NativeGlassSurface } from "../components/NativeGlassSurface";
import { useAppLanguage } from "../i18n/LanguageProvider";
import { Text } from "../i18n/LocalizedText";
import { useAppTheme } from "../theme/ThemeProvider";
import { QuranSurface } from "./QuranControls";
import { recitationDisplayWords } from "./recitationTracking";
import { practiceProgress, practiceWordCue } from "./practicePresentation";
import type { ReciteFeedback } from "./reciteAssistFeedback";
import { useQuranTransition } from "./useQuranTransition";

/** Glass belongs to small controls, not the Arabic reading surface. Start
 * opaque until the system preference is known; Android retains its fallback. */
export function PracticeChrome({ children }: PropsWithChildren) {
  const { theme } = useAppTheme();
  const [opaque, setOpaque] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (active) setOpaque(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setOpaque);
    return () => { active = false; listener.remove(); };
  }, []);
  const Surface = opaque ? View : NativeGlassSurface;
  return <Surface style={[styles.chrome, { borderColor: theme.colors.border, backgroundColor: opaque ? theme.colors.surfaceStrong : undefined }]}>{children}</Surface>;
}

export function PracticeFlashcard({ children, transitionKey }: PropsWithChildren<{ transitionKey: string }>) {
  const { theme } = useAppTheme();
  const transition = useQuranTransition(transitionKey);
  return <Animated.View style={[styles.cardFrame, transition]}>
    <QuranSurface style={{ borderRadius: 28, padding: 20, borderWidth: 1, borderColor: theme.colors.borderStrong }}>{children}</QuranSurface>
  </Animated.View>;
}

export function PracticeProgress({ reviewed, total }: { reviewed: number; total: number }) {
  const { theme } = useAppTheme();
  const { isRtl } = useAppLanguage();
  const progress = practiceProgress(reviewed, total);
  if (!progress.maximum) return null;
  return <View accessibilityRole="progressbar" accessibilityLabel="Self-test progress"
    accessibilityValue={{ min: 0, max: progress.maximum, now: progress.value }}
    style={[styles.progress, { backgroundColor: theme.colors.tintSoft, flexDirection: isRtl ? "row-reverse" : "row" }]}>
    <View style={{ height: 4, width: `${progress.fraction * 100}%`, borderRadius: 2, backgroundColor: theme.colors.teal }} />
  </View>;
}

export function PracticeWordLine({ text, feedback, fontLoaded, size = 30 }: {
  text: string; feedback?: ReciteFeedback | null; fontLoaded: boolean; size?: number;
}) {
  const { theme } = useAppTheme();
  const { translate } = useAppLanguage();
  const words = recitationDisplayWords(text);
  return <View style={styles.words} accessibilityLabel={translate("Canonical Quran text")}>
    {words.map((word, index) => {
      const cue = practiceWordCue(words, feedback, index);
      const status = cue.possible ? "Possible word difference" : cue.current ? "Current word" : cue.matched ? "Heard word" : "Not yet heard";
      return <View key={`${index}:${word}`} testID={`quran-practice-word-${index}`} style={[styles.word, {
        borderColor: cue.possible ? theme.colors.danger : cue.current ? theme.colors.teal : "transparent",
        backgroundColor: cue.possible ? theme.mode === "dark" ? "#402731" : "#FFF0EF" : cue.current ? theme.colors.tintSoft : "transparent"
      }]}>
        <Text selectable accessibilityLabel={feedback ? `${word} · ${translate(status)}` : word} style={{
          fontSize: size, lineHeight: size * 1.9, writingDirection: "rtl", textAlign: "center", flexShrink: 1,
          fontFamily: fontLoaded ? "QuranNaskh" : undefined, color: cue.possible ? theme.colors.danger : cue.matched || cue.current ? theme.colors.teal : theme.colors.text
        }}>{word}</Text>
        {cue.possible ? <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
          : cue.current ? <Ionicons name="caret-up" size={12} color={theme.colors.teal} /> : null}
      </View>;
    })}
  </View>;
}

export function PracticeConcealedCard() {
  const { theme } = useAppTheme();
  return <View style={[styles.concealed, { backgroundColor: theme.colors.surfaceStrong }]}>
    <View style={[styles.seal, { backgroundColor: theme.colors.tintSoft }]}><Ionicons name="book-outline" size={29} color={theme.colors.teal} /></View>
    <Text style={{ color: theme.colors.text, fontSize: 23, lineHeight: 31, fontWeight: "700", textAlign: "center" }}>Recite from memory</Text>
    <Text style={{ color: theme.colors.muted, fontSize: 15, lineHeight: 23, textAlign: "center", maxWidth: 340 }}>Use a word hint, or reveal the ayah when you’re ready.</Text>
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.concealedLines}>
      {["82%", "66%", "74%"].map((width, index) => <View key={width} style={{ width: width as `${number}%`, height: 7, borderRadius: 4,
        backgroundColor: theme.colors.border, opacity: 1 - index * .18 }} />)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  cardFrame: { width: "100%", maxWidth: 960, alignSelf: "center" },
  chrome: { padding: 12, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", marginVertical: 8 },
  progress: { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 16 },
  words: { flexDirection: "row-reverse", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 5, marginVertical: 18 },
  word: { minWidth: 34, maxWidth: "100%", paddingHorizontal: 5, paddingBottom: 3, borderRadius: 10, borderBottomWidth: 2, alignItems: "center", justifyContent: "center" },
  concealed: { minHeight: 240, borderRadius: 22, padding: 20, marginVertical: 16, gap: 12, alignItems: "center", justifyContent: "center" },
  seal: { width: 60, height: 60, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  concealedLines: { gap: 9, marginTop: 6, width: "100%", maxWidth: 280, alignItems: "center" }
});
