import { Ionicons } from "@expo/vector-icons";
import { bilalCompanionDisclaimer, bilalCompanionName, bilalCompanionSuggestions, bilalCompanionWelcome, companionVisibleOnRoute, safeCompanionLink, type CompanionReply } from "@hbic/shared";
import { usePathname } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
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

type Message = { id: number; role: "user" | "assistant"; text: string; reply?: CompanionReply };

/** Deliberately opened, memory-only companion. No background inference or animation loop. */
export function BilalCompanion() {
  const pathname = usePathname(), { content, loading } = usePublishedContent(), { active: onboarding } = useOnboarding();
  const { theme } = useAppTheme(), { language, translate: t } = useAppLanguage(), insets = useSafeAreaInsets(), { height } = useWindowDimensions();
  const [open, setOpen] = useState(false), [foreground, setForeground] = useState(AppState.currentState === "active"), [reduceMotion, setReduceMotion] = useState(true);
  const [draft, setDraft] = useState(""), [messages, setMessages] = useState<Message[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const input = useRef<TextInput>(null), scroll = useRef<ScrollView>(null), sequence = useRef(0), locked = useRef(false), controller = useRef<AbortController | null>(null);
  const eligible = !onboarding && !loading && foreground && content.featureFlags.bilalCompanionEnabled && companionVisibleOnRoute(pathname, true);
  function close() { controller.current?.abort(); controller.current = null; locked.current = false; setBusy(false); setOpen(false); }

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const state = AppState.addEventListener("change", value => setForeground(value === "active"));
    // A notification must not leave a chat covering a more important action.
    const received = Notifications.addNotificationReceivedListener(close);
    const tapped = Notifications.addNotificationResponseReceivedListener(close);
    return () => { mounted = false; motion.remove(); state.remove(); received.remove(); tapped.remove(); controller.current?.abort(); };
  }, []);
  useEffect(() => { close(); }, [pathname, eligible]);
  useEffect(() => { setCompanionActive(open && eligible); return () => { setCompanionActive(false); }; }, [open, eligible]);

  async function send(question = draft) {
    const text = question.trim();
    if (!text || text.length > 800 || locked.current) return;
    if (messages.filter(message => message.role === "user").length >= 20) { setError(t("Please clear this chat to start a new conversation.")); return; }
    noteRatingHomeInteraction(); locked.current = true; setBusy(true); setDraft(""); setError("");
    const previousQuestions = messages.filter(message => message.role === "user").slice(-4).map(message => message.text);
    setMessages(current => [...current, { id: ++sequence.current, role: "user", text }]);
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 20_000);
    try {
      const reply = await askBilalCompanion({ question: text, previousQuestions }, abort.signal);
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
  if (!eligible) return null;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={t("Open Bilal Companion")} testID="bilal-companion-launcher"
      onPress={() => { noteRatingHomeInteraction(); setOpen(true); }}
      style={({ pressed }) => [styles.launcher, { right: Math.max(16, insets.right + 12), bottom: isMacQuranHost ? 24 : Math.max(12, insets.bottom) + 86, opacity: pressed ? .85 : 1 }]}>
      <Ionicons name="chatbubble-ellipses-outline" size={23} color="#F1D98D" /><Text style={styles.launcherLabel}>{t("Ask Bilal")}</Text>
    </Pressable>
    <Modal visible={open} transparent animationType={reduceMotion ? "none" : "fade"} onRequestClose={close} onShow={() => input.current?.focus()} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable accessibilityLabel={t("Close chat")} accessibilityRole="button" onPress={close} style={styles.scrim} />
        <View accessibilityViewIsModal style={[styles.panel, { maxHeight: Math.max(220, height - insets.top - insets.bottom - 28), marginBottom: Math.max(12, insets.bottom), marginRight: Math.max(12, insets.right), backgroundColor: c.surface, borderColor: c.borderStrong }]}>
          <View style={styles.header}>
            <View style={styles.mark}><Ionicons name="chatbubble-ellipses-outline" size={23} color="#F1D98D" /></View>
            <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>{bilalCompanionName}</Text><Text style={styles.subtitle}>{t("Your Masjid Bilal companion")}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Clear chat")} disabled={busy || !messages.length} onPress={() => { setMessages([]); setDraft(""); setError(""); input.current?.focus(); }} style={[styles.iconButton, { opacity: busy || !messages.length ? .4 : 1 }]}><Ionicons name="refresh-outline" size={20} color="white" /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Close chat")} onPress={close} style={styles.iconButton}><Ionicons name="close" size={24} color="white" /></Pressable>
          </View>
          <View style={[styles.notice, { backgroundColor: c.tintSoft, borderColor: c.border }]}>
            <Text style={[styles.noticeText, { color: c.muted }]}>{t(bilalCompanionDisclaimer)}</Text>
            {language !== "en" ? <Text style={[styles.noticeText, { color: c.muted }]}>{t("Answers quote published English information.")}</Text> : null}
          </View>
          <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
            <View style={[styles.bubble, styles.assistant, { backgroundColor: c.tintSoft, borderColor: c.border }]}><Text style={[styles.message, { color: c.text }]}>{t(bilalCompanionWelcome)}</Text></View>
            {!messages.length ? <View style={styles.suggestions}>{bilalCompanionSuggestions.map(question => <Pressable key={question} accessibilityRole="button" onPress={() => void send(question)} disabled={busy} style={[styles.suggestion, { backgroundColor: c.surfaceStrong, borderColor: c.border }]}><Text style={[styles.suggestionText, { color: c.text }]}>{t(question)}</Text><Ionicons name="arrow-forward" size={16} color={c.tint} /></Pressable>)}</View> : null}
            {messages.map(message => <View key={message.id} style={[styles.bubble, message.role === "user" ? styles.user : styles.assistant, { backgroundColor: message.role === "user" ? c.tint : c.tintSoft, borderColor: c.border }]}>
              <Text selectable style={[styles.message, { color: message.role === "user" ? c.onTint : c.text }]}>{message.text}</Text>
              {message.reply ? <>
                <View style={styles.sources}>{message.reply.sources.map(source => <Pressable accessibilityRole="link" accessibilityLabel={source.title} key={source.id} onPress={() => void openSource(source.href)} style={[styles.source, { backgroundColor: c.surface, borderColor: c.border }]}><Text style={[styles.sourceText, { color: c.text }]}>{source.title}</Text><Ionicons name="arrow-up-right-box" size={13} color={c.tint} /></Pressable>)}</View>
                <Text style={[styles.meta, { color: c.muted }]}>{t("Published information")} · {new Date(message.reply.asOf).toLocaleTimeString("en-CA", { timeZone: "America/Edmonton", hour: "numeric", minute: "2-digit" })} Calgary</Text>
              </> : null}
            </View>)}
            {busy ? <Text accessibilityLiveRegion="polite" style={[styles.status, { color: c.muted }]}>{t("Checking published information…")}</Text> : null}
            {error ? <Text accessibilityRole="alert" style={[styles.status, { color: c.danger }]}>{error}</Text> : null}
          </ScrollView>
          <View style={[styles.footer, { borderColor: c.border }]}>
            <View style={[styles.form, { backgroundColor: c.surfaceStrong, borderColor: c.border }]}>
              <TextInput ref={input} style={[styles.input, { color: c.text }]} placeholder={t("Ask about Masjid Bilal…")} placeholderTextColor={c.muted} accessibilityLabel={t("Your question")} value={draft} maxLength={800} autoComplete="off" editable={!busy} onChangeText={value => { noteRatingHomeInteraction(); setDraft(value); }} onSubmitEditing={() => void send()} returnKeyType="send" />
              <Pressable accessibilityRole="button" accessibilityLabel={t("Send question")} disabled={busy || !draft.trim()} onPress={() => void send()} style={[styles.send, { backgroundColor: c.tint, opacity: busy || !draft.trim() ? .4 : 1 }]}><Ionicons name="arrow-up" size={22} color={c.onTint} /></Pressable>
            </View>
            <View style={styles.footerLinks}><Text style={[styles.meta, { color: c.muted }]}>{t("This session only")}</Text><Pressable accessibilityRole="link" onPress={() => void openSource("/privacy#bilal-companion")} style={styles.footerLink}><Text style={[styles.linkText, { color: c.tint }]}>{t("Privacy")}</Text></Pressable><Pressable accessibilityRole="link" onPress={() => void openSource("/contact")} style={styles.footerLink}><Text style={[styles.linkText, { color: c.tint }]}>{t("Contact the office")}</Text></Pressable></View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
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
