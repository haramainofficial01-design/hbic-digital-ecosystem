import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { challengeAuth, challengeRequest, challengeSelection, type ChallengeSelection } from "./challengeClient";
import { ChallengePracticeClock } from "./challengePracticeClock";
import type { QuranMode, ReturnTypeQuranAudio } from "./types";
const pendingKey = "hbic:quran:challenge:receipt:v1";
type Receipt = ChallengeSelection & { sessionId: string; seconds: number };
export function useQuranChallengePractice(mode: QuranMode, audio: ReturnTypeQuranAudio, captureActive = false) {
  const [selection, setSelection] = useState<ChallengeSelection | null>(null);
  const visible = useRef(false), appActive = useRef(AppState.currentState === "active"), playing = useRef(false);
  const enabledMode = useRef(false); enabledMode.current = ["read", "listen", "practice", "memorize", "test"].includes(mode);
  const capturing = useRef(captureActive); capturing.current = captureActive;
  const clock = useRef<ChallengePracticeClock | null>(null), touched = useRef(Date.now());
  useFocusEffect(useCallback(() => { visible.current = true; return () => { visible.current = false; }; }, []));
  useEffect(() => {
    let active = true, notified = false;
    const unsubscribe = challengeSelection.subscribe(value => { notified = true; setSelection(value); });
    void challengeSelection.read().then(value => { if (active && !notified) setSelection(value); }).catch(() => {});
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!selection) return;
    const { eventId, uid, startsAt, endsAt } = selection;
    let cancelled = false, inFlight = false, nextAttemptAt = 0, timer: ReturnType<typeof setInterval> | null = null;
    appActive.current = AppState.currentState === "active"; playing.current = audio.player.playing;
    let session: { id: string; expiresAt: number } | null = null, pendingReceipt: Receipt | null = null;
    const eligible = () => !cancelled && visible.current && appActive.current && enabledMode.current && Date.now() >= startsAt && Date.now() < endsAt && challengeAuth().currentUser?.uid === uid;
    async function flush() {
      if (session) {
        pendingReceipt = { eventId, uid, startsAt, endsAt, sessionId: session.id, seconds: clock.current?.seconds ?? 0 };
        session = null; clock.current = null;
        await AsyncStorage.setItem(pendingKey, JSON.stringify(pendingReceipt));
      }
      if (pendingReceipt && challengeAuth().currentUser?.uid === pendingReceipt.uid) {
        try { await challengeRequest("", { action: "finish", ...pendingReceipt }, true); }
        catch (error) { if ((error as { status?: number }).status !== 400) throw error; /* Invalid/withdrawn lease cannot earn time; do not retry forever. */ }
        pendingReceipt = null; await AsyncStorage.removeItem(pendingKey);
      }
    }
    async function tick() {
      if (inFlight || Date.now() < nextAttemptAt) return;
      inFlight = true;
      try {
        if (!eligible()) { await flush(); return; }
        if (pendingReceipt) await flush();
        const continuousPractice = playing.current || capturing.current;
        if (!session && (continuousPractice || Date.now() - touched.current < 60000)) {
          const data = await challengeRequest("", { action: "start", eventId }, true);
          session = data.session; clock.current = new ChallengePracticeClock(Date.now());
          if (!eligible()) { await flush(); return; }
        }
        if (session) {
          clock.current?.touch(touched.current);
          clock.current?.sample(Date.now(), eligible(), continuousPractice);
          if (Date.now() >= session.expiresAt || !continuousPractice && Date.now() - touched.current >= 60000) await flush();
        }
      } catch { nextAttemptAt = Date.now() + 60000; /* No rapid polling on errors, no offline credit. */ }
      finally { inFlight = false; if (cancelled && session) void flush().catch(() => {}); }
    }
    const app = AppState.addEventListener("change", state => { appActive.current = state === "active"; if (!appActive.current) void tick(); });
    const player = audio.player.addListener("playbackStatusUpdate", status => { playing.current = status.playing; });
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(pendingKey);
        if (raw) { const old: Receipt = JSON.parse(raw); if (old.uid === uid) pendingReceipt = old; }
      } catch { /* Invalid local recovery data never earns time. */ }
      if (cancelled) return;
      timer = setInterval(() => void tick(), 10000); void tick();
    })();
    return () => { cancelled = true; if (timer) clearInterval(timer); app.remove(); player.remove(); if (!inFlight) void flush().catch(() => {}); };
  }, [selection, audio.player]);
  return useCallback(() => { touched.current = Date.now(); clock.current?.touch(touched.current); }, []);
}
