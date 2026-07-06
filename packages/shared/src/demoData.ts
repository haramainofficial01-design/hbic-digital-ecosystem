import { hbicSettings } from "./constants";
import type {
  Announcement,
  AuditLog,
  DonationCategory,
  EidSchedule,
  EventItem,
  IqamahTime,
  JumuahSchedule,
  MediaItem,
  PrayerTime,
  PushNotificationLog,
  RamadanSchedule,
  ServiceItem,
  VolunteerOpportunity
} from "./types";

export const demoPrayerTime: PrayerTime = {
  date: "2026-07-01",
  fajr: "3:42 AM",
  sunrise: "5:25 AM",
  dhuhr: "1:39 PM",
  asr: "6:05 PM",
  maghrib: "9:55 PM",
  isha: "11:18 PM",
  source: "iqamah.ca timetable for HBIC Calgary",
  sourceUrl: "https://iqamah.ca/",
  calculationMethod: "iqamah.ca published masjid timetable, reviewed by HBIC",
  importedAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString()
};

export const demoIqamahTime: IqamahTime = {
  date: "2026-07-01",
  fajrIqamah: "4:15 AM",
  dhuhrIqamah: "2:00 PM",
  asrIqamah: "6:30 PM",
  maghribIqamah: "10:00 PM",
  ishaIqamah: "11:30 PM",
  source: "HBIC reviewed iqamah timetable",
  sourceUrl: "https://iqamah.ca/",
  manualOverride: true,
  adjustmentNotes: "Iqamah values are reviewed by HBIC before publishing.",
  updatedBy: "HBIC Office",
  updatedAt: new Date().toISOString()
};

export const demoJumuahSchedule: JumuahSchedule = {
  firstKhutbahTime: "1:30 PM",
  firstIqamahTime: "1:50 PM",
  secondKhutbahTime: "2:30 PM",
  secondIqamahTime: "2:50 PM",
  notes: "Please arrive early and park respectfully around the community.",
  updatedAt: new Date().toISOString()
};

export const demoRamadanSchedule: RamadanSchedule = {
  suhoorEnd: "4:35 AM",
  iftar: "8:42 PM",
  taraweeh: "10:15 PM",
  qiyam: "2:30 AM",
  notes: "Ramadan schedule is shown when the HBIC Ramadan timetable is active."
};

export const demoEidSchedule: EidSchedule = {
  eidName: "Eid al-Adha",
  date: "2026-05-27",
  prayerTimes: ["7:30 AM", "9:00 AM"],
  location: hbicSettings.address,
  notes: "Eid schedule is shown when Eid prayer times are active."
};

export const demoAnnouncements: Announcement[] = [
  {
    id: "ann-urgent-parking",
    title: "Parking reminder for Jumu'ah",
    body: "Please avoid blocking neighbouring driveways and follow volunteer directions.",
    pinned: true,
    urgent: true,
    audience: "All",
    publishedAt: "2026-07-01T10:00:00.000Z",
    createdBy: "HBIC Admin"
  },
  {
    id: "ann-quran",
    title: "Quran classes registration",
    body: "Registration interest is open for weekday Quran classes. Contact the office for placement details.",
    pinned: false,
    urgent: false,
    audience: "All",
    publishedAt: "2026-06-29T18:00:00.000Z",
    createdBy: "HBIC Admin"
  }
];

export const demoEvents: EventItem[] = [
  {
    id: "event-summer-camp-2026",
    title: "HBIC Summer Camp 2026",
    description: "A summer of faith, friendship, and fun with Islamic lessons, stories of the Prophets and Seerah, sports and outdoor activities, scavenger hunts, creative projects, leadership activities, awards, competitions, and a positive Islamic environment. Potential field trips include Calgary Zoo, TELUS Spark Science Centre, Prairie Winds Park, Fish Creek Provincial Park, Central Library Calgary, Butterfield Acres Farm, and local community parks, subject to approval, weather, and logistics.",
    date: "July-August 2026",
    startTime: "Mon-Thu 9:00 AM-2:00 PM",
    endTime: "Friday 9:00 AM-1:00 PM",
    location: "Hazrat Bilal Islamic Centre",
    category: "Youth",
    image: "summer-camp-2026.jpeg",
    registrationLink: `mailto:${hbicSettings.email}?subject=HBIC%20Summer%20Camp%202026`,
    audience: "Boys & girls, ages 7-12",
    speaker: "HBIC instructors and youth team",
    notificationEnabled: true,
    createdBy: "HBIC Admin",
    updatedAt: new Date().toISOString()
  },
  {
    id: "event-heart-antidotes",
    title: "Heart Antidotes",
    description: "Short reminders from the lives of the pious, with brief reflections to uplift the heart and strengthen faith.",
    date: "Every Friday",
    startTime: "After Maghrib",
    endTime: "",
    location: "Hazrat Bilal Islamic Centre",
    category: "Lectures",
    image: "heart-antidotes.jpeg",
    registrationLink: "",
    audience: "Open to brothers & sisters, all ages",
    speaker: "HBIC halaqah series",
    notificationEnabled: true,
    createdBy: "HBIC Admin",
    updatedAt: new Date().toISOString()
  },
  {
    id: "event-quran-reflections",
    title: "Qur'an Reflections",
    description: "Reflections from Tafsir as-Sa'di, sharing lessons and guidance from the Qur'an.",
    date: "Every Sunday",
    startTime: "After Maghrib",
    endTime: "",
    location: "Hazrat Bilal Islamic Centre",
    category: "Lectures",
    image: "quran-reflections.jpeg",
    registrationLink: "",
    audience: "Open to brothers & sisters, all ages",
    speaker: "HBIC halaqah series",
    notificationEnabled: true,
    createdBy: "HBIC Admin",
    updatedAt: new Date().toISOString()
  },
  {
    id: "event-prophetic-foundations",
    title: "Prophetic Foundations",
    description: "40 Ahadith on the foundations of Islam, with essential prophetic teachings every Muslim should know.",
    date: "Every Saturday",
    startTime: "After Maghrib",
    endTime: "",
    location: "Hazrat Bilal Islamic Centre",
    category: "Lectures",
    image: "prophetic-foundations.jpeg",
    registrationLink: "",
    audience: "Open to brothers & sisters, all ages",
    speaker: "HBIC halaqah series",
    notificationEnabled: true,
    createdBy: "HBIC Admin",
    updatedAt: new Date().toISOString()
  },
  {
    id: "event-creed-essentials",
    title: "Creed Essentials",
    description: "The Three Fundamental Principles, an introduction to Islamic creed.",
    date: "Every Thursday",
    startTime: "8:00 PM",
    endTime: "",
    location: "Hazrat Bilal Islamic Centre",
    category: "Lectures",
    image: "creed-essentials.jpeg",
    registrationLink: "",
    audience: "Open to brothers & sisters, all ages",
    speaker: "HBIC halaqah series",
    notificationEnabled: true,
    createdBy: "HBIC Admin",
    updatedAt: new Date().toISOString()
  }
];

export const demoDonationCategories: DonationCategory[] = [
  { id: "general", title: "General Donation", description: "Support daily masjid operations and community services.", amountSuggestions: [25, 50, 100], icon: "heart" },
  { id: "zakat", title: "Zakat", description: "For eligible giving when HBIC has confirmed the current collection and distribution policy.", amountSuggestions: [100, 250, 500], icon: "hands" },
  { id: "sadaqah", title: "Sadaqah", description: "Give ongoing charity for community benefit.", amountSuggestions: [20, 50, 100], icon: "sparkles" },
  { id: "operations", title: "Masjid Operations", description: "Utilities, cleaning, supplies, and maintenance.", amountSuggestions: [50, 150, 300], icon: "building" },
  { id: "youth", title: "Youth Programs", description: "Help fund safe, beneficial programs for youth.", amountSuggestions: [25, 75, 150], icon: "users" },
  { id: "quran", title: "Quran Classes", description: "Support Quran learning and Islamic education.", amountSuggestions: [30, 100, 200], icon: "book" },
  { id: "ramadan", title: "Ramadan", description: "Iftar, Taraweeh, and Ramadan programming.", amountSuggestions: [50, 100, 500], icon: "moon" },
  { id: "maintenance", title: "Building/Maintenance", description: "Long-term upkeep of the facility.", amountSuggestions: [100, 500, 1000], icon: "wrench" }
];

export const demoMediaItems: MediaItem[] = [
  {
    id: "taraweeh-2025-recitation",
    title: "Taraweeh 2025 Recitation",
    description: "A glimpse of the beautiful Qur'an recitation and Ramadan moments shared with the HBIC community.",
    type: "Ramadan / Qur'an Recitation",
    year: 2025,
    videoUrl: "/media/videos/taraweeh-2025-recitation.mp4",
    posterUrl: "/media/videos/taraweeh-2025-recitation-poster.jpg",
    platform: "Website",
    visible: true,
    featured: true,
    createdAt: "2025-03-20T00:00:00.000Z",
    updatedAt: new Date().toISOString()
  }
];

export const demoVolunteerOpportunities: VolunteerOpportunity[] = [
  {
    id: "vol-jumuah-parking",
    title: "Jumu'ah Parking Support",
    description: "Help direct traffic and keep the area respectful for neighbours.",
    date: "2026-07-03",
    contactEmail: hbicSettings.email,
    audience: "All"
  },
  {
    id: "vol-youth-events",
    title: "Youth Program Helpers",
    description: "Support setup, clean up, and mentorship during youth activities.",
    date: "2026-07-05",
    contactEmail: hbicSettings.email,
    audience: "Youth"
  }
];

export const demoServices: ServiceItem[] = [
  { id: "quran-classes", title: "Qur'an Classes", description: "Qur'an learning opportunities for children and adults.", contactMethod: "email" },
  { id: "youth", title: "Youth Programs", description: "Programs for youth connection, learning, service, and safe community growth.", contactMethod: "email" },
  { id: "sisters", title: "Sisters' Programs", description: "Programs and gatherings for sisters.", contactMethod: "email" },
  { id: "volunteer", title: "Volunteer Opportunities", description: "Help with Jumu'ah, events, youth programs, and general community support.", contactMethod: "form" },
  { id: "community", title: "Community Support", description: "A first point of contact for community needs and referrals.", contactMethod: "email" }
];

export const demoPushLogs: PushNotificationLog[] = [
  {
    id: "push-1",
    type: "jumuahReminder",
    title: "Jumu'ah reminder",
    body: "Two Jumu'ah prayers today. Please arrive early.",
    sentBy: "HBIC Office",
    sentAt: "2026-07-01T12:00:00.000Z",
    audience: "All",
    route: "/prayer",
    status: "sent"
  }
];

export const demoAuditLogs: AuditLog[] = [
  {
    id: "audit-1",
    action: "Updated iqamah times",
    collection: "iqamahTimes",
    recordId: demoIqamahTime.date,
    actorName: "HBIC Office",
    actorRole: "caretaker",
    createdAt: new Date().toISOString()
  }
];
