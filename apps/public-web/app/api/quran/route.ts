import { NextRequest, NextResponse } from "next/server";
import { availability, ayah, chapter, chapters, juz, mushafPage, search } from "../../../lib/quranFoundation";
import { isQuranPublicEnabled } from "../../../lib/quranRelease";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isQuranPublicEnabled()) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  const mode = request.nextUrl.searchParams.get("mode") ?? "chapters";
  try {
    if (mode === "status") return NextResponse.json({ ok: true, availability: availability() }, { headers: { "Cache-Control": "no-store" } });
    if (mode === "chapters") return NextResponse.json({ ok: true, chapters: await chapters(), availability: availability() }, { headers: { "Cache-Control": "public, s-maxage=21600" } });
    if (mode === "chapter") {
      const id = Number(request.nextUrl.searchParams.get("chapter"));
      const page = Number(request.nextUrl.searchParams.get("page") ?? 1);
      if (!Number.isInteger(id) || id < 1 || id > 114 || !Number.isInteger(page) || page < 1 || page > 8) {
        return NextResponse.json({ ok: false, message: "Invalid surah or page." }, { status: 400 });
      }
      return NextResponse.json({ ok: true, ...(await chapter(id, page)), availability: availability() }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
    }
    if (mode === "juz") {
      const id = Number(request.nextUrl.searchParams.get("juz"));
      const page = Number(request.nextUrl.searchParams.get("page") ?? 1);
      if (!Number.isInteger(id) || id < 1 || id > 30 || !Number.isInteger(page) || page < 1 || page > 20) {
        return NextResponse.json({ ok: false, message: "Invalid juz or page." }, { status: 400 });
      }
      return NextResponse.json({ ok: true, ...(await juz(id, page)), availability: availability() }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
    }
    if (mode === "mushaf-page") {
      const id = Number(request.nextUrl.searchParams.get("page"));
      if (!Number.isInteger(id) || id < 1 || id > 604) {
        return NextResponse.json({ ok: false, message: "Invalid Quran page." }, { status: 400 });
      }
      return NextResponse.json({ ok: true, ...(await mushafPage(id)), availability: availability() }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
    }
    if (mode === "ayah") {
      const key = request.nextUrl.searchParams.get("key") ?? "";
      if (!/^\d{1,3}:\d{1,3}$/.test(key) || Number(key.split(":")[0]) > 114) {
        return NextResponse.json({ ok: false, message: "Invalid ayah reference." }, { status: 400 });
      }
      return NextResponse.json({ ok: true, ...(await ayah(key)), availability: availability() }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
    }
    if (mode === "search") {
      const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
      if (query.length < 2 || query.length > 120) return NextResponse.json({ ok: false, message: "Enter 2–120 characters." }, { status: 400 });
      return NextResponse.json({ ok: true, ...(await search(query)), availability: availability() }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: false, message: "Unknown Quran request." }, { status: 404 });
  } catch (error) {
    const missing = error instanceof Error && error.message === "QF_NOT_CONFIGURED";
    console.error("Quran request failed", error instanceof Error ? error.message : error);
    return NextResponse.json({
      ok: false,
      code: missing ? "NOT_CONFIGURED" : "UPSTREAM_UNAVAILABLE",
      message: missing ? "Quran Foundation credentials are not connected to this preview." : "Quran content is temporarily unavailable.",
      availability: availability()
    }, { status: missing ? 503 : 502, headers: { "Cache-Control": "no-store" } });
  }
}
