import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { X509Certificate, createPrivateKey, createPublicKey } from "node:crypto";
import { PKPass } from "passkit-generator";
import sharp from "sharp";
import type { AcademyPublicFamily } from "@hbic/shared";
import { AcademyError, academyDb, getAcademyFamily } from "./academyStore";
import { walletPassHash } from "./academyWalletTicket";

const passTypeIdentifier = "pass.ca.hbic.calgary.app.academy";
const teamIdentifier = "ZJ58VWNTX3";
export const academyWalletExpiration = "2027-02-02T06:00:00Z";

function appleCredentials() {
  const signerKey = Buffer.from(process.env.ACADEMY_APPLE_WALLET_KEY_BASE64 ?? "", "base64").toString();
  const signerCert = Buffer.from(process.env.ACADEMY_APPLE_WALLET_CERT_BASE64 ?? "", "base64").toString();
  const wwdr = Buffer.from(process.env.ACADEMY_APPLE_WALLET_WWDR_BASE64 ?? "", "base64").toString();
  try {
    const cert = new X509Certificate(signerCert);
    const privateKey = createPrivateKey(signerKey);
    const matches = cert.publicKey.export({ type: "spki", format: "pem" }) === createPublicKey(privateKey).export({ type: "spki", format: "pem" });
    if (!matches || !cert.subject.includes(passTypeIdentifier) || !cert.subject.includes(teamIdentifier) ||
        Date.parse(cert.validFrom) > Date.now() || Date.parse(cert.validTo) <= Date.now() ||
        !cert.verify(new X509Certificate(wwdr).publicKey)) throw new Error();
    return { signerKey, signerCert, wwdr };
  } catch { throw new AcademyError("Apple Wallet is not configured yet.", 503); }
}

export function appleWalletConfigured() {
  try { appleCredentials(); return true; } catch { return false; }
}

/** Never trust a pass screenshot, cached payment label, or replaced token. */
export async function currentWalletFamily(uid: string, expectedHash?: string) {
  const family = await getAcademyFamily(uid);
  if (!family) throw new AcademyError("Register before opening your Academy pass.", 404);
  const hash = walletPassHash(family.passToken);
  const pass = await academyDb().collection("academyPasses").doc(hash).get();
  if (!/^[A-Za-z0-9_-]{43}$/.test(family.passToken) || family.enrollmentState === "withdrawn" ||
      !pass.exists || pass.data()?.state !== "active" || pass.data()?.uid !== uid ||
      expectedHash && expectedHash !== hash || Date.now() >= Date.parse(academyWalletExpiration)) {
    throw new AcademyError("This Academy pass is inactive, expired or replaced.", 410);
  }
  return family;
}

let logoBuffers: Promise<Record<string, Buffer>> | undefined;
async function images() {
  if (!logoBuffers) logoBuffers = (async () => {
    let logo: Buffer;
    try { logo = await readFile(join(process.cwd(), "public/brand/hbic-logo.png")); }
    catch { logo = await readFile(join(process.cwd(), "apps/public-web/public/brand/hbic-logo.png")); }
    const result: Record<string, Buffer> = {};
    for (const [name, width] of [["icon.png", 29], ["icon@2x.png", 58], ["icon@3x.png", 87], ["logo.png", 50], ["logo@2x.png", 100], ["logo@3x.png", 150]] as const) {
      result[name] = await sharp(logo).resize(width, width, { fit: "contain", background: "#ffffff00" }).png().toBuffer();
    }
    return result;
  })().catch((error) => { logoBuffers = undefined; throw error; });
  return logoBuffers;
}

export async function createAppleAcademyPass(family: Pick<AcademyPublicFamily, "passToken" | "reference">) {
  const pass = new PKPass(await images(), appleCredentials(), {
    passTypeIdentifier, teamIdentifier, formatVersion: 1,
    serialNumber: walletPassHash(family.passToken),
    organizationName: "Hazrat Bilal Islamic Centre",
    description: "HBIC Quran Academy check-in pass",
    logoText: "HBIC Qur’an Academy",
    foregroundColor: "rgb(246, 247, 242)", backgroundColor: "rgb(11, 42, 59)", labelColor: "rgb(226, 204, 150)"
  });
  pass.type = "generic";
  pass.primaryFields.push({ key: "academy", label: "MASJID BILAL · CALGARY", value: "Qur’an Academy" });
  pass.secondaryFields.push({ key: "reference", label: "ACADEMY REFERENCE", value: family.reference });
  pass.auxiliaryFields.push({ key: "term", label: "TERM", value: "2026–27" }, { key: "classes", label: "MON & THU", value: "5:30–7:00 PM" });
  pass.backFields.push({ key: "verification", label: "Live verification", value: "Present this pass to authorized HBIC staff. They retrieve your current enrollment and payment status. This pass is not a payment receipt." },
    { key: "address", label: "HBIC", value: "20 Saddlestone Dr NE, Calgary, AB T3J 0B4" },
    { key: "manage", label: "Manage your Academy enrollment", value: "https://hbic.ca/quran-academy" });
  pass.setBarcodes({ format: "PKBarcodeFormatQR", message: `https://hbic.ca/a/${family.passToken}`, messageEncoding: "iso-8859-1", altText: family.reference });
  pass.setExpirationDate(new Date(academyWalletExpiration));
  return pass.getAsBuffer();
}

export function appleWalletTicketSecret() { return appleCredentials().signerKey; }
