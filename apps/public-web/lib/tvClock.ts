import { resolvedMasjidTimeZone } from "@hbic/shared";

const formatters = new Map<string, Intl.DateTimeFormat>();
function format(date: Date, kind: "clock" | "time" | "date") {
  const zone = resolvedMasjidTimeZone(date), key = `${zone}:${kind}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone: zone,
      ...(kind === "date" ? { weekday: "long", month: "long", day: "numeric", year: "numeric" } as const :
        { hour: "numeric", minute: "2-digit", ...(kind === "clock" ? { second: "2-digit" } as const : {}) } as const) });
    formatters.set(key, formatter);
  }
  return formatter.format(date);
}
export const formatDisplayClock = (date: Date) => format(date, "clock");
export const formatDisplayTime = (date: Date) => format(date, "time");
export const formatDisplayDate = (date: Date) => format(date, "date");

let sample: { epoch: number; monotonic: number } | null = null;
/** Reuse the existing CDN response; no extra clock endpoint or polling. */
export function syncDisplayClock(headers: Pick<Headers, "get">) {
  const date = headers.get("date"), age = Number(headers.get("age") ?? "0");
  const epoch = date ? Date.parse(date) : NaN;
  if (!Number.isFinite(epoch) || !Number.isFinite(age) || age < 0 || age > 86400) return;
  sample = { epoch: epoch + age * 1000, monotonic: performance.now() };
}
export function displayNow() {
  return sample ? new Date(sample.epoch + Math.max(0, performance.now() - sample.monotonic)) : new Date();
}
