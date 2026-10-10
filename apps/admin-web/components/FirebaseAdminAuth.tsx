"use client";
import {
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type MultiFactorResolver
} from "firebase/auth";
import { useEffect, useId, useRef, useState } from "react";
import { getAdminAuth } from "../lib/firebase";

const initialEmail = "haramain.official01@gmail.com";
const apiBase = (process.env.NEXT_PUBLIC_API_URL || "https://hbic.ca").replace(/\/$/, "");

function basicAuthorization(email: string, password: string) {
  const bytes = new TextEncoder().encode(`${email.trim().toLowerCase()}:${password}`);
  let binary = "";
  bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return `Basic ${window.btoa(binary)}`;
}

function AuthField({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} autoComplete={type === "password" ? "current-password" : "username"} onChange={(event) => onChange(event.target.value)} />
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
  const [status, setStatus] = useState("Sign in with your personal administrator account.");
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const handlingAuth = useRef(false);
  const sharedSession = useRef(false);
  const sharedToken = useRef<string | null>(null);
  const [sharedReady, setSharedReady] = useState(false);

  useEffect(() => {
    const clientAuth = getAdminAuth();
    setAuth(clientAuth);
    if (!clientAuth) {
      setStatus("Personal administrator sign-in is not configured in this build. Existing shared HBIC access remains available.");
      return;
    }
    return onIdTokenChanged(clientAuth, async (user) => {
    // A forced token refresh can emit another onIdTokenChanged event. Ignore
    // that nested event while this sign-in is being reconciled.
    if (sharedSession.current || handlingAuth.current) return;
    handlingAuth.current = true;
    try {
    if (!user) {
      onSession(null);
      return;
    }
    try {
      await user.reload();
    } catch {
      if (!sharedSession.current) onSession(null);
      setStatus("Could not refresh administrator sign-in. Sign out and try again.");
      return;
    }
    if (sharedSession.current) return;
    if (!user.emailVerified) {
      onSession(null);
      setStatus("Verify the email address before administrator access can continue.");
      return;
    }
    const idToken = await user.getIdToken(true);
    if (sharedSession.current) return;
    const approved = await fetch(`${apiBase}/api/admin/auth/session`, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: "no-store"
    });
    if (!approved.ok || clientAuth.currentUser?.uid !== user.uid) {
      onSession(null);
      setStatus("This email is not approved for administrator access, or the session expired. Contact an HBIC administrator if you believe this is a mistake.");
      return;
    }
    onSession(`Bearer ${idToken}`, user.email ?? undefined);
    setStatus(`Signed in as ${user.email}. You can load the protected draft and Academy records.`);
    } catch {
      onSession(null);
      setStatus("Could not finish administrator sign-in. Sign out and try again.");
    } finally {
      handlingAuth.current = false;
    }
    });
  }, [onSession]);

  async function login() {
    if (!auth) return setStatus("Personal administrator sign-in is not configured in this build.");
    setBusy(true);
    try {
      sharedSession.current = false;
      sharedToken.current = null;
      setSharedReady(false);
      onSession(null);
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

  async function refreshVerifiedEmail() {
    if (!auth?.currentUser) return;
    setBusy(true);
    try {
      await auth.currentUser.reload();
      if (!auth.currentUser.emailVerified) return setStatus("Email is not verified yet. Open the verification link, then try again.");
      await auth.currentUser.getIdToken(true);
      await signOut(auth);
      setStatus("Email verified. Sign in with your private password.");
    } catch {
      setStatus("Could not refresh email verification. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifySharedAccess() {
    setBusy(true);
    setSharedReady(false);
    try {
      const token = basicAuthorization(sharedEmail, sharedPassword);
      const response = await fetch(`${apiBase}/api/admin/content/draft`, {
        headers: { Authorization: token },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Shared access was not accepted by the publishing server.");
      sharedSession.current = true;
      sharedToken.current = token;
      onSession(token, sharedEmail.trim().toLowerCase());
      setSharedReady(true);
      setSharedPassword("");
      setStatus("Shared HBIC access verified for publishing. Private Academy family records require an approved personal account.");
    } catch {
      sharedSession.current = false;
      sharedToken.current = null;
      onSession(null);
      setStatus("Shared access could not be verified. Check the email and password, then try again.");
    } finally {
      setBusy(false);
    }
  }

  async function activatePersonalAccount() {
    if (!auth || !sharedToken.current) return;
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/auth/bootstrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: sharedToken.current },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Personal account activation failed.");
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setStatus("Approved personal account activated. Check its inbox for the private password setup link, then sign in.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Personal account activation failed. Contact the HBIC administrator.");
    } finally {
      setBusy(false);
    }
  }

  if (resolver) return (
    <div className="firebase-auth-panel" id="admin-auth">
      <strong>Existing authenticator on this account</strong>
      <p>New approved accounts need only their email and password. This account already has an authenticator enrolled, so Firebase still requires its code until that factor is removed.</p>
      <AuthField label="Six-digit authenticator code" value={code} onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} />
      <button className="primary" type="button" onClick={verifyMfa} disabled={busy || code.length !== 6}>Verify & sign in</button>
      <p role="status">{status}</p>
    </div>
  );

  if (auth?.currentUser && auth.currentUser.emailVerified) return (
    <div className="firebase-auth-panel firebase-auth-ready" id="admin-auth">
      <div><strong>{auth.currentUser.email}</strong><p role="status">{status}</p></div>
        <button className="secondary" type="button" onClick={() => void signOut(auth)}>Sign out</button>
    </div>
  );

  if (auth?.currentUser && !auth.currentUser.emailVerified) return (
    <div className="firebase-auth-panel" id="admin-auth">
      <strong>Verify your personal email</strong>
      <p>Open the Firebase verification email for {auth.currentUser.email}. An approved, verified email and private password are required for Academy records.</p>
      <div className="firebase-auth-actions">
        <button className="primary" type="button" onClick={() => void refreshVerifiedEmail()} disabled={busy}>I verified my email</button>
        <button className="secondary" type="button" onClick={() => void sendEmailVerification(auth.currentUser!)} disabled={busy}>Resend verification</button>
        <button className="secondary" type="button" onClick={() => void signOut(auth)} disabled={busy}>Use another account</button>
      </div>
      <p role="status">{status}</p>
    </div>
  );

  return (
    <div className="firebase-auth-panel" id="admin-auth">
      <AuthField label="Personal administrator email" value={email} type="email" onChange={setEmail} />
      <AuthField label="Private password" value={password} type="password" onChange={setPassword} />
      <div className="firebase-auth-actions">
        <button className="secondary" type="button" onClick={login} disabled={busy || !auth || !email.trim() || !password}>Sign in</button>
        <button className="secondary" type="button" onClick={sendSetupEmail} disabled={busy || !auth || !email.trim()}>Set or reset approved admin password</button>
      </div>
      <details className="firebase-auth-shared">
        <summary>Use existing shared HBIC access</summary>
        <div className="firebase-auth-shared-fields">
        <AuthField label="Shared administrator email" value={sharedEmail} type="email" onChange={setSharedEmail} />
        <AuthField label="Shared administrator password" value={sharedPassword} type="password" onChange={setSharedPassword} />
        <button className="secondary" type="button" onClick={() => void verifySharedAccess()} disabled={busy || !sharedEmail.trim() || !sharedPassword}>Use shared access</button>
        {sharedReady ? <div className="firebase-auth-actions"><p>Shared publishing is active. Academy family records require an approved personal administrator account.</p><button className="secondary" type="button" onClick={() => void activatePersonalAccount()} disabled={busy || !auth || !email.trim()}>Activate approved personal account</button></div> : null}
        </div>
      </details>
      <p>To open private Academy records, sign in with a verified, approved personal email and private password. New personal accounts must first be approved by HBIC; shared access is for publishing only.</p>
      <p role="status">{status}</p>
    </div>
  );
}
