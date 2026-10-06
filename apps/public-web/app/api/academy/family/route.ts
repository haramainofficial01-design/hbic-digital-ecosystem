import { academyParent, expirePendingAcademyCheckoutForCash, getAcademyFamily, getAcademyPendingRegistration, prepareAcademyPendingCardRegistration, registerAcademyFamily, AcademyError } from "../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";
import { startAcademyPendingCheckout } from "../../../../lib/academyStripe";
import { dispatchAcademyEmails } from "../../../../lib/academyEmail";
import { after } from "next/server";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }

function failure(error: unknown) {
  return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Academy request failed." },
    { status: error instanceof AcademyError ? error.status : 500 });
}

export async function GET(request: Request) {
  try {
    const parent = await academyParent(request);
    const [family, pendingRegistration] = await Promise.all([
      getAcademyFamily(parent.uid),
      getAcademyPendingRegistration(parent.uid)
    ]);
    return jsonResponse({ ok: true, family, pendingRegistration }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const parent = await academyParent(request);
    const body = await request.json() as { paymentChoice?: unknown; pendingRegistrationId?: unknown };
    if (body.paymentChoice === "card") {
      const pendingRegistration = await prepareAcademyPendingCardRegistration(parent.uid, parent.email, body);
      const checkoutUrl = await startAcademyPendingCheckout(parent.uid);
      return jsonResponse({ ok: true, family: null, pendingRegistration, checkoutUrl },
        { status: 202, headers: { "Cache-Control": "no-store" } });
    }
    const expectedRegistrationId = typeof body.pendingRegistrationId === "string" ? body.pendingRegistrationId : undefined;
    const conversion = await expirePendingAcademyCheckoutForCash(parent.uid, expectedRegistrationId);
    const family = await registerAcademyFamily(parent.uid, parent.email, conversion?.cashRegistration ?? body,
      conversion ? { registrationId: conversion.registrationId, checkoutSessionId: conversion.sessionId } :
        expectedRegistrationId ? { registrationId: expectedRegistrationId, checkoutSessionId: null } : undefined);
    after(() => dispatchAcademyEmails(20).then(() => undefined).catch(() => undefined));
    return jsonResponse({ ok: true, family, pendingRegistration: null }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
