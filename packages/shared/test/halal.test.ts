import assert from "node:assert/strict";
import test from "node:test";
import { toPublicHalalRestaurant, validateRestaurantInterestInput } from "../src/halal";
import type { HalalRestaurant } from "../src/types";

function restaurant(overrides: Partial<HalalRestaurant> = {}): HalalRestaurant {
  return {
    id: "restaurant-1",
    slug: "restaurant-1",
    businessName: "Example Restaurant",
    description: "Example description",
    cuisine: "Example cuisine",
    tags: ["family"],
    location: {
      address: "1 Example Street",
      city: "Calgary",
      province: "Alberta",
      postalCode: "T0T 0T0",
      timezone: "America/Edmonton"
    },
    contact: {
      phone: "403-555-0100",
      email: "private-owner@example.test",
      ownerContacts: [{ name: "Private Owner", email: "private@example.test" }]
    },
    operations: {
      hours: {},
      dineIn: true,
      takeout: true,
      delivery: false,
      catering: false,
      reservations: false
    },
    media: {
      galleryUrls: [],
      authorizationConfirmed: true
    },
    halalEvidence: {
      status: "certificate-reviewed",
      publicSummary: "Certificate reviewed.",
      internalDocumentUrls: ["https://private.example.test/document"],
      reviewer: "Private Reviewer",
      history: []
    },
    publication: {
      status: "published",
      internalNote: "Private publication note"
    },
    commercial: {
      listingTier: "standard",
      sponsored: false,
      billingState: "private"
    },
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides
  };
}

test("restaurant interest requires consent, acknowledgement, and core business details", () => {
  const invalid = validateRestaurantInterestInput({
    kind: "restaurant-interest",
    email: "not-an-email",
    consent: false,
    acknowledgement: false
  });
  assert.ok(invalid.errors.length >= 7);

  const valid = validateRestaurantInterestInput({
    kind: "restaurant-interest",
    businessName: "Example <script> Restaurant",
    contactPerson: "Owner",
    email: "OWNER@EXAMPLE.COM",
    phone: "+1 403 555 0100",
    address: "1 Example Street",
    cuisine: "Canadian",
    currentHalalClaim: "Owner-declared halal",
    consent: true,
    acknowledgement: true
  });
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.value?.email, "owner@example.com");
  assert.equal(valid.value?.businessName?.includes("<"), false);
});

test("honeypot and implausibly fast submissions are rejected", () => {
  assert.ok(validateRestaurantInterestInput({
    kind: "directory-notify",
    email: "person@example.com",
    consent: true,
    acknowledgement: true,
    websiteField: "spam"
  }).errors.length > 0);
  assert.ok(validateRestaurantInterestInput({
    kind: "directory-notify",
    email: "person@example.com",
    consent: true,
    acknowledgement: true,
    startedAt: Date.now()
  }).errors.length > 0);
});

test("public restaurant projection strips private evidence, contacts, notes, and billing", () => {
  const projected = toPublicHalalRestaurant(restaurant(), new Date("2026-07-10T00:00:00.000Z"));
  assert.ok(projected);
  const serialized = JSON.stringify(projected);
  for (const privateValue of ["private-owner", "Private Owner", "private.example", "Private Reviewer", "private publication", "billingState"]) {
    assert.equal(serialized.includes(privateValue), false, privateValue);
  }
});

test("expired and suspended verification cannot remain publicly active", () => {
  assert.equal(toPublicHalalRestaurant(restaurant({
    halalEvidence: { ...restaurant().halalEvidence, expiresAt: "2026-07-01T00:00:00.000Z" }
  }), new Date("2026-07-10T00:00:00.000Z")), null);
  assert.equal(toPublicHalalRestaurant(restaurant({
    halalEvidence: { ...restaurant().halalEvidence, status: "suspended" }
  })), null);
});

test("sponsorship never changes halal status", () => {
  const sponsored = restaurant({
    commercial: { listingTier: "enhanced", sponsored: true, featuredPriority: 1 },
    halalEvidence: { ...restaurant().halalEvidence, status: "owner-declared" }
  });
  const projected = toPublicHalalRestaurant(sponsored);
  assert.equal(projected?.sponsored, true);
  assert.equal(projected?.halalStatus, "owner-declared");
});
