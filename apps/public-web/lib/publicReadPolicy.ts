// Public timetable/content polling runs once per minute. A shared 60-second
// CDN window avoids four server invocations per minute for unchanged public data.
// Process-local TTL stays 15 seconds; explicit administrator verification always bypasses it.
// Browser caches revalidate; shared CDN caches have a short hard expiry, not an
// unbounded stale-while-revalidate window. No private Academy data is cached.
export const publicReadHeaders = { "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate" };
export const publicReadTtlMs = 15_000;
export const publicPageCacheTag = "hbic-public-page-content";
const invalidators = new Set<() => void>();
export function registerPublicReadInvalidator(clear: () => void) { invalidators.add(clear); }
export function invalidatePublicReads() {
  for (const clear of invalidators) clear();
  // Tests use isolated in-memory fixtures, not Next's production cache.
  if (process.env.NODE_ENV === "production") revalidateTag(publicPageCacheTag);
}
import { revalidateTag } from "next/cache";
