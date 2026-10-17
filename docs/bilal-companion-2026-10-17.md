# Bilal Companion

HBIC-owned, no-model public-information assistant for the existing website
and compatible iOS/Android app. The user explicitly declined any AI provider
budget. No external inference, API project, new paid service, model download,
account permission or native dependency is introduced. Normal existing hosting
and app-build usage still applies; this is not a promise of unlimited free
infrastructure.

## Product and information boundaries

- Deliberately opened **Ask Bilal** launcher in HBIC navy, teal and gold.
  Bounded conversation panel, source chips, clear/dismiss controls and restrained
  motion respecting Reduced Motion. Never opens automatically.
- This is an English-topic published-information lookup, not an independently
  trained conversational model. It can answer supported questions about the
  masjid, prayer times, Academy, donations, Quran tools, app settings, events,
  programs and contact routes. Unknown questions receive an explicit handoff.
  Urdu, Dari and Arabic interface labels are supplied; answers quote published
  English information and the app explicitly says so. No universal natural-
  language understanding, translation certification or "all questions" claim.
- Current public CMS fields are explicitly allowlisted. Expired, hidden,
  future and non-All announcements and past events are not exposed. Private
  account, student, attendance, receipt, payment and administrator records are
  not queried. The only additional lookup is the existing public Academy
  billing GET, cached briefly, never a customer or administrative endpoint.
- Today's prayer timetable uses the existing canonical snapshot and requires
  the current Calgary date, available and non-stale schedule. Adhan and iqamah
  are distinguished, including a pending iqamah. A different day is never
  inferred from today's times. Missing fee evidence does not default to an old
  poster amount. Tuition and donations remain separate.
- No enrollment, payment, notification send, religious ruling or political
  endorsement action exists. Recite Assist remains the existing unqualified
  preview; the assistant does not claim 99% accuracy.
- Chat stays out of Quran, Academy, payment/check-in and TV displays. Native
  notifications/backgrounding/route changes close it and abort pending work;
  an active chat defers the existing voluntary rating invitation.

## Privacy and controls

The public POST accepts a bounded question and at most four previous user
questions, not arbitrary system messages or tools. It returns only server-
authored published facts and canonical public hbic.ca source links. Text is
rendered as plain text; untrusted HTML and external/private links cannot execute.
Requests have size/time/rate bounds and private no-store responses. A bounded
per-instance limiter uses a salted address hash, without a persistent profile.
No chat database, analytics event or application-log text is written. In-memory
history clears on Clear chat, reload or app restart. The public privacy policy
documents server processing and ordinary hosting/security connection handling.

**Admin → Public feature controls → Bilal Companion** controls
`featureFlags.bilalCompanionEnabled` after the normal content publication.
The server checks this switch on every question; no provider key is required.

## Verification

`npm run test:companion` covers request limits, supported matching/follow-ups,
unknown handoffs, public-only sources, private/religious boundaries, canonical
prayer/fee evidence, gating/expiry, remote disable, errors/rate limits, website
focus trapping/restoration and small/large light/dark layouts, native lifecycle,
source navigation and memory-only reset. Browser tests use the actual website
component. Native component tests use explicit adapters and are **not** physical
device or native Mac interaction evidence. No fixture is a store screenshot.

Typechecks, lint, public/admin builds and prayer/privacy/rating regression
checks are required before release. Native Hermes exports, signed artifacts
and final-build Android UI checks are recorded separately. No new microphone,
recitation-model or thermal qualification is implied by this feature.

## Delivery

Website and admin use the existing Vercel projects and production configuration,
with tested staged production deployments before alias promotion. Native
version 1.7.8 requires the existing App Store/Google Play build/review flow;
this project has no configured Expo OTA delivery. Git push, website deployment,
store upload, review submission and public approval are distinct milestones.
Exact completed delivery states are recorded after verification, not inferred
from a successful source build.
