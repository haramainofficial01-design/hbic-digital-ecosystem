export const firebaseCollections = [
  "settings",
  "prayerTimes",
  "iqamahTimes",
  "jumuahSchedules",
  "ramadanSchedules",
  "eidSchedules",
  "announcements",
  "events",
  "programs",
  "donationCategories",
  "mediaItems",
  "volunteerOpportunities",
  "pushNotificationLogs",
  "users",
  "adminRoles",
  "auditLogs"
] as const;

export type FirebaseCollection = (typeof firebaseCollections)[number];
