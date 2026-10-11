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
- iOS review draft `8e9dfbab-48b8-464c-b369-1ca0ea4dc54c` is
  `READY_FOR_REVIEW`, not yet submitted. The expired Apple browser session
  prevents correcting the old “Data Not Collected” label; a signed-in owner
  session is required before submission. API signing/upload access works.
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
  Publishing overview confirms “Changes in review” with production 1.7.5 (39),
  six actual phone screenshots, updated privacy URL and data safety together.
  Google quick checks are running and will automatically forward the submission
  when successful. Managed publishing is off. This is submission acceptance,
  not a claim that Google review has finished or users already have the update.
- Google data safety has been corrected and saved, covering optional account,
  Academy/payment, challenge and notification data. Privacy and deletion-request
  URLs use the live `hbic.ca` policy. These listing changes are included in the
  accepted Google submission. Local microphone audio is not transmitted. No
  tracking/ads added.

No Live Stripe test charge, false cash receipt, new signing credential, domain
change, or fabricated leaderboard/prize was performed during this rollout.
