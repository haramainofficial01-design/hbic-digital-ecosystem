import { publicPotluck } from "../../../lib/potluckModel";
import { potluckOwner, readPotluck, potluckResponse, potluckFailure, potluckBody, sameOrigin, writePotluck } from "../../../lib/potluckStore";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { const actor = potluckOwner(request, true); return potluckResponse({ ok: true, ...publicPotluck(await readPotluck(), actor.owner) }, 200, actor.fresh ? actor.token : undefined); }
  catch (error) { return potluckFailure(error); }
}
export async function POST(request: Request) {
  try { sameOrigin(request); const actor = potluckOwner(request); const body = await potluckBody(request); return potluckResponse({ ok: true, ...await writePotluck(body, actor, request) }); }
  catch (error) { return potluckFailure(error); }
}
