import "server-only";
import { AcademyError } from "./academyStore";
import { googleAcademyObject, googleWalletClassSuffix, signGoogleWalletJwt } from "./academyGoogleWalletModel";

const api = "https://walletobjects.googleapis.com/walletobjects/v1";
let cachedToken: { value: string; expires: number; identity: string } | undefined;

function credentials() {
  const parsed = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) : {};
  const email = parsed.client_email || process.env.FIREBASE_CLIENT_EMAIL;
  const key = (parsed.private_key || process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const issuer = process.env.ACADEMY_GOOGLE_WALLET_ISSUER_ID || "";
  if (!/^\d{10,25}$/.test(issuer) || email !== "firebase-adminsdk-fbsvc@hbic-calgary-prod.iam.gserviceaccount.com" || !key.includes("PRIVATE KEY")) throw new AcademyError("Google Wallet is not configured yet.", 503);
  return { email, key, issuer };
}

async function token(c: ReturnType<typeof credentials>) {
  if (cachedToken && cachedToken.identity === c.email && cachedToken.expires > Date.now()) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const assertion = signGoogleWalletJwt({ iss: c.email, scope: "https://www.googleapis.com/auth/wallet_object.issuer", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }, c.key);
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }), cache: "no-store", signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new AcademyError("Google Wallet authorization is unavailable.", 503);
  cachedToken = { value: data.access_token, expires: Date.now() + (Number(data.expires_in) - 120) * 1000, identity: c.email };
  return cachedToken.value;
}

/** Only the server holds credentials. Every issuance revalidates the live pass first. */
export async function createGoogleAcademyPass(family: { passToken: string; reference: string }, options: { allowDemo?: boolean } = {}) {
  if (!options.allowDemo && process.env.ACADEMY_GOOGLE_WALLET_READY !== "true") throw new AcademyError("Google Wallet publishing is not enabled yet.", 503);
  const c = credentials();
  const headers = { Authorization: `Bearer ${await token(c)}`, "Content-Type": "application/json" };
  const object = googleAcademyObject(c.issuer, family);
  async function ensure(resource: string, id: string, body: unknown) {
    const existing = await fetch(`${api}/${resource}/${encodeURIComponent(id)}`, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (existing.ok) return existing.json();
    if (existing.status !== 404) throw new AcademyError("Google Wallet issuer access is unavailable.", 503);
    const created = await fetch(`${api}/${resource}`, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (created.status === 409) {
      const raced = await fetch(`${api}/${resource}/${encodeURIComponent(id)}`, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (raced.ok) return raced.json();
    }
    if (!created.ok) throw new AcademyError("Google Wallet pass could not be created.", 503);
    return created.json();
  }
  await ensure("genericClass", object.classId, { id: `${c.issuer}.${googleWalletClassSuffix}` });
  const stored = await ensure("genericObject", object.id, object);
  if (stored.state !== "ACTIVE" || stored.classId !== object.classId || stored.barcode?.value !== object.barcode.value) throw new AcademyError("This Google Wallet pass is inactive or replaced.", 410);
  const jwt = signGoogleWalletJwt({ iss: c.email, aud: "google", typ: "savetowallet", iat: Math.floor(Date.now() / 1000), origins: ["https://hbic.ca"], payload: { genericObjects: [{ id: object.id }] } }, c.key);
  return `https://pay.google.com/gp/v/save/${jwt}`;
}
