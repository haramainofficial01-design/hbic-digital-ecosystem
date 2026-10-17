import { hbicSettings } from "./constants";
import { normalizeRatingCampaign } from "./ratingCampaign";
import { discontinuedEventIds } from "./eventLifecycle";
import {
  getCurrentDailyBenefit,
  getPublishedLocalServices,
  getPublishedNewMuslimResources,
  getPublicVolunteerOpportunities
} from "./community";
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
  AskMasjidSettings,
  DailyBenefit,
  DonationCategory,
  EidSchedule,
  EventItem,
  FeatureFlags,
  HijriSettings,
  IqamahTime,
  JumuahSchedule,
  LocalMuslimService,
  MasjidSettings,
  MediaItem,
  NewMuslimResource,
  PrayerTime,
  RamadanSchedule,
  ServiceItem,
  TvDisplaySettings,
  VolunteerOpportunity
} from "./types";

export type ContentStatus = "draft" | "published";

export interface HbicContent {
  settings: MasjidSettings;
  prayerTime: PrayerTime;
  iqamahTime: IqamahTime;
  jumuahSchedule: JumuahSchedule;
  hijriSettings: HijriSettings;
  displaySettings: TvDisplaySettings;
  featureFlags: FeatureFlags;
  ramadanSchedule: RamadanSchedule;
  eidSchedule: EidSchedule;
  announcements: Announcement[];
  events: EventItem[];
  /** Public archive is separate so older clients never list it as upcoming. */
  pastEvents?: EventItem[];
  programs: ServiceItem[];
  donationCategories: DonationCategory[];
  mediaItems: MediaItem[];
  volunteerOpportunities: VolunteerOpportunity[];
  newMuslimResources: NewMuslimResource[];
  localMuslimServices: LocalMuslimService[];
  dailyBenefits: DailyBenefit[];
  askMasjidSettings: AskMasjidSettings;
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
  "/about",
  "/community",
  "/halal-restaurants",
  "/display"
] as const;

export const defaultFeatureFlags: FeatureFlags = {
  bilalCompanionEnabled: true,
  communityHubEnabled: true,
  hijriDateEnabled: true,
  whiteDaysEnabled: true,
  whiteDaysNotificationsEnabled: true,
  jumuahDoorNoticeEnabled: true,
  halalComingSoonEnabled: true,
  halalDirectoryListingsEnabled: false,
  restaurantInterestFormEnabled: false,
  newMuslimResourcesEnabled: false,
  localServicesEnabled: false,
  volunteerEnabled: true,
  askMasjidEnabled: false,
  dailyBenefitEnabled: false,
  seasonalModeEnabled: true,
  historyOfFiqhEventEnabled: false
};

export const defaultContent: HbicContent = {
  settings: hbicSettings,
  prayerTime: demoPrayerTime,
  iqamahTime: demoIqamahTime,
  jumuahSchedule: demoJumuahSchedule,
  hijriSettings: {
    calendar: "islamic-umalqura",
    adjustmentDays: 0,
    overrides: [],
    updatedAt: hbicSettings.updatedAt
  },
  displaySettings: {
    title: "Masjid Bilal",
    showGregorianDate: true,
    showHijriDate: true,
    showJumuah: true,
    showQrCode: true,
    showWebsite: true,
    showSocialLinks: true,
    showWeather: true,
    announcement: {
      enabled: false,
      message: "",
      updatedAt: hbicSettings.updatedAt
    },
    updatedAt: hbicSettings.updatedAt
  },
  featureFlags: defaultFeatureFlags,
  ramadanSchedule: demoRamadanSchedule,
  eidSchedule: demoEidSchedule,
  announcements: demoAnnouncements,
  events: demoEvents,
  programs: demoServices,
  donationCategories: demoDonationCategories,
  mediaItems: demoMediaItems,
  volunteerOpportunities: demoVolunteerOpportunities,
  newMuslimResources: [],
  localMuslimServices: [],
  dailyBenefits: [],
  askMasjidSettings: {
    enabled: false,
    categories: ["General", "Programs", "Prayer services", "New Muslim support", "Community services"],
    privacyNotice: "Your question is sent privately to the appropriate Masjid Bilal team member. It is not published publicly.",
    routingEmail: hbicSettings.email,
    responseOwner: "Masjid office",
    updatedAt: hbicSettings.updatedAt
  },
  status: "published",
  version: 1,
  updatedAt: hbicSettings.updatedAt
};

export function isVisibleItem(item: { visible?: boolean; archived?: boolean }) {
  return item.visible !== false && item.archived !== true;
}

export function getPublicEvents(content: Pick<HbicContent, "events" | "featureFlags">) {
  return content.events.filter((event) => {
    if (!isVisibleItem(event)) return false;
    if (event.status === "draft") return false;
    if (event.lifecycle === "completed" || event.lifecycle === "discontinued") return false;
    if ((discontinuedEventIds as readonly string[]).includes(event.id)) return false;
    return true;
  });
}

export function getPastEvents(content: Pick<HbicContent, "events" | "pastEvents">) {
  return [...new Map([...content.events, ...(content.pastEvents ?? [])]
    .filter(event => event.visible !== false && event.status !== "draft" && event.lifecycle === "completed")
    .map(event => [event.id, { ...event, registrationLink: "", notificationEnabled: false, featured: false }])).values()];
}

export function toPublicContent(content: HbicContent, now = new Date()): HbicContent {
  const currentBenefit = getCurrentDailyBenefit(content.dailyBenefits, now);
  const currentTimestamp = now.getTime();

  return {
    ...content,
    prayerTime: {
      ...content.prayerTime,
      source: "Masjid Bilal",
      sourceUrl: undefined,
      calculationMethod: "Masjid Bilal timetable"
    },
    iqamahTime: {
      ...content.iqamahTime,
      source: "Masjid Bilal",
      sourceUrl: undefined,
      updatedBy: "",
      adjustmentNotes: "",
      overrides: undefined,
      automaticIqamah: undefined
    },
    announcements: content.announcements.filter((announcement) => {
      if (!isVisibleItem(announcement)) return false;
      return !announcement.expiresAt || Date.parse(announcement.expiresAt) > currentTimestamp;
    }),
    events: getPublicEvents(content),
    pastEvents: getPastEvents(content),
    programs: content.programs.filter(isVisibleItem),
    mediaItems: content.mediaItems.filter((item) => item.visible),
    volunteerOpportunities: getPublicVolunteerOpportunities(
      content.volunteerOpportunities,
      now.toISOString().slice(0, 10)
    ),
    newMuslimResources: getPublishedNewMuslimResources(content.newMuslimResources),
    localMuslimServices: getPublishedLocalServices(content.localMuslimServices),
    dailyBenefits: currentBenefit ? [currentBenefit] : [],
    askMasjidSettings: {
      ...content.askMasjidSettings,
      routingEmail: "",
      responseOwner: ""
    }
  };
}

export function normalizeContent(input?: Partial<HbicContent> | null): HbicContent {
  const incoming = input ?? {};

  return {
    ...defaultContent,
    ...incoming,
    settings: {
      ...defaultContent.settings,
      ...(incoming.settings ?? {}),
      ratingCampaign: normalizeRatingCampaign(incoming.settings?.ratingCampaign),
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
    iqamahTime: {
      ...defaultContent.iqamahTime,
      ...(incoming.iqamahTime ?? {}),
      overrides: {
        ...(defaultContent.iqamahTime.overrides ?? {}),
        ...(incoming.iqamahTime?.overrides ?? {})
      }
    },
    jumuahSchedule: {
      ...defaultContent.jumuahSchedule,
      ...(incoming.jumuahSchedule ?? {}),
      doorNotice: incoming.jumuahSchedule?.doorNotice
        ? {
            ...(defaultContent.jumuahSchedule.doorNotice ?? incoming.jumuahSchedule.doorNotice),
            ...incoming.jumuahSchedule.doorNotice,
            exceptions: Array.isArray(incoming.jumuahSchedule.doorNotice.exceptions)
              ? incoming.jumuahSchedule.doorNotice.exceptions
              : defaultContent.jumuahSchedule.doorNotice?.exceptions
          }
        : defaultContent.jumuahSchedule.doorNotice
    },
    hijriSettings: {
      ...defaultContent.hijriSettings,
      ...(incoming.hijriSettings ?? {}),
      overrides: Array.isArray(incoming.hijriSettings?.overrides)
        ? incoming.hijriSettings.overrides
        : defaultContent.hijriSettings.overrides
    },
    displaySettings: {
      ...defaultContent.displaySettings,
      ...(incoming.displaySettings ?? {}),
      announcement: {
        ...defaultContent.displaySettings.announcement,
        ...(incoming.displaySettings?.announcement ?? {})
      }
    },
    featureFlags: { ...defaultFeatureFlags, ...(incoming.featureFlags ?? {}) },
    ramadanSchedule: { ...defaultContent.ramadanSchedule, ...(incoming.ramadanSchedule ?? {}) },
    eidSchedule: { ...defaultContent.eidSchedule, ...(incoming.eidSchedule ?? {}) },
    announcements: Array.isArray(incoming.announcements)
      ? incoming.announcements.map((announcement) => ({
          ...announcement,
          visible: announcement.visible ?? true,
          archived: announcement.archived ?? false,
          priority: announcement.priority ?? (announcement.urgent ? "Urgent" : "Normal")
        }))
      : defaultContent.announcements,
    events: Array.isArray(incoming.events)
      ? incoming.events.map((event) => ({
          ...event,
          status: event.status ?? (event.visible === false ? "draft" : "published"),
          visible: event.visible ?? true,
          featured: event.featured ?? false
        }))
      : defaultContent.events,
    programs: Array.isArray(incoming.programs)
      ? incoming.programs.map((program) => ({ ...program, visible: program.visible ?? true, featured: program.featured ?? false }))
      : defaultContent.programs,
    donationCategories: Array.isArray(incoming.donationCategories) ? incoming.donationCategories : defaultContent.donationCategories,
    mediaItems: Array.isArray(incoming.mediaItems) ? incoming.mediaItems : defaultContent.mediaItems,
    volunteerOpportunities: Array.isArray(incoming.volunteerOpportunities)
      ? incoming.volunteerOpportunities.map((opportunity) => ({
          ...opportunity,
          skills: Array.isArray(opportunity.skills) ? opportunity.skills : [],
          status: opportunity.status ?? "open",
          visible: opportunity.visible ?? true
        }))
      : defaultContent.volunteerOpportunities,
    newMuslimResources: Array.isArray(incoming.newMuslimResources)
      ? incoming.newMuslimResources
      : defaultContent.newMuslimResources,
    localMuslimServices: Array.isArray(incoming.localMuslimServices)
      ? incoming.localMuslimServices
      : defaultContent.localMuslimServices,
    dailyBenefits: Array.isArray(incoming.dailyBenefits)
      ? incoming.dailyBenefits
      : defaultContent.dailyBenefits,
    askMasjidSettings: {
      ...defaultContent.askMasjidSettings,
      ...(incoming.askMasjidSettings ?? {}),
      categories: Array.isArray(incoming.askMasjidSettings?.categories)
        ? incoming.askMasjidSettings.categories
        : defaultContent.askMasjidSettings.categories
    },
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
  if (!Number.isInteger(content.hijriSettings.adjustmentDays) || Math.abs(content.hijriSettings.adjustmentDays) > 2) {
    errors.push("Hijri adjustment must be a whole number from -2 to +2.");
  }
  if (!content.displaySettings.title.trim()) errors.push("Prayer display title is required.");
  if (content.displaySettings.title.trim().length > 48) errors.push("Prayer display title must be 48 characters or fewer.");
  if (content.displaySettings.announcement.message.length > 140) errors.push("TV announcement must be 140 characters or fewer.");
  if (content.displaySettings.announcement.enabled && !content.displaySettings.announcement.message.trim()) {
    errors.push("An enabled TV announcement needs a message.");
  }
  if (
    content.featureFlags.jumuahDoorNoticeEnabled &&
    content.jumuahSchedule.doorNotice?.enabled &&
    !content.jumuahSchedule.doorNotice.time.trim()
  ) {
    errors.push("The first Jumu'ah door-closing time is required when the notice is enabled.");
  }
  if (!content.events.length) errors.push("At least one event or program listing is required.");
  if (!content.donationCategories.length) errors.push("At least one donation category is required.");
  if (!content.mediaItems.length) errors.push("At least one media item is required.");
  if (
    content.featureFlags.newMuslimResourcesEnabled &&
    !getPublishedNewMuslimResources(content.newMuslimResources).length
  ) {
    errors.push("New Muslim resources require at least one visible published resource before the module can be enabled.");
  }
  if (
    content.featureFlags.localServicesEnabled &&
    !getPublishedLocalServices(content.localMuslimServices).length
  ) {
    errors.push("Local services require at least one visible published service before the module can be enabled.");
  }
  if (
    content.featureFlags.dailyBenefitEnabled &&
    !content.dailyBenefits.some((benefit) => benefit.visible && benefit.status === "published")
  ) {
    errors.push("Daily Benefit requires at least one visible published item before the module can be enabled.");
  }
  if (content.featureFlags.askMasjidEnabled) {
    if (!content.askMasjidSettings.enabled) errors.push("Ask the Masjid private intake must be enabled.");
    if (!content.askMasjidSettings.categories.length) errors.push("Ask the Masjid requires at least one category.");
    if (!content.askMasjidSettings.routingEmail.trim()) errors.push("Ask the Masjid requires a private routing email.");
    if (!content.askMasjidSettings.privacyNotice.trim()) errors.push("Ask the Masjid requires a privacy notice.");
  }

  return errors;
}
