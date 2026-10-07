"use client";

import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ACADEMY_TUITION_POLICY, ACADEMY_TUITION_POLICY_VERSION, ACADEMY_LAST_BILLING_MONTH, academyCashReminderStage, academyEnrollmentStartPeriod, academyNextMonthEnrollmentOpen, dateStringInTimeZone, masjidTimeZone, type AcademyPublicFamily, type AcademyRegistrationInput } from "@hbic/shared";
import { getAcademyClientAuth } from "../lib/academyFirebaseClient";
import { requestAcademyPasswordReset } from "../lib/academyParentActions";
import { academyChargeDate, academyMonthLabel, academyPaymentFirstPlan } from "../lib/academyPaymentFirst";
import { StoreDownloadButtons } from "./AppStoreLinks";
import styles from "./AcademyParent.module.css";

const blankChild = () => ({ name: "", age: 8, level: "not_sure" as const });
const money = (cents: number | null) => cents === null ? "Tuition pending" : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
type AcademyContent = { classes: { id: string; name: string; dayOfWeek: number; startTime: string; room: string }[]; calendar: { id: string; title: string; date: string; type: string }[]; announcements: { id: string; title: string; message: string; priority: string }[] };
type AcademyPayment = { period: string; method: "cash" | "card"; status: string; amountCents: number | null; paidAt: string | null; invoiceUrl: string | null };
type PendingRegistration = { registrationId: string; enrollmentStartPeriod: string; guardianName: string; phone: string; email: string; whatsappConsent: boolean; emailUpdates: boolean; children: AcademyRegistrationInput["children"]; paymentChoice: "card"; startChoice: "current" | "next"; policyVersion: AcademyRegistrationInput["policyVersion"]; policyAccepted: true; recurringAuthorized: true; checkoutStarted: boolean; createdAt: string };
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Cooldown between verification-email resends: long enough to stop accidental
// double-taps, short enough that a parent missing the email is not stuck.
const VERIFY_RESEND_COOLDOWN_SECONDS = 60;

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

function verificationReturnSettings() {
  // Firebase's hosted verification page can return parents to the exact
  // Academy form after they confirm their address on a phone or another tab.
  // Other preview hosts keep Firebase's default handler unless authorized.
  if (typeof window === "undefined" || !["hbic.ca", "www.hbic.ca"].includes(window.location.hostname)) return undefined;
  return { url: "https://hbic.ca/quran-academy", handleCodeInApp: false };
}

export function AcademyParent() {
  const academyAuth = getAcademyClientAuth();
  const [user, setUser] = useState<User | null>(null);
  const [verified, setVerified] = useState(false);
  const [family, setFamily] = useState<AcademyPublicFamily | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerAccount, setRegisterAccount] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);
  const [form, setForm] = useState<AcademyRegistrationInput>({ guardianName: "", phone: "", email: "", whatsappConsent: false, children: [blankChild()], paymentChoice: "card", policyVersion: ACADEMY_TUITION_POLICY_VERSION, policyAccepted: false, recurringAuthorized: false });
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [appleWalletReady, setAppleWalletReady] = useState(false);
  const [googleWalletReady, setGoogleWalletReady] = useState(false);
  const [receipts, setReceipts] = useState<{ number: string; period: string; amountCents: number; receivedAt: string; billingMode: "test" | "live" }[]>([]);
  const [payments, setPayments] = useState<AcademyPayment[]>([]);
  const [content, setContent] = useState<AcademyContent | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [cardAvailable, setCardAvailable] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [authorizeCardSwitch, setAuthorizeCardSwitch] = useState(false);
  const [insideApp, setInsideApp] = useState(false);
  const familyId = family?.id;
  const currentPassToken = family?.passToken;
  const cashReminder = family?.paymentChoice === "cash" ? academyCashReminderStage(new Date(), family.cashReminderEligible, family.paymentState) : null;
  const calgaryToday = dateStringInTimeZone(new Date(), masjidTimeZone);
  const nextStartPeriod = academyNextMonthEnrollmentOpen() && calgaryToday.slice(0, 7) < ACADEMY_LAST_BILLING_MONTH ? academyEnrollmentStartPeriod("next") : null;
  const signupPeriod = form.startChoice === "next" && nextStartPeriod ? nextStartPeriod : calgaryToday.slice(0, 7);
  const signupBilling = academyPaymentFirstPlan(5000, form.children.length, signupPeriod);
  const classStart = family?.enrollmentStartPeriod && `${family.enrollmentStartPeriod}-01` > calgaryToday ? `${family.enrollmentStartPeriod}-01` : calgaryToday;
  const nextClass = content?.calendar.find((item) => item.date >= classStart && item.type === "class");
  const nextClosure = content?.calendar.find((item) => item.date >= calgaryToday && (item.type === "holiday" || item.type === "no_class"));

  useEffect(() => {
    setInsideApp(Boolean(window.ReactNativeWebView));
    const onPushResult = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      if (detail?.message) setStatus(detail.message);
    };
    window.addEventListener("hbicAcademyPushResult", onPushResult);
    return () => window.removeEventListener("hbicAcademyPushResult", onPushResult);
  }, []);

  useEffect(() => {
    if (!insideApp || !user || !verified || !familyId) return;
    let cancelled = false;
    void user.getIdToken(true).then((token) => {
      if (!cancelled) window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "academy-session", token }));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [insideApp, user, verified, familyId]);

  async function enableAppUpdates() {
    if (!user || !window.ReactNativeWebView) return;
    try {
      const token = await user.getIdToken(true);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "academy-enable-updates", token }));
      setStatus("Check your device’s notification permission prompt.");
    } catch { setStatus("Sign in again before enabling app updates."); }
  }

  async function signOutAcademy() {
    if (!academyAuth) return;
    if (user && window.ReactNativeWebView) {
      try {
        const token = await user.getIdToken(true);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "academy-sign-out", token }));
      } catch { /* Firebase sign-out still proceeds if token refresh fails. */ }
    }
    await signOut(academyAuth);
  }

  useEffect(() => { void fetch("/api/academy/billing", { cache: "no-store" }).then((response) => response.json()).then((data) => {
    setCardAvailable(data.cardAvailable === true); setRegistrationOpen(data.registrationOpen === true);
  }).catch(() => { setCardAvailable(false); setRegistrationOpen(false); }); }, []);

  // Reloads the Firebase user and force-refreshes the ID token, then publishes
  // the refreshed state. Reads auth.currentUser fresh AFTER the reload — never
  // a captured user object — so the UI cannot keep showing a pre-reload
  // emailVerified=false after verification succeeded.
  async function refreshVerification(): Promise<boolean> {
    const target = academyAuth?.currentUser;
    if (!target) { setUser(null); setVerified(false); return false; }
    try {
      await target.reload();
      await target.getIdToken(true);
    } catch {
      // A network failure here must not sign the parent out; fall through and
      // report whatever verified state Firebase currently has.
    }
    const fresh = academyAuth?.currentUser ?? target;
    setUser(fresh);
    const ok = fresh.emailVerified === true;
    setVerified(ok);
    return ok;
  }

  useEffect(() => academyAuth ? onAuthStateChanged(academyAuth, (next) => {
    setUser(next);
    setVerified(Boolean(next?.emailVerified));
    setFamily(null);
    setVerificationEmailSent(false);
    setResendCooldown(0);
    if (next) {
      setForm((current) => ({ ...current, email: next.email ?? "" }));
      // The auth event can deliver a cached user whose emailVerified predates
      // verification — refresh once so a verified parent is never blocked.
      if (!next.emailVerified) void refreshVerification();
    }
  }) : undefined, [academyAuth]);

  // When the parent returns to this tab after opening the verification link in
  // another tab or their mail app, pick up the verified flag automatically.
  useEffect(() => {
    if (!user || verified) return;
    const refresh = () => { void refreshVerification(); };
    const onVisibilityChange = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", refresh);
    };
  }, [academyAuth, user, verified]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!user || !verified) return;
    let cancelled = false;
    let inFlight = false;
    let lastRefresh = 0;
    const refresh = async () => {
      if (cancelled || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const idToken = await user.getIdToken(true);
        const response = await fetch("/api/academy/family", { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" });
        if (response.status === 401) {
          // The cached session may predate verification (or have lapsed).
          // Reconcile against freshly reloaded auth before showing anything —
          // never flash a stale "not verified" warning at a verified parent.
          const wasVerified = verified;
          const ok = await refreshVerification();
          if (cancelled) return;
          if (!academyAuth?.currentUser) { setStatus("Sign in to continue your Quran Academy registration."); return; }
          if (!ok) { setStatus(""); return; } // the verify screen (not a warning banner) guides the parent
          if (!wasVerified) return; // flipped to verified — the effect re-runs via `verified` and retries with a fresh token
          // Verified per Firebase, yet the server still rejects the fresh
          // token: surface it instead of spinning silently (server config issue).
          setStatus("Academy sign-in could not be confirmed. Please sign in again.");
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load Academy details.");
        if (!cancelled) {
          setFamily(data.family);
          setPendingRegistration(data.pendingRegistration ?? null);
          if (data.pendingRegistration) {
            const pending = data.pendingRegistration as PendingRegistration;
            setForm((current) => ({ ...current, guardianName: pending.guardianName, phone: pending.phone, email: pending.email,
              whatsappConsent: pending.whatsappConsent, emailUpdates: pending.emailUpdates, children: pending.children,
              paymentChoice: "card", startChoice: pending.startChoice, policyVersion: pending.policyVersion,
              policyAccepted: true, recurringAuthorized: true }));
            if (new URLSearchParams(window.location.search).get("checkout") === "cancelled") setStatus("Checkout was not completed. You can try card Checkout again or choose cash at HBIC.");
          } else setStatus("");
        }
        const receiptResponse = await fetch("/api/academy/receipts", { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" });
        if (receiptResponse.ok) {
          const receiptData = await receiptResponse.json();
          if (!cancelled) setReceipts(receiptData.receipts ?? []);
        }
        const paymentsResponse = await fetch("/api/academy/payments", { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" });
        if (paymentsResponse.ok) {
          const paymentData = await paymentsResponse.json();
          if (!cancelled) setPayments(paymentData.payments ?? []);
        }
        const contentResponse = await fetch("/api/academy/content", { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" });
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          if (!cancelled) setContent(contentData.content);
        }
      } catch (error) { if (!cancelled) setStatus(error instanceof Error ? error.message : "Could not load Academy details."); }
      finally { inFlight = false; lastRefresh = Date.now(); }
    };
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 60_000);
    const onFocus = () => { if (Date.now() - lastRefresh >= 5_000) void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [user, verified]);

  useEffect(() => {
    if (!user || !familyId || !currentPassToken) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    const load = async () => {
      const response = await fetch("/api/academy/pass/qr", { headers: { Authorization: `Bearer ${await user.getIdToken(true)}` }, cache: "no-store" });
      if (!response.ok) return;
      objectUrl = URL.createObjectURL(await response.blob());
      if (!cancelled) setQrUrl(objectUrl);
      if (!/Android/i.test(navigator.userAgent)) {
        const wallet = await fetch("/api/academy/pass/wallet", { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken(true)}` }, cache: "no-store" });
        if (!cancelled) setAppleWalletReady(wallet.ok);
      }
      const googleWallet = await fetch("/api/academy/pass/google-wallet", { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken(true)}` }, cache: "no-store" });
      if (!cancelled) setGoogleWalletReady(googleWallet.ok);
    };
    void load().catch(() => { if (!cancelled) { setAppleWalletReady(false); setGoogleWalletReady(false); } });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); setQrUrl(null); setAppleWalletReady(false); setGoogleWalletReady(false); };
  }, [user, familyId, currentPassToken]);

  async function addAppleWallet() {
    if (!user || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/academy/pass/wallet", { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken(true)}` }, cache: "no-store" });
      const data = await response.json() as { appleUrl?: string; error?: string };
      if (!response.ok || !data.appleUrl) throw new Error(data.error ?? "Wallet pass is unavailable.");
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: "academy-wallet", url: data.appleUrl }));
      else window.location.assign(data.appleUrl);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Wallet pass could not be opened."); }
    finally { setBusy(false); }
  }

  async function addGoogleWallet() {
    if (!user || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/academy/pass/google-wallet", { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken(true)}` }, cache: "no-store" });
      const data = await response.json() as { googleUrl?: string; error?: string };
      if (!response.ok || !data.googleUrl) throw new Error(data.error ?? "Google Wallet is unavailable.");
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: "academy-google-wallet", url: data.googleUrl }));
      else window.location.assign(data.googleUrl);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Google Wallet could not be opened."); }
    finally { setBusy(false); }
  }

  async function authenticate() {
    if (!academyAuth) return setStatus("Parent sign-in is temporarily unavailable. Please contact HBIC.");
    setBusy(true); setStatus("");
    try {
      if (registerAccount) {
        if (password.length < 12) throw new Error("Use a password of at least 12 characters.");
        const result = await createUserWithEmailAndPassword(academyAuth, email.trim().toLowerCase(), password);
        await sendEmailVerification(result.user, verificationReturnSettings());
        // The verify screen renders the confirmation copy from this flag —
        // nothing is sent automatically beyond this one email.
        setVerificationEmailSent(true);
        setResendCooldown(VERIFY_RESEND_COOLDOWN_SECONDS);
        setStatus("");
      } else {
        const result = await signInWithEmailAndPassword(academyAuth, email.trim().toLowerCase(), password);
        await refreshVerification();
      }
      setPassword("");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }

  async function resetPassword() {
    if (!academyAuth) return setStatus("Parent sign-in is temporarily unavailable. Please contact HBIC.");
    setBusy(true); setStatus("");
    try {
      setStatus(await requestAcademyPasswordReset(email, (normalizedEmail) => sendPasswordResetEmail(academyAuth, normalizedEmail)));
    } finally { setBusy(false); }
  }

  // Sends exactly one verification email per tap, then starts the cooldown so
  // repeated taps cannot spam the parent's inbox.
  async function resendVerificationEmail() {
    const current = academyAuth?.currentUser ?? user;
    if (!current || resendCooldown > 0) return;
    setBusy(true);
    try {
      await sendEmailVerification(current, verificationReturnSettings());
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

  async function submit() {
    if (!user) return;
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/academy/family", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken(true)}` },
        body: JSON.stringify({ ...form, ...(pendingRegistration && form.paymentChoice === "cash" ? { pendingRegistrationId: pendingRegistration.registrationId } : {}) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Registration could not be saved.");
      if (form.paymentChoice === "card") {
        const url = new URL(data.checkoutUrl);
        if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Unexpected billing destination.");
        window.location.assign(url.href);
        return;
      }
      setFamily(data.family);
      setPendingRegistration(null);
      setStatus("Conditional registration received. Bring your pass and cash tuition to HBIC.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Registration could not be saved."); }
    finally { setBusy(false); }
  }

  async function beginBilling(action: "checkout" | "portal", currentUser = user) {
    if (!currentUser) return;
    const response = await fetch("/api/academy/billing", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await currentUser.getIdToken(true)}` }, body: JSON.stringify({ action }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Billing is unavailable.");
    const url = new URL(data.url);
    if (url.protocol !== "https:" || !["checkout.stripe.com", "billing.stripe.com"].includes(url.hostname)) throw new Error("Unexpected billing destination.");
    window.location.assign(url.href);
  }

  async function cancelChild(childId: string, childName: string) {
    if (!user || !window.confirm(`Cancel ${childName}'s Quran Academy enrollment? Future charges for this child will stop. Any already-paid period remains available until its end.`)) return;
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/academy/billing/cancel", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken(true)}` }, body: JSON.stringify({ childId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Cancellation could not be completed.");
      setFamily(data.family);
      setStatus(`Cancellation scheduled for ${new Date(data.effectiveAt).toLocaleDateString("en-CA", { timeZone: "America/Edmonton" })}. No further renewal for ${childName}.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Cancellation could not be completed."); }
    finally { setBusy(false); }
  }

  async function switchPaymentMethod(method: "card" | "cash") {
    if (!user || !family) return;
    if (method === "cash" && !window.confirm("Switch future unpaid tuition to cash at HBIC? Any already-paid month remains paid. Card renewal will stop before cash becomes due.")) return;
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/academy/billing/method", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken(true)}` }, body: JSON.stringify({ method, recurringAuthorized: method === "card" && authorizeCardSwitch }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Payment method could not be changed.");
      setFamily(data.family);
      if (data.checkoutUrl) {
        const url = new URL(data.checkoutUrl);
        if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Unexpected card setup destination.");
        window.location.assign(url.href);
      } else setStatus(data.family?.pendingPaymentChoice === "cash" ? `Card billing will stop before cash becomes due for ${data.family.paymentChangeEffectivePeriod}.` : "Payment method updated for the next unpaid tuition month.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Payment method could not be changed."); }
    finally { setBusy(false); }
  }

  return <main className={styles.shell}>
    <div className={styles.hero}>
      <div className={styles.academySeal} aria-label="HBIC Qur’an Academy · Masjid Bilal">
        <svg viewBox="0 0 220 220" aria-hidden="true"><defs><path id="academy-seal-top" d="M 19,110 A 91,91 0 0,1 201,110" /><path id="academy-seal-bottom" d="M 19,110 A 91,91 0 0,0 201,110" /></defs>
          <text><textPath href="#academy-seal-top" startOffset="50%" textAnchor="middle">HBIC QUR’AN ACADEMY</textPath></text>
          <text><textPath href="#academy-seal-bottom" startOffset="50%" textAnchor="middle">MASJID BILAL · CALGARY</textPath></text></svg>
        <img src="/brand/hbic-logo.png" alt="Masjid Bilal logo" />
      </div>
      <div><span className={styles.eyebrow}>MASJID BILAL · CALGARY</span><h1>HBIC Qur’an Academy</h1><p>A simple home for your children&apos;s Quran learning, class information, and Academy payments.</p></div>
    </div>
    <div className={styles.layout}>
      <section className={styles.panel}>
        {!user ? <><h2>{registerAccount && registrationOpen ? "Create your parent account" : "Sign in to continue your Quran Academy registration."}</h2><p>Only you and authorized HBIC staff can see your family&apos;s details.</p>
          <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" autoComplete={registerAccount ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className={styles.primary} disabled={busy || !academyAuth} onClick={() => void authenticate()}>{registerAccount ? "Create account" : "Sign in"}</button>
          {!registerAccount ? <button className={styles.textButton} disabled={busy || !academyAuth} onClick={() => void resetPassword()}>Forgot password?</button> : null}
          {!academyAuth ? <p className={styles.status}>Parent sign-in is temporarily unavailable. Please contact HBIC.</p> : null}
          {registrationOpen ? <button className={styles.textButton} onClick={() => setRegisterAccount(!registerAccount)}>{registerAccount ? "I already have an account" : "Create a parent account"}</button> : null}
        </> : !verified ? <><h2>Verify your email</h2><p>Open the verification link sent to {user.email}. We need a verified address before saving children&apos;s information.</p>
          {verificationEmailSent ? <><p className={styles.verificationPrimary}>Verification email sent.</p><p className={styles.verificationSecondary}>Didn’t see it? Check your spam or junk folder.</p></> : null}
          <button className={styles.primary} onClick={() => void confirmVerifiedEmail()}>I verified my email</button>
          <button className={styles.secondary} disabled={busy || resendCooldown > 0} onClick={() => void resendVerificationEmail()}>{resendCooldown > 0 ? `Resend verification email (${resendCooldown}s)` : "Resend verification email"}</button>
          <button className={styles.textButton} onClick={() => { if (academyAuth) void signOut(academyAuth); }}>Use a different email</button>
        </> : family?.enrollmentState === "withdrawn" ? <><h2>Start a new Academy registration</h2><p>Your previous enrollment has ended and is not shown as active. You can register a child again with a fresh Academy pass and reference. HBIC retains legally required payment and audit history privately.</p><button className={styles.primary} disabled={!registrationOpen} onClick={() => { setFamily(null); setForm({ guardianName: "", phone: "", email: user.email?.trim().toLowerCase() ?? "", whatsappConsent: false, children: [blankChild()], paymentChoice: "card", policyVersion: ACADEMY_TUITION_POLICY_VERSION, policyAccepted: false, recurringAuthorized: false }); }}>Register again</button></> : !family && !registrationOpen ? <><h2>Registration is temporarily unavailable</h2><p>Classes begin Monday, October 5. Please check back shortly.</p></> : !family ? <><h2>{pendingRegistration ? "Finish your Academy registration" : "Register your family"}</h2><p>{pendingRegistration ? "Your card Checkout is unpaid. Continue to Checkout, or choose cash at HBIC; cash stays due until staff receive it." : "One short form for all your children. Class placement and tuition are confirmed by HBIC. There is no class October 1; the first class is October 5."}</p>
          <div className={styles.fields}><label>Parent or guardian full name<input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></label>
            <label>Phone<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Email<input type="email" value={form.email} readOnly /></label></div>
          <label className={styles.check}><input type="checkbox" checked={form.whatsappConsent} onChange={(e) => setForm({ ...form, whatsappConsent: e.target.checked })} /> I would like Academy updates through the WhatsApp group. I can join as soon as I register, even while cash tuition is due.</label>
          <label className={styles.check}><input type="checkbox" checked={form.emailUpdates === true} onChange={(e) => setForm({ ...form, emailUpdates: e.target.checked })} /> Email me Academy announcements, holidays and schedule changes. Payment receipts and enrollment messages are sent separately.</label>
          <h3>Children</h3>{form.children.map((child, index) => <div className={styles.child} key={index}>
            <label>Child&apos;s full name<input value={child.name} onChange={(e) => setForm({ ...form, children: form.children.map((item, i) => i === index ? { ...item, name: e.target.value } : item) })} /></label>
            <label>Age<input type="number" min={3} max={18} value={child.age} onChange={(e) => setForm({ ...form, children: form.children.map((item, i) => i === index ? { ...item, age: Number(e.target.value) } : item) })} /></label>
            <label>Quran level<select value={child.level} onChange={(e) => setForm({ ...form, children: form.children.map((item, i) => i === index ? { ...item, level: e.target.value as typeof child.level } : item) })}><option value="not_sure">Not sure — HBIC can assess</option><option value="qaida">Qaida</option><option value="quran">Quran</option></select></label>
            {form.children.length > 1 ? <button className={styles.textButton} onClick={() => setForm({ ...form, children: form.children.filter((_, i) => i !== index) })}>Remove</button> : null}
          </div>)}
          <button className={styles.textButton} disabled={form.children.length >= 8} onClick={() => setForm({ ...form, children: [...form.children, blankChild()] })}>+ Add another child</button>
          <h3>When would you like to start?</h3><label>Enrollment start<select value={form.startChoice ?? "current"} onChange={(e) => setForm({ ...form, startChoice: e.target.value as "current" | "next" })}><option value="current">Start this month · $50 per child now</option>{nextStartPeriod ? <option value="next">Start {nextStartPeriod}-01 · skip this month</option> : null}</select></label>
          {form.startChoice === "next" && nextStartPeriod ? <p>Start on {nextStartPeriod}-01. No classes or tuition this month; card Checkout collects securely and the first full $50-per-child charge is on {nextStartPeriod}-01. Cash is due at HBIC on that date.</p> : <p>This month’s full $50-per-child tuition is due now—there is no proration. Card Checkout charges it now, then $50 per child renews on the 1st if you do not cancel. Cash is due in person at HBIC for this month.</p>}
          <h3>How would you like to pay?</h3><div className={styles.choice}><button className={form.paymentChoice === "card" ? styles.selected : ""} disabled={!cardAvailable} title={cardAvailable ? "Secure Stripe Checkout" : "Card billing is temporarily unavailable"} onClick={() => setForm({ ...form, paymentChoice: "card" })}>Pay by card{cardAvailable ? "" : " · not ready"}</button><button className={form.paymentChoice === "cash" ? styles.selected : ""} type="button" onClick={() => setForm({ ...form, paymentChoice: "cash" })}>Pay cash at HBIC</button></div>
          {form.paymentChoice === "card" ? <div className={styles.summary}><div><small>DUE TODAY</small><strong>{`CA$${(signupBilling.dueNowCents / 100).toFixed(2)}`}</strong><span>{signupBilling.dueNowCents ? `For ${academyMonthLabel(signupPeriod)} Quran Academy tuition. No proration.` : "No tuition today. Securely save and authorize your card."}</span></div><div><small>NEXT AUTOMATIC CHARGE</small><strong>{signupBilling.recurringAnchor ? `CA$${(signupBilling.monthlyTotalCents / 100).toFixed(2)} on ${academyChargeDate(signupBilling.recurringAnchor)}` : "No further charges this term"}</strong><span>{signupBilling.recurringAnchor ? `After that, CA$${(signupBilling.monthlyTotalCents / 100).toFixed(2)} on the 1st of each month until cancellation. The final charge this term is January 1, 2027. There is no February tuition.` : "The February 1 class is included in January. No February tuition."}</span></div></div> : null}
          <p className={styles.terms}>Tuition is CAD $50 per child per month. A current-month start is charged at the full monthly amount now. During only the final three calendar days of a month, you may choose next month instead and the full amount is charged or due on the 1st of that month. Card renewals are $50 per child on the 1st unless cancelled. You can stop future renewals anytime: choose “Cancel this child’s enrollment” and confirm once—no staff approval. Tuition is monthly, not per class.</p>
          <details className={styles.policy} open><summary>Quran Academy Tuition &amp; Payment Policy</summary>{ACADEMY_TUITION_POLICY.map((term) => <p key={term.title}><strong>{term.title}.</strong> {term.body}</p>)}<small>Policy version {ACADEMY_TUITION_POLICY_VERSION}</small></details>
          <label className={styles.check}><input type="checkbox" checked={form.policyAccepted} onChange={(e) => setForm({ ...form, policyAccepted: e.target.checked })} /> I have read and agree to the HBIC Quran Academy Tuition &amp; Payment Policy.</label>
          {form.paymentChoice === "card" ? <label className={styles.check}><input type="checkbox" checked={form.recurringAuthorized} onChange={(e) => setForm({ ...form, recurringAuthorized: e.target.checked })} /> I authorize recurring monthly tuition charges for my enrolled children until cancelled under this policy.</label> : null}
          <button className={styles.primary} disabled={busy || !form.policyAccepted || (form.paymentChoice === "card" && (!cardAvailable || !form.recurringAuthorized))} onClick={() => void submit()}>{pendingRegistration && form.paymentChoice === "cash" ? "Switch to cash at HBIC" : form.paymentChoice === "card" ? "Continue to secure Checkout" : "Send registration"}</button>
        </> : <><div className={styles.familyHeading}><div><span className={styles.eyebrow}>YOUR ACADEMY HOME</span><h2>{family.guardianName}</h2><p>{family.reference} · {family.enrollmentState === "awaiting_checkout" ? "Awaiting card confirmation — finish secure Stripe Checkout" : family.enrollmentState === "submitted" ? "Conditional enrollment — payment or placement pending" : family.enrollmentState}</p>{family.enrollmentStartPeriod ? <p>Enrollment starts {family.enrollmentStartPeriod}-01</p> : null}</div><button className={styles.textButton} onClick={() => void signOutAcademy()}>Sign out</button></div>
          <div className={`${styles.summary} ${styles.message}`}><div><small>ACADEMY UPDATES</small><strong>Join the parent WhatsApp group</strong><span>Join now for class and holiday announcements, including while your enrollment is conditional.</span><a href="https://chat.whatsapp.com/IZhuemIDjR10DTluYIiSQq?mode=gi_t" target="_blank" rel="noopener noreferrer">Join the HBIC Quran Academy WhatsApp group ↗</a></div></div>
          {!insideApp ? <div className={`${styles.summary} ${styles.message}`}><div><small>YOUR MASJID, EVERY DAY</small><strong>Download the free Masjid Bilal app today</strong><p>Keep your child’s Academy registration, payments and class updates close at hand, alongside prayer times, masjid events and community announcements. Stay connected with your child’s Qur’an learning and your masjid, wherever you are.</p><StoreDownloadButtons /></div></div> : null}
          {family.enrollmentState === "active" ? <div className={`${styles.summary} ${styles.message}`}><div><strong>Assalamu alaikum — welcome to HBIC Quran Academy</strong><p>JazakAllahu khairan for investing in your child’s Qur’an education and supporting the long-term growth of our classes and masjid. May Allah put barakah in their learning and make the Qur’an a light in their life. We look forward to welcoming your family, inshaAllah.</p></div></div> : null}
          {family.billingSetupState === "attention" ? <p className={styles.terms} role="status">Your successful tuition payment is recorded. Automatic billing setup needs attention; do not pay again. HBIC will help complete it.</p> : null}
          {insideApp ? <div className={styles.summary}><div><small>APP UPDATES</small><strong>Class changes on your phone</strong><span>Opt in for Academy announcements, closures, and cash tuition reminders on this device.</span><button className={styles.secondary} type="button" onClick={() => void enableAppUpdates()}>Enable Academy app notifications</button></div></div> : null}
          {cashReminder ? <p className={styles.terms} role="status">{cashReminder === "due" ? "Academy cash tuition is due today, the 1st. Please pay at HBIC; staff will record your receipt." : "Academy cash tuition for next month is due on the 1st. Please plan to pay in person at HBIC."}</p> : null}
          {nextClass ? <div className={styles.summary}><div><small>NEXT CLASS</small><strong>{nextClass.title}</strong><span>{nextClass.date} · 5:30–7:00 p.m.</span></div>
            {nextClosure ? <div><small>UPCOMING CLOSURE</small><strong>{nextClosure.title}</strong><span>{nextClosure.date}</span></div> : null}</div> : null}
          <div className={styles.summary}><div><small>CHILDREN</small><strong>{family.children.map((child) => child.name).join(" · ")}</strong><span>Class placement will appear here when confirmed.</span></div>
            <div><small>TUITION · {family.billingPeriod}</small><strong>{family.noTuitionDue ? "No tuition due · staff-approved exemption" : family.paymentState === "paid" ? family.billingMethod === "card" ? "Card paid" : "Cash paid" : family.paymentState === "past_due" ? "Past due — please contact HBIC" : family.paymentState === "cash_due" ? "Cash due on the 1st" : family.paymentState === "card_attention" ? "Payment needs attention" : family.paymentState === "scheduled" ? family.cardSetupComplete ? `Card ready · first charge ${family.billingPeriod}-01` : `Card setup pending · first charge ${family.billingPeriod}-01` : family.paymentState === "not_due" ? "No tuition due" : "Tuition pending"}</strong><span>{money(family.amountCents)}</span></div></div>
          <h3>Class rhythm</h3><p>Monday and Thursday · 5:30–7:00 p.m. through February 1, 2027. One Thursday each month is a special activity with games and an Islamic presentation; food or prizes may be offered occasionally. Check the Academy calendar for the exact date. No classes after February 1 through the Ramadan and Eid al-Fitr break; resumption after Eid will be announced. HBIC will confirm your child&apos;s class placement and any schedule changes.</p>
          <h3>Enrollment</h3><ul>{family.children.map((child) => <li key={child.id}>{child.name}{child.tuitionExempt ? " · No tuition due (staff-approved exemption)" : ""}{child.cancelEffectiveAt ? ` · Ends ${new Date(child.cancelEffectiveAt).toLocaleDateString("en-CA", { timeZone: "America/Edmonton" })}` : <button className={styles.textButton} disabled={busy} onClick={() => void cancelChild(child.id, child.name)}>Cancel this child&apos;s enrollment</button>}</li>)}</ul>
          {family.paymentChoice === "card" && cardAvailable ? <button className={styles.primary} onClick={() => void beginBilling(family.cardSetupComplete ? "portal" : "checkout").catch((error) => setStatus(error instanceof Error ? error.message : "Billing unavailable."))}>{family.cardSetupComplete ? "Update payment card" : "Complete secure card setup"}</button> : null}
          <h3>Payment method</h3><p>Current method: {family.paymentChoice === "card" ? "Card" : "Cash at HBIC"}. Changes apply to the next unpaid month; already-paid tuition is not charged again.</p>
          {family.staffCardSetupRequestedAt && family.paymentChoice === "cash" ? <p className={styles.terms}>HBIC staff recorded your request to use card. Your cash arrangement remains in place until you authorize card tuition below and complete secure Stripe Checkout.</p> : null}
          {family.pendingPaymentChoice === "cash" ? <p className={styles.terms}>Card billing is scheduled to stop. Cash begins with {family.paymentChangeEffectivePeriod}. You can keep card billing below before it stops.</p> : null}
          {family.paymentChoice === "cash" || family.pendingPaymentChoice === "cash" ? <><label className={styles.check}><input type="checkbox" checked={authorizeCardSwitch} onChange={(event) => setAuthorizeCardSwitch(event.target.checked)} /> I authorize secure Stripe card setup and recurring monthly tuition during the active term, until cancelled.</label><button className={styles.secondary} disabled={busy || !cardAvailable || !authorizeCardSwitch} onClick={() => void switchPaymentMethod("card")}>Use card for future unpaid tuition</button></> : <button className={styles.secondary} disabled={busy} onClick={() => void switchPaymentMethod("cash")}>Switch future unpaid tuition to cash</button>}
          {payments.length ? <><h3>Payment history</h3><ul>{payments.map((payment) => <li key={payment.period}>{payment.period} · {money(payment.amountCents)} · {payment.method === "card" ? "Card" : "Cash"} · {payment.status.replaceAll("_", " ")}{payment.invoiceUrl ? <> · <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">View Stripe invoice</a></> : null}</li>)}</ul></> : null}
          <details className={styles.policy}><summary>Tuition &amp; Payment Policy</summary>{ACADEMY_TUITION_POLICY.map((term) => <p key={term.title}><strong>{term.title}.</strong> {term.body}</p>)}<small>Accepted {family.policyVersion ?? "earlier terms"}{family.policyAcceptedAt ? ` · ${new Date(family.policyAcceptedAt).toLocaleDateString("en-CA")}` : ""}</small></details>
          {content?.classes.length ? <><h3>My classes</h3><ul>{content.classes.map((item) => <li key={item.id}>{item.name} · {days[item.dayOfWeek]} {item.startTime} · {item.room}</li>)}</ul></> : null}
          {content?.announcements.length ? <><h3>Announcements</h3><ul>{content.announcements.slice(0, 3).map((item) => <li key={item.id}><strong>{item.title}</strong> — {item.message}</li>)}</ul></> : null}
          {content?.calendar.length ? <><h3>Calendar</h3><ul>{content.calendar.filter((item) => item.date >= new Date().toLocaleDateString("en-CA", { timeZone: "America/Edmonton" })).slice(0, 5).map((item) => <li key={item.id}>{item.date} · {item.title} ({item.type.replace("_", " ")})</li>)}</ul></> : null}
          <h3>Academy pass</h3><p>Show this code at the desk. Staff scan the live record; a screenshot&apos;s printed payment status is never proof of payment.</p>
          {family.passToken ? qrUrl ? <img className={styles.qr} src={qrUrl} alt="Private Academy pass QR code for HBIC staff scanning" /> : <p>Preparing your pass…</p> : <p>This pass is inactive. Please contact HBIC.</p>}
          <p className={styles.reference}>Registration {family.reference}</p>
          {appleWalletReady ? <button className={styles.secondary} type="button" disabled={busy} onClick={() => void addAppleWallet()}>Add to Apple Wallet</button> : null}
          {googleWalletReady ? <button className={styles.secondary} type="button" disabled={busy} onClick={() => void addGoogleWallet()}>Add to Google Wallet</button> : null}
          {receipts.length ? <><h3>Cash receipts</h3><ul>{receipts.map((receipt) => <li key={receipt.number}>{receipt.billingMode === "test" ? "TEST PAYMENT RECEIPT · " : ""}{receipt.period} · {money(receipt.amountCents)} · Paid {new Date(receipt.receivedAt).toLocaleDateString("en-CA")} · {receipt.number}</li>)}</ul></> : null}
        </>}
        {status ? <p className={styles.status} role="status">{status}</p> : null}
      </section>
      <aside className={styles.side}><span className={styles.eyebrow}>MADE FOR FAMILIES</span><h2>Learning with clarity.</h2><p>Registration, class updates, and current payments live in one calm place. Prayer times remain at the heart of the Masjid Bilal app.</p><div className={styles.sideItem}>01 <span>One form for all your children</span></div><div className={styles.sideItem}>02 <span>A current, scannable Academy pass</span></div><div className={styles.sideItem}>03 <span>Class information from HBIC</span></div></aside>
    </div>
    <section className={styles.publicPolicy} id="tuition-policy" aria-label="Quran Academy Tuition and Payment Policy"><h2>Tuition &amp; Payment Policy</h2><p>Clear terms for every family, before registration.</p>{ACADEMY_TUITION_POLICY.map((term) => <p key={term.title}><strong>{term.title}.</strong> {term.body}</p>)}<small>Version {ACADEMY_TUITION_POLICY_VERSION}</small></section>
  </main>;
}
