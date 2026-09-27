import { calgaryBillingPeriod, type AcademyPublicFamily } from "@hbic/shared";
import * as Notifications from "expo-notifications";
import { ensureNotificationChannelsAsync, notificationChannels } from "./notifications";

const prefix = "academy-cash-";
const day = 86_400_000;

/** Reconciles only Academy-owned reminders; prayer alerts are never touched. */
export async function reconcileAcademyCashReminders(family: AcademyPublicFamily | null, now = new Date(), serverEnabled = false) {
  const existing = (await Notifications.getAllScheduledNotificationsAsync()).filter((item) => item.identifier.startsWith(prefix));
  await Promise.all(existing.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  if (serverEnabled || !family || family.paymentChoice !== "cash" || !family.cashReminderEligible || family.enrollmentState === "withdrawn" ||
      family.children.every((child) => child.cancelEffectiveAt && Date.parse(child.cancelEffectiveAt) <= now.getTime())) return 0;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return 0;
  await ensureNotificationChannelsAsync();
  const [year, month] = calgaryBillingPeriod(now).split("-").map(Number);
  let count = 0;
  for (let index = 0; index < 6; index += 1) {
    const due = new Date(Date.UTC(year, month - 1 + index, 1, 15));
    const period = calgaryBillingPeriod(due);
    const active = family.children.some((child) => !child.cancelEffectiveAt || Date.parse(child.cancelEffectiveAt) > due.getTime());
    if (!active || index === 0 && family.paymentState === "paid") continue;
    for (const [kind, date] of [["upcoming", new Date(due.getTime() - 3 * day)], ["due", due]] as const) {
      if (date.getTime() <= now.getTime()) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${prefix}${period}-${kind}`,
        content: {
          title: kind === "due" ? "Quran Academy cash tuition is due today" : "Quran Academy cash tuition is due soon",
          body: kind === "due" ? "Please pay at HBIC today, the 1st, and ask for your receipt." : "The next monthly cash payment is due on the 1st at HBIC.",
          sound: "default",
          data: { owner: "academy-cash", route: "/quran-academy", type: "quranClassReminder" }
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: notificationChannels.quietReminders }
      });
      count += 1;
    }
  }
  return count;
}
