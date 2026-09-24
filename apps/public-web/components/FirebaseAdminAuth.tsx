"use client";

import {
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  multiFactor,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type MultiFactorResolver,
  type TotpSecret
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
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [status, setStatus] = useState("Sign in with your personal HBIC administrator account.");
  const [busy, setBusy] = useState(false);
  const generating = useRef(false);

  useEffect(() => onIdTokenChanged(adminAuth, async (user) => {
    if (!user) {
      onSession(null);
      return;
    }
    if (!user.emailVerified) {
      onSession(null);
      setStatus("Verify the email address before administrator access can continue.");
      return;
    }
    if (multiFactor(user).enrolledFactors.length === 0) {
      onSession(null);
      if (!generating.current && !secret) {
        generating.current = true;
        try {
          const session = await multiFactor(user).getSession();
          setSecret(await TotpMultiFactorGenerator.generateSecret(session));
          setStatus("MFA is required. Add the secret below to your authenticator app, then enter its six-digit code.");
        } catch {
          setStatus("Unable to start MFA enrollment. Sign out and try again.");
        } finally {
          generating.current = false;
        }
      }
      return;
    }
    onSession(`Bearer ${await user.getIdToken()}`, user.email ?? undefined);
    setStatus(`Signed in securely as ${user.email}. MFA is active.`);
  }), [onSession, secret]);

  async function login() {
    setBusy(true);
    setStatus("Signing in…");
    try {
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

  async function enrollMfa() {
    const user = adminAuth.currentUser;
    if (!user || !secret) return;
    setBusy(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code.trim());
      await multiFactor(user).enroll(assertion, "HBIC Authenticator");
      setSecret(null);
      setCode("");
      onSession(`Bearer ${await user.getIdToken(true)}`, user.email ?? undefined);
      setStatus(`Signed in securely as ${user.email}. MFA is active.`);
    } catch {
      setStatus("That enrollment code was invalid or expired. Enter the newest authenticator code.");
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

  function useSharedAccess() {
    onSession(basicAuthorization(sharedEmail, sharedPassword), sharedEmail.trim().toLowerCase());
    setSharedPassword("");
    setStatus("Shared HBIC access is ready. Load the protected display settings to verify it.");
  }

  if (secret) {
    return (
      <div className="firebase-auth-panel">
        <strong>Set up authenticator MFA</strong>
        <p>In Google Authenticator, Microsoft Authenticator, 1Password, or another TOTP app, add this setup key:</p>
        <code>{secret.secretKey}</code>
        <label><span>Six-digit authenticator code</span><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
        <button type="button" onClick={enrollMfa} disabled={busy || code.length !== 6}>Activate MFA</button>
        <p role="status">{status}</p>
      </div>
    );
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

  if (adminAuth.currentUser && multiFactor(adminAuth.currentUser).enrolledFactors.length > 0) {
    return (
      <div className="firebase-auth-panel firebase-auth-ready">
        <div><strong>{adminAuth.currentUser.email}</strong><p role="status">{status}</p></div>
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
        <button type="button" onClick={useSharedAccess} disabled={!sharedEmail.trim() || !sharedPassword}>Use shared access</button>
      </div>
      <p role="status">{status}</p>
    </div>
  );
}
