/** Bounded, per-instance abuse protection without database reads or user tracking. */
export function createQuranRateLimit(limit = 60, interval = 60_000, now = Date.now) {
  const windows = new Map<string, { until: number; count: number }>();
  return (identity: string) => {
    const time = now(); let entry = windows.get(identity);
    if (!entry || entry.until <= time) {
      if (windows.size >= 500) {
        for (const [key, value] of windows) if (value.until <= time) windows.delete(key);
        if (windows.size >= 500) windows.delete(windows.keys().next().value!);
      }
      entry = { until: time + interval, count: 0 }; windows.set(identity, entry);
    }
    ++entry.count;
    return { allowed: entry.count <= limit, retryAfter: Math.max(1, Math.ceil((entry.until - time) / 1000)) };
  };
}
export const quranRateLimit = createQuranRateLimit();
