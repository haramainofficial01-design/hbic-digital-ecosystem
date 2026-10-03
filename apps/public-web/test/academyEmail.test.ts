import assert from "node:assert/strict";
import test from "node:test";
import { academyUpdateEmail, registrationEmail, cardReceiptEmail, cashReceiptEmail, cashReminderEmail } from "../lib/academyEmail";

test("registration email never represents unfinished Checkout as paid or enrolled", () => {
  const base = { uid: "local-test", email: "parent@example.com", name: "<Test Parent>", reference: "QA-TEST", period: "2026-10" };
  const card = registrationEmail({ ...base, paymentChoice: "card" });
  const cash = registrationEmail({ ...base, paymentChoice: "cash" });
  assert.match(card.text, /awaiting Checkout until Stripe confirms/);
  assert.match(card.text, /not proof of payment/);
  assert.match(cash.text, /conditional/);
  assert.match(cash.text, /only after receiving cash/);
  assert.match(cash.text, /5:30–7:00 PM/);
  assert.match(card.html, /&lt;Test Parent&gt;/);
  assert.match(card.text, /chat\.whatsapp\.com\/IZhuemIDjR10DTluYIiSQq/);
});

test("schedule email escapes staff text and deduplicates each recipient/event", () => {
  const input = { eventKey: "closure-test", uid: "local-test", reference: "QA-TEST", email: "parent@example.com", name: "Parent", title: "Closure\r\nTest", body: "<script>Not HTML</script>" };
  const message = academyUpdateEmail(input);
  assert.equal(message.subject.includes("\n"), false);
  assert.equal(message.html.includes("<script>"), false);
  assert.match(message.html, /&lt;script&gt;/);
  assert.equal(message.key, academyUpdateEmail(input).key);
  assert.notEqual(message.key, academyUpdateEmail({ ...input, reference: "QA-NEW" }).key);
});

test("receipt and reminder messages distinguish actual payment from amounts due", () => {
  const card = cardReceiptEmail({ invoiceId: "in_test", email: "parent@example.com", name: "Parent", period: "2026-10", amountCents: 10000, paidAt: "2026-10-01T18:00:00Z", invoiceUrl: "javascript:invalid", testMode: true });
  const cash = cashReceiptEmail({ receiptId: "TEST-RECEIPT", email: "parent@example.com", name: "Parent", reference: "QA-TEST", period: "2026-10", amountCents: 5000, receivedAt: "2026-10-01T18:00:00Z", enrollmentState: "conditional", testMode: true });
  const reminder = cashReminderEmail({ uid: "local-test", reference: "QA-TEST", email: "parent@example.com", name: "Parent", period: "2026-11", amountCents: 5000, stage: "upcoming", testMode: true });
  assert.match(card.text, /\$100\.00/);
  assert.equal(card.html.includes("javascript:"), false);
  assert.match(cash.text, /check-in is separate from payment/);
  assert.match(reminder.text, /due on the 1st/);
  for (const message of [card, cash, reminder]) assert.match(message.subject, /^TEST ·/);
});
