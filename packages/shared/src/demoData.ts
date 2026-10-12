import { hbicSettings } from "./constants";
import { correctApprovedEvent, academyEventDescription, academyEventTitle, academyPosterFile, summerCampHighlightUrl } from "./eventLifecycle";
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
  date: "2026-07-09",
  fajr: "4:02 AM",
  sunrise: "5:32 AM",
  dhuhr: "1:41 PM",
  asr: "6:01 PM",
  maghrib: "9:50 PM",
  isha: "11:20 PM",
  source: "HBIC published timetable",
  sourceUrl: "",
  calculationMethod: "HBIC published masjid timetable",
  importedAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString()
};

export const demoIqamahTime: IqamahTime = {
  date: "2026-07-09",
  fajrIqamah: "4:30 AM",
  dhuhrIqamah: "2:00 PM",
  asrIqamah: "6:30 PM",
  maghribIqamah: "10:00 PM",
  ishaIqamah: "11:25 PM",
  source: "HBIC published iqamah timetable",
  sourceUrl: "",
  manualOverride: false,
  overrides: {},
  adjustmentNotes: "",
  updatedBy: "HBIC Office",
  updatedAt: new Date().toISOString()
};

export const demoJumuahSchedule: JumuahSchedule = {
  firstKhutbahTime: "1:45 PM",
  firstIqamahTime: "1:45 PM",
  secondKhutbahTime: "2:30 PM",
  secondIqamahTime: "2:30 PM",
  firstDoorsCloseTime: "2:00 PM",
  doorNotice: {
    enabled: true,
    time: "2:00 PM",
    title: "First Jumu'ah",
    body: "Doors close at 2:00 PM for the first Jumu'ah prayer.",
    parkingNotice: "Please arrive early and park respectfully around the community.",
    updatedBy: "HBIC Office",
    updatedAt: new Date().toISOString()
  },
  manualOverride: false,
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
    visible: true,
    archived: false,
    priority: "Urgent",
    pinned: true,
    urgent: true,
    audience: "All",
    publishedAt: "2026-07-01T10:00:00.000Z",
    createdBy: "HBIC Admin"
  },
  {
    id: "ann-quran",
    title: "Quran classes registration",
    body: "HBIC Qur'an Academy: Mondays & Thursdays, 5:30–7:00 PM. $50 CAD per child/month. Register at hbic.ca/quran-academy; card online or cash at HBIC.",
    visible: true,
    archived: false,
    priority: "Normal",
    pinned: false,
    urgent: false,
    audience: "All",
    publishedAt: "2026-06-29T18:00:00.000Z",
    createdBy: "HBIC Admin"
  }
];

const demoEventRecords: EventItem[] = [
  {
    id: "event-history-of-fiqh",
    title: "History of Fiqh",
    subtitle: "The History & Development of Fiqh",
    summary: "A focused three-week study of how Fiqh developed through different eras, its major stages, and key scholars and figures.",
    description: "Join us for a focused three-week program exploring how Fiqh developed throughout the different eras, its major stages, and some of the key scholars and figures who shaped its history. This program will be especially beneficial for students of knowledge, but it is open to anyone who would like to attend and benefit.",
    date: "Sundays",
    startTime: "8:30 PM",
    endTime: "",
    duration: "Three weekly sessions",
    recurringSchedule: "Sundays at 8:30 PM",
    location: "Hazrat Bilal Islamic Centre",
    category: "Classes",
    image: "",
    posterStatus: "awaiting-upload",
    registrationLink: "",
    audience: "Intermediate level · Open to everyone · Especially beneficial for students of knowledge",
    speaker: "Faheem",
    tags: ["Fiqh", "Students of Knowledge", "Weekly Class", "Adult Education", "Open to Everyone"],
    caption: "📚 History of Fiqh\nThe History & Development of Fiqh\n\nJoin us for a focused 3-week program exploring how Fiqh developed throughout the different eras, its major stages, and some of the key scholars and figures who shaped its history.\n\n🗓 Sundays\n🕣 8:30 PM\n🎙 Speaker: Faheem\n📍 Hazrat Bilal Islamic Centre\n\nThis program will be especially beneficial for students of knowledge, but it is open to anyone who would like to attend and benefit.\n\nA simple weekly gathering for those who want to better understand the development of Islamic scholarship and the foundations behind the study of Fiqh.\n\nAll are welcome.",
    status: "published",
    visible: true,
    featured: true,
    notificationEnabled: true,
    createdBy: "HBIC Admin",
    updatedAt: new Date().toISOString()
  },
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
    visible: true,
    featured: true,
    notificationEnabled: true,
    createdBy: "HBIC Admin",
    updatedAt: new Date().toISOString()
  },
  {
    id: "event-quran-academy",
    title: academyEventTitle,
    summary: "Qur'an & Tajweed, Noorani Qa'idah, and beneficial Thursday activities.",
    description: academyEventDescription,
    date: "Mondays & Thursdays",
    startTime: "5:30 PM",
    endTime: "7:00 PM",
    location: "Hazrat Bilal Islamic Centre",
    category: "Classes",
    image: academyPosterFile,
    registrationLink: "https://hbic.ca/quran-academy",
    audience: "Children",
    speaker: "HBIC Qur'an Academy",
    visible: true,
    featured: true,
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
    visible: true,
    featured: false,
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
    visible: true,
    featured: false,
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
    visible: true,
    featured: false,
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
    visible: true,
    featured: false,
    notificationEnabled: true,
    createdBy: "HBIC Admin",
    updatedAt: new Date().toISOString()
  }
];
export const demoEvents: EventItem[] = demoEventRecords.map(correctApprovedEvent);

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
  { id: "summer-camp-2026-highlights", title: "HBIC Summer Camp 2026 Highlights", description: "A look back at a completed summer of learning, friendship and community activities.", type: "Past Events & Highlights", year: 2026, videoUrl: summerCampHighlightUrl, posterUrl: "/photos/summer-camp-2026.jpeg", platform: "Instagram", visible: true, featured: false, createdAt: "2026-10-07T05:05:17.000Z", updatedAt: "2026-10-12T02:30:00.000Z" },
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
    audience: "All",
    status: "closed",
    visible: false
  },
  {
    id: "vol-youth-events",
    title: "Youth Program Helpers",
    description: "Support setup, clean up, and mentorship during youth activities.",
    date: "2026-07-05",
    contactEmail: hbicSettings.email,
    audience: "Youth",
    status: "closed",
    visible: false
  }
];

export const demoServices: ServiceItem[] = [
  { id: "quran-classes", title: academyEventTitle, description: academyEventDescription, image: academyPosterFile, href: "/quran-academy", visible: true, featured: true, contactMethod: "form", formUrl: "https://hbic.ca/quran-academy" },
  { id: "youth", title: "Youth Programs", description: "Programs for youth connection, learning, service, and safe community growth.", image: "youth-program.jpeg", href: "/youth", visible: true, featured: true, contactMethod: "email" },
  { id: "sisters", title: "Sisters' Programs", description: "Programs and gatherings for sisters.", visible: true, featured: false, contactMethod: "email" },
  { id: "volunteer", title: "Volunteer Opportunities", description: "Help with Jumu'ah, events, youth programs, and general community support.", image: "community-jumuah.jpg", visible: true, featured: false, contactMethod: "form" },
  { id: "community", title: "Community Support", description: "A first point of contact for community needs and referrals.", image: "masjid-exterior.png", href: "/contact", visible: true, featured: false, contactMethod: "email" }
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
