# Masjid Bilal 1.7.5

Release source includes `8c8940e`, `fdd2e97`, and `d169b47`.
See `quran-performance-review-2026-10-11.md` for the completed regression,
typecheck, local production build, and native simulator/emulator evidence.

## What's new

- A clearer Quran workspace for reading, listening, practice, and your library.
- More efficient streamed recitation playback and reader updates.
- Private on-device recordings: keep selected recordings or use session-only mode.
- Hide verses, reveal hints, and review possible word mistakes in practice.
- Improved recording, audio interruption, and background safety.
- Optional community challenges with nicknames and active practice-time rankings.
  HBIC staff must publish event rules and any prize details first.
- A cleaner admin workspace and responsive website Quran reader.
- The phone website's prayer panel minimizes when scrolling.

Recite Assist remains an optional early preview. It can make mistakes and does
not certify Tajweed or replace a teacher. Recordings and personal word reviews
stay on the device; there is no recording upload. Public challenge participation
requires separate adult opt-in, a verified account, and a nickname. No event or
prize is automatically published by this release.

Physical-device temperature/battery improvement has not been measured. The
verified performance evidence is reduced reader re-rendering and native runtime
tests, not a quantified battery-life claim.

The existing app identifiers, signing credentials, Watch/widgets, Academy billing,
Stripe, donation fund categorization, prayer source and manual overrides remain.
Store build numbers are allocated remotely, above iOS 33 and Android 37. A store
upload is not equivalent to a completed review or public availability.

## Production rollout — October 11, 2026

- Public production: `dpl_HJupwAKw4k8uJimh7fSAJjqijsbg`, source `fdde430`.
  Existing `hbic.ca` and custom aliases preserved. Build command confirmed
  `npm run build:web`.
- Admin production: `dpl_HvLmKuiZo688Zf7DjDMnNvNmU9UE`, source `3c583d8`.
  Existing `hbic-calgary-admin.vercel.app` preserved. Build command confirmed
  `npm run build:admin`; the admin source is unchanged by later disclosure edits.
- Fresh no-cache HTTP checks passed for the homepage, Quran, Academy, prayer
  times, display, `/api/display`, Quran chapters, challenges, privacy and admin.
  The challenge API correctly returns no event until staff publishes one.
- iOS 1.7.5 build 34: EAS `ec588c3d-84d3-4b3b-80e0-de650df2581c`.
  All four phone, widget, Watch and Watch-widget target identities/versions,
  purpose strings, signing and latest bundled feature markers verified.
  Apple upload `8d88bb05-fc91-43fb-9309-f7f00be573b1` finished; App Store
  Connect processed build `ccdbbbf8-0990-4040-a3fe-b4ac2ecd91aa` as `VALID`.
- iOS review submission `8e9dfbab-48b8-464c-b369-1ca0ea4dc54c` is
  `WAITING_FOR_REVIEW`. Apple accepted the existing 1.7.5 build 34 for review;
  version `9a967fda-66c7-40be-9c85-a5873156a720` also reports
  `WAITING_FOR_REVIEW`. Release is automatic after approval, not yet public.
- The authenticated Apple privacy page now publishes ten applicable data types
  for App Functionality, linked to identity and not used for tracking: name,
  email, phone, payment information, other user content, user and device IDs,
  purchase history, product interaction and other data. Publication was checked
  after a full page reload; no unfinished data-type setup remained. Audio and
  precise location are not transmitted. The existing canonical privacy link
  remains `https://hbic.ca/privacy`.
- 32 Apple asset placements prepared: eight medium iPhone, five large iPhone,
  five iPad, three Watch, nine Duo (including open/partial positions), header
  and search creative assets. Three new native Release captures were inspected
  after a passing XCTest run; no blank Mushaf or error-banner capture uploaded.
- Android build 38 was superseded before any Play upload. Google reported an
  unused media foreground-service permission inherited from the audio library.
  `ceef024` removes only those unused permissions, preserving microphone
  permission and all existing foreground audio/recording behavior. Five focused
  release regression tests and mobile typecheck passed; Expo introspection
  confirms manifest-merge removal directives.
- Replacement Android 1.7.5 versionCode 39: EAS
  `02d9b149-f701-414e-85c1-74a78dd6966f`, source `ceef024`.
  Build finished. The actual signed AAB has 88.4% R8-renamed classes and
  verified 16 KB alignment for all 42 arm64/x86_64 libraries. Its merged
  manifest has no unused foreground-service permission and still has
  `RECORD_AUDIO`. Latest feature markers and absence of private credentials
  verified in the actual JS bundle, not only source. SHA-256:
  `c658e916519c6a2073882d4c5e2dc157767251420c55e5d6055059c2e23d538e`.
  Google Play accepted versionCode 39 with the exact artifact checksum. The
  existing production track now specifies 39 as a completed full rollout.
  Google completed review and the October 11 publishing overview now reports
  “App update published. Users should see changes immediately, but this may
  take longer.” The production track was rechecked as completed versionCode
  39. All six phone screenshots still match the actual captured file checksums.
  Managed publishing is off; the Android update is published, subject to
  Google Play propagation to individual users.
- Google data safety has been corrected and saved, covering optional account,
  Academy/payment, challenge and notification data. Privacy and deletion-request
  URLs use the live `hbic.ca` policy. These listing changes are included in the
  accepted Google submission. Local microphone audio is not transmitted. No
  tracking/ads added.

No Live Stripe test charge, false cash receipt, new signing credential, domain
change, or fabricated leaderboard/prize was performed during this rollout.
