import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, ScrollView, View } from "react-native";
import { Text, TextInput, Alert } from "../i18n/LocalizedText";

import { WebView } from "react-native-webview";
import { parseAyahReference, validMushafPageNumber, type MushafPage } from "@hbic/shared";
import { quranClient, quranRemoteClient } from "../services/quran";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppButton } from "../components/AppButton";
import { QuranIconButton, QuranMessage } from "./QuranControls";
import { QuranReadingLayout } from "./QuranReadingLayout";
import { mushafDocument } from "./mushafDocument";
import type { QuranLibrary, ReturnTypeQuranAudio } from "./types";

export function QuranMushaf({ reference, library, audio, onOpenAyah }: { reference: string; library: QuranLibrary; audio: ReturnTypeQuranAudio; onOpenAyah: (key: string) => void }) {
  const { theme } = useAppTheme();
  const [page, setPage] = useState<number | null>(null), [data, setData] = useState<MushafPage | null>(null);
  const [error, setError] = useState<string | null>(null), [reload, setReload] = useState(0), [fontReady, setFontReady] = useState(false);
  const [referenceRetry, setReferenceRetry] = useState(0);
  const [width, setWidth] = useState(0), [jump, setJump] = useState("");
  const selected = useRef(reference), saveRead = useRef(library.read); saveRead.current = library.read;
  useEffect(() => {
    const request = new AbortController(); selected.current = reference; setPage(null); setData(null); setError(null);
    void quranRemoteClient.mushafReference(reference, request.signal).then((p) => { if (!request.signal.aborted) setPage(p); })
      .catch(() => { if (!request.signal.aborted) setError("Madinah page could not load. Check your connection and retry, or choose Ayah View."); });
    return () => request.abort();
  }, [reference, referenceRetry]);
  useEffect(() => {
    if (page === null) return;
    const request = new AbortController(); setData(null); setFontReady(false); setError(null);
    void quranRemoteClient.readMushaf(page, request.signal).then((value) => {
      if (request.signal.aborted) return;
      const words = value.lines.flatMap((l) => l.words);
      if (!words.some((w) => w.key === selected.current)) selected.current = words[0].key;
      setData(value);
    }).catch(() => { if (!request.signal.aborted) setError("Madinah page could not load. Check your connection and retry, or choose Ayah View."); });
    return () => request.abort();
  }, [page, reload]);
  function changePage(next: number) { if (validMushafPageNumber(next)) { audio.stop(); Keyboard.dismiss(); setJump(""); setPage(next); } }
  function choose(key: string) {
    if (!data?.lines.some((l) => l.words.some((w) => w.key === key))) return;
    const ref = parseAyahReference(key)!;
    selected.current = key; void saveRead.current(ref.chapter, ref.ayah).catch(() => {});
    const saved = library.library.bookmarks.includes(key);
    Alert.alert(`Ayah ${key}`, "Listen, save a bookmark, or open the meaning in Ayah View.", [
      { text: "Listen to Ayah", onPress: () => { void audio.start([ref.ayah], () => quranClient.verse(key, library.library.preferences))
        .catch(() => setError("This ayah’s audio is unavailable. Reading is still available.")); } },
      { text: saved ? "Remove Bookmark" : "Save Bookmark", onPress: () => { void library.bookmark(key).catch(() => {}); } },
      { text: "Open Ayah View", onPress: () => onOpenAyah(key) },
      { text: "Close", style: "cancel" }
    ], { cancelable: true }); // Android shows the three actions; Back/outside dismisses.
  }
  const html = useMemo(() => data ? mushafDocument(data, theme.mode === "dark", selected.current) : "", [data, theme.mode]);
  return <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 14, gap: 10, width: "100%", maxWidth: 650, alignSelf: "center" }}>
    <QuranReadingLayout library={library} onAyahView={() => onOpenAyah(selected.current)} />
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <QuranIconButton label="Previous Mushaf Page" icon="chevron-back" disabled={page === null || page === 1} onPress={() => changePage(page! - 1)} />
      <View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "700", textAlign: "center" }} numberOfLines={1}>{data?.chapterNames.join(" · ") ?? "Madinah Mushaf"}</Text>
        <Text style={{ color: theme.colors.muted, fontSize: 12, textAlign: "center", marginTop: 4 }}>{page ? `Page ${page} of 604${data ? ` · Juz ${data.juz}` : ""}` : "Finding your page…"}</Text></View>
      <QuranIconButton label="Next Mushaf Page" icon="chevron-forward" disabled={page === null || page === 604} onPress={() => changePage(page! + 1)} />
    </View>
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: width ? width * 1.53 : 530, borderRadius: 8, overflow: "hidden", backgroundColor: theme.mode === "dark" ? "#152B35" : "#FBF8EF" }}>
      {data ? <WebView key={`${data.page}:${reload}:${theme.mode}`} source={{ html }} originWhitelist={["about:blank"]} style={{ backgroundColor: "transparent" }}
        scrollEnabled={false} bounces={false} showsVerticalScrollIndicator={false} setSupportMultipleWindows={false} allowFileAccess={false} allowUniversalAccessFromFileURLs={false}
        javaScriptCanOpenWindowsAutomatically={false} onShouldStartLoadWithRequest={(request) => request.url === "about:blank"}
        onMessage={(event) => {
          try {
            if (event.nativeEvent.data.length > 500) return;
            const result = JSON.parse(event.nativeEvent.data);
            if (result.type === "ready" && result.page === data.page && result.overflow === false) {
              setFontReady(true); const ref = parseAyahReference(selected.current);
              if (ref) void saveRead.current(ref.chapter, ref.ayah).catch(() => {});
            } else if (result.type === "error") setError("Madinah font could not load. Retry or choose Ayah View; no substitute glyphs are shown.");
            else if (result.type === "ayah" && typeof result.key === "string") choose(result.key);
            else if (result.type === "page" && [1, -1].includes(result.direction)) changePage(data.page + result.direction);
          } catch { /* Ignore invalid bridge messages. */ }
        }} onError={() => setError("Madinah page could not display. Please retry or choose Ayah View.")} /> : <ActivityIndicator color={theme.colors.teal} style={{ flex: 1 }} accessibilityLabel="Loading Madinah Mushaf" />}
    </View>
    {error ? <QuranMessage message={error} onRetry={() => page === null ? setReferenceRetry((n) => n + 1) : setReload((n) => n + 1)} /> : null}
    <Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 19, textAlign: "center" }}>{fontReady ? "Tap an ayah for audio, bookmarks or meaning. Swipe to turn the page." : "Loading the verified page font…"}</Text>
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12 }}>
      <TextInput accessibilityLabel="Mushaf Page Number" value={jump} onChangeText={setJump} placeholder="Page 1–604" placeholderTextColor={theme.colors.subtle} keyboardType="number-pad" maxLength={3} style={{ flex: 1, minHeight: 48, fontSize: 16, color: theme.colors.text }} />
      <AppButton label="Go to Page" variant="ghost" onPress={() => { if (validMushafPageNumber(Number(jump))) changePage(Number(jump)); else setError("Choose a page between 1 and 604."); }} />
    </View>
    <Text style={{ color: theme.colors.subtle, fontSize: 11, lineHeight: 18, textAlign: "center" }}>Madinah Hafs · QCF V2 · 15-line edition{"\n"}Opening pages retain their special layout.{"\n"}Quran data and fonts provided by Quran Foundation.</Text>
  </ScrollView>;
}
