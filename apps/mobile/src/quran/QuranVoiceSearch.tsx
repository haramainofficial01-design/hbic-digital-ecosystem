import { useEffect, useRef, useState } from "react";
import { Alert, AppState, Platform, Text, View } from "react-native";
import { AudioModule } from "expo-audio";
import { requireOptionalNativeModule, NativeModule } from "expo-modules-core";
import { AppButton } from "../components/AppButton";
import { useAppTheme } from "../theme/ThemeProvider";
type Events = { onResult: (event: { text: string; final: boolean }) => void; onEnd: () => void; onError: (event: { message: string }) => void };
declare class VoiceModule extends NativeModule<Events> {
  available(locale: string): boolean;
  start(locale: string): Promise<void>;
  stop(): Promise<void>;
}
const native = Platform.OS === "web" ? null : requireOptionalNativeModule<VoiceModule>("QuranVoiceSearch");
export function QuranVoiceSearch({ onQuery, stopPlayback }: { onQuery: (query: string) => void; stopPlayback: () => void }) {
  const { theme } = useAppTheme();
  const [locale, setLocale] = useState("en-US"), [phase, setPhase] = useState<"idle" | "starting" | "listening">("idle");
  const [heard, setHeard] = useState(""), [error, setError] = useState<string | null>(null);
  const current = useRef({ onQuery, stopPlayback }); current.current = { onQuery, stopPlayback };
  const epoch = useRef(0), mounted = useRef(true), lastHeard = useRef("");
  const available = Boolean(native?.available(locale));
  useEffect(() => {
    mounted.current = true;
    if (!native) return () => { mounted.current = false; };
    const result = native.addListener("onResult", (event) => {
      const text = event.text.slice(0, 120); lastHeard.current = text; setHeard(text);
      if (event.final) { current.current.onQuery(text); setPhase("idle"); }
    });
    const end = native.addListener("onEnd", () => setPhase("idle"));
    const failure = native.addListener("onError", (event) => { setError(event.message); setPhase("idle"); });
    const background = AppState.addEventListener("change", (state) => { if (state !== "active") { ++epoch.current; void native.stop(); } });
    return () => {
      mounted.current = false;
      // This is a session generation counter, not a DOM/native element ref.
      // Cleanup must invalidate the latest pending permission request.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++epoch.current;
      result.remove(); end.remove(); failure.remove(); background.remove(); void native.stop();
    };
  }, []);
  async function start() {
    if (!native || !available || phase !== "idle") return;
    const token = ++epoch.current; setPhase("starting"); setError(null); setHeard(""); lastHeard.current = ""; current.current.stopPlayback();
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error("Microphone permission was declined. You can still type your search.");
      if (token !== epoch.current || !mounted.current || AppState.currentState !== "active") return;
      await native.start(locale);
      if (token === epoch.current && mounted.current) setPhase("listening"); else await native.stop();
    } catch (reason) { if (mounted.current) { setPhase("idle"); setError(reason instanceof Error ? reason.message : "Voice search is unavailable."); } }
  }
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      <AppButton label={phase === "idle" ? "Search by voice" : "Stop voice search"} variant="secondary" icon={phase === "idle" ? "mic-outline" : "stop-circle-outline"} disabled={!available} onPress={() => {
        if (phase !== "idle") { ++epoch.current; void native?.stop(); if (lastHeard.current) current.current.onQuery(lastHeard.current); setPhase("idle"); return; }
        Alert.alert("Voice navigation", "Say a surah name or an ayah reference. Speech is processed on this device; no microphone audio is stored or sent by HBIC. Listening stops after 20 seconds or when you leave this screen.", [{ text: "Not now", style: "cancel" }, { text: "Continue", onPress: () => void start() }]);
      }} />
      <AppButton label={locale === "en-US" ? "English voice" : "Arabic voice"} variant="ghost" disabled={phase !== "idle"} onPress={() => setLocale((v) => v === "en-US" ? "ar-SA" : "en-US")} />
    </View>
    {phase !== "idle" ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.teal, fontSize: 15 }}>{heard || (phase === "starting" ? "Preparing microphone…" : "Listening…")}</Text> : null}
    {!available ? <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 20 }}>On-device voice search is unavailable for this language on this device. Use the search box instead.</Text> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger, fontSize: 14 }}>{error}</Text> : null}
  </View>;
}
