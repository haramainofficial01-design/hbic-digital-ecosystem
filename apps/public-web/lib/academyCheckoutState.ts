type CheckoutSession = { id: string; status: string | null; payment_status?: string | null };

export function pendingAcademyRegistrationMatches(expectedId: string, actualId: unknown) {
  return expectedId.length > 0 && expectedId === actualId;
}

export function cashConversionWasApplied(family: Record<string, unknown> | undefined, registrationId: string) {
  return family?.cashConversionFromRegistrationId === registrationId;
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
