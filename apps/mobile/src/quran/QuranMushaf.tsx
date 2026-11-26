import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { parseAyahReference, validMushafPageNumber, type MushafPage } from "@hbic/shared";
import { Text, TextInput, Alert } from "../i18n/LocalizedText";
import { useAppLanguage } from "../i18n/LanguageProvider";
import { quranClient, quranRemoteClient } from "../services/quran";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppButton } from "../components/AppButton";
import { QuranIconButton, QuranMessage } from "./QuranControls";
import { QuranReadingLayout } from "./QuranReadingLayout";
import { QuranFoldRegion } from "./QuranFoldRegion";
import { isMacQuranHost } from "./macRuntime";
import { mushafDocument } from "./mushafDocument";
import { isMushafNightStand, mushafPresentation, mushafSpreadStart, mushafTurn, type MushafGeometry } from "./mushafSpread";
import type { QuranLibrary, ReturnTypeQuranAudio } from "./types";

const pageLoadError = "Madinah page could not load. Check your connection and retry, or choose Ayah View.";
const fontLoadError = "Madinah font could not load. Retry or choose Ayah View; no substitute glyphs are shown.";

function useMushafPage(number: number | null, reload: number) {
  const [result, setResult] = useState<{ number: number; reload: number; page: MushafPage | null }>();
  useEffect(() => {
    if (number === null) return;
    const request = new AbortController();
    void quranRemoteClient.readMushaf(number, request.signal)
      .then((page) => { if (!request.signal.aborted) setResult({ number, reload, page }); })
      .catch(() => { if (!request.signal.aborted) setResult({ number, reload, page: null }); });
    return () => request.abort();
  }, [number, reload]);
  return result?.number === number && result.reload === reload ? result.page : undefined;
}

function pageHasAyah(page: MushafPage | null | undefined, key: string) {
  return page?.lines.some(line => line.words.some(word => word.key === key)) ?? false;
}

function MushafLeaf({ number, page, selected, revision, onReady, onAyah, onTurn, onRetry }: {
  number: number | null;
  page: MushafPage | null | undefined;
  selected: string;
  revision: number;
  onReady: (page: MushafPage) => void;
  onAyah: (page: MushafPage, key: string) => void;
  onTurn: (direction: 1 | -1) => void;
  onRetry: () => void;
}) {
  const { theme } = useAppTheme();
  const [width, setWidth] = useState(0);
  const [problem, setProblem] = useState<{ page: number; revision: number; message: string }>();
  const webView = useRef<WebView>(null);
  // The reader owns selection across both leaves. Keep the loaded fonts and page stable.
  const html = useMemo(() => ({ html: page ? mushafDocument(page, theme.mode === "dark", "") : "" }), [page, theme.mode]);
  const message = page === null ? pageLoadError : problem?.page === number && problem.revision === revision ? problem.message : null;
  const selectionScript = `window.hbicSelectMushafAyah?.(${JSON.stringify(selected)}); true;`;

  useEffect(() => {
    webView.current?.injectJavaScript(selectionScript);
  }, [selectionScript]);

  return <View style={styles.leaf}>
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[styles.paper, {
      height: width ? width * 1.53 : 530, backgroundColor: theme.mode === "dark" ? "#152B35" : "#FBF8EF",
    }]}>
      {page && !message ? <WebView ref={webView} key={`${page.page}:${revision}:${theme.mode}`} source={html} originWhitelist={["about:blank"]}
        style={styles.webPage} scrollEnabled={false} bounces={false} showsVerticalScrollIndicator={false}
        setSupportMultipleWindows={false} allowFileAccess={false} allowUniversalAccessFromFileURLs={false}
        javaScriptCanOpenWindowsAutomatically={false} onShouldStartLoadWithRequest={request => request.url === "about:blank"}
        onMessage={event => {
          try {
            if (event.nativeEvent.data.length > 500) return;
            const result = JSON.parse(event.nativeEvent.data);
            if (result.type === "ready" && result.page === page.page && result.overflow === false) {
              webView.current?.injectJavaScript(selectionScript);
              onReady(page);
            }
            else if (result.type === "error") setProblem({ page: page.page, revision, message: fontLoadError });
            else if (result.type === "ayah" && typeof result.key === "string") onAyah(page, result.key);
            else if (result.type === "page" && (result.direction === 1 || result.direction === -1)) onTurn(result.direction);
          } catch { /* Ignore invalid bridge messages. */ }
        }}
        onError={() => setProblem({ page: page.page, revision, message: "Madinah page could not display. Please retry or choose Ayah View." })} />
        : message ? <View style={styles.leafStatus}><QuranMessage message={message} onRetry={onRetry} /></View>
        : <ActivityIndicator color={theme.colors.teal} style={styles.loading} accessibilityLabel="Loading Madinah Mushaf" />}
    </View>
    {number !== null ? <Text style={[styles.folio, { color: theme.colors.muted }]}>Page {number}</Text> : null}
  </View>;
}

export const mushafNightBackground = "#070F16";
export type MushafReaderLayout = { duo: boolean; tabletop: boolean; night: boolean };

export function QuranMushaf({ reference, library, audio, onOpenAyah, onReaderLayoutChange, tabletopToolbar, immersive, focused = false }: {
  reference: string;
  library: QuranLibrary;
  audio: ReturnTypeQuranAudio;
  onOpenAyah: (key: string) => void;
  onReaderLayoutChange: (layout: MushafReaderLayout) => void;
  tabletopToolbar?: ReactNode;
  immersive: boolean;
  focused?: boolean;
}) {
  const { theme } = useAppTheme();
  const { translate } = useAppLanguage();
  const [page, setPage] = useState<number | null>(null);
  const [selected, setSelected] = useState(reference);
  const [geometry, setGeometry] = useState<MushafGeometry | null>(null);
  const [referenceRetry, setReferenceRetry] = useState(0);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [jump, setJump] = useState("");
  const [nightDismissed, setNightDismissed] = useState(false);
  const [nightRequested, setNightRequested] = useState(false);
  const selectedKey = useRef(reference);
  const lastSaved = useRef<string | null>(null);
  const presentation = mushafPresentation(geometry);
  const spread = presentation.kind === "spread";
  // The lower deck is a separate scroll region so its controls stay off the fold.
  const tabletop = presentation.kind === "tabletop" ? presentation : null;
  const hinge = presentation.kind === "spread" ? presentation.hinge : undefined;
  const firstNumber = page === null ? null : spread ? mushafSpreadStart(page) : page;
  const secondNumber = spread && firstNumber !== null ? firstNumber + 1 : null;
  const first = useMushafPage(firstNumber, reload);
  const second = useMushafPage(secondNumber, reload);
  const current = first?.page === page ? first : second?.page === page ? second : null;
  const tabletopActive = tabletop !== null;
  const duo = geometry?.duo === 1;
  const landscapeCover = !!geometry && duo && presentation.kind === "single" && geometry.width > geometry.height;
  const standPose = isMushafNightStand(geometry);
  const night = landscapeCover && (nightRequested || (standPose && !nightDismissed));

  useEffect(() => {
    if (!standPose) setNightDismissed(false);
    if (!landscapeCover) setNightRequested(false);
    if (night) Keyboard.dismiss();
  }, [landscapeCover, night, standPose]);
  useEffect(() => {
    onReaderLayoutChange({ duo, tabletop: tabletopActive, night });
  }, [duo, night, onReaderLayoutChange, tabletopActive]);
  useEffect(() => () => onReaderLayoutChange({ duo: false, tabletop: false, night: false }), [onReaderLayoutChange]);

  useEffect(() => {
    const request = new AbortController();
    selectedKey.current = reference;
    setSelected(reference);
    setPage(null);
    setError(null);
    void quranRemoteClient.mushafReference(reference, request.signal)
      .then(number => { if (!request.signal.aborted) setPage(number); })
      .catch(() => { if (!request.signal.aborted) setError(pageLoadError); });
    return () => request.abort();
  }, [reference, referenceRetry]);

  function save(key: string) {
    const ref = parseAyahReference(key);
    if (!ref) return;
    selectedKey.current = key;
    setSelected(key);
    if (lastSaved.current === key) return;
    lastSaved.current = key;
    void library.read(ref.chapter, ref.ayah).catch(() => {
      if (lastSaved.current === key) lastSaved.current = null;
    });
  }

  function changePage(next: number) {
    if (!validMushafPageNumber(next)) return;
    audio.stop();
    Keyboard.dismiss();
    setJump("");
    setError(null);
    setPage(next);
  }

  function jumpToPage(value: string) {
    const next = Number(value);
    if (validMushafPageNumber(next)) changePage(next);
    else setError("Choose a page between 1 and 604.");
  }

  function turn(direction: 1 | -1) {
    if (page !== null) changePage(mushafTurn(page, direction, spread));
  }

  function listen(key: string) {
    const ref = parseAyahReference(key);
    if (!ref) return;
    if (audio.playback.verse?.verseKey === key && ["playing", "paused"].includes(audio.playback.phase)) {
      void audio.togglePause().catch(() => setError("This ayah’s audio is unavailable. Reading is still available."));
      return;
    }
    void audio.start([ref.ayah], () => quranClient.verse(key, library.library.preferences))
      .catch(() => setError("This ayah’s audio is unavailable. Reading is still available."));
  }

  function choose(leaf: MushafPage, key: string) {
    if (!pageHasAyah(leaf, key)) return;
    setPage(leaf.page);
    save(key);
    // In tabletop the selected ayah's actions are on the lower screen.
    if (tabletop) return;
    const saved = library.library.bookmarks.includes(key);
    Alert.alert(`Ayah ${key}`, "Listen, save a bookmark, or open the meaning in Ayah View.", [
      { text: "Listen to Ayah", onPress: () => listen(key) },
      { text: saved ? "Remove Bookmark" : "Save Bookmark", onPress: () => { void library.bookmark(key).catch(() => {}); } },
      { text: "Open Ayah View", onPress: () => onOpenAyah(key) },
      { text: "Close", style: "cancel" },
    ], { cancelable: true });
  }

  function ready(leaf: MushafPage) {
    if (page !== leaf.page) return;
    const firstWord = leaf.lines.find(line => line.words.length)?.words[0];
    if (firstWord) save(pageHasAyah(leaf, selectedKey.current) ? selectedKey.current : firstWord.key);
  }

  function retry() {
    setError(null);
    if (page === null) setReferenceRetry(value => value + 1);
    else setReload(value => value + 1);
  }

  const renderLeaf = (number: number | null, data: MushafPage | null | undefined) =>
    <MushafLeaf number={number} page={data} selected={selected} revision={reload} onReady={ready} onAyah={choose} onTurn={turn} onRetry={retry} />;

  const facingPages = spread && secondNumber !== null;
  const leafWidth = facingPages && geometry ? Math.max(210, Math.floor((geometry.height - (duo ? 76 : 94)) / 1.53)) : undefined;
  const pages = facingPages ? <View style={styles.spread}>
    <View style={hinge ? [styles.hingeLeaf, { width: hinge.right }] : styles.facingLeaf}>
      <View style={{ width: "100%", maxWidth: leafWidth, alignSelf: "flex-start" }}>{renderLeaf(firstNumber, first)}</View>
    </View>
    <View style={{ width: hinge?.gap ?? 14 }} />
    <View style={hinge ? [styles.hingeLeaf, { width: hinge.left }] : styles.facingLeaf}>
      <View style={{ width: "100%", maxWidth: leafWidth, alignSelf: "flex-end" }}>{renderLeaf(secondNumber, second)}</View>
    </View>
  </View> : tabletop ? <View style={{ width: "100%", maxWidth: Math.max(205, Math.floor((tabletop.top - 30) / 1.53)), alignSelf: "center" }}>
    {renderLeaf(firstNumber, first)}
  </View> : renderLeaf(firstNumber, first);
  const pageButton = (direction: 1 | -1, icon: "chevron-back" | "chevron-forward") =>
    <QuranIconButton label={direction === -1 ? "Previous Mushaf Page" : "Next Mushaf Page"} icon={icon}
      disabled={page === null || !validMushafPageNumber(mushafTurn(page, direction, spread))} onPress={() => turn(direction)} />;
  const controls = <View style={[styles.heading, spread && styles.leftToRight]}>
    {pageButton(spread ? 1 : -1, "chevron-back")}
    <View style={styles.chapter}>
      <Text style={[styles.chapterName, { color: theme.colors.text }]} numberOfLines={2}>{current?.chapterNames.join(" · ") ?? "Madinah Mushaf"}</Text>
      <Text style={[styles.folio, { color: theme.colors.muted }]}>
        {facingPages ? `Pages ${firstNumber}–${secondNumber} of 604` : page ? `Page ${page} of 604${current ? ` · Juz ${current.juz}` : ""}` : "Finding your page…"}
      </Text>
    </View>
    {pageButton(spread ? -1 : 1, "chevron-forward")}
  </View>;
  const ayahReady = pageHasAyah(current, selected);
  const playing = audio.playback.verse?.verseKey === selected && audio.playback.phase === "playing";
  const saved = library.library.bookmarks.includes(selected);
  const deck = tabletop ? <View style={styles.tools} accessibilityRole="toolbar">
    <Text style={[styles.chapterName, { color: theme.colors.text }]}>{ayahReady ? `Ayah ${selected}` : "Madinah Mushaf"}</Text>
    <View style={styles.actions}>
      <AppButton label={playing ? "Pause" : "Listen to Ayah"} icon={playing ? "pause" : "play"} disabled={!ayahReady} onPress={() => listen(selected)} />
      <AppButton label={saved ? "Remove Bookmark" : "Save Bookmark"} icon={saved ? "bookmark" : "bookmark-outline"} variant="secondary"
        disabled={!ayahReady} onPress={() => { void library.bookmark(selected).catch(() => {}); }} />
      <AppButton label="Meaning" icon="list-outline" variant="ghost" disabled={!ayahReady} onPress={() => onOpenAyah(selected)} />
    </View>
  </View> : null;
  const tools = <>
    {error ? <QuranMessage message={error} onRetry={retry} /> : null}
    <View style={[styles.jump, { borderColor: theme.colors.border }]}>
      <TextInput accessibilityLabel="Mushaf Page Number" value={jump} onChangeText={setJump} placeholder="Page 1–604"
        placeholderTextColor={theme.colors.subtle} keyboardType="number-pad" maxLength={3} style={[styles.jumpField, { color: theme.colors.text }]}
        inputAccessoryViewButtonLabel={translate("Go to Page")} submitBehavior="blurAndSubmit"
        onSubmitEditing={event => jumpToPage(event.nativeEvent.text)} />
      <AppButton label="Go to Page" variant="ghost" onPress={() => jumpToPage(jump)} />
    </View>
    <Text style={[styles.credit, { color: theme.colors.subtle }]}>Madinah Hafs · QCF V2 · 15-line edition{"\n"}Opening pages retain their special layout.{"\n"}Quran data and fonts provided by Quran Foundation.</Text>
  </>;
  const layoutSwitch = !focused ? <QuranReadingLayout library={library} onAyahView={() => onOpenAyah(selectedKey.current)} /> : null;
  const audioLabel = playing ? "Pause" : "Listen to Ayah";

  return <View style={styles.reader}>
    {!isMacQuranHost ? <QuranFoldRegion immersive={immersive} onChange={setGeometry} /> : null}
    {night ? <ScrollView testID="mushaf-night-stand" style={[styles.reader, styles.nightSurface]}
      showsVerticalScrollIndicator={false} contentContainerStyle={styles.nightContent}>
      <View style={styles.nightHeading}>
        <Text accessibilityRole="header" style={styles.nightTitle}>{current?.chapterNames.join(" · ") ?? "Madinah Mushaf"}</Text>
        {page !== null ? <Text style={styles.nightPosition}>{ayahReady ? `${translate(`Page ${page}`)} · ${translate(`Ayah ${selected}`)}` : `Page ${page}`}</Text> : null}
        {error ? <Text accessibilityRole="alert" style={styles.nightPosition}>{error}</Text> : null}
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => { setNightRequested(false); setNightDismissed(true); }}
          style={({ pressed }) => [styles.nightAction, pressed && styles.nightPressed]}>
          <Text style={styles.nightActionLabel}>Return to Mushaf</Text>
        </Pressable>
        {ayahReady ? <Pressable accessibilityRole="button" onPress={() => listen(selected)}
          style={({ pressed }) => [styles.nightAction, styles.nightAudio, pressed && styles.nightPressed]}>
          <Text style={styles.nightActionLabel}>{audioLabel}</Text>
        </Pressable> : null}
      </View>
    </ScrollView> : tabletop ? <>
      <ScrollView testID="mushaf-tabletop-page" style={{ height: tabletop.top, flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={styles.upperPage} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={!duo}>
        {pages}
      </ScrollView>
      <View style={{ height: tabletop.gap }} />
      <ScrollView testID="mushaf-tabletop-controls" style={styles.reader} contentContainerStyle={styles.controlDeck}
        automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={!duo}>
        {tabletopToolbar}
        {controls}
        {deck}
        {layoutSwitch}
        {tools}
      </ScrollView>
    </> : <ScrollView testID={spread ? "mushaf-spread" : "mushaf-single"} style={styles.reader}
      automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={!duo}
      contentContainerStyle={[styles.scroller, spread && styles.spreadScroller, hinge && styles.hingeScroller]}>
      <View style={hinge ? { width: hinge.right, paddingHorizontal: 12, alignSelf: "flex-end", gap: 10 } : styles.controls}>
        {!spread && !duo ? layoutSwitch : null}
        {controls}
        {landscapeCover ? <AppButton label="Night Stand" icon="moon-outline" variant="ghost" onPress={() => setNightRequested(true)} /> : null}
      </View>
      {pages}
      <View style={hinge ? { width: hinge.right, paddingHorizontal: 12, alignSelf: "flex-end", gap: 10 } : styles.controls}>
        {spread || duo ? layoutSwitch : null}
        {!spread ? <Text style={[styles.credit, { color: theme.colors.muted }]}>Tap an ayah for audio, bookmarks or meaning. Swipe to turn the page.</Text> : null}
        {tools}
      </View>
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  reader: { flex: 1, minHeight: 0 },
  scroller: { padding: 14, gap: 10, width: "100%", maxWidth: 650, alignSelf: "center" },
  spreadScroller: { maxWidth: 1050 },
  hingeScroller: { paddingHorizontal: 0, maxWidth: undefined, direction: "ltr" },
  controls: { gap: 10, width: "100%", maxWidth: 650, alignSelf: "center" },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  leftToRight: { direction: "ltr" },
  chapter: { flex: 1, minWidth: 0, gap: 4 },
  chapterName: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  folio: { fontSize: 12, textAlign: "center", fontVariant: ["tabular-nums"] },
  spread: { flexDirection: "row-reverse", direction: "ltr", alignItems: "flex-start" },
  facingLeaf: { flex: 1, minWidth: 0 },
  hingeLeaf: { paddingHorizontal: 12 },
  leaf: { width: "100%", gap: 6 },
  paper: { borderRadius: 8, overflow: "hidden" },
  webPage: { backgroundColor: "transparent" },
  loading: { flex: 1 },
  leafStatus: { flex: 1, justifyContent: "center", padding: 12 },
  upperPage: { width: "100%", alignItems: "center", padding: 8 },
  controlDeck: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  tools: { alignItems: "center", gap: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  jump: { flexDirection: "row", gap: 6, alignItems: "center", borderRadius: 16, borderWidth: 1, paddingHorizontal: 12 },
  jumpField: { flex: 1, minWidth: 0, minHeight: 48, fontSize: 16 },
  credit: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  nightSurface: { backgroundColor: mushafNightBackground },
  nightContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", gap: 24, paddingHorizontal: 24, paddingVertical: 16 },
  nightHeading: { gap: 8, width: "100%", maxWidth: 520 },
  nightTitle: { color: "#F0DEB4", fontSize: 38, fontWeight: "600", textAlign: "center" },
  nightPosition: { color: "#B9CBCB", fontSize: 16, textAlign: "center", fontVariant: ["tabular-nums"] },
  nightAction: { minHeight: 48, justifyContent: "center", paddingHorizontal: 15, paddingVertical: 10, borderRadius: 24 },
  nightAudio: { backgroundColor: "#173534" },
  nightActionLabel: { color: "#ECF3EF", fontSize: 15, fontWeight: "600", textAlign: "center" },
  nightPressed: { opacity: 0.7 },
});
