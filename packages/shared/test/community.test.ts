import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultContent,
  getCurrentDailyBenefit,
  getPublicEvents,
  getPublicVolunteerOpportunities,
  toPublicContent,
  validateAskMasjidSubmission
} from "../src/index";

test("private question validation rejects spam and accepts a routed community question", () => {
  const categories = ["General", "Programs"];
  const valid = validateAskMasjidSubmission({
    name: "Community Member",
    email: "PERSON@EXAMPLE.COM",
    category: "General",
    question: "Could someone please contact me about a current program?",
    consent: true,
    startedAt: Date.now() - 3_000
  }, categories);
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.value?.email, "person@example.com");

  const spam = validateAskMasjidSubmission({
    email: "person@example.com",
    category: "General",
    question: "This would otherwise be long enough.",
    consent: true,
    websiteField: "bot.example"
  }, categories);
  assert.ok(spam.errors.length > 0);
});

test("daily benefit requires a visible published item within its publication window", () => {
  const now = new Date("2026-07-28T12:00:00.000Z");
  assert.equal(getCurrentDailyBenefit([
    {
      id: "draft",
      kind: "imam-message",
      title: "Draft",
      body: "Private",
      source: "Internal",
      reviewer: "Reviewer",
      publishFrom: "2026-07-01T00:00:00.000Z",
      status: "draft",
      visible: true,
      updatedAt: "2026-07-01T00:00:00.000Z"
    },
    {
      id: "published",
      kind: "dua",
      title: "Published",
      body: "Approved",
      source: "Approved source",
      reviewer: "Reviewer",
      publishFrom: "2026-07-28T00:00:00.000Z",
      publishUntil: "2026-07-29T00:00:00.000Z",
      status: "published",
      visible: true,
      updatedAt: "2026-07-28T00:00:00.000Z"
    }
  ], now)?.id, "published");
});

test("expired or closed volunteer calls do not remain public", () => {
  const result = getPublicVolunteerOpportunities([
    {
      id: "expired",
      title: "Expired",
      description: "Old",
      date: "2026-07-01",
      contactEmail: "office@example.com",
      audience: "All"
    },
    {
      id: "closed",
      title: "Closed",
      description: "Closed",
      date: "2026-08-01",
      contactEmail: "office@example.com",
      audience: "All",
      status: "closed"
    },
    {
      id: "open",
      title: "Open",
      description: "Current",
      date: "2026-08-01",
      contactEmail: "office@example.com",
      audience: "All",
      status: "open",
      visible: true
    }
  ], "2026-07-28");
  assert.deepEqual(result.map((item) => item.id), ["open"]);
});

test("History of Fiqh is retained privately but excluded from current projections", () => {
  const event = getPublicEvents(defaultContent).find((item) => item.id === "event-history-of-fiqh");

  assert.equal(event, undefined);
  const retained=defaultContent.events.find(item=>item.id==="event-history-of-fiqh")!;
  assert.equal(retained.title,"History of Fiqh");
  assert.equal(retained.archived,true);
  assert.equal(retained.notificationEnabled,false);
});

test("public content projection strips private drafts and internal routing details", () => {
  const projected = toPublicContent({
    ...defaultContent,
    prayerTime: { ...defaultContent.prayerTime, source: "private-provider", sourceUrl: "https://private.example" },
    iqamahTime: {
      ...defaultContent.iqamahTime,
      source: "private-provider",
      sourceUrl: "https://private.example",
      updatedBy: "private-admin",
      adjustmentNotes: "private-note"
    },
    askMasjidSettings: {
      ...defaultContent.askMasjidSettings,
      routingEmail: "private-routing@example.com",
      responseOwner: "Private Owner"
    },
    events: [
      ...defaultContent.events,
      {
        ...defaultContent.events[0],
        id: "event-private-draft",
        title: "Private draft event",
        status: "draft" as const,
        visible: true
      }
    ],
    newMuslimResources: [{
      id: "draft-resource",
      category: "visiting",
      title: "Draft",
      summary: "Private",
      status: "draft",
      visible: true,
      sortOrder: 0,
      updatedAt: "2026-07-28T00:00:00.000Z"
    }]
  }, new Date("2026-07-28T12:00:00.000Z"));

  const serialized = JSON.stringify(projected);
  for (const privateValue of [
    "private-provider",
    "private.example",
    "private-admin",
    "private-note",
    "private-routing@example.com",
    "Private Owner",
    "draft-resource",
    "event-private-draft"
  ]) {
    assert.equal(serialized.includes(privateValue), false, privateValue);
  }
});
