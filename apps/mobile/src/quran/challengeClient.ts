import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QuranChallenge } from "@hbic/shared";
const base = (process.env.EXPO_PUBLIC_API_URL || "https://hbic.ca").replace(/\/$/, "");
const selectionKey = "hbic:quran:challenge:selection:v1";
export type ChallengeSelection = { eventId: string; uid: string; startsAt: number; endsAt: number };
const listeners = new Set<(selection: ChallengeSelection | null) => void>();
export const challengeSelection = {
  async read(): Promise<ChallengeSelection | null> {
    const raw = await AsyncStorage.getItem(selectionKey); if (!raw) return null;
    try { const value = JSON.parse(raw); return typeof value.eventId === "string" && typeof value.uid === "string" && Number.isFinite(value.startsAt) && Number.isFinite(value.endsAt) ? value : null; } catch { return null; }
  },
  async set(selection: ChallengeSelection | null) {
    if (selection) await AsyncStorage.setItem(selectionKey, JSON.stringify(selection)); else await AsyncStorage.removeItem(selectionKey);
    listeners.forEach(fn => fn(selection));
  },
  subscribe(fn: (selection: ChallengeSelection | null) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
};
export function challengeAuth() {
  // Optional account modules are not loaded by anonymous reading/listening.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require("../services/firebase") as typeof import("../services/firebase")).auth;
}
export async function challengeRequest(path = "", body?: Record<string, unknown>, personal = false) {
  const user = personal ? challengeAuth().currentUser : null;
  if (personal && (!user?.emailVerified)) throw new Error("Sign in and verify your email to participate.");
  const token = user ? await user.getIdToken() : null;
  const request = new AbortController(), timeout = setTimeout(() => request.abort(), 15000);
  try {
    const response = await fetch(`${base}/api/quran/challenges${path}`, { method: body ? "POST" : "GET", signal: request.signal,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json(); if (!response.ok || data.ok === false) throw Object.assign(new Error(data.error ?? "Challenges are temporarily unavailable."), { status: response.status });
    return data as { events: QuranChallenge[]; event: QuranChallenge; rows: { rank: number; nickname: string; seconds: number }[]; me: { nickname: string; seconds: number } | null;
      session: { id: string; eventId: string; expiresAt: number; startedAt: number }; credited: number };
  } finally { clearTimeout(timeout); }
}
