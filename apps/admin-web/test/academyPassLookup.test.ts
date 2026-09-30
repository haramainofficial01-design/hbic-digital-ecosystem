import assert from "node:assert/strict";
import test from "node:test";
import { parseAcademyPassLookup } from "../lib/academyPassLookup";

test("accepts a full QA reference without a camera", () => {
  assert.deepEqual(parseAcademyPassLookup("qa-72449ba706"), { reference: "QA-72449BA706" });
  assert.deepEqual(parseAcademyPassLookup("hbic.ca/QA-72449BA706"), { reference: "QA-72449BA706" });
});

test("accepts a genuine HBIC pass link and rejects malformed or foreign links", () => {
  const token = "a".repeat(43);
  assert.deepEqual(parseAcademyPassLookup(`https://hbic.ca/a/${token}`), { token });
  assert.deepEqual(parseAcademyPassLookup(token), { token });
  assert.equal(parseAcademyPassLookup("QA-72449BA70"), null);
  assert.equal(parseAcademyPassLookup("https://example.org/a/" + token), null);
});
