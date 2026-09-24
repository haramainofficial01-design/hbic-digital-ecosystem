"use client";

import {
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  multiFactor,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type MultiFactorResolver,
  type TotpSecret
} from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { getAdminAuth } from "../lib/firebase";

const initialEmail = "haramain.official01@gmail.com";

function basicAuthorization(email: string, password: string) {
  const bytes = new TextEncoder().encode(`${email.trim().toLowerCase()}:${password}`);
  let binary = "";
  bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return `Basic ${window.btoa(binary)}`;
}

function AuthField({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} autoComplete={type === "password" ? "current-password" : "username"} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export function FirebaseAdminAuth({ onSession }: { onSession: (token: string | null, email?: string) => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [sharedEmail, setSharedEmail] = useState("");
  const [sharedPassword, setSharedPassword] = useState("");
  const [code, setCode] = useState("");
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [status, setStatus] = useState("Sign in with your personal administrator account.");
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const generating = useRef(false);

  useEffect(() => {
    const clientAuth = getAdminAuth();
    setAuth(clientAuth);
    if (!clientAuth) {
      setStatus("Personal administrator sign-in is not configured in this build. Existing shared HBIC access remains available.");
      return;
    }
    return onIdTokenChanged(clientAuth, async (user) => {
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
          setSecret(await TotpMultiFactorGenerator.generateSecret(await multiFactor(user).getSession()));
          setStatus("MFA is required. Add this setup key to your authenticator, then enter its six-digit code.");
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
    });
  }, [onSession, secret]);

  async function login() {
    if (!auth) return setStatus("Personal administrator sign-in is not configured in this build.");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      setPassword("");
    } catch (error) {
      if ((error as { code?: string }).code === "auth/multi-factor-auth-required") {
        setResolver(getMultiFactorResolver(auth, error as never));
        setStatus("Enter the six-digit code from your authenticator app.");
      } else setStatus("Unable to sign in. Check the email/password or use the setup link.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyMfa() {
    if (!auth || !resolver) return;
    setBusy(true);
    try {
      const hint = resolver.hints.find((entry) => entry.factorId === TotpMultiFactorGenerator.FACTOR_ID);
      if (!hint) throw new Error("No TOTP factor is enrolled.");
      await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code.trim()));
      setResolver(null);
      setCode("");
    } catch {
      setStatus("That MFA code was invalid or expired. Enter the newest code.");
    } finally {
      setBusy(false);
    }
  }

  async function enrollMfa() {
    if (!auth) return;
    const user = auth.currentUser;
    if (!user || !secret) return;
    setBusy(true);
    try {
      await multiFactor(user).enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret, code.trim()), "HBIC Authenticator");
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
    if (!auth) return setStatus("Personal administrator sign-in is not configured in this build.");
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setStatus("Password setup email sent. Set a private password from your inbox, then return here.");
    } catch {
      setStatus("The setup email could not be sent yet. Confirm activation and try again.");
    } finally {
      setBusy(false);
    }
  }

  function useSharedAccess() {
    onSession(basicAuthorization(sharedEmail, sharedPassword), sharedEmail.trim().toLowerCase());
    setSharedPassword("");
    setStatus("Shared HBIC access is ready. Load the protected draft to verify it.");
  }

  if (secret || resolver) return (
    <div className="firebase-auth-panel">
      <strong>{secret ? "Set up authenticator MFA" : "MFA verification"}</strong>
      {secret ? <><p>Add this setup key to your authenticator app:</p><code>{secret.secretKey}</code></> : null}
      <AuthField label="Six-digit authenticator code" value={code} onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} />
      <button className="primary" type="button" onClick={secret ? enrollMfa : verifyMfa} disabled={busy || code.length !== 6}>{secret ? "Activate MFA" : "Verify & sign in"}</button>
      <p role="status">{status}</p>
    </div>
  );

  if (auth?.currentUser && multiFactor(auth.currentUser).enrolledFactors.length > 0) return (
    <div className="firebase-auth-panel firebase-auth-ready">
      <div><strong>{auth.currentUser.email}</strong><p role="status">{status}</p></div>
        <button className="secondary" type="button" onClick={() => void signOut(auth)}>Sign out</button>
    </div>
  );

  return (
    <div className="firebase-auth-panel">
      <AuthField label="Personal administrator email" value={email} type="email" onChange={setEmail} />
      <AuthField label="Private password" value={password} type="password" onChange={setPassword} />
      <div className="firebase-auth-actions">
        <button className="secondary" type="button" onClick={login} disabled={busy || !auth || !email.trim() || !password}>Sign in</button>
        <button className="secondary" type="button" onClick={sendSetupEmail} disabled={busy || !auth || !email.trim()}>Email password setup link</button>
      </div>
      <div className="firebase-auth-shared">
        <strong>Existing shared HBIC access</strong>
        <AuthField label="Shared administrator email" value={sharedEmail} type="email" onChange={setSharedEmail} />
        <AuthField label="Shared administrator password" value={sharedPassword} type="password" onChange={setSharedPassword} />
        <button className="secondary" type="button" onClick={useSharedAccess} disabled={!sharedEmail.trim() || !sharedPassword}>Use shared access</button>
      </div>
      <p role="status">{status}</p>
    </div>
  );
}
