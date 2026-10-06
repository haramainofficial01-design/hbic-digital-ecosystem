import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Image, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ACADEMY_TUITION_POLICY, ACADEMY_TUITION_POLICY_VERSION, ACADEMY_LAST_BILLING_MONTH, academyCashReminderStage, academyEnrollmentStartPeriod, academyNextMonthEnrollmentOpen, dateStringInTimeZone, masjidTimeZone, type AcademyChildInput, type AcademyPublicFamily, type AcademyRegistrationInput } from "@hbic/shared";
import { AppScreen } from "../components/AppScreen";
import { AppButton } from "../components/AppButton";
import { GlassCard } from "../components/GlassCard";
import { academyEnabled } from "../config/releaseFeatures";
import { auth } from "../services/firebase";
import { registerForPushNotificationsAsync } from "../services/notifications";
import { reconcileAcademyCashReminders } from "../services/academyReminders";
import { useAppTheme } from "../theme/ThemeProvider";

const api = (process.env.EXPO_PUBLIC_API_URL || "https://hbic.ca").replace(/\/$/, "");
const child = (): AcademyChildInput => ({ name: "", age: 8, level: "not_sure" });
type AcademyContent = { classes: { id: string; name: string; dayOfWeek: number; startTime: string; room: string }[]; calendar: { id: string; title: string; date: string; type: string }[]; announcements: { id: string; title: string; message: string }[] };
type AcademyPayment = { period: string; method: "cash" | "card"; status: string; amountCents: number | null; invoiceUrl: string | null };
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Cooldown between verification-email resends: long enough to stop accidental
// double-taps, short enough that a parent missing the email is not stuck.
const VERIFY_RESEND_COOLDOWN_SECONDS = 60;

export default function QuranAcademyScreen() {
  const { theme } = useAppTheme();
  const [user, setUser] = useState<User | null>(null);
  const [verified, setVerified] = useState(false);
  const [family, setFamily] = useState<AcademyPublicFamily | null>(null);
  const [content, setContent] = useState<AcademyContent | null>(null);
  const [payments, setPayments] = useState<AcademyPayment[]>([]);
  const [receipts, setReceipts] = useState<{ number: string; period: string; amountCents: number; billingMode: "test" | "live" }[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newAccount, setNewAccount] = useState(false);
  const [form, setForm] = useState<AcademyRegistrationInput>({ guardianName: "", phone: "", email: "", whatsappConsent: false, children: [child()], paymentChoice: "card", policyVersion: ACADEMY_TUITION_POLICY_VERSION, policyAccepted: false, recurringAuthorized: false });
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [cardAvailable, setCardAvailable] = useState(false);
  const [serverCashReminders, setServerCashReminders] = useState(false);
  const [serverDeviceRegistered, setServerDeviceRegistered] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [authorizeCardSwitch, setAuthorizeCardSwitch] = useState(false);
  const academyPushToken = useRef<string | null>(null);
  const cashReminder = family?.paymentChoice === "cash" ? academyCashReminderStage(new Date(), family.cashReminderEligible, family.paymentState) : null;
  const calgaryToday = dateStringInTimeZone(new Date(), masjidTimeZone);
  const nextStartPeriod = academyNextMonthEnrollmentOpen() && calgaryToday.slice(0, 7) < ACADEMY_LAST_BILLING_MONTH ? academyEnrollmentStartPeriod("next") : null;
  const classStart = family?.enrollmentStartPeriod && `${family.enrollmentStartPeriod}-01` > calgaryToday ? `${family.enrollmentStartPeriod}-01` : calgaryToday;
  const nextClass = content?.calendar.find((item) => item.date >= classStart && item.type === "class");
  const nextClosure = content?.calendar.find((item) => item.date >= calgaryToday && (item.type === "holiday" || item.type === "no_class"));

  useEffect(() => { if (academyEnabled) void fetch(`${api}/api/academy/billing`).then((response) => response.json()).then((data) => {
    setCardAvailable(data.cardAvailable === true); setRegistrationOpen(data.registrationOpen === true);
    setServerCashReminders(data.serverCashRemindersAvailable === true);
  }).catch(() => { setCardAvailable(false); setRegistrationOpen(false); }); }, []);

  // Reloads the Firebase user and force-refreshes the ID token, then publishes
  // the refreshed state. Reads auth.currentUser fresh AFTER the reload — never
  // a captured user object — so the UI cannot keep showing a pre-reload
  // emailVerified=false after verification succeeded.
  async function refreshVerification(): Promise<boolean> {
    const target = auth.currentUser;
    if (!target) { setUser(null); setVerified(false); return false; }
    try {
      await target.reload();
      await target.getIdToken(true);
    } catch {
      // A network failure here must not sign the parent out; fall through and
      // report whatever verified state Firebase currently has.
    }
    const fresh = auth.currentUser ?? target;
    setUser(fresh);
    const ok = fresh.emailVerified === true;
    setVerified(ok);
    return ok;
  }

  useEffect(() => onAuthStateChanged(auth, (next) => {
    setUser(next); setVerified(Boolean(next?.emailVerified)); setFamily(null);
    setVerificationEmailSent(false); setResendCooldown(0);
    setServerDeviceRegistered(false);
    if (next?.email) setForm((current) => ({ ...current, email: next.email! }));
    // The auth event can deliver a cached user whose emailVerified predates
    // verification — refresh once so a verified parent is never blocked.
    if (next && !next.emailVerified) void refreshVerification();
  }), []);

  // When the app returns to the foreground after the parent opened the
  // verification link in their mail app or browser, pick up the verified flag
  // automatically — no sign-out/sign-in required.
  useEffect(() => {
    if (!user || verified) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshVerification();
    });
    return () => subscription.remove();
  }, [user, verified]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const refresh = useCallback(async () => {
    if (!user || !verified) return;
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch(`${api}/api/academy/family`, { headers: { Authorization: `Bearer ${idToken}` } });
      if (response.status === 401) {
        // The cached session may predate verification (or have lapsed).
        // Reconcile against freshly reloaded auth before showing anything.
        const wasVerified = verified;
        const ok = await refreshVerification();
        if (!auth.currentUser) { setStatus("Sign in to continue your Quran Academy registration."); return; }
        if (!ok) { setStatus(""); return; } // the verify screen (not a warning banner) guides the parent
        if (!wasVerified) return; // flipped to verified — refresh re-runs via `verified` and retries with a fresh token
        // Verified per Firebase, yet the server still rejects the fresh
        // token: surface it instead of spinning silently (server config issue).
        setStatus("Academy sign-in could not be confirmed. Please sign in again.");
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Academy details are unavailable.");
      setFamily(data.family);
      setToken(idToken);
      if (data.family) {
        const contentResponse = await fetch(`${api}/api/academy/content`, { headers: { Authorization: `Bearer ${idToken}` } });
        if (contentResponse.ok) setContent((await contentResponse.json()).content);
        const [paymentsResponse, receiptsResponse] = await Promise.all([
          fetch(`${api}/api/academy/payments`, { headers: { Authorization: `Bearer ${idToken}` } }),
          fetch(`${api}/api/academy/receipts`, { headers: { Authorization: `Bearer ${idToken}` } })
        ]);
        if (paymentsResponse.ok) setPayments((await paymentsResponse.json()).payments ?? []);
        if (receiptsResponse.ok) setReceipts((await receiptsResponse.json()).receipts ?? []);
      }
    } catch (error) { setStatus(error instanceof Error ? error.message : "Academy details are unavailable."); }
  }, [user, verified]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Stripe opens in the parent's browser. Returning to HBIC must retrieve the
  // live webhook-confirmed enrollment, rather than leave a stale pending pass.
  useEffect(() => {
    if (!user || !verified) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [user, verified, refresh]);

  useEffect(() => {
    if (!user || !family) return;
    void reconcileAcademyCashReminders(family, new Date(), serverCashReminders && serverDeviceRegistered).catch(() => undefined);
    void registerAcademyDevice(false);
    // Family changes are the canonical trigger for local reminder reconciliation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, family, serverCashReminders, serverDeviceRegistered]);

  async function registerAcademyDevice(requestPermission: boolean) {
    if (!user || !family) return;
    const pushToken = await registerForPushNotificationsAsync({ requestPermission });
    if (!pushToken) { if (requestPermission) setStatus("Enable notifications in your device settings to receive Academy updates."); return; }
    const response = await fetch(`${api}/api/academy/device`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken(true)}` },
      body: JSON.stringify({ token: pushToken, platform: Platform.OS, reminderDelivery: serverCashReminders ? "server" : "local" }) });
    if (!response.ok) throw new Error("Academy update registration could not be completed.");
    academyPushToken.current = pushToken;
    setServerDeviceRegistered(serverCashReminders);
    if (requestPermission) setStatus("Academy updates and cash reminders are enabled on this device.");
  }

  async function signOutAcademy() {
    if (user && academyPushToken.current) {
      await fetch(`${api}/api/academy/device`, { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken(true)}` },
        body: JSON.stringify({ token: academyPushToken.current }) }).catch(() => undefined);
    }
    academyPushToken.current = null;
    setServerDeviceRegistered(false);
    await reconcileAcademyCashReminders(null).catch(() => undefined);
    await signOut(auth);
  }

  async function authenticate() {
    setBusy(true); setStatus("");
    try {
      if (newAccount) {
        if (password.length < 12) throw new Error("Use a password of at least 12 characters.");
        const result = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        await sendEmailVerification(result.user);
        // The verify screen renders the confirmation copy from this flag —
        // nothing is sent automatically beyond this one email.
        setVerificationEmailSent(true);
        setResendCooldown(VERIFY_RESEND_COOLDOWN_SECONDS);
        setStatus("");
      } else {
        await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        await refreshVerification();
      }
      setPassword("");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }

  // Sends exactly one verification email per tap, then starts the cooldown so
  // repeated taps cannot spam the parent's inbox.
  async function resendVerificationEmail() {
    const current = auth.currentUser ?? user;
    if (!current || resendCooldown > 0) return;
    setBusy(true);
    try {
      await sendEmailVerification(current);
      setVerificationEmailSent(true);
      setResendCooldown(VERIFY_RESEND_COOLDOWN_SECONDS);
      setStatus("");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not resend the verification email."); }
    finally { setBusy(false); }
  }

  async function confirmVerifiedEmail() {
    const ok = await refreshVerification();
    if (ok) setStatus("");
    else setStatus("We still don't see a verified email for this address. Open the verification link — check your spam or junk folder — then try again.");
  }

  async function register() {
    if (!user) return;
    setBusy(true); setStatus("");
    try {
      const response = await fetch(`${api}/api/academy/family`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken(true)}` }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Registration failed.");
      setFamily(data.family); setStatus(form.paymentChoice === "card" ? "Finish secure Stripe Checkout to confirm your registration." : "Conditional registration received. Bring your pass and cash tuition to HBIC.");
      await refresh();
      if (form.paymentChoice === "card") await openBilling("checkout", user);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Registration failed."); }
    finally { setBusy(false); }
  }

  async function openBilling(action: "checkout" | "portal", currentUser = user) {
    if (!currentUser) return;
    try {
      const response = await fetch(`${api}/api/academy/billing`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await currentUser.getIdToken(true)}` }, body: JSON.stringify({ action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Billing unavailable.");
      const url = new URL(data.url);
      if (url.protocol !== "https:" || !["checkout.stripe.com", "billing.stripe.com"].includes(url.hostname)) throw new Error("Unexpected billing destination.");
      await Linking.openURL(url.href);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Billing unavailable."); }
  }

  async function cancelChild(childId: string, childName: string) {
    if (!user) return;
    setBusy(true); setStatus("");
    try {
      const response = await fetch(`${api}/api/academy/billing/cancel`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken(true)}` }, body: JSON.stringify({ childId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Cancellation failed.");
      setFamily(data.family);
      setStatus(`${childName}'s enrollment ends ${new Date(data.effectiveAt).toLocaleDateString("en-CA")}. Future renewal for this child has stopped.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Cancellation failed."); }
    finally { setBusy(false); }
  }

  function confirmCancelChild(childId: string, childName: string) {
    Alert.alert("Cancel future enrollment?", `Future charges for ${childName} will stop. Any already-paid period remains available until its end.`, [
      { text: "Keep enrollment", style: "cancel" }, { text: "Cancel enrollment", style: "destructive", onPress: () => void cancelChild(childId, childName) }
    ]);
  }

  async function switchPaymentMethod(method: "card" | "cash") {
    if (!user) return;
    setBusy(true); setStatus("");
    try {
      const response = await fetch(`${api}/api/academy/billing/method`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken(true)}` }, body: JSON.stringify({ method, recurringAuthorized: method === "card" && authorizeCardSwitch }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Payment method could not be changed.");
      setFamily(data.family);
      if (data.checkoutUrl) {
        const url = new URL(data.checkoutUrl);
        if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Unexpected card setup destination.");
        await Linking.openURL(url.href);
      } else setStatus(data.family?.pendingPaymentChoice === "cash" ? `Card billing will stop before cash becomes due for ${data.family.paymentChangeEffectivePeriod}.` : "Payment method updated for the next unpaid tuition month.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Payment method could not be changed."); }
    finally { setBusy(false); }
  }

  const field = (label: string, value: string, onChangeText: (value: string) => void, keyboardType: "default" | "email-address" | "phone-pad" | "number-pad" = "default", secureTextEntry = false) => <View style={styles.field}><Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text><TextInput accessibilityLabel={label} style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surface }]} value={value} onChangeText={onChangeText} keyboardType={keyboardType} secureTextEntry={secureTextEntry} autoCapitalize={keyboardType === "email-address" ? "none" : "words"} /></View>;

  if (!academyEnabled) return <AppScreen><Text>Quran Academy is not available in this build.</Text></AppScreen>;
  return <AppScreen><GlassCard tone="navy"><View style={styles.seal}><Text style={styles.sealTitle}>HBIC QUR’AN ACADEMY</Text><Image source={require("../assets/brand/hbic-logo.png")} style={styles.sealLogo} accessibilityLabel="Masjid Bilal logo" /><Text style={styles.sealFoot}>MASJID BILAL · CALGARY</Text></View><Text style={styles.eyebrow}>MASJID BILAL · CALGARY</Text><Text style={styles.hero}>HBIC Qur’an Academy</Text><Text style={styles.heroBody}>A calm home for your children&apos;s Quran learning, classes, and Academy pass.</Text></GlassCard>
    {!user ? <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>{newAccount && registrationOpen ? "Create parent account" : "Sign in to continue your Quran Academy registration."}</Text>
      {field("Email", email, setEmail, "email-address")}{field("Password", password, setPassword, "default", true)}
      <AppButton label={newAccount ? "Create account" : "Sign in"} disabled={busy} onPress={() => void authenticate()} />
      {registrationOpen ? <AppButton label={newAccount ? "I already have an account" : "Create a parent account"} variant="ghost" onPress={() => setNewAccount(!newAccount)} /> : null}
    </GlassCard> : !verified ? <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Verify your email</Text><Text style={{ color: theme.colors.muted, marginBottom: 16 }}>Open the verification link sent to {user.email}. We need a verified address before saving your children’s information.</Text>{verificationEmailSent ? <><Text style={styles.verificationPrimary}>Verification email sent.</Text><Text style={styles.verificationSecondary}>Didn’t see it? Check your spam or junk folder.</Text></> : null}<AppButton label="I verified my email" onPress={() => void confirmVerifiedEmail()} /><AppButton label={resendCooldown > 0 ? `Resend verification email (${resendCooldown}s)` : "Resend verification email"} variant="secondary" disabled={busy || resendCooldown > 0} onPress={() => void resendVerificationEmail()} /><AppButton label="Use a different email" variant="ghost" onPress={() => void signOutAcademy()} /></GlassCard>
      : family?.enrollmentState === "withdrawn" ? <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Start a new Academy registration</Text><Text style={{ color: theme.colors.muted, marginBottom: 12 }}>Your previous enrollment has ended. Register again for a fresh Academy reference and pass. HBIC keeps required payment records privately.</Text><AppButton label="Register again" disabled={!registrationOpen} onPress={() => { setFamily(null); setForm({ guardianName: "", phone: "", email: user.email?.trim().toLowerCase() ?? "", whatsappConsent: false, children: [child()], paymentChoice: "card", policyVersion: ACADEMY_TUITION_POLICY_VERSION, policyAccepted: false, recurringAuthorized: false }); }} /></GlassCard>
      : !family && !registrationOpen ? <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Registration is temporarily unavailable</Text><Text style={{ color: theme.colors.muted }}>Classes begin Monday, October 5. Please check back shortly.</Text></GlassCard>
      : !family ? <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Register your family</Text><Text style={{ color: theme.colors.muted }}>One short form for all your children. HBIC confirms class placement and tuition.</Text>
        {field("Parent or guardian full name", form.guardianName, (value) => setForm({ ...form, guardianName: value }))}
        {field("Phone", form.phone, (value) => setForm({ ...form, phone: value }), "phone-pad")}
        <Text style={[styles.label, { color: theme.colors.muted }]}>Verified email: {form.email}</Text>
        <View style={styles.row}><Text style={[styles.label, { color: theme.colors.text, flex: 1 }]}>I would like Academy updates through the WhatsApp group. I can join after registering, even while cash tuition is due.</Text><Switch value={form.whatsappConsent} onValueChange={(value) => setForm({ ...form, whatsappConsent: value })} /></View>
        {form.children.map((item, index) => <View key={index} style={[styles.child, { borderColor: theme.colors.border }]}><Text style={[styles.label, { color: theme.colors.text }]}>Child {index + 1}</Text>
          {field("Child's full name", item.name, (value) => setForm({ ...form, children: form.children.map((c, i) => i === index ? { ...c, name: value } : c) }))}
          {field("Age", String(item.age), (value) => setForm({ ...form, children: form.children.map((c, i) => i === index ? { ...c, age: Number(value) } : c) }), "number-pad")}
          <View style={styles.row}>{(["not_sure", "qaida", "quran"] as const).map((level) => <Pressable key={level} style={[styles.level, { backgroundColor: item.level === level ? theme.colors.tintSoft : theme.colors.surface, borderColor: theme.colors.borderStrong }]} onPress={() => setForm({ ...form, children: form.children.map((c, i) => i === index ? { ...c, level } : c) })}><Text style={{ color: theme.colors.text }}>{level === "not_sure" ? "Not sure" : level === "qaida" ? "Qaida" : "Quran"}</Text></Pressable>)}</View>
          {form.children.length > 1 ? <AppButton label="Remove child" variant="ghost" onPress={() => setForm({ ...form, children: form.children.filter((_, i) => i !== index) })} /> : null}
        </View>)}
        <AppButton label="Add another child" variant="secondary" disabled={form.children.length >= 8} onPress={() => setForm({ ...form, children: [...form.children, child()] })} />
        <Text style={[styles.label, { color: theme.colors.text, marginVertical: 14 }]}>When would you like to start?</Text>
        <View style={styles.row}><AppButton label="This month · $50 per child now" variant={form.startChoice !== "next" ? "primary" : "secondary"} onPress={() => setForm({ ...form, startChoice: "current" })} />{nextStartPeriod ? <AppButton label={`Next month · start ${nextStartPeriod}-01`} variant={form.startChoice === "next" ? "primary" : "secondary"} onPress={() => setForm({ ...form, startChoice: "next" })} /> : null}</View>
        <Text style={{ color: theme.colors.muted, lineHeight: 22, marginTop: 10 }}>{form.startChoice === "next" ? `No classes or tuition this month. We securely collect your card now; the first $50-per-child tuition is charged on ${nextStartPeriod}-01. Cash is due at HBIC that day.` : "The full current-month tuition—$50 per child, with no proration—is due now. Card Checkout charges it now, then renews at $50 per child on the 1st unless you cancel. Cash is due in person at HBIC."}</Text>
        <Text style={[styles.label, { color: theme.colors.muted, marginVertical: 14 }]}>How would you like to pay?</Text>
        <View style={styles.row}><AppButton label={cardAvailable ? "Card monthly" : "Card not ready"} variant={form.paymentChoice === "card" ? "primary" : "secondary"} disabled={!cardAvailable} onPress={() => setForm({ ...form, paymentChoice: "card" })} /><AppButton label="Cash at HBIC" variant={form.paymentChoice === "cash" ? "primary" : "secondary"} onPress={() => setForm({ ...form, paymentChoice: "cash" })} /></View>
        <Text style={{ color: theme.colors.muted, lineHeight: 22, marginVertical: 12 }}>Tuition is $50 CAD per child monthly. {form.startChoice === "next" ? "Card tuition first charges on the 1st of next month. Cash tuition is due for that same start month." : calgaryToday < "2026-10-01" ? "There is no September charge. Card tuition starts October 1 at the full monthly amount; October cash tuition is due in person October 1." : `Card billing charges the full monthly amount today, then renews on the 1st. Cash is due in person on the 1st.`} There is no class October 1; tuition is monthly, not per class. You may cancel future enrollment at any time.</Text>
        <View style={[styles.child, { borderColor: theme.colors.border }]}><Text style={[styles.heading, { color: theme.colors.text }]}>Tuition &amp; Payment Policy</Text>{ACADEMY_TUITION_POLICY.map((term) => <Text key={term.title} style={{ color: theme.colors.muted, lineHeight: 22, marginBottom: 10 }}><Text style={{ fontWeight: "800", color: theme.colors.text }}>{term.title}. </Text>{term.body}</Text>)}<Text style={{ color: theme.colors.muted }}>Version {ACADEMY_TUITION_POLICY_VERSION}</Text></View>
        <View style={styles.row}><Text style={[styles.label, { color: theme.colors.text, flex: 1 }]}>I have read and agree to the HBIC Quran Academy Tuition &amp; Payment Policy.</Text><Switch value={form.policyAccepted} onValueChange={(value) => setForm({ ...form, policyAccepted: value })} /></View>
        {form.paymentChoice === "card" ? <View style={styles.row}><Text style={[styles.label, { color: theme.colors.text, flex: 1 }]}>I authorize recurring monthly tuition charges until cancelled under this policy.</Text><Switch value={form.recurringAuthorized} onValueChange={(value) => setForm({ ...form, recurringAuthorized: value })} /></View> : null}
        <AppButton label="Send registration" disabled={busy || !form.policyAccepted || (form.paymentChoice === "card" && (!cardAvailable || !form.recurringAuthorized))} onPress={() => void register()} />
      </GlassCard> : <><GlassCard><Text style={[styles.eyebrow, { color: theme.colors.teal }]}>YOUR ACADEMY HOME</Text><Text style={[styles.heading, { color: theme.colors.text }]}>{family.guardianName}</Text><Text style={{ color: theme.colors.muted }}>{family.reference} · {family.enrollmentState === "awaiting_checkout" ? "Awaiting card confirmation — finish secure Stripe Checkout" : family.enrollmentState === "submitted" ? "Conditional enrollment — payment or placement pending" : family.enrollmentState}</Text>{family.enrollmentStartPeriod ? <Text style={{ color: theme.colors.muted }}>Enrollment starts {family.enrollmentStartPeriod}-01</Text> : null}</GlassCard>
        <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Academy parent updates</Text><Text style={{ color: theme.colors.muted, lineHeight: 22, marginBottom: 12 }}>Join the WhatsApp group now for class and holiday news, even while cash tuition is due or enrollment is conditional.</Text><AppButton label="Join Academy WhatsApp group" icon="open-outline" variant="secondary" onPress={() => void Linking.openURL("https://chat.whatsapp.com/IZhuemIDjR10DTluYIiSQq?mode=gi_t")} /></GlassCard>
        {cashReminder ? <GlassCard><Text accessibilityRole="alert" style={{ color: theme.colors.text, lineHeight: 23 }}>{cashReminder === "due" ? "Academy cash tuition is due today, the 1st. Please pay at HBIC and ask for your receipt." : "Academy cash tuition for next month is due on the 1st. Please plan to pay in person at HBIC."}</Text></GlassCard> : null}
        {nextClass ? <GlassCard><Text style={[styles.label, { color: theme.colors.muted }]}>NEXT CLASS</Text><Text style={[styles.heading, { color: theme.colors.text }]}>{nextClass.title}</Text><Text style={{ color: theme.colors.muted }}>{nextClass.date} · 5:30–7:00 p.m.</Text></GlassCard> : null}
        {nextClosure ? <GlassCard><Text style={[styles.label, { color: theme.colors.muted }]}>UPCOMING CLOSURE</Text><Text style={[styles.heading, { color: theme.colors.text }]}>{nextClosure.title}</Text><Text style={{ color: theme.colors.muted }}>{nextClosure.date}</Text></GlassCard> : null}
        <AppButton label="Enable Academy class and holiday updates" variant="secondary" onPress={() => void registerAcademyDevice(true).catch((error) => setStatus(error instanceof Error ? error.message : "Updates unavailable."))} />
        <GlassCard><Text style={[styles.label, { color: theme.colors.muted }]}>CHILDREN</Text><Text style={[styles.heading, { color: theme.colors.text }]}>{family.children.map((item) => item.name).join(" · ")}</Text><Text style={{ color: theme.colors.muted }}>Class placement will appear when HBIC confirms it.</Text></GlassCard>
        <GlassCard><Text style={[styles.label, { color: theme.colors.muted }]}>TUITION · {family.billingPeriod}</Text><Text style={[styles.heading, { color: theme.colors.text }]}>{family.paymentState === "paid" ? family.billingMethod === "card" ? "Card paid" : "Cash paid" : family.paymentState === "past_due" ? "Past due — please contact HBIC" : family.paymentState === "cash_due" ? "Cash due on the 1st" : family.paymentState === "card_attention" ? "Payment needs attention" : family.paymentState === "scheduled" ? family.cardSetupComplete ? `Card ready · first charge ${family.billingPeriod}-01` : `Card setup pending · first charge ${family.billingPeriod}-01` : family.paymentState === "not_due" ? "No tuition due" : "Tuition pending"}</Text><Text style={{ color: theme.colors.muted }}>{family.amountCents === null ? "HBIC will confirm tuition" : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(family.amountCents / 100)}</Text></GlassCard>
        <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Class rhythm</Text><Text style={{ color: theme.colors.muted, lineHeight: 23 }}>Mondays and Thursdays, 5:30–7:00 p.m. through February 1, 2027. One Thursday each month is a special activity with games and an Islamic presentation; food or prizes are occasional. Check the Academy calendar for the exact date. No classes afterward through Ramadan and Eid al-Fitr; resumption after Eid will be announced. HBIC confirms class placement and changes.</Text></GlassCard>
        <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Enrollment</Text>{family.children.map((item) => <View key={item.id} style={{ marginBottom: 12 }}><Text style={{ color: theme.colors.text, fontWeight: "700" }}>{item.name}{item.cancelEffectiveAt ? ` · Ends ${new Date(item.cancelEffectiveAt).toLocaleDateString("en-CA")}` : ""}</Text>{!item.cancelEffectiveAt ? <AppButton label={`Cancel ${item.name}'s future enrollment`} variant="ghost" disabled={busy} onPress={() => confirmCancelChild(item.id, item.name)} /> : null}</View>)}</GlassCard>
        {family.paymentChoice === "card" && cardAvailable ? <AppButton label={family.cardSetupComplete ? "Update payment card" : "Complete secure card setup"} onPress={() => void openBilling(family.cardSetupComplete ? "portal" : "checkout")} /> : null}
        <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Payment method</Text><Text style={{ color: theme.colors.muted, lineHeight: 22 }}>Current: {family.paymentChoice === "card" ? "Card" : "Cash at HBIC"}. Changes apply to the next unpaid month; already-paid tuition is not charged twice.</Text>
          {family.pendingPaymentChoice === "cash" ? <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Card billing will stop before cash is due for {family.paymentChangeEffectivePeriod}.</Text> : null}
          {family.paymentChoice === "cash" || family.pendingPaymentChoice === "cash" ? <><View style={styles.row}><Text style={[styles.label, { color: theme.colors.text, flex: 1 }]}>I authorize secure Stripe card setup and recurring monthly tuition during this term, until cancelled.</Text><Switch value={authorizeCardSwitch} onValueChange={setAuthorizeCardSwitch} /></View><AppButton label="Use card for future unpaid tuition" variant="secondary" disabled={busy || !cardAvailable || !authorizeCardSwitch} onPress={() => void switchPaymentMethod("card")} /></> : <AppButton label="Switch future unpaid tuition to cash" variant="secondary" disabled={busy} onPress={() => Alert.alert("Switch to cash?", "Card renewal will stop before cash becomes due. Already-paid tuition remains paid.", [{ text: "Keep card", style: "cancel" }, { text: "Switch to cash", onPress: () => void switchPaymentMethod("cash") }])} />}</GlassCard>
        {payments.length ? <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Payment history</Text>{payments.map((payment) => <View key={payment.period} style={{ marginVertical: 6 }}><Text style={{ color: theme.colors.text, fontWeight: "700" }}>{payment.period} · {payment.status.replaceAll("_", " ")}</Text><Text style={{ color: theme.colors.muted }}>{payment.method === "card" ? "Card" : "Cash"} · {payment.amountCents === null ? "Tuition pending" : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(payment.amountCents / 100)}</Text>{payment.invoiceUrl ? <AppButton label="View Stripe invoice" variant="ghost" onPress={() => void Linking.openURL(payment.invoiceUrl!)} /> : null}</View>)}</GlassCard> : null}
        <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Tuition &amp; Payment Policy</Text>{ACADEMY_TUITION_POLICY.map((term) => <Text key={term.title} style={{ color: theme.colors.muted, lineHeight: 22, marginBottom: 10 }}><Text style={{ fontWeight: "800", color: theme.colors.text }}>{term.title}. </Text>{term.body}</Text>)}<Text style={{ color: theme.colors.muted }}>Accepted {family.policyVersion ?? "earlier terms"}{family.policyAcceptedAt ? ` · ${new Date(family.policyAcceptedAt).toLocaleDateString("en-CA")}` : ""}</Text></GlassCard>
        {receipts.length ? <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Cash receipts</Text>{receipts.map((receipt) => <Text key={receipt.number} style={{ color: theme.colors.muted, marginVertical: 5 }}>{receipt.billingMode === "test" ? "TEST PAYMENT RECEIPT · " : ""}{receipt.period} · {receipt.number} · {new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(receipt.amountCents / 100)}</Text>)}</GlassCard> : null}
        {content?.classes.length ? <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>My classes</Text>{content.classes.map((item) => <Text key={item.id} style={{ color: theme.colors.muted, marginVertical: 5 }}>{item.name} · {days[item.dayOfWeek]} {item.startTime} · {item.room}</Text>)}</GlassCard> : null}
        {content?.announcements.length ? <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Announcements</Text>{content.announcements.slice(0, 3).map((item) => <Text key={item.id} style={{ color: theme.colors.muted, marginVertical: 5 }}>{item.title} — {item.message}</Text>)}</GlassCard> : null}
        {content?.calendar.length ? <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Calendar</Text>{content.calendar.slice(0, 5).map((item) => <Text key={item.id} style={{ color: theme.colors.muted, marginVertical: 5 }}>{item.date} · {item.title} ({item.type.replace("_", " ")})</Text>)}</GlassCard> : null}
        <GlassCard><Text style={[styles.heading, { color: theme.colors.text }]}>Academy pass</Text><Text style={{ color: theme.colors.muted }}>{family.passToken ? "Show this QR at the desk. Staff always check live status." : "This pass is inactive. Please contact HBIC."}</Text>{token && family.passToken ? <Image source={{ uri: `${api}/api/academy/pass/qr`, headers: { Authorization: `Bearer ${token}` } }} style={styles.qr} accessibilityLabel="Academy pass QR code" /> : null}</GlassCard>
        <AppButton label="Refresh Academy status" variant="secondary" onPress={() => void refresh()} /><AppButton label="Sign out" variant="ghost" onPress={() => void signOutAcademy()} />
      </>}
    {status ? <Text accessibilityRole="alert" style={{ color: theme.colors.text }}>{status}</Text> : null}
  </AppScreen>;
}

const styles = StyleSheet.create({ seal: { width: 176, height: 176, borderRadius: 88, borderWidth: 1.5, borderColor: "#cfad68", alignItems: "center", justifyContent: "space-around", alignSelf: "center", marginBottom: 20, paddingVertical: 12, backgroundColor: "#12384b" }, sealTitle: { color: "#e5c781", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }, sealLogo: { width: 86, height: 86, borderRadius: 43, borderWidth: 4, borderColor: "#fff8e9", backgroundColor: "white" }, sealFoot: { color: "#e5c781", fontSize: 8, fontWeight: "800", letterSpacing: .7 }, hero: { color: "#fff8e9", fontFamily: "Georgia", fontSize: 40, marginTop: 8 }, heroBody: { color: "#d6e5e4", fontSize: 16, lineHeight: 24, marginTop: 8 }, eyebrow: { color: "#e5c06b", fontSize: 11, fontWeight: "900", letterSpacing: 2 }, heading: { fontSize: 24, fontWeight: "800", marginBottom: 10 }, label: { fontSize: 14, fontWeight: "700" }, field: { gap: 5, marginVertical: 9 }, input: { borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: 14, fontSize: 16 }, row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginVertical: 9 }, child: { borderWidth: 1, borderRadius: 18, padding: 14, marginVertical: 10 }, level: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }, verificationPrimary: { fontSize: 16, fontWeight: "800", color: "#12384b", marginTop: 4 }, verificationSecondary: { fontSize: 13, color: "#5f7a78", marginTop: 2, marginBottom: 10 }, qr: { width: 260, height: 260, alignSelf: "center", marginTop: 20, borderRadius: 16, backgroundColor: "white" } });
