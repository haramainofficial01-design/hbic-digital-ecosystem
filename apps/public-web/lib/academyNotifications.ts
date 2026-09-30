import "server-only";

import { ACADEMY_LAST_BILLING_MONTH, academyCashReminderStage, calgaryBillingPeriod, defaultNotificationPreferences, nextCalgaryFirstBillingAnchor } from "@hbic/shared";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { academyDb, getAcademyFamily } from "./academyStore";
import { sendPushNotification, type RegisteredPushToken } from "./notificationStore";

/** Academy announcements are targeted to enrolled parents, never all app users. */
export async function sendAcademyUpdate(input: { title: string; body: string; classIds: string[]; kind: "announcement" | "calendar" }) {
  const db = academyDb();
  const tokens: RegisteredPushToken[] = [];
  let cursor: QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection("academyFamilies").orderBy("__name__").limit(200);
    if (cursor) query = query.startAfter(cursor);
    const batch = await query.get();
    for (const family of batch.docs) {
      const data = family.data();
      // Conditional registrations need schedule changes before payment clears.
      if (!["conditional", "submitted", "waitlisted", "approved", "active"].includes(String(data.enrollmentState))) continue;
      const children = Array.isArray(data.children) ? data.children as { classId?: string | null; cancelEffectiveAt?: string | null }[] : [];
      if (!children.some((child) => !child.cancelEffectiveAt || Date.parse(child.cancelEffectiveAt) > Date.now())) continue;
      if (input.classIds.length && !children.some((child) => child.classId && input.classIds.includes(child.classId))) continue;
      const devices = await family.ref.collection("devices").where("enabled", "==", true).limit(20).get();
      for (const device of devices.docs) {
        const record = device.data();
        if (typeof record.token !== "string" || !/^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(record.token)) continue;
        tokens.push({ token: record.token, platform: record.platform === "ios" || record.platform === "android" ? record.platform : "unknown",
          preferences: defaultNotificationPreferences, enabled: true, createdAt: record.updatedAt ?? "", updatedAt: record.updatedAt ?? "" });
      }
    }
    if (batch.size < 200) break;
    cursor = batch.docs[batch.docs.length - 1];
  }
  return sendPushNotification({ title: input.title.slice(0, 90), body: input.body.slice(0, 220), audience: "All",
    route: "/quran-academy", type: "quranClassReminder", data: { academy: true, kind: input.kind } }, tokens);
}

/** Daily server-side fallback for enrolled cash families with app push enabled.
 * A family/device using this route does not also schedule local cash reminders.
 */
export async function runAcademyCashReminders(now = new Date()) {
  const db = academyDb();
  const dueMonth = calgaryBillingPeriod(new Date(nextCalgaryFirstBillingAnchor(now) * 1000));
  const currentMonth = calgaryBillingPeriod(now);
  let checked = 0, sent = 0, skipped = 0;
  let cursor: QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection("academyFamilies").orderBy("__name__").limit(100);
    if (cursor) query = query.startAfter(cursor);
    const batch = await query.get();
    for (const document of batch.docs) {
      checked += 1;
      const record = document.data();
      if (record.paymentChoice !== "cash" || !record.firstCashPaidAt) continue;
      const family = await getAcademyFamily(document.id);
      if (!family || family.enrollmentState === "withdrawn") continue;
      // Upcoming reminders concern the *next* month's ledger. A paid current
      // month must not suppress them, while a prepaid next month must.
      const stage = academyCashReminderStage(now, family.cashReminderEligible, "cash_due");
      if (!stage) continue;
      const period = stage === "upcoming" ? dueMonth : currentMonth;
      if (period > ACADEMY_LAST_BILLING_MONTH) continue;
      const month = await document.ref.collection("months").doc(period).get();
      if (month.data()?.status === "paid" || month.data()?.status === "not_due") continue;
      const dueTime = stage === "upcoming" ? nextCalgaryFirstBillingAnchor(now) * 1000 : now.getTime();
      if (!family.children.some((child) => !child.cancelEffectiveAt || Date.parse(child.cancelEffectiveAt) > dueTime)) continue;
      const devices = await document.ref.collection("devices").where("enabled", "==", true).limit(20).get();
      const tokens: RegisteredPushToken[] = devices.docs.map((device) => device.data())
        .filter((device) => device.reminderDelivery === "server" && typeof device.token === "string" && /^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(device.token))
        .map((device) => ({ token: device.token as string, platform: device.platform === "ios" || device.platform === "android" ? device.platform : "unknown",
          preferences: defaultNotificationPreferences, enabled: true, createdAt: device.updatedAt ?? "", updatedAt: device.updatedAt ?? "" }));
      if (!tokens.length) { skipped += 1; continue; }
      const marker = db.collection("academyReminderRuns").doc(`${document.id}_${period}_${stage}`);
      try { await marker.create({ familyId: document.id, period, stage, status: "sending", createdAt: now.toISOString() }); }
      catch (error) { if ((error as { code?: number }).code === 6) { skipped += 1; continue; } throw error; }
      try {
        const result = await sendPushNotification({
          title: stage === "due" ? "Quran Academy cash tuition is due today" : "Quran Academy cash tuition is due soon",
          body: stage === "due" ? "Please pay at HBIC today, the 1st, and ask for your receipt." : "The next monthly cash payment is due on the 1st at HBIC.",
          audience: "All", route: "/quran-academy", type: "quranClassReminder", data: { academy: true, kind: "cash_reminder", period, stage }
        }, tokens);
        await marker.update({ status: result.status, accepted: result.successCount, failed: result.failureCount, finishedAt: new Date().toISOString() });
        sent += result.successCount;
      } catch (error) {
        // Allow an authorized retry on the same Calgary date after a provider
        // outage. Accepted tickets can still duplicate if a process crashes
        // after Expo accepts them; the marker minimizes that small window.
        await marker.delete();
        throw error;
      }
    }
    if (batch.size < 100) break;
    cursor = batch.docs[batch.docs.length - 1];
  }
  return { checked, acceptedPushTokens: sent, skipped };
}
