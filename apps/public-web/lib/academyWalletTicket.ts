import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type WalletTicket = { uid: string; passHash: string; expires: number };
export const walletPassHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Short-lived encrypted capability: Safari can import without exposing a Firebase token. */
export function createWalletTicket(uid: string, passToken: string, secret: string, now = Date.now()) {
  if (secret.length < 64) throw new Error("Wallet signing is not configured.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), iv);
  const payload: WalletTicket = { uid, passHash: walletPassHash(passToken), expires: now + 5 * 60_000 };
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function readWalletTicket(value: string, secret: string, now = Date.now()): WalletTicket {
  if (secret.length < 64 || !/^[A-Za-z0-9_-]{80,1200}$/.test(value)) throw new Error("Invalid Wallet download.");
  try {
    const bytes = Buffer.from(value, "base64url");
    const cipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), bytes.subarray(0, 12));
    cipher.setAuthTag(bytes.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString()) as WalletTicket;
    if (typeof data.uid !== "string" || !data.uid || !/^[a-f0-9]{64}$/.test(data.passHash) ||
        !Number.isSafeInteger(data.expires) || data.expires <= now || data.expires > now + 5 * 60_000) throw new Error();
    return data;
  } catch { throw new Error("Wallet download expired or invalid. Return to your Academy pass and try again."); }
}
