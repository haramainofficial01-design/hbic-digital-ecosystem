import { requireAdminSecret, jsonResponse, optionsResponse } from "../../../../lib/api";
import { readPotluck, writePotluck, potluckBody, potluckFailure } from "../../../../lib/potluckStore";
import { availableItems, PotluckError } from "../../../../lib/potluckModel";
export const dynamic = "force-dynamic";
export function OPTIONS() { return optionsResponse(); }
async function authorize(request: Request) {
  const auth = await requireAdminSecret(request);
  if (!auth.ok) return auth;
  if (auth.actor.kind !== "firebase-account" || !["superAdmin", "director", "caretaker"].includes(auth.actor.role)) return { ok: false as const, response: jsonResponse({ ok: false, error: "Sign in with an approved Academy staff account." }, { status: 403 }) };
  return auth;
}
export async function GET(request: Request) {
  const auth = await authorize(request); if (!auth.ok) return auth.response;
  try {
    const state = await readPotluck();
    return jsonResponse({ ok: true, items: availableItems(state), entries: state.entries.filter(e => !e.cancelled).map(({ owner, ...e }) => e), suggestions: state.suggestions.map(({ owner, ...s }) => s) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return jsonResponse({ ok: false, error: "The potluck list is unavailable." }, { status: 503 }); }
}
export async function POST(request: Request) {
  const auth = await authorize(request); if (!auth.ok) return auth.response;
  try {
    const body = await potluckBody(request);
    if (!["approve", "reject", "remove"].includes(String(body.action))) throw new PotluckError("Choose Approve, Decline or Remove.");
    const uid = auth.actor.uid;
    if (!uid) throw new PotluckError("Sign in with an approved Academy staff account.", 403);
    await writePotluck(body, { admin: true, owner: uid });
    return jsonResponse({ ok: true });
  } catch (error) { const result = potluckFailure(error); return jsonResponse(await result.json(), { status: result.status }); }
}
