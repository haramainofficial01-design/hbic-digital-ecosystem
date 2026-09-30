"use client";
/* eslint-disable @next/next/no-img-element -- This QR is generated locally as a data URI and is never network-fetched. */

import {
  TotpMultiFactorGenerator,
  createUserWithEmailAndPassword,
  getMultiFactorResolver,
  multiFactor,
  onIdTokenChanged,
  sendEmailVerification,
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
const apiBase = (process.env.NEXT_PUBLIC_API_URL || "https://hbic.ca").replace(/\/$/, "");

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
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [status, setStatus] = useState("Sign in with your personal administrator account.");
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const generating = useRef(false);
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
    if (sharedSession.current) return;
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
    if (multiFactor(user).enrolledFactors.length === 0) {
      onSession(null);
      if (!generating.current && !secret) {
        generating.current = true;
        try {
          let generated: TotpSecret;
          try {
            generated = await TotpMultiFactorGenerator.generateSecret(await multiFactor(user).getSession());
          } catch {
            // Existing TOTP configuration needs no server-side change. Only
            // attempt project preparation when Firebase rejects enrollment.
            const prepared = await fetch(`${apiBase}/api/admin/auth/prepare`, {
              method: "POST",
              headers: { Authorization: `Bearer ${await user.getIdToken(true)}` }
            });
            if (!prepared.ok) {
              const result = await prepared.json().catch(() => null) as { error?: string } | null;
              throw new Error(result?.error ?? "Authenticator setup is unavailable.");
            }
            generated = await TotpMultiFactorGenerator.generateSecret(await multiFactor(user).getSession());
          }
          setSecret(generated);
          try {
            const { toDataURL } = await import("qrcode");
            setTotpQr(await toDataURL(generated.generateQrCodeUrl(user.email ?? "HBIC admin", "HBIC Admin"), {
              width: 240, margin: 2, errorCorrectionLevel: "M"
            }));
          } catch {
            setTotpQr(null);
          }
          setStatus("Scan the QR with an authenticator or add the setup key manually, then enter its six-digit code.");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Unable to start MFA enrollment. Sign out and try again.");
        } finally {
          generating.current = false;
        }
      }
      return;
    }
    const idToken = await user.getIdTokenResult(true);
    if (sharedSession.current) return;
    const firebaseClaims = idToken.claims.firebase as { sign_in_second_factor?: string } | undefined;
    if (!firebaseClaims?.sign_in_second_factor) {
      onSession(null);
      setStatus("MFA is enrolled, but this session has not completed its challenge. Sign out and sign in again.");
      return;
    }
    onSession(`Bearer ${idToken.token}`, user.email ?? undefined);
    setStatus(`Signed in securely as ${user.email}. MFA is active.`);
    });
  }, [onSession, secret]);

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

  async function enrollMfa() {
    if (!auth) return;
    const user = auth.currentUser;
    if (!user || !secret) return;
    setBusy(true);
    try {
      await multiFactor(user).enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret, code.trim()), "HBIC Authenticator");
      setSecret(null);
      setTotpQr(null);
      setCode("");
      // Enrollment is not an MFA-authenticated sign-in. Require a fresh login
      // so the resulting ID token carries the second-factor claim.
      await signOut(auth);
      onSession(null);
      setStatus("Authenticator activated. Sign in again and enter its code to open Academy records.");
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

  async function createPersonalAccount() {
    if (!auth) return setStatus("Personal administrator sign-in is not configured in this build.");
    if (password.length < 12) return setStatus("Choose a private password of at least 12 characters.");
    setBusy(true);
    try {
      sharedSession.current = false;
      onSession(null);
      const user = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await sendEmailVerification(user.user);
      setPassword("");
      setStatus("Account created. Verify this email from your inbox, then return here. Academy records stay locked until authenticator MFA is complete.");
    } catch (error) {
      const code = (error as { code?: string }).code;
      setStatus(code === "auth/email-already-in-use"
        ? "This email already has a Firebase account. Use 'Set or reset approved admin password' and then sign in."
        : "Could not create the account. Check the email and password, then try again.");
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
      setStatus("Email verified. Sign in with your private password to set up the authenticator.");
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
      setStatus("Shared HBIC access verified. Publishing is available; private Academy family records require personal MFA.");
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
      setStatus("Approved personal account activated. Check its inbox for the private password setup link, then sign in and complete MFA.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Personal account activation failed. Contact the HBIC administrator.");
    } finally {
      setBusy(false);
    }
  }

  if (secret || resolver) return (
    <div className="firebase-auth-panel" id="admin-auth">
      <strong>{secret ? "Set up authenticator MFA" : "MFA verification"}</strong>
      {secret ? <><p>Scan this with your phone’s Passwords app or an authenticator. Face ID or fingerprint can unlock that app; the six-digit code is still required for HBIC sign-in.</p>{totpQr ? <img src={totpQr} width={240} height={240} alt="HBIC administrator authenticator setup QR code" /> : null}<p>If you are setting this up on the same phone, enter this key manually in your authenticator:</p><code>{secret.secretKey}</code></> : null}
      <AuthField label="Six-digit authenticator code" value={code} onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} />
      <button className="primary" type="button" onClick={secret ? enrollMfa : verifyMfa} disabled={busy || code.length !== 6}>{secret ? "Activate MFA" : "Verify & sign in"}</button>
      <p role="status">{status}</p>
    </div>
  );

  if (auth?.currentUser && multiFactor(auth.currentUser).enrolledFactors.length > 0) return (
    <div className="firebase-auth-panel firebase-auth-ready" id="admin-auth">
      <div><strong>{auth.currentUser.email}</strong><p role="status">{status}</p></div>
        <button className="secondary" type="button" onClick={() => void signOut(auth)}>Sign out</button>
    </div>
  );

  if (auth?.currentUser && !auth.currentUser.emailVerified) return (
    <div className="firebase-auth-panel" id="admin-auth">
      <strong>Verify your personal email</strong>
      <p>Open the Firebase verification email for {auth.currentUser.email}. Your personal password alone does not unlock Academy records.</p>
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
        <button className="secondary" type="button" onClick={() => void createPersonalAccount()} disabled={busy || !auth || !email.trim() || !password}>Create approved personal account</button>
        <button className="secondary" type="button" onClick={sendSetupEmail} disabled={busy || !auth || !email.trim()}>Set or reset approved admin password</button>
      </div>
      <div className="firebase-auth-shared">
        <strong>Existing shared HBIC access</strong>
        <AuthField label="Shared administrator email" value={sharedEmail} type="email" onChange={setSharedEmail} />
        <AuthField label="Shared administrator password" value={sharedPassword} type="password" onChange={setSharedPassword} />
        <button className="secondary" type="button" onClick={() => void verifySharedAccess()} disabled={busy || !sharedEmail.trim() || !sharedPassword}>Use shared access</button>
        {sharedReady ? <div className="firebase-auth-actions"><p>Shared publishing is active. Academy family records require a personal administrator account with MFA.</p><button className="secondary" type="button" onClick={() => void activatePersonalAccount()} disabled={busy || !auth || !email.trim()}>Activate approved personal account</button></div> : null}
      </div>
      <p>To open private Academy records: create or sign in to your approved personal email, verify it, scan the authenticator QR, then sign in again with its six-digit code. Shared access is optional for publishing only; a password-reset email alone never grants Academy access.</p>
      <p role="status">{status}</p>
    </div>
  );
}
