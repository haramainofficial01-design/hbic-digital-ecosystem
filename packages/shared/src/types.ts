export type PrayerName = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
export type IqamahPrayerName = Exclude<PrayerName, "sunrise">;

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

export type LanguageCode = "en" | "ur" | "fa-AF" | "ar";

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

export interface IqamahOverride {
  enabled: boolean;
  value: string;
  startsAt?: string;
  endsAt?: string;
  note?: string;
  updatedBy?: string;
  updatedAt?: string;
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
  overrides?: Partial<Record<IqamahPrayerName, IqamahOverride>>;
  /** Last verified automatic values, retained independently of manual overrides. */
  automaticIqamah?: Partial<Record<IqamahPrayerName, string>>;
  /** Feed-provided next-week values, used for Saturday-to-Sunday rollover only. */
  upcomingWeekIqamah?: Partial<Record<IqamahPrayerName, string>>;
  adjustmentNotes: string;
  updatedBy: string;
  updatedAt: string;
}

export interface JumuahSchedule {
  firstKhutbahTime: string;
  firstIqamahTime: string;
  secondKhutbahTime: string;
  secondIqamahTime: string;
  firstDoorsCloseTime?: string;
  doorNotice?: JumuahDoorNotice;
  manualOverride?: boolean;
  notes: string;
  updatedAt: string;
}

export interface JumuahDoorNotice {
  enabled: boolean;
  time: string;
  title: string;
  body: string;
  titleUr?: string;
  bodyUr?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  exceptions?: Array<{
    date: string;
    enabled: boolean;
    time?: string;
    body?: string;
  }>;
  parkingNotice?: string;
  capacityNotice?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface HijriDateOverride {
  id: string;
  gregorianDate: string;
  day: number;
  month: string;
  year: number;
  label?: string;
  labelUr?: string;
  note?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface HijriSettings {
  calendar: "islamic-umalqura";
  adjustmentDays: number;
  overrides?: HijriDateOverride[];
  updatedAt: string;
}

export interface TvDisplayAnnouncement {
  enabled: boolean;
  message: string;
  startsAt?: string;
  expiresAt?: string;
  updatedAt: string;
}

/** Presentation-only options for the read-only masjid television route. */
export interface TvDisplaySettings {
  title: string;
  showGregorianDate: boolean;
  showHijriDate: boolean;
  showJumuah: boolean;
  showQrCode: boolean;
  showWebsite: boolean;
  showSocialLinks: boolean;
  showWeather: boolean;
  announcement: TvDisplayAnnouncement;
  updatedAt: string;
}

export interface FeatureFlags {
  communityHubEnabled: boolean;
  hijriDateEnabled: boolean;
  whiteDaysEnabled: boolean;
  whiteDaysNotificationsEnabled: boolean;
  jumuahDoorNoticeEnabled: boolean;
  halalComingSoonEnabled: boolean;
  halalDirectoryListingsEnabled: boolean;
  restaurantInterestFormEnabled: boolean;
  newMuslimResourcesEnabled: boolean;
  localServicesEnabled: boolean;
  volunteerEnabled: boolean;
  askMasjidEnabled: boolean;
  dailyBenefitEnabled: boolean;
  seasonalModeEnabled: boolean;
  historyOfFiqhEventEnabled: boolean;
}

export type HalalVerificationStatus =
  | "verified-by-masjid"
  | "certificate-reviewed"
  | "owner-declared"
  | "partial-menu"
  | "pending"
  | "expired"
  | "suspended";

export type RestaurantPublicationStatus =
  | "draft"
  | "pending"
  | "approved"
  | "published"
  | "suspended"
  | "expired"
  | "rejected"
  | "archived";

export interface HalalRestaurant {
  id: string;
  slug: string;
  businessName: string;
  description: string;
  cuisine: string;
  tags: string[];
  location: {
    address: string;
    city: string;
    province: string;
    postalCode: string;
    coordinates?: { latitude: number; longitude: number };
    timezone: string;
    mapIdentifier?: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
    menuUrl?: string;
    orderingUrl?: string;
    ownerContacts?: Array<{ name: string; email?: string; phone?: string }>;
  };
  operations: {
    hours: Record<string, string>;
    dineIn: boolean;
    takeout: boolean;
    delivery: boolean;
    catering: boolean;
    reservations: boolean;
    pricing?: string;
    parking?: string;
    accessibility?: string;
    familySeating?: boolean;
    prayerSpace?: boolean;
  };
  media: {
    logoUrl?: string;
    coverUrl?: string;
    galleryUrls: string[];
    authorizationConfirmed: boolean;
    attribution?: string;
  };
  halalEvidence: {
    status: HalalVerificationStatus;
    method?: string;
    publicSummary?: string;
    verifiedAt?: string;
    expiresAt?: string;
    certificateIssuer?: string;
    internalDocumentUrls?: string[];
    supplierEvidence?: string;
    ownerDeclaration?: string;
    allMeatHalal?: boolean;
    partialMenu?: boolean;
    porkHandling?: string;
    alcohol?: string;
    sharedKitchen?: string;
    crossContamination?: string;
    reviewer?: string;
    nextReviewAt?: string;
    history: Array<{
      status: HalalVerificationStatus;
      changedAt: string;
      changedBy: string;
      note?: string;
    }>;
  };
  publication: {
    status: RestaurantPublicationStatus;
    publishedAt?: string;
    suspendedAt?: string;
    internalNote?: string;
  };
  commercial: {
    listingTier: "standard" | "enhanced";
    sponsored: boolean;
    sponsorshipStartsAt?: string;
    sponsorshipEndsAt?: string;
    billingState?: string;
    featuredPriority?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PublicHalalRestaurant {
  id: string;
  slug: string;
  businessName: string;
  description: string;
  cuisine: string;
  tags: string[];
  address: string;
  city: string;
  province: string;
  postalCode: string;
  coordinates?: { latitude: number; longitude: number };
  phone: string;
  website?: string;
  menuUrl?: string;
  orderingUrl?: string;
  hours: Record<string, string>;
  operations: Pick<
    HalalRestaurant["operations"],
    "dineIn" | "takeout" | "delivery" | "catering" | "reservations" | "pricing" | "parking" | "accessibility" | "familySeating" | "prayerSpace"
  >;
  logoUrl?: string;
  coverUrl?: string;
  galleryUrls: string[];
  halalStatus: HalalVerificationStatus;
  halalSummary?: string;
  verifiedAt?: string;
  expiresAt?: string;
  certificateIssuer?: string;
  sponsored: boolean;
}

export type RestaurantInterestKind = "restaurant-interest" | "directory-notify";
export type RestaurantInterestStatus = "new" | "reviewing" | "contacted" | "duplicate" | "closed";

export interface RestaurantInterestInput {
  kind: RestaurantInterestKind;
  businessName?: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  address?: string;
  cuisine?: string;
  website?: string;
  message?: string;
  currentHalalClaim?: string;
  consent: boolean;
  acknowledgement: boolean;
  websiteField?: string;
  startedAt?: number;
}

export interface RestaurantInterestSubmission extends Omit<RestaurantInterestInput, "websiteField" | "startedAt"> {
  id: string;
  status: RestaurantInterestStatus;
  duplicateFingerprint: string;
  submittedAt: string;
  updatedAt: string;
  adminNote?: string;
}

export type CommunityPublicationStatus = "draft" | "published" | "archived";

export type NewMuslimResourceCategory =
  | "visiting"
  | "beginner-classes"
  | "wudu"
  | "prayer-basics"
  | "shahadah-support"
  | "mentor-request"
  | "introductory-books";

export interface NewMuslimResource {
  id: string;
  category: NewMuslimResourceCategory;
  title: string;
  summary: string;
  titleUr?: string;
  summaryUr?: string;
  actionLabel?: string;
  actionUrl?: string;
  status: CommunityPublicationStatus;
  visible: boolean;
  sortOrder: number;
  updatedAt: string;
}

export type LocalMuslimServiceCategory =
  | "schools"
  | "quran-teachers"
  | "counselling"
  | "food-support"
  | "refugee-services"
  | "youth"
  | "sisters"
  | "seniors"
  | "transportation"
  | "professional-referrals";

export interface LocalMuslimService {
  id: string;
  category: LocalMuslimServiceCategory;
  title: string;
  summary: string;
  contactLabel?: string;
  contactUrl?: string;
  status: CommunityPublicationStatus;
  visible: boolean;
  sortOrder: number;
  reviewedAt?: string;
  updatedAt: string;
}

export type DailyBenefitKind = "ayah" | "hadith" | "dua" | "imam-message";

export interface DailyBenefit {
  id: string;
  kind: DailyBenefitKind;
  title: string;
  body: string;
  titleUr?: string;
  bodyUr?: string;
  source: string;
  reviewer: string;
  publishFrom: string;
  publishUntil?: string;
  status: CommunityPublicationStatus;
  visible: boolean;
  updatedAt: string;
}

export interface AskMasjidSettings {
  enabled: boolean;
  categories: string[];
  privacyNotice: string;
  routingEmail: string;
  responseOwner: string;
  updatedAt: string;
}

export type AskMasjidSubmissionStatus = "new" | "reviewing" | "routed" | "answered" | "closed" | "duplicate";

export interface AskMasjidSubmissionInput {
  name?: string;
  email: string;
  category: string;
  question: string;
  consent: boolean;
  websiteField?: string;
  startedAt?: number;
}

export interface AskMasjidSubmission extends Omit<AskMasjidSubmissionInput, "websiteField" | "startedAt"> {
  id: string;
  status: AskMasjidSubmissionStatus;
  duplicateFingerprint: string;
  submittedAt: string;
  updatedAt: string;
  routedTo?: string;
  adminNote?: string;
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
  image?: string;
  visible?: boolean;
  archived?: boolean;
  expiresAt?: string;
  priority?: "Normal" | "High" | "Urgent";
  destination?: string;
  pinned: boolean;
  urgent: boolean;
  audience: "All" | "Youth" | "Sisters" | "Volunteers";
  publishedAt: string;
  createdBy: string;
}

export interface EventItem {
  id: string;
  title: string;
  subtitle?: string;
  summary?: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  duration?: string;
  recurringSchedule?: string;
  location: string;
  category: ProgramCategory;
  image: string;
  posterStatus?: "ready" | "awaiting-upload";
  registrationLink: string;
  audience: string;
  speaker: string;
  tags?: string[];
  caption?: string;
  status?: "draft" | "published";
  visible?: boolean;
  featured?: boolean;
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
  skills?: string[];
  minimumAge?: number;
  capacity?: number;
  status?: "open" | "full" | "closed";
  visible?: boolean;
  updatedAt?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  image?: string;
  href?: string;
  visible?: boolean;
  featured?: boolean;
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
  whiteDaysReminders: boolean;
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
  | "iqamahChange"
  | "whiteDaysReminder";

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
  | "/more"
  | "/community"
  | "/halal-restaurants"
  | "/notifications"
  | "/quran-academy";

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
