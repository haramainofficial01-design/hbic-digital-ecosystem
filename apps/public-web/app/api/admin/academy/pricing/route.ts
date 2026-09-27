import { academyAdmin, AcademyError, getAcademyPricing, setAcademyPricing } from "../../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }

export async function GET(request: Request) {
  try { await academyAdmin(request); return jsonResponse({ ok: true, pricing: await getAcademyPricing(), billingMode: process.env.ACADEMY_STRIPE_BILLING_MODE === "live" ? "live" : "test" }); }
  catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unavailable." }, { status: error instanceof AcademyError ? error.status : 500 }); }
}

export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    if (!["superAdmin", "director"].includes(actor.role)) throw new AcademyError("Director access is required to set tuition.", 403);
    const body = await request.json() as { tuitionMode?: unknown; monthlyCents?: unknown; stripePriceId?: unknown };
    const pricing = await setAcademyPricing(body.tuitionMode, body.monthlyCents, body.stripePriceId, actor.uid);
    return jsonResponse({ ok: true, pricing });
  } catch (error) { return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to save tuition." }, { status: error instanceof AcademyError ? error.status : 500 }); }
}
