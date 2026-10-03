import { academyParent, getAcademyFamily, registerAcademyFamily, AcademyError } from "../../../../lib/academyStore";
import { jsonResponse, optionsResponse } from "../../../../lib/api";
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
    const family = await getAcademyFamily(parent.uid);
    return jsonResponse({ ok: true, family }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const parent = await academyParent(request);
    const family = await registerAcademyFamily(parent.uid, parent.email, await request.json());
    after(() => dispatchAcademyEmails(20).then(() => undefined).catch(() => undefined));
    return jsonResponse({ ok: true, family }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
