import assert from "node:assert/strict";
import test from "node:test";
import { createWalletTicket, readWalletTicket, walletPassHash } from "../lib/academyWalletTicket";

const secret = "test-only-wallet-key".repeat(8);
const pass = "A".repeat(43);
const now = Date.UTC(2026, 9, 2, 18);

test("Wallet capability hides identity and resolves the exact current pass", () => {
  const ticket = createWalletTicket("parent-test", pass, secret, now);
  assert.equal(ticket.includes("parent-test"), false);
  assert.equal(ticket.includes(pass), false);
  assert.deepEqual(readWalletTicket(ticket, secret, now), { uid: "parent-test", passHash: walletPassHash(pass), expires: now + 300_000 });
});
test("Wallet capabilities expire at five minutes, not after", () => {
  const ticket = createWalletTicket("parent-test", pass, secret, now);
  assert.doesNotThrow(() => readWalletTicket(ticket, secret, now + 299_999));
  assert.throws(() => readWalletTicket(ticket, secret, now + 300_000));
});
test("Tampering and rotated signing keys cannot authorize downloads", () => {
  const ticket = createWalletTicket("parent-test", pass, secret, now);
  const tampered = `${ticket.slice(0, 50)}${ticket[50] === "A" ? "B" : "A"}${ticket.slice(51)}`;
  assert.throws(() => readWalletTicket(tampered, secret, now));
  assert.throws(() => readWalletTicket(ticket, "different-test-key".repeat(8), now));
  assert.throws(() => readWalletTicket("invalid", secret, now));
  assert.throws(() => createWalletTicket("parent-test", pass, "short", now));
});
