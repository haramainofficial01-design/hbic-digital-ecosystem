import { sign } from "node:crypto";
import { walletPassHash } from "./academyWalletTicket";

export const googleWalletClassSuffix = "hbic_academy_2026_27";
export const googleWalletExpiration = "2027-02-02T06:00:00Z";

export function googleAcademyObject(issuer: string, family: { passToken: string; reference: string }) {
  if (!/^\d{10,25}$/.test(issuer) || !/^[A-Za-z0-9_-]{43}$/.test(family.passToken) || !/^QA-[A-F0-9]{10}$/.test(family.reference)) throw new Error("Invalid Academy pass identity");
  const text = (value: string) => ({ defaultValue: { language: "en", value } });
  return {
    id: `${issuer}.${walletPassHash(family.passToken)}`, classId: `${issuer}.${googleWalletClassSuffix}`,
    state: "ACTIVE", genericType: "GENERIC_OTHER", hexBackgroundColor: "#0B2A3B",
    logo: { sourceUri: { uri: "https://hbic.ca/brand/hbic-logo.png" }, contentDescription: text("Masjid Bilal") },
    cardTitle: text("HBIC Qur’an Academy"), subheader: text("MASJID BILAL · CALGARY"), header: text(family.reference),
    barcode: { type: "QR_CODE", value: `https://hbic.ca/a/${family.passToken}`, alternateText: family.reference },
    validTimeInterval: { end: { date: googleWalletExpiration } },
    textModulesData: [
      { id: "classes", header: "2026–27 TERM", body: "Mondays & Thursdays · 5:30–7:00 PM" },
      { id: "verification", header: "LIVE STAFF VERIFICATION", body: "Present this pass to authorized HBIC staff for current enrollment and payment status. This pass is not a payment receipt." },
      { id: "address", header: "HBIC", body: "20 Saddlestone Dr NE, Calgary, AB T3J 0B4" }
    ],
    linksModuleData: { uris: [{ id: "academy", uri: "https://hbic.ca/quran-academy", description: "Manage Academy enrollment" }] }
  };
}

export function signGoogleWalletJwt(payload: Record<string, unknown>, key: string) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const message = `${encode({ alg: "RS256", typ: "JWT" })}.${encode(payload)}`;
  return `${message}.${sign("RSA-SHA256", Buffer.from(message), key).toString("base64url")}`;
}
