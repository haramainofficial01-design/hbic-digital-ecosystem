import { dateStringInTimeZone, masjidTimeZone } from "@hbic/shared";
import { createReadCache } from "./readCache";
import type { TvDisplayPayload } from "./tvDisplay";

export function publicDisplayUrl(now = new Date()) {
  // One shared CDN key per Calgary day, not per timer tick. Midnight must not
  // reuse a cached response for yesterday's schedule.
  return `/api/display?date=${dateStringInTimeZone(now, masjidTimeZone)}`;
}

// Rail and occasion styling consume the same canonical snapshot. They must not
// independently fetch identical data or turn every request into a new CDN key.
const display = createReadCache(async () => {
  const response = await fetch(publicDisplayUrl());
  if (!response.ok) throw new Error("Display data unavailable");
  const data = await response.json() as TvDisplayPayload;
  if (!data.ok) throw new Error("Display data unavailable");
  return data;
}, 15_000);

export function fetchPublicDisplay() {
  return display.get(dateStringInTimeZone(new Date(), masjidTimeZone));
}
