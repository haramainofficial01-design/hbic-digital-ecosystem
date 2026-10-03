import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import test from "node:test";
import { googleAcademyObject, signGoogleWalletJwt } from "../lib/academyGoogleWalletModel";

test("Google pass contains opaque current identity, no family/payment details, and replacement gets a new object", () => {
  const family = { passToken: "A".repeat(43), reference: "QA-AAAAAAAAAA", guardianName: "Never embed me", paymentChoice: "card", amountCents: 5000 };
  const object = googleAcademyObject("3388000000023198109", family);
  assert.equal(object.barcode.value, `https://hbic.ca/a/${family.passToken}`);
  assert.equal(object.barcode.alternateText, family.reference);
  assert.equal(object.validTimeInterval.end.date, "2027-02-02T06:00:00Z");
  assert.equal(JSON.stringify(object).includes(family.guardianName), false);
  assert.equal(JSON.stringify(object).includes("5000"), false);
  assert.notEqual(object.id, googleAcademyObject("3388000000023198109", { ...family, passToken: "B".repeat(43) }).id);
  assert.throws(() => googleAcademyObject("merchant-profile", family));
  assert.throws(() => googleAcademyObject("3388000000023198109", { ...family, passToken: "invalid" }));
});

test("Google Save JWT is actually RS256 signed and does not embed the private key", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const key = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const payload = { iss: "test@example.invalid", aud: "google", typ: "savetowallet", payload: { genericObjects: [{ id: "issuer.opaque" }] } };
  const jwt = signGoogleWalletJwt(payload, key);
  const [header, body, signature] = jwt.split(".");
  assert.equal(JSON.parse(Buffer.from(header, "base64url").toString()).alg, "RS256");
  assert.deepEqual(JSON.parse(Buffer.from(body, "base64url").toString()), payload);
  assert.equal(verify("RSA-SHA256", Buffer.from(`${header}.${body}`), publicKey, Buffer.from(signature, "base64url")), true);
  assert.equal(jwt.includes("PRIVATE"), false);
});
