import type {
  HalalRestaurant,
  PublicHalalRestaurant,
  RestaurantInterestInput
} from "./types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+()\d\s.-]{7,30}$/;

function plainText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeUrl(value: unknown) {
  const normalized = plainText(value, 500);
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function validateRestaurantInterestInput(input: unknown): {
  value?: RestaurantInterestInput;
  errors: string[];
} {
  const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const kind = raw.kind === "directory-notify" ? "directory-notify" : "restaurant-interest";
  const value: RestaurantInterestInput = {
    kind,
    businessName: plainText(raw.businessName, 140),
    contactPerson: plainText(raw.contactPerson, 120),
    email: plainText(raw.email, 200).toLowerCase(),
    phone: plainText(raw.phone, 40),
    address: plainText(raw.address, 240),
    cuisine: plainText(raw.cuisine, 120),
    website: safeUrl(raw.website),
    message: plainText(raw.message, 2_000),
    currentHalalClaim: plainText(raw.currentHalalClaim, 800),
    consent: raw.consent === true,
    acknowledgement: raw.acknowledgement === true,
    websiteField: plainText(raw.websiteField, 200),
    startedAt: typeof raw.startedAt === "number" ? raw.startedAt : undefined
  };
  const errors: string[] = [];

  if (value.websiteField) errors.push("Unable to accept this submission.");
  if (!emailPattern.test(value.email)) errors.push("Enter a valid email address.");
  if (!value.consent) errors.push("Consent is required.");
  if (!value.acknowledgement) errors.push("Please acknowledge that submission is not halal verification or publication.");
  if (value.startedAt && Date.now() - value.startedAt < 2_000) errors.push("Please review the form before submitting.");

  if (kind === "restaurant-interest") {
    if (!value.businessName) errors.push("Business name is required.");
    if (!value.contactPerson) errors.push("Contact person is required.");
    if (!value.phone || !phonePattern.test(value.phone)) errors.push("Enter a valid phone number.");
    if (!value.address) errors.push("Business address is required.");
    if (!value.cuisine) errors.push("Cuisine is required.");
    if (!value.currentHalalClaim) errors.push("Describe the restaurant's current halal claim.");
  }

  return errors.length ? { errors } : { value, errors };
}

export function isPublicHalalVerificationActive(restaurant: HalalRestaurant, now = new Date()) {
  if (restaurant.publication.status !== "published") return false;
  if (restaurant.halalEvidence.status === "expired" || restaurant.halalEvidence.status === "suspended") return false;
  if (restaurant.halalEvidence.expiresAt && Date.parse(restaurant.halalEvidence.expiresAt) <= now.getTime()) return false;
  return true;
}

export function toPublicHalalRestaurant(
  restaurant: HalalRestaurant,
  now = new Date()
): PublicHalalRestaurant | null {
  if (!isPublicHalalVerificationActive(restaurant, now)) return null;

  return {
    id: restaurant.id,
    slug: restaurant.slug,
    businessName: restaurant.businessName,
    description: restaurant.description,
    cuisine: restaurant.cuisine,
    tags: restaurant.tags,
    address: restaurant.location.address,
    city: restaurant.location.city,
    province: restaurant.location.province,
    postalCode: restaurant.location.postalCode,
    coordinates: restaurant.location.coordinates,
    phone: restaurant.contact.phone,
    website: restaurant.contact.website,
    menuUrl: restaurant.contact.menuUrl,
    orderingUrl: restaurant.contact.orderingUrl,
    hours: restaurant.operations.hours,
    operations: {
      dineIn: restaurant.operations.dineIn,
      takeout: restaurant.operations.takeout,
      delivery: restaurant.operations.delivery,
      catering: restaurant.operations.catering,
      reservations: restaurant.operations.reservations,
      pricing: restaurant.operations.pricing,
      parking: restaurant.operations.parking,
      accessibility: restaurant.operations.accessibility,
      familySeating: restaurant.operations.familySeating,
      prayerSpace: restaurant.operations.prayerSpace
    },
    logoUrl: restaurant.media.logoUrl,
    coverUrl: restaurant.media.coverUrl,
    galleryUrls: restaurant.media.galleryUrls,
    halalStatus: restaurant.halalEvidence.status,
    halalSummary: restaurant.halalEvidence.publicSummary,
    verifiedAt: restaurant.halalEvidence.verifiedAt,
    expiresAt: restaurant.halalEvidence.expiresAt,
    certificateIssuer: restaurant.halalEvidence.certificateIssuer,
    sponsored: restaurant.commercial.sponsored
  };
}
