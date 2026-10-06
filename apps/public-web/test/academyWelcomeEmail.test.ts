import assert from "node:assert/strict";
import test from "node:test";
import { enrollmentConfirmedEmail } from "../lib/academyEmail";

test("Academy welcome email uses natural child-name grammar and a stable registration key", () => {
  const one = enrollmentConfirmedEmail({ uid: "parent-1", email: "parent@example.com", name: "Parent", reference: "QA-123", childNames: ["Amina"] });
  const two = enrollmentConfirmedEmail({ uid: "parent-1", email: "parent@example.com", name: "Parent", reference: "QA-123", childNames: ["Amina", "Yusuf"] });
  const three = enrollmentConfirmedEmail({ uid: "parent-1", email: "parent@example.com", name: "Parent", reference: "QA-123", childNames: ["Amina", "Yusuf", "Maryam"] });
  assert.equal(one.subject, "Welcome to HBIC Quran Academy");
  assert.match(one.text, /your child Amina/);
  assert.match(two.text, /your children Amina and Yusuf/);
  assert.match(three.text, /your children Amina, Yusuf, and Maryam/);
  assert.match(three.text, /JazakAllahu khairan/);
  assert.equal(one.key, two.key);
});
