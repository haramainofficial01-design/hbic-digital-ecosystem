# Masjid Bilal 1.7.2 battery fixes

This release reduces avoidable app work without changing Academy billing or the canonical prayer schedule.

- Watch Home uses minute-aligned updates rather than rebuilding every second. Its countdown is shown in hours/minutes, and display updates stop while inactive or in the dimmed always-on state. Canonical adhan/iqamah boundaries and resume recalculate the displayed prayer.
- Watch refresh reuses a recent usable schedule, limits failed automatic retries, and bounds direct network requests. Manual refresh remains available.
- Phone prayer, Hijri, White Days and onboarding clocks stop while their screen is hidden or the app is inactive; resume refreshes immediately.
- Concurrent foreground content refreshes share one request. Identical content preserves object identity, avoiding unnecessary native snapshot publication and notification reconciliation. Identical cache payloads are not rewritten.
- Android widget updates use cached absolute dates. Concurrent fetches and resize-triggered repeated fetches are deduplicated; no-widget broadcasts do not fetch. Explicit refresh remains available.

Validation on October 7, 2026:

- Mobile TypeScript and lint pass.
- Six timer/onboarding tests pass, including background pause, foreground resume, duplicate foreground events and cleanup.
- Existing native Swift prayer tests pass, including canonical transition, next-day and DST checks; minute alignment is covered.
- Watch native simulator build passes; installed 42 mm and 46 mm runtime screens show the minute countdown and preserved layout.
- Android native widget Kotlin compilation passes.
- Hermes production exports for both iOS and Android pass.
- Existing native target identifiers, Watch embedding and widget extensions verified.

This validates reduced scheduled work. Physical-device battery savings are not quantified from simulators. Store upload/review status will be recorded after the exact release artifacts are processed.
