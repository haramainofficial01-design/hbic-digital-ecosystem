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

This validates reduced scheduled work. Physical-device battery savings are not quantified from simulators.

## Signed release and store acceptance

- Release source: `87edb44eac940ec78bc55b79ba87ab53f8ebe1cd`, pushed to the canonical repository before building.
- iOS: 1.7.2 (25), EAS build `70826d81-0710-48c7-a10d-7ade39b3f06d`, FINISHED. The downloaded IPA independently verifies the phone, Watch, iOS widget and Watch complication bundle identifiers, all with version 1.7.2 and build 25. The Hermes bundle includes the new visibility-aware clock and the existing production Academy, Sunnah.com and Quran maintenance markers; no private-key/Stripe-secret patterns were found.
- The iOS cloud upload `65fa8ede-b75d-4659-a601-02837dae940a` was still queued and was cancelled before directly uploading the same verified IPA through Apple's local uploader using the existing ASC key. The temporary local key copy was removed afterward. Apple reported upload success with no errors, delivery/build ID `e05c85c6-ec6a-4f8f-896b-07e26ed37f0d`; App Store Connect independently reports processing state VALID.
- Existing App Store app 6790937097 now has version 1.7.2 `33a4e14f-00fe-46b4-aecb-f77509cb0d1d`, attached to that exact build. Existing description/support URL/screenshots were inherited; English-Canada notes describe the battery and refresh changes. Review submission `8a175504-3a42-46c6-aa82-e574175df3fd` and the version both report WAITING_FOR_REVIEW.
- Android cloud job `25f3f386-6519-4826-9740-bc3834b6cd92` reserved versionCode 31 but remained queued and was cancelled before it ran. A local EAS production build then reused the existing remote keystore and reserved the next unused code, 32. There is no cloud EAS build ID for this local artifact. Its signed bundle is 1.7.2 (32), package `ca.hbic.calgary.app`; native widget receiver, the new clock marker and existing Academy/Sunnah/maintenance markers are verified from the actual AAB. JAR signature verification passed.
- Google Play's bundle upload returned HTTP 200, versionCode 32 and a SHA-256 matching the exact local artifact. The production track release `Masjid Bilal 1.7.2 (32)` and English-US battery/performance notes were validated and committed with `changesNotSentForReview=false`. A fresh production-track read confirms code 32 and status completed. This confirms accepted upload and review submission, not Google approval/public availability.
- Local artifacts are ignored output files: `output/release-1.7.2/HBIC-1.7.2-25.ipa` and `output/release-1.7.2/HBIC-1.7.2-32.aab`.
- No Academy billing, hosting, Stripe permissions, Wallet configuration, Firebase security, or signing identities were changed for this release. Existing released binaries and rollback artifacts remain intact.
