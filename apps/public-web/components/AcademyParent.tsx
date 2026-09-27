"use client";

import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ACADEMY_TUITION_POLICY, ACADEMY_TUITION_POLICY_VERSION, academyCashReminderStage, dateStringInTimeZone, isCalgaryFirstOfMonth, masjidTimeZone, type AcademyPublicFamily, type AcademyRegistrationInput } from "@hbic/shared";
import { getAcademyClientAuth } from "../lib/academyFirebaseClient";
import styles from "./AcademyParent.module.css";

const blankChild = () => ({ name: "", age: 8, level: "not_sure" as const });
const money = (cents: number | null) => cents === null ? "Tuition pending" : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
type AcademyContent = { classes: { id: string; name: string; dayOfWeek: number; startTime: string; room: string }[]; calendar: { id: string; title: string; date: string; type: string }[]; announcements: { id: string; title: string; message: string; priority: string }[] };
type AcademyPayment = { period: string; method: "cash" | "card"; status: string; amountCents: number | null; paidAt: string | null; invoiceUrl: string | null };
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AcademyParent() {
  const academyAuth = getAcademyClientAuth();
  const [user, setUser] = useState<User | null>(null);
  const [verified, setVerified] = useState(false);
  const [family, setFamily] = useState<AcademyPublicFamily | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerAccount, setRegisterAccount] = useState(false);
  const [form, setForm] = useState<AcademyRegistrationInput>({ guardianName: "", phone: "", email: "", whatsappConsent: false, children: [blankChild()], paymentChoice: "cash", policyVersion: ACADEMY_TUITION_POLICY_VERSION, policyAccepted: false, recurringAuthorized: false });
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<{ number: string; period: string; amountCents: number; receivedAt: string; billingMode: "test" | "live" }[]>([]);
  const [payments, setPayments] = useState<AcademyPayment[]>([]);
  const [content, setContent] = useState<AcademyContent | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [cardAvailable, setCardAvailable] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const familyId = family?.id;
  const cashReminder = family?.paymentChoice === "cash" ? academyCashReminderStage(new Date(), family.cashReminderEligible, family.paymentState) : null;
  const calgaryToday = dateStringInTimeZone(new Date(), masjidTimeZone);
  const nextClass = content?.calendar.find((item) => item.date >= calgaryToday && item.type === "class");
  const nextClosure = content?.calendar.find((item) => item.date >= calgaryToday && (item.type === "holiday" || item.type === "no_class"));

  useEffect(() => { void fetch("/api/academy/billing", { cache: "no-store" }).then((response) => response.json()).then((data) => {
    setCardAvailable(data.cardAvailable === true); setRegistrationOpen(data.registrationOpen === true);
  }).catch(() => { setCardAvailable(false); setRegistrationOpen(false); }); }, []);

  useEffect(() => academyAuth ? onAuthStateChanged(academyAuth, (next) => {
    setUser(next);
    setVerified(Boolean(next?.emailVerified));
    setFamily(null);
    if (next) setForm((current) => ({ ...current, email: next.email ?? "" }));
  }) : undefined, [academyAuth]);

  useEffect(() => {
    if (!user || !verified) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch("/api/academy/family", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load Academy details.");
        if (!cancelled) setFamily(data.family);
        const receiptResponse = await fetch("/api/academy/receipts", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        if (receiptResponse.ok) {
          const receiptData = await receiptResponse.json();
          if (!cancelled) setReceipts(receiptData.receipts ?? []);
        }
        const paymentsResponse = await fetch("/api/academy/payments", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        if (paymentsResponse.ok) {
          const paymentData = await paymentsResponse.json();
          if (!cancelled) setPayments(paymentData.payments ?? []);
        }
        const contentResponse = await fetch("/api/academy/content", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          if (!cancelled) setContent(contentData.content);
        }
      } catch (error) { if (!cancelled) setStatus(error instanceof Error ? error.message : "Could not load Academy details."); }
    };
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [user, verified]);

  useEffect(() => {
    if (!user || !familyId) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    const load = async () => {
      const response = await fetch("/api/academy/pass/qr", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
      if (!response.ok) return;
      objectUrl = URL.createObjectURL(await response.blob());
      if (!cancelled) setQrUrl(objectUrl);
    };
    void load();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); setQrUrl(null); };
  }, [user, familyId]);

  async function authenticate() {
    if (!academyAuth) return setStatus("Parent sign-in needs Firebase preview configuration.");
    setBusy(true); setStatus("");
    try {
      if (registerAccount) {
        if (password.length < 12) throw new Error("Use a password of at least 12 characters.");
        const result = await createUserWithEmailAndPassword(academyAuth, email.trim().toLowerCase(), password);
        await sendEmailVerification(result.user);
        setStatus("Verification email sent. Open the link, then return and choose ‘I verified my email’. ");
      } else await signInWithEmailAndPassword(academyAuth, email.trim().toLowerCase(), password);
      setPassword("");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!user) return;
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/academy/family", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken(true)}` }, body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Registration could not be saved.");
      setFamily(data.family);
      setStatus("Registration received. HBIC will confirm class placement and tuition.");
      if (form.paymentChoice === "card") {
        try { await beginBilling("checkout", user); }
        catch (error) { setStatus(`Registration saved. Card setup still needs attention: ${error instanceof Error ? error.message : "billing unavailable"}`); }
      }
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
    if (!user || !window.confirm(`Cancel ${childName}'s Quran Academy enrollment after the current paid period? Future card charges for this child will stop.`)) return;
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
        {!user && !registrationOpen ? <><h2>Registration opens October 1</h2><p>Quran Academy classes begin Monday, October 5. Families will be able to register here once registration opens.</p></> :
        !user ? <><h2>{registerAccount ? "Create your parent account" : "Parent sign in"}</h2><p>Only you and authorized HBIC staff can see your family&apos;s details.</p>
          <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" autoComplete={registerAccount ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className={styles.primary} disabled={busy || !academyAuth} onClick={() => void authenticate()}>{registerAccount ? "Create account" : "Sign in"}</button>
          {!academyAuth ? <p className={styles.status}>Parent sign-in is unavailable in this local preview until Firebase client configuration is supplied.</p> : null}
          <button className={styles.textButton} onClick={() => setRegisterAccount(!registerAccount)}>{registerAccount ? "I already have an account" : "Create a parent account"}</button>
        </> : !verified ? <><h2>Verify your email</h2><p>Open the verification link sent to {user.email}. We need a verified address before saving children&apos;s information.</p>
          <button className={styles.primary} onClick={() => void user.reload().then(() => user.getIdToken(true)).then(() => setVerified(user.emailVerified))}>I verified my email</button>
          <button className={styles.textButton} onClick={() => { if (academyAuth) void signOut(academyAuth); }}>Sign out</button>
        </> : !family && !registrationOpen ? <><h2>Registration opens October 1</h2><p>Classes begin Monday, October 5. Please return when registration opens.</p></> : !family ? <><h2>Register your family</h2><p>One short form for all your children. Class placement and tuition are confirmed by HBIC.</p>
          <div className={styles.fields}><label>Parent or guardian full name<input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></label>
            <label>Phone<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Email<input type="email" value={form.email} readOnly /></label></div>
          <label className={styles.check}><input type="checkbox" checked={form.whatsappConsent} onChange={(e) => setForm({ ...form, whatsappConsent: e.target.checked })} /> I agree to receive Quran Academy class updates through WhatsApp.</label>
          <h3>Children</h3>{form.children.map((child, index) => <div className={styles.child} key={index}>
            <label>Child&apos;s full name<input value={child.name} onChange={(e) => setForm({ ...form, children: form.children.map((item, i) => i === index ? { ...item, name: e.target.value } : item) })} /></label>
            <label>Age<input type="number" min={3} max={18} value={child.age} onChange={(e) => setForm({ ...form, children: form.children.map((item, i) => i === index ? { ...item, age: Number(e.target.value) } : item) })} /></label>
            <label>Quran level<select value={child.level} onChange={(e) => setForm({ ...form, children: form.children.map((item, i) => i === index ? { ...item, level: e.target.value as typeof child.level } : item) })}><option value="not_sure">Not sure — HBIC can assess</option><option value="qaida">Qaida</option><option value="quran">Quran</option></select></label>
            {form.children.length > 1 ? <button className={styles.textButton} onClick={() => setForm({ ...form, children: form.children.filter((_, i) => i !== index) })}>Remove</button> : null}
          </div>)}
          <button className={styles.textButton} disabled={form.children.length >= 8} onClick={() => setForm({ ...form, children: [...form.children, blankChild()] })}>+ Add another child</button>
          <h3>How would you like to pay?</h3><div className={styles.choice}><button className={form.paymentChoice === "cash" ? styles.selected : ""} type="button" onClick={() => setForm({ ...form, paymentChoice: "cash" })}>Pay cash at HBIC</button><button className={form.paymentChoice === "card" ? styles.selected : ""} disabled={!cardAvailable} title={cardAvailable ? "Secure Stripe Checkout" : "Card billing opens after HBIC approves tuition and sandbox testing"} onClick={() => setForm({ ...form, paymentChoice: "card" })}>Pay by card{cardAvailable ? "" : " · not ready"}</button></div>
          <p className={styles.terms}>Tuition is $50 CAD per child each month. Card enrollment charges {isCalgaryFirstOfMonth(new Date()) ? "the full monthly amount" : "a prorated first amount"} today, then renews automatically on the 1st. Cash is due in person on the 1st.</p>
          <details className={styles.policy} open><summary>Quran Academy Tuition &amp; Payment Policy</summary>{ACADEMY_TUITION_POLICY.map((term) => <p key={term.title}><strong>{term.title}.</strong> {term.body}</p>)}<small>Policy version {ACADEMY_TUITION_POLICY_VERSION}</small></details>
          <label className={styles.check}><input type="checkbox" checked={form.policyAccepted} onChange={(e) => setForm({ ...form, policyAccepted: e.target.checked })} /> I have read and agree to the HBIC Quran Academy Tuition &amp; Payment Policy.</label>
          {form.paymentChoice === "card" ? <label className={styles.check}><input type="checkbox" checked={form.recurringAuthorized} onChange={(e) => setForm({ ...form, recurringAuthorized: e.target.checked })} /> I authorize recurring monthly tuition charges for my enrolled children until cancelled under this policy.</label> : null}
          <button className={styles.primary} disabled={busy || !form.policyAccepted || (form.paymentChoice === "card" && !form.recurringAuthorized)} onClick={() => void submit()}>Send registration</button>
        </> : <><div className={styles.familyHeading}><div><span className={styles.eyebrow}>YOUR ACADEMY HOME</span><h2>{family.guardianName}</h2><p>{family.reference} · {family.enrollmentState}</p></div><button className={styles.textButton} onClick={() => { if (academyAuth) void signOut(academyAuth); }}>Sign out</button></div>
          {cashReminder ? <p className={styles.terms} role="status">{cashReminder === "due" ? "Academy cash tuition is due today, the 1st. Please pay at HBIC; staff will record your receipt." : "Academy cash tuition for next month is due on the 1st. Please plan to pay in person at HBIC."}</p> : null}
          {nextClass ? <div className={styles.summary}><div><small>NEXT CLASS</small><strong>{nextClass.title}</strong><span>{nextClass.date} · 6:00–7:30 p.m.</span></div>
            {nextClosure ? <div><small>UPCOMING CLOSURE</small><strong>{nextClosure.title}</strong><span>{nextClosure.date}</span></div> : null}</div> : null}
          <div className={styles.summary}><div><small>CHILDREN</small><strong>{family.children.map((child) => child.name).join(" · ")}</strong><span>Class placement will appear here when confirmed.</span></div>
            <div><small>CURRENT PAYMENT · {family.billingPeriod}</small><strong>{family.paymentState === "paid" ? "Paid" : family.paymentState === "cash_due" ? "Cash due" : family.paymentState === "not_due" ? "No tuition due" : "Tuition pending"}</strong><span>{money(family.amountCents)}</span></div></div>
          <h3>Class rhythm</h3><p>Monday and Thursday · 6:00–7:30 p.m. Every second Thursday is a fun class with games and an Islamic presentation; food or prizes may be offered occasionally. HBIC will confirm your child&apos;s class placement and any schedule changes.</p>
          <h3>Enrollment</h3><ul>{family.children.map((child) => <li key={child.id}>{child.name}{child.cancelEffectiveAt ? ` · Ends ${new Date(child.cancelEffectiveAt).toLocaleDateString("en-CA", { timeZone: "America/Edmonton" })}` : <button className={styles.textButton} disabled={busy} onClick={() => void cancelChild(child.id, child.name)}>Cancel this child&apos;s enrollment</button>}</li>)}</ul>
          {family.paymentChoice === "card" && cardAvailable ? <button className={styles.primary} onClick={() => void beginBilling(family.paymentState === "paid" ? "portal" : "checkout").catch((error) => setStatus(error instanceof Error ? error.message : "Billing unavailable."))}>{family.paymentState === "paid" ? "Update payment card" : "Complete secure card setup"}</button> : null}
          {payments.length ? <><h3>Payment history</h3><ul>{payments.map((payment) => <li key={payment.period}>{payment.period} · {money(payment.amountCents)} · {payment.method === "card" ? "Card" : "Cash"} · {payment.status.replaceAll("_", " ")}{payment.invoiceUrl ? <> · <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">View Stripe invoice</a></> : null}</li>)}</ul></> : null}
          <details className={styles.policy}><summary>Tuition &amp; Payment Policy</summary>{ACADEMY_TUITION_POLICY.map((term) => <p key={term.title}><strong>{term.title}.</strong> {term.body}</p>)}<small>Accepted {family.policyVersion ?? "earlier terms"}{family.policyAcceptedAt ? ` · ${new Date(family.policyAcceptedAt).toLocaleDateString("en-CA")}` : ""}</small></details>
          {content?.classes.length ? <><h3>My classes</h3><ul>{content.classes.map((item) => <li key={item.id}>{item.name} · {days[item.dayOfWeek]} {item.startTime} · {item.room}</li>)}</ul></> : null}
          {content?.announcements.length ? <><h3>Announcements</h3><ul>{content.announcements.slice(0, 3).map((item) => <li key={item.id}><strong>{item.title}</strong> — {item.message}</li>)}</ul></> : null}
          {content?.calendar.length ? <><h3>Calendar</h3><ul>{content.calendar.filter((item) => item.date >= new Date().toLocaleDateString("en-CA", { timeZone: "America/Edmonton" })).slice(0, 5).map((item) => <li key={item.id}>{item.date} · {item.title} ({item.type.replace("_", " ")})</li>)}</ul></> : null}
          <h3>Academy pass</h3><p>Show this code at the desk. Staff scan the live record; a screenshot&apos;s printed payment status is never proof of payment.</p>
          {family.passToken ? qrUrl ? <img className={styles.qr} src={qrUrl} alt="Private Academy pass QR code for HBIC staff scanning" /> : <p>Preparing your pass…</p> : <p>This pass is inactive. Please contact HBIC.</p>}
          <p className={styles.reference}>Registration {family.reference}</p>
          {receipts.length ? <><h3>Cash receipts</h3><ul>{receipts.map((receipt) => <li key={receipt.number}>{receipt.billingMode === "test" ? "TEST PAYMENT RECEIPT · " : ""}{receipt.period} · {money(receipt.amountCents)} · Paid {new Date(receipt.receivedAt).toLocaleDateString("en-CA")} · {receipt.number}</li>)}</ul></> : null}
        </>}
        {status ? <p className={styles.status} role="status">{status}</p> : null}
      </section>
      <aside className={styles.side}><span className={styles.eyebrow}>MADE FOR FAMILIES</span><h2>Learning with clarity.</h2><p>Registration, class updates, and current payments live in one calm place. Prayer times remain at the heart of the Masjid Bilal app.</p><div className={styles.sideItem}>01 <span>One form for all your children</span></div><div className={styles.sideItem}>02 <span>A current, scannable Academy pass</span></div><div className={styles.sideItem}>03 <span>Class information from HBIC</span></div></aside>
    </div>
    <section className={styles.publicPolicy} id="tuition-policy" aria-label="Quran Academy Tuition and Payment Policy"><h2>Tuition &amp; Payment Policy</h2><p>Clear terms for every family, before registration.</p>{ACADEMY_TUITION_POLICY.map((term) => <p key={term.title}><strong>{term.title}.</strong> {term.body}</p>)}<small>Version {ACADEMY_TUITION_POLICY_VERSION}</small></section>
  </main>;
}
