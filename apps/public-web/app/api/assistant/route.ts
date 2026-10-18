import { randomBytes, createHmac } from "node:crypto";
import { bilalCompanionName, companionBoundary, companionQuestionTerms, companionReply, normalizeCompanionQuestion, validateCompanionRequest } from "@hbic/shared";
import { getPublishedContent } from "../../../lib/contentStore";
import { isQuranPublicEnabled } from "../../../lib/quranRelease";
import { createQuranRateLimit } from "../../../lib/quranRateLimit";
import { buildCompanionKnowledge } from "../../../lib/bilalCompanionKnowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const limiter = createQuranRateLimit(60, 60_000), ephemeralSalt = randomBytes(32);
const headers = { "Cache-Control": "private, no-store", "Access-Control-Allow-Origin": "https://hbic.ca", "Vary": "Origin" };
const json = (body: unknown, status = 200, extra = {}) => Response.json(body, { status, headers: { ...headers, ...extra } });

async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw Error("invalid-input");
  const reader = request.body?.getReader(); if (!reader) throw Error("invalid-input");
  let bytes = 0; const chunks: Uint8Array[] = [];
  try { while (true) { const item = await reader.read(); if (item.done) break; bytes += item.value.byteLength; if (bytes > 12_000) { await reader.cancel(); throw Error("invalid-input"); } chunks.push(item.value); } }
  finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

let billingCache: { until: number; monthlyCents: number; tuitionMode: string } | null = null;
async function currentPublicTuition(question: string) {
  if (!/academy|tuition|fee|cash|billing|class/.test(companionQuestionTerms(normalizeCompanionQuestion(question)))) return {};
  if (billingCache && billingCache.until > Date.now()) return billingCache;
  try {
    // Existing public read only. Never call a parent, Stripe-customer or admin endpoint.
    const response = await fetch("https://hbic.ca/api/academy/billing", { cache: "no-store", signal: AbortSignal.timeout(3500) });
    const value = await response.json();
    if (response.ok && value.ok === true && Number.isSafeInteger(value.monthlyCents) && value.monthlyCents > 0 && value.monthlyCents <= 100_000 && ["per_child", "per_family"].includes(value.tuitionMode)) {
      billingCache = { until: Date.now() + 60_000, monthlyCents: value.monthlyCents, tuitionMode: value.tuitionMode }; return billingCache;
    }
  } catch { /* Missing public fee evidence is a refusal to guess, not a default price. */ }
  return {};
}

export async function GET() {
  try {
    const { content, status } = await getPublishedContent();
    return json({ ok: true, name: bilalCompanionName, enabled: content.featureFlags.bilalCompanionEnabled, informationAvailable: status.configured, mode: "published-info", externalAI: false, privacyUrl: "https://hbic.ca/privacy#bilal-companion" });
  } catch { return json({ ok: false, error: "The companion is temporarily unavailable." }, 503); }
}

export async function POST(request: Request) {
  const address = (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 200);
  const identity = createHmac("sha256", ephemeralSalt).update(address).digest("hex");
  const rate = limiter(identity);
  if (!rate.allowed) return json({ ok: false, error: "Please wait a moment before asking another question." }, 429, { "Retry-After": String(rate.retryAfter) });
  let input;
  try { input = validateCompanionRequest(await readBody(request)); } catch { return json({ ok: false, error: "Please enter a question of up to 800 characters." }, 400); }
  if (!input) return json({ ok: false, error: "Please enter a question of up to 800 characters." }, 400);
  try {
    const { content, status } = await getPublishedContent();
    if (!content.featureFlags.bilalCompanionEnabled) return json({ ok: false, error: "Bilal is currently switched off. Please contact the office." }, 503);
    const now = new Date();
    if (companionBoundary(input.question)) return json(companionReply({ request: input, facts: [], now, contentVersion: content.version, ready: status.configured }));
    const tuition = process.env.ACADEMY_PREVIEW_ENABLED === "true" ? await currentPublicTuition([input.question, ...input.previousQuestions].join(" ")) : {};
    const facts = buildCompanionKnowledge(content, now, { academy: process.env.ACADEMY_PREVIEW_ENABLED === "true", quran: isQuranPublicEnabled(), ...tuition });
    return json(companionReply({ request: input, facts, now, contentVersion: content.version, ready: status.configured }));
  } catch { return json({ ok: false, error: "I can’t verify the latest information right now. Please try again or contact the masjid." }, 503); }
}
