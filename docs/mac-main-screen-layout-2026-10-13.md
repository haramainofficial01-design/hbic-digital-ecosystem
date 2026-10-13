# Mac main-screen layout follow-up — 13 October 2026

The user's screenshot showed left-bunched prayer selectors, an oversized
phone-style hero stretched across the Mac, and a heading behind the top native
tab strip. These are presentation changes, not prayer-data/time changes.

- The Mac prayer selector uses equal growing buttons across the card, wraps in
  small windows, retains 44-point targets and handles accessibility activation.
- A sufficiently wide Mac prayer card puts the focused prayer beside its two
  times. Smaller cards and larger text stay stacked. The floating decorative
  sun is omitted on Mac so it cannot cross prayer text; it remains on phones.
- All `AppScreen` screens reserve space below the Mac native tab strip, retain
  a bounded 1,120-point content column, and remove phone-style bottom-tab padding.
- Home pairs its photo and prayer card; Prayer pairs its timetable and Jumu'ah
  information; Donate pairs the existing category/amount form and e-transfer.
  Window resizing and larger text restore the original one-column order.
- Detection reuses the existing native Mac host constants. Width alone cannot
  enable Mac styling on iPhone, Android, iPad or Vision. No native dependency,
  timer, new data request, app identity or prayer resolver was introduced.

## Verification and boundaries

The actual PrayerHero, PrayerTimesList, AppScreen, DesktopColumns and
SectionHeader React components were tested headlessly with explicit native-view
adapters at 390/640/900/1280/1792 points in light/dark mode. All ten layouts fit;
six prayer controls remain available, Mac controls reach both edges, headings
clear the tab space, and Maghrib/Now callbacks select the correct state. Adapter
fixes preserve native relative positioning, point-based line heights, borders
and non-interactive decorative layers instead of hiding application failures.

These component-layout screenshots are **not native Mac or App Store
screenshots**. The fixture uses demo prayer data, not a claimed live-time check.
The existing Quran Mac component tests and rating suppression/persistence tests
also pass. Mobile TypeScript and lint pass; iOS and Android Hermes exports pass.

Xcode's existing Designed-for-iPad Apple-silicon Mac destination builds a signed
Release successfully. Deep strict code-sign verification succeeds. The user
requested no foreground switching, so no new interactive Mac launch, click,
audio, VoiceOver or resize sequence is claimed. Prior native-qualification
limitations in `quran-mac-workspace-2026-10-12.md` remain applicable.

No production deployment, OTA publication, store upload/review, build-number
change, signing-account change, Stripe request or notification was performed.
The current local changes must not be described as publicly released.
