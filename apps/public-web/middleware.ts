import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isQuranPublicEnabled } from "./lib/quranRelease";

export function middleware(request: NextRequest) {
  if (!isQuranPublicEnabled()) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/quran"] };
