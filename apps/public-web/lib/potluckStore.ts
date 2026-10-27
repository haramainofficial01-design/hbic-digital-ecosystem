import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "./contentStore";
import { changePotluck, potluckEvent, PotluckError, publicPotluck, type PotluckAction, type PotluckState } from "./potluckModel";

const cookieName = "hbic-potluck-owner";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function potluckOwner(request: Request, create = false) {
  const value = request.headers.get("cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  const token = value && /^[a-f0-9]{64}$/.test(value) ? value : create ? randomBytes(32).toString("hex") : null;
  if (!token) throw new PotluckError("Refresh the page before signing up.", 403);
  return { token, owner: hash(token), fresh: token !== value };
}
function database() { const db = getDatabase(); if (!db) throw new PotluckError("The signup list is unavailable. Please try again shortly.", 503); return db; }
export async function readPotluck() {
  const doc = await database().collection("academyPotlucks").doc(potluckEvent.id).get();
  const data = doc.data(); return { entries: data?.entries ?? [], suggestions: data?.suggestions ?? [] } as PotluckState;
}
export function potluckResponse(body: unknown, status = 200, token?: string) {
  const response = NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  if (token) response.cookies.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/potluck", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
export function potluckFailure(error: unknown) {
  return potluckResponse({ ok: false, error: error instanceof PotluckError ? error.message : "The signup list could not be saved. Please try again." }, error instanceof PotluckError ? error.status : 503);
}
export async function potluckBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new PotluckError("Send the signup form as JSON.", 415);
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > 4096) throw new PotluckError("This entry is too long.", 413);
  const reader = request.body?.getReader(); if (!reader) throw new PotluckError("Check your entry and try again.");
  let size = 0, raw = ""; const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 4096) { await reader.cancel(); throw new PotluckError("This entry is too long.", 413); }
      raw += decoder.decode(chunk.value, { stream: true });
    }
    raw += decoder.decode();
  } finally { reader.releaseLock(); }
  try { const body = JSON.parse(raw); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(); return body as PotluckAction; }
  catch { throw new PotluckError("Check your entry and try again."); }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new PotluckError("Open the signup page to make changes.", 403);
}
export async function writePotluck(body: PotluckAction, actor: { owner: string; admin?: boolean }, request?: Request) {
  const db = database(), ref = db.collection("academyPotlucks").doc(potluckEvent.id);
  const hour = Math.floor(Date.now() / 3_600_000);
  const address = request?.headers.get("x-vercel-forwarded-for") ?? request?.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const ip = hash(`${potluckEvent.id}:${hour}:${address}`);
  const rate = db.collection("potluckRateLimits").doc(`${hour}-${ip}`);
  const state = await db.runTransaction(async tx => {
    const doc = await tx.get(ref), rateDoc = !actor.admin ? await tx.get(rate) : null;
    if (rateDoc && Number(rateDoc.data()?.count ?? 0) >= 100) throw new PotluckError("Too many changes. Please try again in an hour.", 429);
    const data = doc.data();
    const previous = { entries: data?.entries ?? [], suggestions: data?.suggestions ?? [] } as PotluckState;
    const result = changePotluck(previous, body, actor);
    tx.set(ref, { ...result, updatedAt: new Date().toISOString(), ...(actor.admin ? { reviewedBy: actor.owner } : {}) }, { merge: true });
    if (!actor.admin) tx.set(rate, { count: Number(rateDoc?.data()?.count ?? 0) + 1, expiresAt: new Date((hour + 2) * 3_600_000) });
    return result;
  });
  return publicPotluck(state, actor.owner);
}
