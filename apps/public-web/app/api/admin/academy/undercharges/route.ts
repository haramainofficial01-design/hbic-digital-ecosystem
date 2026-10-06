import { academyAdmin, AcademyError } from "../../../../../lib/academyStore";
import { collectAcademyUndercharges, previewAcademyUndercharges } from "../../../../../lib/academyStripe";
import { jsonResponse, optionsResponse } from "../../../../../lib/api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }

export async function GET(request: Request) {
  try {
    await academyAdmin(request);
    const period = new URL(request.url).searchParams.get("period") ?? undefined;
    const corrections = await previewAcademyUndercharges(period);
    return jsonResponse({ ok: true, corrections }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to preview tuition corrections." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await academyAdmin(request);
    if (!["superAdmin", "director"].includes(actor.role)) throw new AcademyError("Only a director or super administrator can run card tuition corrections.", 403);
    const body = await request.json().catch(() => ({})) as { period?: unknown; confirm?: unknown };
    if (body.confirm !== true) throw new AcademyError("Confirm the tuition correction run first.", 400);
    const results = await collectAcademyUndercharges(actor, typeof body.period === "string" ? body.period : undefined);
    return jsonResponse({ ok: true, results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unable to run tuition corrections." },
      { status: error instanceof AcademyError ? error.status : 500 });
  }
}
