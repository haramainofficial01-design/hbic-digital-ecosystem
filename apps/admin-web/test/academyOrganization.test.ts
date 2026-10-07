import assert from "node:assert/strict";
import test from "node:test";
import type { AcademyPublicFamily } from "@hbic/shared";
import { tuitionFamilies, tuitionChildren, tuitionReportCents, tuitionPaidStudents, tuitionPaymentBreakdown } from "../lib/academyOrganization";

test("exempt students remain enrolled but are excluded from operational payment views", () => {
  const exempt = { id: "exempt", enrollmentState: "active", noTuitionDue: true, paymentState: "paid", amountCents: 10000,
    children: [{ name: "A", tuitionExempt: true }, { name: "B", tuitionExempt: true }] } as AcademyPublicFamily;
  const mixed = { ...exempt, id: "mixed", noTuitionDue: false, children: [{ name: "A", tuitionExempt: true }, { name: "B" }] } as AcademyPublicFamily;
  const paid = { ...mixed, id: "paid", children: [{ name: "C" }] } as AcademyPublicFamily;
  const snapshot = structuredClone([exempt, mixed, paid]);
  assert.deepEqual(tuitionFamilies([exempt, mixed, paid]).map(f => f.id), ["mixed", "paid"]);
  assert.deepEqual(tuitionChildren(mixed).map(c => c.name), ["B"]);
  assert.deepEqual([exempt, mixed, paid], snapshot, "exclusion never changes real paid history or enrollment");
  assert.equal(tuitionFamilies([{ ...paid, enrollmentState: "withdrawn" }]).length, 0);
});

test("cash/card breakdown counts each paid family-month once, excluding exemptions and future starts", async () => {
  const { tuitionPaymentBreakdown } = await import("../lib/academyOrganization");
  const make = (id: string, method: "cash" | "card", cents: number) => ({ id, enrollmentState: "active", noTuitionDue: false,
    children: [{ name: "Student" }], billingPeriod: "2026-10", billingMethod: method, paymentChoice: method, paymentState: "paid", amountCents: cents }) as AcademyPublicFamily;
  const cash = make("cash", "cash", 10000), card = make("card", "card", 5000);
  assert.deepEqual(tuitionPaymentBreakdown([cash, card,
    { ...cash, id: "exempt", noTuitionDue: true, children: [{ name: "Exempt", tuitionExempt: true }] } as AcademyPublicFamily,
    { ...card, id: "unpaid", paymentState: "card_attention" },
    { ...card, id: "future", billingPeriod: "2026-11" },
    { ...cash, id: "withdrawn", enrollmentState: "withdrawn" }], "2026-10"), { cash: { count: 1, cents: 10000 }, card: { count: 1, cents: 5000 } });
});


test("mixed-family summaries exclude exempt tuition without changing the receipt", () => {
  const family = { id: "mixed", enrollmentState: "active", noTuitionDue: false, billingPeriod: "2026-10",
    paymentState: "paid", billingMethod: "cash", amountCents: 15000,
    children: [{ name: "A" }, { name: "B" }, { name: "C", tuitionExempt: true }] } as AcademyPublicFamily;
  assert.equal(tuitionReportCents(family), 10000);
  assert.equal(tuitionPaidStudents([family], "2026-10"), 2);
  assert.deepEqual(tuitionPaymentBreakdown([family], "2026-10"), { cash: { count: 1, cents: 10000 }, card: { count: 0, cents: 0 } });
  assert.equal(family.amountCents, 15000);
  assert.equal(tuitionReportCents({ ...family, amountCents: 4288 }), 4288, "never invent a paid amount");
  assert.equal(tuitionPaidStudents([family], "2026-11"), 0);
});
