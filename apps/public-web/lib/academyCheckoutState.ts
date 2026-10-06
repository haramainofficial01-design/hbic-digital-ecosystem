type CheckoutSession = { id: string; status: string | null; payment_status?: string | null };

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
