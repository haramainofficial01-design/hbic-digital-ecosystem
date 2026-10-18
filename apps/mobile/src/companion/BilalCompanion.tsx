import { Ionicons } from "@expo/vector-icons";
import { bilalCompanionDisclaimer, bilalCompanionName, bilalCompanionSuggestions, bilalCompanionWelcome, companionVisibleOnRoute, safeCompanionLink, type CompanionReply } from "@hbic/shared";
import { usePathname } from "expo-router";
import * as Notifications from "expo-notifications";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AccessibilityInfo, AppState, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppLanguage } from "../i18n/LanguageProvider";
import { useOnboarding } from "../onboarding/OnboardingProvider";
import { isMacQuranHost } from "../quran/macRuntime";
import { noteRatingHomeInteraction } from "../rating/homeActivity";
import { usePublishedContent } from "../services/content";
import { useAppTheme } from "../theme/ThemeProvider";
import { askBilalCompanion } from "./client";
import { setCompanionActive } from "./activity";
import { BilalTourCard } from "./BilalTourCard";
import { useBilalTour } from "./useBilalTour";
import { NativeGlassSurface } from "../components/NativeGlassSurface";
import { useIsFocused } from "@react-navigation/native";

type Message = { id: number; role: "user" | "assistant"; text: string; question?: string; reply?: CompanionReply };
const LauncherContext = createContext<{ bottom: number; right: number; open(): void } | null>(null);

/** Belongs inside the focused native screen, not behind the native navigator. */
export function BilalLauncher() {
  const launcher = useContext(LauncherContext), focused = useIsFocused(), { translate: t } = useAppLanguage();
  if (!launcher || !focused) return null;
  return <View pointerEvents="box-none" collapsable={false} style={styles.launcherHost}>
    <Pressable accessibilityRole="button" accessibilityLabel={t("Open Bilal")} testID="bilal-companion-launcher" onPress={launcher.open}
      style={({ pressed }) => [styles.launcher, { right: launcher.right, bottom: launcher.bottom, opacity: pressed ? .85 : 1 }]}>
      <Ionicons name="chatbubble-ellipses-outline" size={23} color="#F1D98D" /><Text style={styles.launcherLabel}>{t("Ask Bilal")}</Text>
    </Pressable>
  </View>;
}

/** Deliberately opened, memory-only companion. No background inference or animation loop. */
export function BilalCompanion({ children }: PropsWithChildren) {
  const pathname = usePathname(), { content, loading } = usePublishedContent(), { active: onboarding } = useOnboarding();
  const { theme } = useAppTheme(), { language, isRtl, translate: t } = useAppLanguage(), insets = useSafeAreaInsets(), { height } = useWindowDimensions();
  const [open, setOpen] = useState(false), [foreground, setForeground] = useState(AppState.currentState === "active"), [reduceMotion, setReduceMotion] = useState(true), [notificationReady, setNotificationReady] = useState(false);
  const [draft, setDraft] = useState(""), [messages, setMessages] = useState<Message[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const input = useRef<TextInput>(null), scroll = useRef<ScrollView>(null), sequence = useRef(0), locked = useRef(false), controller = useRef<AbortController | null>(null);
  const eligible = !onboarding && !loading && foreground && content.featureFlags.bilalCompanionEnabled && companionVisibleOnRoute(pathname, true);
  const tour = useBilalTour({ eligible: eligible && notificationReady && pathname === "/", open, onboarding, onOpen: () => setOpen(true) });
  const deferTour = useRef(tour.defer); deferTour.current = tour.defer;
  const close = useCallback(() => { controller.current?.abort(); controller.current = null; locked.current = false; setBusy(false); setOpen(false); }, []);
  const interrupt = useCallback(() => { deferTour.current(); close(); }, [close]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const state = AppState.addEventListener("change", value => setForeground(value === "active"));
    // A notification must not leave a chat covering a more important action.
    const received = Notifications.addNotificationReceivedListener(interrupt);
    const tapped = Notifications.addNotificationResponseReceivedListener(interrupt);
    void Notifications.getLastNotificationResponseAsync().then(value => { if (mounted) { if (value) deferTour.current(); setNotificationReady(true); } }).catch(() => {});
    return () => { mounted = false; motion.remove(); state.remove(); received.remove(); tapped.remove(); controller.current?.abort(); };
  }, [interrupt]);
  useEffect(() => { close(); }, [pathname, eligible, close]);
  useEffect(() => { if (!foreground) deferTour.current(); }, [foreground]);
  useEffect(() => { setCompanionActive(eligible && (open || pathname === "/" && tour.seen === false)); return () => { setCompanionActive(false); }; }, [open, eligible, pathname, tour.seen]);
  useEffect(() => { if (open && tour.step === null) { const timer = setTimeout(() => input.current?.focus(), 200); return () => clearTimeout(timer); } }, [open, tour.step]);

  async function send(question = draft, displayedQuestion = question) {
    const text = question.trim();
    if (!text || text.length > 800 || locked.current) return;
    if (messages.filter(message => message.role === "user").length >= 20) { setError(t("Please clear this chat to start a new conversation.")); return; }
    noteRatingHomeInteraction(); tour.noteInteraction(); locked.current = true; setBusy(true); setDraft(""); setError("");
    const previousQuestions = messages.filter(message => message.role === "user").slice(-4).map(message => message.question ?? message.text);
    setMessages(current => [...current, { id: ++sequence.current, role: "user", text: displayedQuestion.trim(), question: text }]);
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 20_000);
    try {
      const reply = await askBilalCompanion({ question: text, previousQuestions, language }, abort.signal);
      if (!abort.signal.aborted && controller.current === abort) setMessages(current => [...current, { id: ++sequence.current, role: "assistant", text: reply.answer, reply }]);
    } catch (reason) {
      if (controller.current === abort) { setDraft(text); setError(t(abort.signal.aborted ? "That request was interrupted. Please try again." : reason instanceof Error ? reason.message : "Please try again shortly.")); }
    } finally { clearTimeout(timeout); if (controller.current === abort) { locked.current = false; setBusy(false); controller.current = null; } }
  }
  async function openSource(value: string) {
    const url = safeCompanionLink(value); if (!url) return;
    try { await Linking.openURL(url); close(); } catch { setError(t("Couldn’t open that page. Please try again.")); }
  }
  const c = theme.colors;
  const direction = { textAlign: isRtl ? "right" as const : "left" as const, writingDirection: isRtl ? "rtl" as const : "ltr" as const };
  const row = { flexDirection: isRtl ? "row-reverse" as const : "row" as const };
  const launcher = eligible && !open ? {
    right: Math.max(16, insets.right + 12), bottom: isMacQuranHost ? 24 : Math.max(12, insets.bottom) + 86,
    open: () => { noteRatingHomeInteraction(); tour.noteInteraction(); if (tour.seen === false) tour.start(); else { tour.finish(); setOpen(true); } }
  } : null;
  return <LauncherContext.Provider value={launcher}>
    {children}
    <Modal visible={open && eligible} transparent animationType={reduceMotion ? "none" : "fade"} onRequestClose={close} onShow={() => { if (tour.step === null) input.current?.focus(); }} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"} onTouchStart={tour.noteInteraction}>
        <Pressable accessibilityLabel={t("Close chat")} accessibilityRole="button" onPress={close} style={styles.scrim} />
        <View accessibilityViewIsModal style={[styles.panel, { maxHeight: Math.max(220, height - insets.top - insets.bottom - 28), marginBottom: Math.max(12, insets.bottom), marginRight: Math.max(12, insets.right), backgroundColor: c.surface, borderColor: c.borderStrong }]}>
          <View style={[styles.header, row]}>
            <NativeGlassSurface style={styles.mark}><Ionicons name="chatbubble-ellipses-outline" size={23} color="#F1D98D" /></NativeGlassSurface>
            <View style={styles.heading}><Text accessibilityRole="header" style={[styles.title, direction]}>{t(bilalCompanionName)}</Text><Text style={[styles.subtitle, direction]}>{t("Your Masjid Bilal companion")}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Quick tour")} disabled={tour.step !== null || busy} onPress={tour.start} style={styles.iconButton}><Ionicons name="help-circle-outline" size={21} color="white" /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Clear chat")} disabled={busy || !messages.length || tour.step !== null} onPress={() => { setMessages([]); setDraft(""); setError(""); input.current?.focus(); }} style={[styles.iconButton, { opacity: busy || !messages.length || tour.step !== null ? .4 : 1 }]}><Ionicons name="refresh-outline" size={20} color="white" /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Close chat")} onPress={close} style={styles.iconButton}><Ionicons name="close" size={24} color="white" /></Pressable>
          </View>
          {tour.step !== null ? <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled"><BilalTourCard step={tour.step} onNext={tour.next} onSkip={() => { tour.finish(); close(); }} /></ScrollView> : <>
          <View style={[styles.notice, { backgroundColor: c.tintSoft, borderColor: c.border }]}>
            <Text style={[styles.noticeText, direction, { color: c.muted }]}>{t(bilalCompanionDisclaimer)}</Text>
          </View>
          <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
            <View style={[styles.bubble, styles.assistant, { backgroundColor: c.tintSoft, borderColor: c.border }]}><Text style={[styles.message, direction, { color: c.text }]}>{t(bilalCompanionWelcome)}</Text></View>
            {!messages.length ? <View style={styles.suggestions}>{bilalCompanionSuggestions.map(question => <Pressable key={question} accessibilityRole="button" onPress={() => void send(question, t(question))} disabled={busy} style={[styles.suggestion, row, { backgroundColor: c.surfaceStrong, borderColor: c.border }]}><Text style={[styles.suggestionText, direction, { color: c.text }]}>{t(question)}</Text><Ionicons name={isRtl ? "arrow-back" : "arrow-forward"} size={16} color={c.tint} /></Pressable>)}</View> : null}
            {messages.map(message => <View key={message.id} style={[styles.bubble, message.role === "user" ? styles.user : styles.assistant, { backgroundColor: message.role === "user" ? c.tint : c.tintSoft, borderColor: c.border }]}>
              <Text selectable style={[styles.message, direction, { color: message.role === "user" ? c.onTint : c.text }]}>{message.text}</Text>
              {message.reply ? <>
                <View style={[styles.sources, row]}>{message.reply.sources.filter(source => safeCompanionLink(source.href)).map(source => <Pressable accessibilityRole="link" accessibilityLabel={t(source.title)} key={source.id} onPress={() => void openSource(source.href)} style={[styles.source, row, { backgroundColor: c.surface, borderColor: c.border }]}><Text style={[styles.sourceText, direction, { color: c.text }]}>{t(source.title)}</Text><Ionicons name="arrow-up-right-box" size={13} color={c.tint} /></Pressable>)}</View>
                <Text style={[styles.meta, direction, { color: c.muted }]}>{t("Published information")} · {new Date(message.reply.asOf).toLocaleTimeString(language === "en" ? "en-CA" : language, { timeZone: "America/Edmonton", hour: "numeric", minute: "2-digit" })} · {t("Calgary")}</Text>
              </> : null}
            </View>)}
            {busy ? <Text accessibilityLiveRegion="polite" style={[styles.status, { color: c.muted }]}>{t("Checking published information…")}</Text> : null}
            {error ? <Text accessibilityRole="alert" style={[styles.status, { color: c.danger }]}>{error}</Text> : null}
          </ScrollView>
          <View style={[styles.footer, { borderColor: c.border }]}>
            <View style={[styles.form, row, { backgroundColor: c.surfaceStrong, borderColor: c.border }]}>
              <TextInput ref={input} style={[styles.input, direction, { color: c.text }]} placeholder={t("Ask about Masjid Bilal…")} placeholderTextColor={c.muted} accessibilityLabel={t("Your question")} value={draft} maxLength={800} autoComplete="off" editable={!busy} onChangeText={value => { noteRatingHomeInteraction(); tour.noteInteraction(); setDraft(value); }} onSubmitEditing={() => void send()} returnKeyType="send" />
              <Pressable accessibilityRole="button" accessibilityLabel={t("Send question")} disabled={busy || !draft.trim()} onPress={() => void send()} style={[styles.send, { backgroundColor: c.tint, opacity: busy || !draft.trim() ? .4 : 1 }]}><Ionicons name="arrow-up" size={22} color={c.onTint} /></Pressable>
            </View>
            <View style={styles.footerLinks}><Text style={[styles.meta, { color: c.muted }]}>{t("This session only")}</Text><Pressable accessibilityRole="link" onPress={() => void openSource("/privacy#bilal-companion")} style={styles.footerLink}><Text style={[styles.linkText, { color: c.tint }]}>{t("Privacy")}</Text></Pressable><Pressable accessibilityRole="link" onPress={() => void openSource("/contact")} style={styles.footerLink}><Text style={[styles.linkText, { color: c.tint }]}>{t("Contact the office")}</Text></Pressable></View>
          </View>
          </>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </LauncherContext.Provider>;
}

const styles = StyleSheet.create({
  launcherHost: { ...StyleSheet.absoluteFillObject, zIndex: 80, elevation: 80 },
  launcher: { position: "absolute", zIndex: 80, flexDirection: "row", alignItems: "center", gap: 9, minHeight: 52, borderRadius: 20, borderWidth: 1, borderColor: "#648B91", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#082C3C", boxShadow: "0px 6px 18px #001C3828" },
  launcherLabel: { color: "#FFF9E8", fontSize: 14, fontWeight: "700" },
  overlay: { flex: 1, justifyContent: "flex-end", alignItems: "flex-end", paddingLeft: 12 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,24,39,0.4)" },
  panel: { width: "100%", maxWidth: 460, height: 680, flexShrink: 1, borderRadius: 26, borderWidth: 1, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, backgroundColor: "#082C3C" },
  mark: { width: 38, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "#164858", borderRadius: 14 },
  heading: { flex: 1, minWidth: 0 }, title: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" }, subtitle: { fontSize: 10, lineHeight: 16, color: "#C3D7DC", marginTop: 3 },
  iconButton: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  notice: { paddingHorizontal: 16, paddingVertical: 11, gap: 5, borderBottomWidth: 1 }, noticeText: { fontSize: 11, lineHeight: 17 },
  scroll: { flex: 1, minHeight: 0 }, messages: { padding: 16, gap: 14 },
  bubble: { maxWidth: "96%", borderRadius: 18, padding: 13, borderWidth: 1 }, assistant: { alignSelf: "flex-start", borderTopLeftRadius: 5 }, user: { alignSelf: "flex-end", borderBottomRightRadius: 5 },
  message: { fontSize: 14, lineHeight: 23 }, meta: { fontSize: 10, lineHeight: 17, marginTop: 7 },
  suggestions: { gap: 8 }, suggestion: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 13, minHeight: 46, borderWidth: 1, borderRadius: 13 }, suggestionText: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
  sources: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }, source: { flexDirection: "row", alignItems: "center", gap: 5, padding: 10, minHeight: 44, borderWidth: 1, borderRadius: 11, maxWidth: "100%" }, sourceText: { fontSize: 11, fontWeight: "600", flexShrink: 1 },
  status: { fontSize: 12, lineHeight: 19 }, footer: { borderTopWidth: 1, padding: 12 }, form: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 17, padding: 5 },
  input: { minHeight: 44, flex: 1, minWidth: 0, paddingHorizontal: 9, fontSize: 16 }, send: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  footerLinks: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: 8 }, footerLink: { minHeight: 36, justifyContent: "center", paddingHorizontal: 2, marginTop: 5 }, linkText: { fontSize: 10, textDecorationLine: "underline" }
});
