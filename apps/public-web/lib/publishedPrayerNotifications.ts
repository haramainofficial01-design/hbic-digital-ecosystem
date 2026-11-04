import type { Firestore } from "firebase-admin/firestore";
import { dateStringInTimeZone, type HbicContent } from "@hbic/shared";
import { changedIqamahTimes } from "./prayerSync";

/** Only publishing can call this; drafts and public reads never broadcast. */
export async function notifyPublishedIqamahChange(db: Firestore, previous: HbicContent["iqamahTime"], current: HbicContent["iqamahTime"], revision: number, now = new Date(),
  deliver = async (date: string, changes: ReturnType<typeof changedIqamahTimes>) => (await import("./notificationStore")).sendIqamahChangeNotification(date, changes)) {
  const changes = changedIqamahTimes(previous, current);
  if (!changes.length) return { status: "no_change" };
  const claim = db.collection("prayerChangeNotifications").doc(`publication-${revision}`);
  const cache = db.collection("integrations").doc("hbicOfficialPrayerTimes");
  const claimed = await db.runTransaction(async tx => {
    const [existing, state] = await tx.getAll(claim, cache);
    if (existing.exists) return false;
    // Suppress a repeat at Sunday midnight only for the prayers alerted now.
    const baseline = { ...(state.data()?.notificationBaseline ?? previous) };
    for (const change of changes) baseline[`${change.prayer}Iqamah`] = change.newTime;
    tx.set(cache, { notificationBaseline: JSON.parse(JSON.stringify(baseline)) }, { merge: true });
    tx.create(claim, { revision, changes, createdAt: now.toISOString(), status: "claimed" });
    return true;
  });
  if (!claimed) return { status: "already_processed" };
  try {
    const delivery = await deliver(dateStringInTimeZone(now), changes);
    await claim.update({ status: delivery.status, result: delivery });
    return { ...delivery, changedPrayers: changes.map(c => c.prayer) };
  } catch {
    await claim.update({ status: "delivery_error" });
    return { status: "delivery_error" };
  }
}
