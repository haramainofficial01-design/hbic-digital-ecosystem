export type PrayerName = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export type ProgramCategory =
  | "General"
  | "Youth"
  | "Sisters"
  | "Classes"
  | "Lectures"
  | "Ramadan"
  | "Eid"
  | "Volunteer"
  | "Fundraiser"
  | "Community";

export type AdminRole = "superAdmin" | "director" | "caretaker" | "editor";

export type ThemeMode = "system" | "light" | "dark" | "ramadan" | "eid";

export type LanguageCode = "en" | "ur";

export interface MasjidSettings {
  masjidName: string;
  shortName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  donationUrl: string;
  social: {
    youtube: string;
    instagram: string;
    tiktok: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  themeMode: ThemeMode;
  ramadanMode: boolean;
  eidMode: boolean;
  updatedAt: string;
}

export interface PrayerTime {
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  source: string;
  sourceUrl?: string;
  calculationMethod: string;
  importedAt?: string;
  lastUpdated: string;
}

export interface IqamahTime {
  date: string;
  fajrIqamah: string;
  dhuhrIqamah: string;
  asrIqamah: string;
  maghribIqamah: string;
  ishaIqamah: string;
  source: string;
  sourceUrl?: string;
  manualOverride: boolean;
  adjustmentNotes: string;
  updatedBy: string;
  updatedAt: string;
}

export interface JumuahSchedule {
  firstKhutbahTime: string;
  firstIqamahTime: string;
  secondKhutbahTime: string;
  secondIqamahTime: string;
  notes: string;
  updatedAt: string;
}

export interface RamadanSchedule {
  suhoorEnd: string;
  iftar: string;
  taraweeh: string;
  qiyam: string;
  notes: string;
}

export interface EidSchedule {
  eidName: string;
  date: string;
  prayerTimes: string[];
  location: string;
  notes: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  urgent: boolean;
  audience: "All" | "Youth" | "Sisters" | "Volunteers";
  publishedAt: string;
  createdBy: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  category: ProgramCategory;
  image: string;
  registrationLink: string;
  audience: string;
  speaker: string;
  notificationEnabled: boolean;
  createdBy: string;
  updatedAt: string;
}

export interface DonationCategory {
  id: string;
  title: string;
  description: string;
  amountSuggestions: number[];
  icon: string;
  url?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  description: string;
  type: string;
  year: number;
  videoUrl: string;
  posterUrl: string;
  platform: "Website" | "Instagram" | "YouTube" | "TikTok" | "Local" | "Social";
  visible: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerOpportunity {
  id: string;
  title: string;
  description: string;
  date: string;
  contactEmail: string;
  audience: "All" | "Youth" | "Sisters";
  signupUrl?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  contactMethod: "phone" | "email" | "form";
  formUrl?: string;
}

export interface NotificationPreference {
  prayerReminders: boolean;
  iqamahReminders: boolean;
  minutesBeforeIqamah: number;
  jumuahReminders: boolean;
  announcements: boolean;
  eventReminders: boolean;
  programReminders: boolean;
  quranReminders: boolean;
  youthPrograms: boolean;
  sistersPrograms: boolean;
  donationAppeals: boolean;
  mediaUpdates: boolean;
  volunteerOpportunities: boolean;
  livestreamAlerts: boolean;
  urgentAnnouncements: boolean;
  dailyDigest: boolean;
  language: LanguageCode;
}

export type NotificationType =
  | "prayerReminder"
  | "iqamahReminder"
  | "jumuahReminder"
  | "announcement"
  | "urgentAnnouncement"
  | "eventReminder"
  | "programReminder"
  | "quranClassReminder"
  | "youthProgramReminder"
  | "sistersProgramReminder"
  | "ramadanSuhoorReminder"
  | "ramadanIftarReminder"
  | "taraweehReminder"
  | "eidPrayerReminder"
  | "donationCampaignReminder"
  | "volunteerOpportunity"
  | "mediaUpdate"
  | "livestreamAlert"
  | "iqamahChange";

export type NotificationAudience = "All" | "Youth" | "Sisters" | "Volunteers" | "Admins";

export type NotificationRoute =
  | "/"
  | "/prayer"
  | "/events"
  | "/donate"
  | "/media"
  | "/programs"
  | "/youth"
  | "/contact"
  | "/more";

export interface NotificationCategoryConfig {
  type: NotificationType;
  label: string;
  description: string;
  route: NotificationRoute;
  defaultAudience: NotificationAudience;
  respectfulUse: string;
}

export interface PushNotificationLog {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  sentBy: string;
  sentAt: string;
  audience: NotificationAudience | string;
  route?: NotificationRoute;
  scheduledFor?: string;
  status?: "draft" | "queued" | "sent" | "failed";
}

export interface AuditLog {
  id: string;
  action: string;
  collection: string;
  recordId: string;
  actorName: string;
  actorRole: AdminRole;
  createdAt: string;
}
