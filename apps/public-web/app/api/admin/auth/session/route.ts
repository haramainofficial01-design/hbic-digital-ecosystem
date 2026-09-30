import { jsonResponse, optionsResponse, requireAdminSecret } from "../../../../../lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() { return optionsResponse(); }

export async function GET(request: Request) {
  const result = await requireAdminSecret(request);
  if (!result.ok) return result.response;
  if (result.actor.kind !== "firebase-account") {
    return jsonResponse({ ok: false, error: "Approved personal administrator sign-in is required." }, { status: 403 });
  }
  return jsonResponse({ ok: true, email: result.actor.email, role: result.actor.role }, {
    headers: { "Cache-Control": "no-store" }
  });
}
