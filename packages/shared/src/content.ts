import { hbicSettings } from "./constants";
import {
  demoAnnouncements,
  demoDonationCategories,
  demoEidSchedule,
  demoEvents,
  demoIqamahTime,
  demoJumuahSchedule,
  demoMediaItems,
  demoPrayerTime,
  demoRamadanSchedule,
  demoServices,
  demoVolunteerOpportunities
} from "./demoData";
import type {
  Announcement,
  DonationCategory,
  EidSchedule,
  EventItem,
  IqamahTime,
  JumuahSchedule,
  MasjidSettings,
  MediaItem,
  PrayerTime,
  RamadanSchedule,
  ServiceItem,
  VolunteerOpportunity
} from "./types";

export type ContentStatus = "draft" | "published";

export interface HbicContent {
  settings: MasjidSettings;
  prayerTime: PrayerTime;
  iqamahTime: IqamahTime;
  jumuahSchedule: JumuahSchedule;
  ramadanSchedule: RamadanSchedule;
  eidSchedule: EidSchedule;
  announcements: Announcement[];
  events: EventItem[];
  programs: ServiceItem[];
  donationCategories: DonationCategory[];
  mediaItems: MediaItem[];
  volunteerOpportunities: VolunteerOpportunity[];
  status: ContentStatus;
  version: number;
  updatedAt: string;
  publishedAt?: string;
}

export const publicRevalidationPaths = [
  "/",
  "/prayer-times",
  "/events",
  "/donate",
  "/programs",
  "/youth",
  "/media",
  "/contact",
  "/about"
] as const;

export const defaultContent: HbicContent = {
  settings: hbicSettings,
  prayerTime: demoPrayerTime,
  iqamahTime: demoIqamahTime,
  jumuahSchedule: demoJumuahSchedule,
  ramadanSchedule: demoRamadanSchedule,
  eidSchedule: demoEidSchedule,
  announcements: demoAnnouncements,
  events: demoEvents,
  programs: demoServices,
  donationCategories: demoDonationCategories,
  mediaItems: demoMediaItems,
  volunteerOpportunities: demoVolunteerOpportunities,
  status: "published",
  version: 1,
  updatedAt: hbicSettings.updatedAt
};

export function normalizeContent(input?: Partial<HbicContent> | null): HbicContent {
  const incoming = input ?? {};

  return {
    ...defaultContent,
    ...incoming,
    settings: {
      ...defaultContent.settings,
      ...(incoming.settings ?? {}),
      social: {
        ...defaultContent.settings.social,
        ...(incoming.settings?.social ?? {})
      },
      location: {
        ...defaultContent.settings.location,
        ...(incoming.settings?.location ?? {})
      }
    },
    prayerTime: { ...defaultContent.prayerTime, ...(incoming.prayerTime ?? {}) },
    iqamahTime: { ...defaultContent.iqamahTime, ...(incoming.iqamahTime ?? {}) },
    jumuahSchedule: { ...defaultContent.jumuahSchedule, ...(incoming.jumuahSchedule ?? {}) },
    ramadanSchedule: { ...defaultContent.ramadanSchedule, ...(incoming.ramadanSchedule ?? {}) },
    eidSchedule: { ...defaultContent.eidSchedule, ...(incoming.eidSchedule ?? {}) },
    announcements: Array.isArray(incoming.announcements) ? incoming.announcements : defaultContent.announcements,
    events: Array.isArray(incoming.events) ? incoming.events : defaultContent.events,
    programs: Array.isArray(incoming.programs) ? incoming.programs : defaultContent.programs,
    donationCategories: Array.isArray(incoming.donationCategories) ? incoming.donationCategories : defaultContent.donationCategories,
    mediaItems: Array.isArray(incoming.mediaItems) ? incoming.mediaItems : defaultContent.mediaItems,
    volunteerOpportunities: Array.isArray(incoming.volunteerOpportunities)
      ? incoming.volunteerOpportunities
      : defaultContent.volunteerOpportunities,
    status: incoming.status ?? defaultContent.status,
    version: typeof incoming.version === "number" ? incoming.version : defaultContent.version,
    updatedAt: incoming.updatedAt ?? defaultContent.updatedAt,
    publishedAt: incoming.publishedAt
  };
}

export function validateContent(content: HbicContent): string[] {
  const errors: string[] = [];

  if (!content.settings.masjidName.trim()) errors.push("Masjid name is required.");
  if (!content.settings.phone.trim()) errors.push("Phone number is required.");
  if (!content.settings.email.trim()) errors.push("Email is required.");
  if (!content.prayerTime.fajr.trim()) errors.push("Fajr adhan time is required.");
  if (!content.prayerTime.dhuhr.trim()) errors.push("Dhuhr adhan time is required.");
  if (!content.prayerTime.asr.trim()) errors.push("Asr adhan time is required.");
  if (!content.prayerTime.maghrib.trim()) errors.push("Maghrib adhan time is required.");
  if (!content.prayerTime.isha.trim()) errors.push("Isha adhan time is required.");
  if (!content.iqamahTime.fajrIqamah.trim()) errors.push("Fajr iqamah time is required.");
  if (!content.iqamahTime.dhuhrIqamah.trim()) errors.push("Dhuhr iqamah time is required.");
  if (!content.iqamahTime.asrIqamah.trim()) errors.push("Asr iqamah time is required.");
  if (!content.iqamahTime.maghribIqamah.trim()) errors.push("Maghrib iqamah time is required.");
  if (!content.iqamahTime.ishaIqamah.trim()) errors.push("Isha iqamah time is required.");
  if (!content.jumuahSchedule.firstKhutbahTime.trim()) errors.push("First Jumu'ah khutbah time is required.");
  if (!content.jumuahSchedule.secondKhutbahTime.trim()) errors.push("Second Jumu'ah khutbah time is required.");
  if (!content.events.length) errors.push("At least one event or program listing is required.");
  if (!content.donationCategories.length) errors.push("At least one donation category is required.");
  if (!content.mediaItems.length) errors.push("At least one media item is required.");

  return errors;
}
