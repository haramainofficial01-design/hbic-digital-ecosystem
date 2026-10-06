type CheckoutSession = { id: string; status: string | null; payment_status?: string | null };

type AcademyCorrectionInvoice = {
  id: string;
  status: string | null;
  currency: string;
  livemode: boolean;
  total: number;
  amount_due: number;
  amount_remaining: number;
  amount_paid: number;
  customer: string | { id: string } | null;
  metadata: Record<string, string> | null;
};

/** Recognize any already-existing Stripe correction before a new one can be created. */
export function existingAcademyUnderchargeInvoiceStatus(
  invoices: AcademyCorrectionInvoice[],
  expected: {
    familyId: string;
    registrationId: string;
    customerId: string;
    subscriptionId: string;
    period: string;
    originalInvoiceId: string;
    previousPaidCents: number;
    expectedCents: number;
    differenceCents: number;
  }
) {
  const related = invoices.filter((invoice) => invoice.metadata?.academyAdjustment === "undercharge" &&
    invoice.metadata?.academyFamilyUid === expected.familyId &&
    invoice.metadata?.academyAdjustmentPeriod === expected.period);
  if (!related.length) return null;
  if (related.length !== 1) return { status: "needs_review", invoiceId: null };

  const invoice = related[0];
  const metadata = invoice.metadata ?? {};
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
  const exactMetadata = metadata.academyRegistrationId === expected.registrationId &&
    metadata.academySubscriptionId === expected.subscriptionId &&
    metadata.academyPreviousPaidCents === String(expected.previousPaidCents) &&
    metadata.academyExpectedCents === String(expected.expectedCents) &&
    (!metadata.academyDifferenceCents || metadata.academyDifferenceCents === String(expected.differenceCents)) &&
    (!metadata.academyOriginalInvoiceId || metadata.academyOriginalInvoiceId === expected.originalInvoiceId);
  const exactInvoice = invoice.livemode && customerId === expected.customerId && invoice.currency === "cad" &&
    exactMetadata && invoice.total === expected.differenceCents && invoice.amount_due === expected.differenceCents;
  if (!exactInvoice) return { status: "needs_review", invoiceId: invoice.id };
  if (invoice.status === "paid" && invoice.amount_paid === expected.differenceCents) {
    return { status: "paid", invoiceId: invoice.id };
  }
  if (invoice.status === "open" && invoice.amount_paid === 0 && invoice.amount_remaining === expected.differenceCents) {
    return { status: "open", invoiceId: invoice.id };
  }
  if (invoice.status === "draft") return { status: "draft", invoiceId: invoice.id };
  return { status: "needs_review", invoiceId: invoice.id };
}

export function pendingAcademyRegistrationMatches(expectedId: string, actualId: unknown) {
  return expectedId.length > 0 && expectedId === actualId;
}

export function cashConversionWasApplied(family: Record<string, unknown> | undefined, registrationId: string) {
  return family?.cashConversionFromRegistrationId === registrationId;
}

/** Combine an actual paid correction with the already-paid base without exceeding the approved tuition. */
export function academyCorrectedMonthPaidCents(input: {
  currentPaidCents: number;
  previousPaidCents: number;
  expectedCents: number;
  correctionPaidCents: number;
}) {
  const valid = Object.values(input).every((value) => Number.isSafeInteger(value) && value >= 0);
  if (!valid || input.expectedCents <= 0) throw new Error("Invalid Academy tuition correction amounts.");
  return Math.min(input.expectedCents,
    Math.max(input.currentPaidCents, input.previousPaidCents) + input.correctionPaidCents);
}

/** Enrollment can be confirmed only after this month's tuition was actually received. */
export function academyTuitionSatisfiedForConfirmation(input: {
  method: "card" | "cash";
  monthMethod: unknown;
  monthStatus: unknown;
  amountCents: unknown;
  requiredCents: number;
  cashReceiptExists?: boolean;
}) {
  if (!Number.isSafeInteger(input.requiredCents) || input.requiredCents <= 0 ||
      input.monthMethod !== input.method || input.monthStatus !== "paid" ||
      typeof input.amountCents !== "number" || input.amountCents < input.requiredCents) return false;
  return input.method === "card" || input.cashReceiptExists === true;
}

/** Verify that Stripe has permanently closed an unpaid Checkout before cash conversion. */
export async function expireUnpaidAcademyCheckout(
  sessionId: string,
  retrieve: (id: string) => Promise<CheckoutSession>,
  expire: (id: string) => Promise<unknown>
) {
  const session = await retrieve(sessionId);
  if (session.status === "complete" || session.payment_status === "paid") {
    throw new Error("Your card Checkout already completed. Wait for payment confirmation before changing payment method.");
  }
  if (session.status === "open") {
    try { await expire(session.id); }
    catch {
      // A concurrent retry may have expired it already; retrieve final state below.
    }
  }
  const finalSession = await retrieve(session.id);
  if (finalSession.status !== "expired") {
    throw new Error("Card Checkout is still processing. Wait for confirmation before changing to cash.");
  }
}
