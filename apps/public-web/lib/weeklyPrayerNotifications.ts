import type { Firestore } from "firebase-admin/firestore";
import { datePartsInTimeZone, dateStringInTimeZone, type HbicContent } from "@hbic/shared";
import { changedIqamahTimes } from "./prayerSync";

/** Vercel's schedule is UTC: 06:00 Sunday is Saturday-night midnight in Calgary.
 * Allow the first hour for scheduler delivery; never send on an ordinary read. */
export function isWeeklyPrayerNotificationWindow(now: Date) {
  const date = dateStringInTimeZone(now);
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 0 && datePartsInTimeZone(now).hour === 0;
}

export async function runWeeklyPrayerNotifications(
  db: Firestore,
  current: HbicContent["iqamahTime"],
  now = new Date(),
  deliver = async (date: string, changes: ReturnType<typeof changedIqamahTimes>) =>
    (await import("./notificationStore")).sendIqamahChangeNotification(date, changes)
) {
  if (!isWeeklyPrayerNotificationWindow(now)) return { status: "outside_window" as const };
  const effectiveDate = dateStringInTimeZone(now);
  const cache = db.collection("integrations").doc("hbicOfficialPrayerTimes");
  const claim = db.collection("prayerChangeNotifications").doc(`weekly-${effectiveDate}`);
  const result = await db.runTransaction(async tx => {
    const [state, existing] = await tx.getAll(cache, claim);
    if (existing.exists) return { status: "already_processed" as const, changes: [] };
    const previous = state.data()?.notificationBaseline as HbicContent["iqamahTime"] | undefined;
    const changes = changedIqamahTimes(previous, current);
    // Advance only the notification baseline; do not alter any prayer times.
    tx.set(cache, { notificationBaseline: JSON.parse(JSON.stringify(current)) }, { merge: true });
    tx.create(claim, { effectiveDate, changes, createdAt: now.toISOString(), status: changes.length ? "claimed" : "no_change" });
    return { status: changes.length ? "claimed" as const : "no_change" as const, changes };
  });
  if (result.status !== "claimed") return { status: result.status };
  try {
    const delivery = await deliver(effectiveDate, result.changes);
    await claim.update({ status: "sent", result: delivery, sentAt: new Date().toISOString() });
    return { status: "sent" as const, changedPrayers: result.changes.map(change => change.prayer) };
  } catch (error) {
    // An ambiguous provider result must not automatically duplicate an alert.
    await claim.update({ status: "delivery_error", failedAt: new Date().toISOString() });
    throw error;
  }
}
