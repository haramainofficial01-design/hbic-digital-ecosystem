import { academyParent, AcademyError } from "../../../../lib/academyStore";
import { academyRegistrationOpen } from "@hbic/shared";
import { academyCardConfig, startAcademyBillingPortal, startAcademyCheckout } from "../../../../lib/academyStripe";
import { jsonResponse, optionsResponse } from "../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
export async function GET() {
  try {
    const config = await academyCardConfig();
    return jsonResponse({ ok: true, registrationOpen: process.env.ACADEMY_REGISTRATION_READY === "true" && academyRegistrationOpen(), cardAvailable: config.cardAvailable,
      serverCashRemindersAvailable: Boolean((process.env.CRON_SECRET?.length ?? 0) >= 16 && process.env.ACADEMY_SERVER_CASH_REMINDERS === "true"),
      tuitionMode: config.tuitionMode, monthlyCents: config.monthlyCents }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Billing unavailable." }, { status: error instanceof AcademyError ? error.status : 500 }); }
}
export async function POST(request: Request) {
  try {
    const parent = await academyParent(request);
    const body = await request.json() as { action?: unknown };
    const url = body.action === "checkout" ? await startAcademyCheckout(parent.uid) : body.action === "portal" ? await startAcademyBillingPortal(parent.uid) : null;
    if (!url) throw new AcademyError("Choose checkout or billing management.");
    return jsonResponse({ ok: true, url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Billing unavailable." }, { status: error instanceof AcademyError ? error.status : 500 }); }
}
