import { iqamahOverrideExpiresAt, iqamahOverrideWeekEndsAt, type HbicContent, type IqamahOverride, type IqamahPrayerName } from "@hbic/shared";

const prayers: IqamahPrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

/** Stamp actual edits server-side. Republishing unrelated content cannot renew
 * an old override, and an arbitrary client expiry cannot extend its week. */
export function boundPrayerOverrides(content: HbicContent, previous?: HbicContent, now = new Date()): HbicContent {
  // Compare normalized legacy values so simply saving a loaded draft does not
  // count as a fresh override merely because it gained an explicit expiry.
  if (previous) previous = boundPrayerOverrides(previous, undefined, now);
  const overrides: Partial<Record<IqamahPrayerName, IqamahOverride>> = {};
  for (const prayer of prayers) {
    const incoming = content.iqamahTime.overrides?.[prayer];
    if (!incoming) continue;
    const before = previous?.iqamahTime.overrides?.[prayer];
    const edited = previous && (!before || ["enabled", "value", "startsAt", "endsAt", "updatedAt"]
      .some((key) => incoming[key as keyof IqamahOverride] !== before[key as keyof IqamahOverride]));
    const anchor = incoming.updatedAt || content.iqamahTime.updatedAt;
    // Malformed legacy timestamps cannot crash public reads or grant an
    // indefinite override. Actual edits always get the server's timestamp.
    const updatedAt = edited ? now.toISOString() : anchor && Number.isFinite(Date.parse(anchor)) ? anchor : "1970-01-01T00:00:00.000Z";
    const bounded = { ...incoming, updatedAt };
    // Editing an expired override intentionally renews it for this week.
    if (edited && before?.endsAt === incoming.endsAt && incoming.endsAt && Date.parse(incoming.endsAt) <= now.getTime()) {
      bounded.endsAt = iqamahOverrideWeekEndsAt(now);
    }
    bounded.endsAt = iqamahOverrideExpiresAt(bounded) || iqamahOverrideWeekEndsAt(new Date(updatedAt));
    overrides[prayer] = bounded;
  }
  return { ...content, iqamahTime: { ...content.iqamahTime, overrides } };
}
