import { NextRequest, NextResponse } from "next/server";
import { availability, chapter, chapters, search, resources, verse, mushaf, mushafReference } from "../../../lib/quranFoundation";
import { isQuranPublicEnabled } from "../../../lib/quranRelease";
import { quranRateLimit } from "../../../lib/quranRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isQuranPublicEnabled()) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  const rate = quranRateLimit((request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim().slice(0, 80));
  if (!rate.allowed) return NextResponse.json({ ok: false, message: "Please wait a moment before trying again." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter), "Cache-Control": "no-store" } });
  const mode = request.nextUrl.searchParams.get("mode") ?? "chapters";
  const reciter = Number(request.nextUrl.searchParams.get("reciter") ?? 7);
  const translation = Number(request.nextUrl.searchParams.get("translation") ?? 20);
  if (![reciter, translation].every((id) => Number.isInteger(id) && id > 0 && id < 10000)) return NextResponse.json({ ok: false, message: "Invalid Quran resource." }, { status: 400 });
  try {
    if (mode === "status") return NextResponse.json({ ok: true, availability: availability() }, { headers: { "Cache-Control": "no-store" } });
    if (mode === "chapters") return NextResponse.json({ ok: true, chapters: await chapters(), availability: availability() }, { headers: { "Cache-Control": "public, s-maxage=21600" } });
    if (mode === "resources") return NextResponse.json({ ok: true, resources: await resources(), availability: availability() }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
    if (mode === "verse") return NextResponse.json({ ok: true, verse: await verse(request.nextUrl.searchParams.get("key") ?? "", reciter, translation) }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
    if (mode === "mushaf") return NextResponse.json({ ok: true, mushaf: await mushaf(Number(request.nextUrl.searchParams.get("page"))) }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
    if (mode === "mushaf-reference") return NextResponse.json({ ok: true, page: await mushafReference(request.nextUrl.searchParams.get("key") ?? "") }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
    if (mode === "chapter") {
      const id = Number(request.nextUrl.searchParams.get("chapter"));
      const page = Number(request.nextUrl.searchParams.get("page") ?? 1);
      if (!Number.isInteger(id) || id < 1 || id > 114 || !Number.isInteger(page) || page < 1 || page > 6) {
        return NextResponse.json({ ok: false, message: "Invalid surah or page." }, { status: 400 });
      }
      return NextResponse.json({ ok: true, ...(await chapter(id, page, reciter, translation)), availability: availability() }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
    }
    if (mode === "search") {
      const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
      if (query.length < 2 || query.length > 120) return NextResponse.json({ ok: false, message: "Enter 2–120 characters." }, { status: 400 });
      return NextResponse.json({ ok: true, ...(await search(query, reciter, translation)), availability: availability() }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: false, message: "Unknown Quran request." }, { status: 404 });
  } catch (error) {
    const missing = error instanceof Error && error.message === "QF_NOT_CONFIGURED";
    const invalid = error instanceof Error && error.message === "QF_INVALID_REFERENCE";
    // Upstream errors can contain request details; never log provider tokens.
    return NextResponse.json({
      ok: false,
      code: missing ? "NOT_CONFIGURED" : "UPSTREAM_UNAVAILABLE",
      message: missing ? "Quran Foundation credentials are not connected." : invalid ? "That ayah or page is outside this surah." : "Quran content is temporarily unavailable. Please retry.",
      availability: availability()
    }, { status: missing ? 503 : invalid ? 400 : 502, headers: { "Cache-Control": "no-store" } });
  }
}
