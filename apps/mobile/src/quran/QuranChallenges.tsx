import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Switch, View } from "react-native";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, type User } from "firebase/auth";
import { challengeActive, type QuranChallenge } from "@hbic/shared";
import { Text, TextInput, Alert } from "../i18n/LocalizedText";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppButton } from "../components/AppButton";
import { QuranSurface } from "./QuranControls";
import { challengeAuth, challengeRequest, challengeSelection, type ChallengeSelection } from "./challengeClient";
export function QuranChallenges() {
  const { theme } = useAppTheme();
  const [events, setEvents] = useState<QuranChallenge[]>([]), [event, setEvent] = useState<QuranChallenge | null>(null);
  const [user, setUser] = useState<User | null>(null), [rows, setRows] = useState<{rank: number; nickname: string; seconds: number}[]>([]);
  const [me, setMe] = useState<{nickname: string; seconds: number} | null>(null);
  const [counting, setCounting] = useState<ChallengeSelection | null>(null);
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [nickname, setNickname] = useState("");
  const [consent, setConsent] = useState(false), [adult, setAdult] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const text = { color: theme.colors.muted, fontSize: 15, lineHeight: 23 };
  const input = { color: theme.colors.text, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 15, padding: 14, minHeight: 52, fontSize: 16 };
  async function action(job: () => Promise<unknown>) {
    if (busy) return; setBusy(true); setError(null);
    try { await job(); } catch (e) { setError(e instanceof Error ? e.message : "Could not finish. Please retry."); } finally { setBusy(false); }
  }
  async function load(selected?: QuranChallenge) {
    if (!selected) { const data = await challengeRequest(); setEvents(data.events); return; }
    const data = await challengeRequest(`?id=${selected.id}`, undefined, Boolean(challengeAuth().currentUser?.emailVerified));
    setEvent(data.event); setRows(data.rows); setMe(data.me); if (data.me) setNickname(data.me.nickname);
  }
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(challengeAuth(), value => { setUser(value); setMe(null); });
    void action(() => load()); return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let active = true, notified = false;
    const unsubscribe = challengeSelection.subscribe(value => { notified = true; setCounting(value); });
    void challengeSelection.read().then(value => { if (active && !notified) setCounting(value); }).catch(() => {});
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => { if (event) void action(() => load(event)); }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 14, maxWidth: 840, width: "100%", alignSelf: "center" }}>
    <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "700" }}>Community Challenges</Text>
    <Text style={text}>Optional nickname rankings for daily practice, Ramadan and the first ten days of Dhul Hijjah. Only events and prize details actually published by HBIC appear here.</Text>
    <Text style={text}>Practice time is server-timed and capped to foreground sessions. It is not a recitation-accuracy score or proof of prize eligibility; staff reviews the rules and results. Audio and word-review history are never shared.</Text>
    {busy ? <ActivityIndicator color={theme.colors.teal} /> : null}
    {error ? <Text accessibilityRole="alert" style={{ ...text, color: theme.colors.danger }}>{error}</Text> : null}
    {!events.length && !busy ? <QuranSurface><Text style={text}>No published event is available right now. Your private reading and practice continue without signing in.</Text><AppButton label="Check for events" variant="secondary" onPress={() => void action(() => load())} /></QuranSurface> : null}
    {events.map(item => <AppButton key={item.id} label={`${item.title}${challengeActive(item) ? " · Active" : " · Upcoming"}`} variant={event?.id === item.id ? "primary" : "secondary"} onPress={() => void action(() => load(item))} />)}
    {event ? <QuranSurface><Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "700" }}>{event.title}</Text>
      <Text style={text}>{new Date(event.startsAt).toLocaleDateString()} – {new Date(event.endsAt).toLocaleDateString()}</Text>
      <Text style={{ ...text, marginTop: 12 }}>{event.rules}</Text>
      <Text style={{ ...text, marginTop: 12 }}>{event.prizeDetails ? `Staff-published prize details: ${event.prizeDetails}` : "No prizes have been published for this event."}</Text>
      {rows.length ? rows.map(row => <View key={row.rank} style={{ flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: theme.colors.border }}><Text style={{ color: theme.colors.teal }}>{row.rank}</Text><Text style={{ color: theme.colors.text, flex: 1 }}>{row.nickname}</Text><Text style={text}>{Math.floor(row.seconds / 60)} min</Text></View>) : <Text style={text}>No public standings yet.</Text>}
      <AppButton label="Refresh standings" variant="ghost" disabled={busy} onPress={() => void action(() => load(event))} />
      {me ? <View style={{ gap: 12 }}><Text style={{ color: theme.colors.teal }}>Participating as {me.nickname} · {Math.floor(me.seconds / 60)} min</Text><Text style={text}>Reading, listening and practice count only while this Quran section is foregrounded and engaged. Idle reading pauses after one minute without a touch. Time updates in batches of up to five minutes, not every second.</Text>
        {user && counting?.eventId === event.id && counting.uid === user.uid ? <Text style={{ color: theme.colors.teal }}>This event is selected for your practice time.</Text> : <AppButton label="Count practice for this event" variant="secondary" disabled={busy || !user} onPress={() => void action(async () => {
          if (user) await challengeSelection.set({ eventId: event.id, uid: user.uid, startsAt: Date.parse(event.startsAt), endsAt: Date.parse(event.endsAt) });
        })} />}
        <AppButton label="Leave and remove my standing" variant="ghost" disabled={busy} onPress={() => Alert.alert("Leave this event?", "Your public nickname and total will be removed. Private recordings and Quran progress are unchanged.", [{ text: "Stay", style: "cancel" }, { text: "Leave", style: "destructive", onPress: () => void action(async () => { await challengeSelection.set(null); await challengeRequest("", { action: "leave", eventId: event.id }, true); setMe(null); await load(event); }) }])} />
      </View> : user?.emailVerified ? <View style={{ gap: 12 }}><TextInput accessibilityLabel="Public challenge nickname" value={nickname} onChangeText={setNickname} placeholder="Nickname, not your full name" maxLength={24} style={input} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Text style={{ ...text, flex: 1 }}>I am 18 or older. Parents may participate under their own nickname.</Text><Switch accessibilityLabel="Adult participant confirmation" value={adult} onValueChange={setAdult} /></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Text style={{ ...text, flex: 1 }}>I agree to the event rules and public nickname/time ranking. I can leave and remove my standing anytime.</Text><Switch accessibilityLabel="Public leaderboard consent" value={consent} onValueChange={setConsent} /></View>
        <AppButton label="Join with my nickname" disabled={busy || !adult || !consent} onPress={() => void action(async () => { await challengeRequest("", { action: "join", eventId: event.id, nickname, consent, adult }, true); await challengeSelection.set({ eventId: event.id, uid: user.uid, startsAt: Date.parse(event.startsAt), endsAt: Date.parse(event.endsAt) }); await load(event); })} />
      </View> : null}
    </QuranSurface> : null}
    {event && !user ? <QuranSurface><Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "700" }}>Optional account</Text><Text style={text}>Use your existing HBIC account, or create one. This does not create an Academy registration. Reading and personal practice never require an account.</Text><View style={{ gap: 10, marginTop: 12 }}>
      <TextInput accessibilityLabel="Challenge account email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} placeholder="Email" style={input} />
      <TextInput accessibilityLabel="Challenge account password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} placeholder="Password" style={input} />
      <AppButton label="Sign in" disabled={busy} onPress={() => void action(async () => { await signInWithEmailAndPassword(challengeAuth(), email.trim(), password); setPassword(""); await load(event); })} />
      <AppButton label="Create optional account" variant="secondary" disabled={busy} onPress={() => void action(async () => { const account = await createUserWithEmailAndPassword(challengeAuth(), email.trim(), password); setPassword(""); await sendEmailVerification(account.user); setError("Verification email sent. Verify your email, then refresh account status."); })} />
      <AppButton label="Forgot password?" variant="ghost" disabled={busy || !email.trim()} onPress={() => void action(async () => { await sendPasswordResetEmail(challengeAuth(), email.trim()); setError("If this registered email is eligible, a reset email has been sent."); })} />
    </View></QuranSurface> : null}
    {user ? <QuranSurface><Text style={text}>{user.emailVerified ? "Verified account connected." : "Verify your email before joining a public leaderboard."}</Text>
      {!user.emailVerified ? <AppButton label="Refresh account status" variant="secondary" disabled={busy} onPress={() => void action(async () => { await user.reload(); await user.getIdToken(true); setUser(challengeAuth().currentUser); if (event) await load(event); })} /> : null}
      <AppButton label="Sign out of HBIC account" variant="ghost" disabled={busy} onPress={() => void action(async () => { await challengeSelection.set(null); await signOut(challengeAuth()); setMe(null); })} />
    </QuranSurface> : null}
  </ScrollView>;
}
