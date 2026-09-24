# Masjid Bilal

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Calgary community members of all ages, visitors, and regular masjid attendees. Their primary task is identifying the next Adhan or Iqamah within two seconds, including while travelling outside Calgary. Administrators publish the official information separately.

## Product Purpose

Connect the community to official prayer times, announcements, events, learning, giving and approved masjid information. First launch is optional, account-free and understandable within a minute.

## Operating Context

Expo SDK 54 and React Native phone apps, native Apple Watch and WidgetKit extensions, Next.js website and TV display, existing Firebase-backed publication API. The new Wear OS app consumes the same public snapshot. America/Edmonton is authoritative. Apple and Android use their own native conventions.

## Capabilities and Constraints

Central Iqamah.ca import plus published admin overrides resolves official times. Clients consume that schedule and retain dated cache. Adhan transitions to Iqamah until Iqamah starts. Sunrise has no Iqamah. No account or location permission is required for public use. Notifications are opt-in. Wear OS, Zepp and other manufacturers must only be advertised at their verified support level. Native Android home widgets are preserved source, not yet verified shipping capability.

## Brand Commitments

Preserve the approved Masjid Bilal logo, navy, blue, white and restrained gold. Refine the existing product without a redesign. Real native Apple Liquid Glass belongs to supported controls; Android uses native Material conventions. No generated branding, fabricated screenshots, decorative glow or invented religious content.

## Evidence on Hand

Source in app/, src/, targets/, modules/; approved artwork in assets/brand/; shared contracts in ../../packages/shared. User release briefs dated 2026-09-17 supply the product and onboarding decisions. Runtime screenshots and publication status must be recorded separately from source implementation.

## Product Principles

- Prayer correctness before decoration.
- One official timetable across every platform.
- Teach through actual functionality and make onboarding skippable.
- Platform-native interaction with recognizable HBIC identity.
- Report unavailable or expired data honestly.

## Accessibility & Inclusion

Large text, screen-reader labels, sufficient contrast, minimum native touch targets, reduced motion and safe areas are required. Preserve English/Urdu infrastructure; new English copy falls back explicitly until community-reviewed Urdu is provided.
