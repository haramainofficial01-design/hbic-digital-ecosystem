import { memo } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import type { QuranPreferences, QuranVerse } from "@hbic/shared";
import { quranAttribution } from "@hbic/shared";
import { useAppTheme } from "../theme/ThemeProvider";
import { QuranIconButton } from "./QuranControls";
export const QuranVerseRow = memo(function QuranVerseRow({ verse, preferences, bookmarked, playing, fontLoaded, onBookmark, onPlay, onOpen }: {
  verse: QuranVerse; preferences: QuranPreferences; bookmarked: boolean; playing: boolean; fontLoaded: boolean;
  onBookmark: (key: string) => void; onPlay: (verse: QuranVerse) => void; onOpen?: (key: string) => void;
}) {
  const { theme } = useAppTheme();
  const share = () => void Share.share({ message: `${verse.textUthmani}\n\n${verse.translation}\nQuran ${verse.verseKey}${verse.translationName ? ` · ${verse.translationName}` : ""}\n${verse.source === "tanzil" ? "Quran text: Tanzil Project · https://tanzil.net" : quranAttribution}\nhttps://quran.com/${verse.verseKey.replace(":", "/")}` }).catch(() => {});
  return <View style={[styles.verse, { borderBottomColor: theme.colors.border, backgroundColor: playing ? theme.colors.tintSoft : "transparent" }]}>
    <View style={styles.row}>
      <Text style={[styles.reference, { color: theme.colors.teal }]} accessibilityLabel={`Surah and ayah ${verse.verseKey}`}>{verse.verseKey}</Text>
      <View style={styles.row}>
        {onOpen ? <QuranIconButton label={`Open ayah ${verse.verseKey}`} icon="arrow-forward" onPress={() => onOpen(verse.verseKey)} /> : null}
        <QuranIconButton label={`${playing ? "Pause" : "Play"} ayah ${verse.verseKey}`} icon={playing ? "pause" : "play"} disabled={!verse.audioUrl} onPress={() => onPlay(verse)} active={playing} />
        <QuranIconButton label={`${bookmarked ? "Remove bookmark for" : "Bookmark"} ${verse.verseKey}`} icon={bookmarked ? "bookmark" : "bookmark-outline"} active={bookmarked} onPress={() => onBookmark(verse.verseKey)} />
        <QuranIconButton label={`Share or copy ayah ${verse.verseKey} with attribution`} icon="share-outline" onPress={share} />
      </View>
    </View>
    <Text selectable style={[styles.arabic, { fontFamily: fontLoaded ? "QuranNaskh" : undefined, color: theme.colors.text,
      fontSize: preferences.arabicSize, lineHeight: preferences.arabicSize * 2.1 }]}>{verse.textUthmani}</Text>
    {preferences.showTranslation && verse.translation ? <>
      <Text selectable style={{ color: theme.colors.muted, fontSize: preferences.translationSize, lineHeight: preferences.translationSize * 1.6,
        writingDirection: /[\u0600-\u06ff]/.test(verse.translation) ? "rtl" : "ltr" }}>{verse.translation}</Text>
      <Text style={[styles.source, { color: theme.colors.subtle }]}>{verse.translationName} · Translation of the meaning</Text>
    </> : null}
  </View>;
});
const styles = StyleSheet.create({
  verse: { paddingHorizontal: 8, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
  reference: { fontSize: 15, fontWeight: "700", marginRight: 8 },
  arabic: { textAlign: "right", writingDirection: "rtl", marginVertical: 14 },
  source: { fontSize: 12, lineHeight: 19, marginTop: 12 }
});
