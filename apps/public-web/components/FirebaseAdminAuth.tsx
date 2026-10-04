"use client";

import {
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type MultiFactorResolver
} from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { adminAuth } from "../lib/firebaseClient";

const initialEmail = "haramain.official01@gmail.com";

function basicAuthorization(email: string, password: string) {
  const bytes = new TextEncoder().encode(`${email.trim().toLowerCase()}:${password}`);
  let binary = "";
  bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return `Basic ${window.btoa(binary)}`;
}

export function FirebaseAdminAuth({ onSession }: { onSession: (token: string | null, email?: string) => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [sharedEmail, setSharedEmail] = useState("");
  const [sharedPassword, setSharedPassword] = useState("");
  const [code, setCode] = useState("");
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const [status, setStatus] = useState("Sign in with your personal HBIC administrator account.");
  const [busy, setBusy] = useState(false);
  const handlingAuth = useRef(false);
  const sharedSession = useRef(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => onIdTokenChanged(adminAuth, async (user) => {
    if (sharedSession.current || handlingAuth.current) return;
    handlingAuth.current = true;
    try {
    if (!user) {
      onSession(null);
      setSignedInEmail(null);
      return;
    }
    await user.reload();
    if (sharedSession.current) return;
    if (!user.emailVerified) {
      onSession(null);
      setSignedInEmail(null);
      setStatus("Verify the email address before administrator access can continue.");
      return;
    }
    const idToken = await user.getIdToken(true);
    const response = await fetch("/api/admin/auth/session", { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" });
    if (sharedSession.current) return;
    if (!response.ok || adminAuth.currentUser?.uid !== user.uid) {
      onSession(null);
      setSignedInEmail(null);
      setStatus("This email is not approved for administrator access, or the session expired.");
      return;
    }
    onSession(`Bearer ${idToken}`, user.email ?? undefined);
    setSignedInEmail(user.email);
    setStatus(`Signed in as ${user.email}. You can load and publish the protected prayer settings.`);
    } catch {
      onSession(null);
      setSignedInEmail(null);
      setStatus("Could not refresh administrator sign-in. Sign out and try again.");
    } finally { handlingAuth.current = false; }
  }), [onSession]);

  async function login() {
    setBusy(true);
    setStatus("Signing in…");
    try {
      sharedSession.current = false;
      onSession(null);
      await signInWithEmailAndPassword(adminAuth, email.trim().toLowerCase(), password);
      setPassword("");
    } catch (error) {
      if ((error as { code?: string }).code === "auth/multi-factor-auth-required") {
        setResolver(getMultiFactorResolver(adminAuth, error as never));
        setStatus("Enter the six-digit code from your authenticator app.");
      } else {
        setStatus("Unable to sign in. Check the email/password or use the setup link.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function resolveMfa() {
    if (!resolver) return;
    setBusy(true);
    try {
      const hint = resolver.hints.find((entry) => entry.factorId === TotpMultiFactorGenerator.FACTOR_ID);
      if (!hint) throw new Error("No TOTP factor is enrolled.");
      await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code.trim()));
      setResolver(null);
      setCode("");
    } catch {
      setStatus("That MFA code was invalid or expired. Enter the newest code and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendSetupEmail() {
    setBusy(true);
    try {
      await sendPasswordResetEmail(adminAuth, email.trim().toLowerCase());
      setStatus("Password setup email sent. Open it from your inbox, set a private password, then return here.");
    } catch {
      setStatus("The setup email could not be sent yet. Confirm the account has been activated and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function useSharedAccess() {
    setBusy(true);
    try {
      const token = basicAuthorization(sharedEmail, sharedPassword);
      const response = await fetch("/api/admin/content/draft", { headers: { Authorization: token }, cache: "no-store" });
      if (!response.ok) throw new Error("Shared access was not accepted.");
      sharedSession.current = true;
      onSession(token, sharedEmail.trim().toLowerCase());
      setSharedPassword("");
      setStatus("Shared HBIC access verified for publishing prayer settings.");
    } catch {
      onSession(null);
      setStatus("Shared access could not be verified. Check the email and password.");
    } finally { setBusy(false); }
  }

  if (resolver) {
    return (
      <div className="firebase-auth-panel">
        <strong>MFA verification</strong>
        <label><span>Six-digit authenticator code</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
        <button type="button" onClick={resolveMfa} disabled={busy || code.length !== 6}>Verify &amp; sign in</button>
        <p role="status">{status}</p>
      </div>
    );
  }

  if (signedInEmail) {
    return (
      <div className="firebase-auth-panel firebase-auth-ready">
        <div><strong>{signedInEmail}</strong><p role="status">{status}</p></div>
        <button type="button" onClick={() => void signOut(adminAuth)}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="firebase-auth-panel">
      <label><span>Personal administrator email</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label><span>Private password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <div className="firebase-auth-actions">
        <button type="button" onClick={login} disabled={busy || !email.trim() || !password}>Sign in</button>
        <button type="button" onClick={sendSetupEmail} disabled={busy || !email.trim()}>Email password setup link</button>
      </div>
      <div className="firebase-auth-shared">
        <strong>Existing shared HBIC access</strong>
        <label><span>Shared administrator email</span><input type="email" autoComplete="username" value={sharedEmail} onChange={(event) => setSharedEmail(event.target.value)} /></label>
        <label><span>Shared administrator password</span><input type="password" autoComplete="current-password" value={sharedPassword} onChange={(event) => setSharedPassword(event.target.value)} /></label>
        <button type="button" onClick={useSharedAccess} disabled={busy || !sharedEmail.trim() || !sharedPassword}>Use shared access</button>
      </div>
      <p role="status">{status}</p>
      {adminAuth.currentUser && <button type="button" onClick={() => { sharedSession.current = false; void signOut(adminAuth); }}>Sign out of current account</button>}
    </div>
  );
}
