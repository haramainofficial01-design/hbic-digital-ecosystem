import { type HbicContent, type IqamahOverride, type IqamahPrayerName } from "@hbic/shared";

const prayers: IqamahPrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

/** Preserve staff-selected times indefinitely, including legacy weekly overrides.
 * Stamp actual edits server-side without changing their selected time. */
export function boundPrayerOverrides(content: HbicContent, previous?: HbicContent, now = new Date()): HbicContent {
  // Compare normalized legacy values so simply saving a loaded draft does not
  // count as a fresh override merely because it gained an explicit expiry.
  if (previous) previous = boundPrayerOverrides(previous, undefined, now);
  const overrides: Partial<Record<IqamahPrayerName, IqamahOverride>> = {};
  for (const prayer of prayers) {
    const incoming = content.iqamahTime.overrides?.[prayer];
    if (!incoming) continue;
    const before = previous?.iqamahTime.overrides?.[prayer];
    const edited = previous && (!before || ["enabled", "value", "startsAt"]
      .some((key) => incoming[key as keyof IqamahOverride] !== before[key as keyof IqamahOverride]));
    const anchor = incoming.updatedAt || content.iqamahTime.updatedAt;
    // Legacy timestamps cannot crash reads. Persistence is intentional.
    const updatedAt = edited ? now.toISOString() : anchor && Number.isFinite(Date.parse(anchor)) ? anchor : "1970-01-01T00:00:00.000Z";
    const bounded = { ...incoming, updatedAt, persistent: true, endsAt: undefined };
    overrides[prayer] = bounded;
  }
  return { ...content, iqamahTime: { ...content.iqamahTime, overrides } };
}
