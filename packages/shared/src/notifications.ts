import type { NotificationCategoryConfig, NotificationPreference, NotificationRoute, NotificationType } from "./types";

export const defaultNotificationPreferences: NotificationPreference = {
  prayerReminders: true,
  iqamahReminders: true,
  minutesBeforeIqamah: 10,
  jumuahReminders: true,
  announcements: true,
  eventReminders: true,
  programReminders: true,
  quranReminders: true,
  youthPrograms: true,
  sistersPrograms: true,
  donationAppeals: false,
  mediaUpdates: true,
  volunteerOpportunities: true,
  livestreamAlerts: true,
  urgentAnnouncements: true,
  dailyDigest: false,
  whiteDaysReminders: false,
  language: "en"
};

export const notificationTypeLabels: Record<NotificationType, string> = {
  prayerReminder: "Prayer reminder",
  iqamahReminder: "Iqamah reminder",
  jumuahReminder: "Jumu'ah reminder",
  announcement: "Announcement",
  urgentAnnouncement: "Urgent announcement",
  eventReminder: "Event reminder",
  programReminder: "Program reminder",
  quranClassReminder: "Qur'an class reminder",
  youthProgramReminder: "Youth program reminder",
  sistersProgramReminder: "Sisters program reminder",
  ramadanSuhoorReminder: "Suhoor reminder",
  ramadanIftarReminder: "Iftar reminder",
  taraweehReminder: "Taraweeh reminder",
  eidPrayerReminder: "Eid prayer reminder",
  donationCampaignReminder: "Donation campaign",
  volunteerOpportunity: "Volunteer opportunity",
  mediaUpdate: "Media update",
  livestreamAlert: "Livestream alert",
  iqamahChange: "Iqamah change",
  whiteDaysReminder: "White Days reminder"
};

export const notificationRouteByType: Record<NotificationType, NotificationRoute> = {
  prayerReminder: "/prayer",
  iqamahReminder: "/prayer",
  jumuahReminder: "/prayer",
  announcement: "/",
  urgentAnnouncement: "/",
  eventReminder: "/events",
  programReminder: "/programs",
  quranClassReminder: "/programs",
  youthProgramReminder: "/youth",
  sistersProgramReminder: "/programs",
  ramadanSuhoorReminder: "/prayer",
  ramadanIftarReminder: "/prayer",
  taraweehReminder: "/media",
  eidPrayerReminder: "/prayer",
  donationCampaignReminder: "/donate",
  volunteerOpportunity: "/events",
  mediaUpdate: "/media",
  livestreamAlert: "/media",
  iqamahChange: "/prayer",
  whiteDaysReminder: "/prayer"
};

export const notificationPreferenceKeyByType: Record<NotificationType, keyof Omit<NotificationPreference, "minutesBeforeIqamah" | "language">> = {
  prayerReminder: "prayerReminders",
  iqamahReminder: "iqamahReminders",
  jumuahReminder: "jumuahReminders",
  announcement: "announcements",
  urgentAnnouncement: "urgentAnnouncements",
  eventReminder: "eventReminders",
  programReminder: "programReminders",
  quranClassReminder: "quranReminders",
  youthProgramReminder: "youthPrograms",
  sistersProgramReminder: "sistersPrograms",
  ramadanSuhoorReminder: "prayerReminders",
  ramadanIftarReminder: "prayerReminders",
  taraweehReminder: "programReminders",
  eidPrayerReminder: "prayerReminders",
  donationCampaignReminder: "donationAppeals",
  volunteerOpportunity: "volunteerOpportunities",
  mediaUpdate: "mediaUpdates",
  livestreamAlert: "livestreamAlerts",
  iqamahChange: "iqamahReminders",
  whiteDaysReminder: "whiteDaysReminders"
};

export const notificationCategories: NotificationCategoryConfig[] = [
  {
    type: "whiteDaysReminder",
    label: "White Days reminder",
    description: "An optional reminder for the 13th, 14th, and 15th of the Hijri month.",
    route: "/prayer",
    defaultAudience: "All",
    respectfulUse: "Describe fasting as voluntary and send only to people who opted in."
  },
  {
    type: "iqamahChange",
    label: "Iqamah change",
    description: "Time-sensitive updates when a published iqamah time changes.",
    route: "/prayer",
    defaultAudience: "All",
    respectfulUse: "Use only when a time actually changes or needs correction."
  },
  {
    type: "jumuahReminder",
    label: "Jumu'ah reminder",
    description: "Friday prayer and parking reminders.",
    route: "/prayer",
    defaultAudience: "All",
    respectfulUse: "Keep concise and avoid repeated reminders."
  },
  {
    type: "urgentAnnouncement",
    label: "Urgent announcement",
    description: "Closures, safety, weather, or urgent masjid notices.",
    route: "/",
    defaultAudience: "All",
    respectfulUse: "Reserved for important operational notices."
  },
  {
    type: "eventReminder",
    label: "Event reminder",
    description: "Community events and halaqah reminders.",
    route: "/events",
    defaultAudience: "All",
    respectfulUse: "Send only for confirmed events."
  },
  {
    type: "quranClassReminder",
    label: "Qur'an classes",
    description: "Qur'an learning updates and class reminders.",
    route: "/programs",
    defaultAudience: "All",
    respectfulUse: "Avoid sending private student details."
  },
  {
    type: "youthProgramReminder",
    label: "HBIC Youth",
    description: "Youth program updates, reminders, and registration notices.",
    route: "/youth",
    defaultAudience: "Youth",
    respectfulUse: "Use community language and avoid sensitive personal details."
  },
  {
    type: "sistersProgramReminder",
    label: "Sisters' programs",
    description: "Sisters' program updates and reminders.",
    route: "/programs",
    defaultAudience: "Sisters",
    respectfulUse: "Keep wording respectful and practical."
  },
  {
    type: "mediaUpdate",
    label: "Media update",
    description: "New reminders, recitations, or community clips.",
    route: "/media",
    defaultAudience: "All",
    respectfulUse: "No autoplay audio and no distracting language around Qur'an content."
  },
  {
    type: "livestreamAlert",
    label: "Livestream alert",
    description: "Livestream or newly published video notices.",
    route: "/media",
    defaultAudience: "All",
    respectfulUse: "Use only when the stream or clip is publicly available."
  },
  {
    type: "donationCampaignReminder",
    label: "Donation appeal",
    description: "Donation campaign updates and fundraising reminders.",
    route: "/donate",
    defaultAudience: "All",
    respectfulUse: "Keep appeals truthful, modest, and never pressure-based."
  },
  {
    type: "volunteerOpportunity",
    label: "Volunteer call",
    description: "Help needed for Jumu'ah, youth programs, and events.",
    route: "/events",
    defaultAudience: "Volunteers",
    respectfulUse: "Avoid sharing volunteer names or private details."
  }
];
