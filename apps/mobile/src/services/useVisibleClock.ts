import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { startVisibleClock } from "./visibleClock";

export function useVisibleClock(intervalMs = 30_000, onTick?: (now: Date) => void) {
  const [now, setNow] = useState(() => new Date());
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  useFocusEffect(useCallback(() => startVisibleClock(
    () => { const fresh = new Date(); setNow(fresh); onTickRef.current?.(fresh); },
    intervalMs,
    (listener) => {
      const subscription = AppState.addEventListener("change", (state) => listener(state === "active"));
      return () => subscription.remove();
    },
    AppState.currentState === "active"
  ), [intervalMs]));
  return now;
}

// The onboarding overlay lives outside an individual navigation screen.
export function useAppClock(enabled: boolean, intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    return startVisibleClock(() => setNow(new Date()), intervalMs, (listener) => {
      const subscription = AppState.addEventListener("change", (state) => listener(state === "active"));
      return () => subscription.remove();
    }, AppState.currentState === "active");
  }, [enabled, intervalMs]);
  return now;
}
