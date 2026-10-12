# Masjid Bilal 1.7.6

## Changes

- Parent Academy Calendar is prominent in the website/app account, with an app
  shortcut, a month grid, tappable class dates, month navigation and staff notes.
- Special Thursdays, explicit closures, changed times and the Ramadan/Eid break
  have clear text labels. Schedule and tuition rules are unchanged.
- Recitation playback offers continuous looping, replay and pitch-preserving
  playback speeds from 0.5× to 2× for reference recordings and personal review.
- Desktop-aware Quran navigation and controls preserve the existing compatible
  Apple-silicon app identity. Native Mac interactive qualification is still
  separate from headless component tests and signed build verification.

## Store release notes

An easier-to-find Quran Academy calendar with a clear month view and tappable
class dates. Loop recitations, replay the current recording and adjust playback
speed from 0.5× to 2×. Refined Quran navigation for larger screens. Existing
prayer times, Academy tuition, categorized donations and private recordings
remain unchanged.

Recite Assist remains an optional early preview and can misidentify words. It
does not certify Tajweed or replace a teacher. No claim of measured battery-life
or recognition-accuracy improvements is made. Personal recordings are not
uploaded by HBIC.

## Delivery

Use existing Vercel projects, Expo project, app identifiers, signing credentials,
Watch/widgets and store records. Version/build numbers must not be reused.
Website deployment, artifact validation, binary upload, review submission and
store approval are separate confirmations. Append actual rollout evidence after
the corresponding operation succeeds; do not treat this document as confirmation.

## Rollout evidence — October 12, 2026

- Public production `dpl_Ahs3yuKjPNEAYZHZJArbaiyCdk2R` is READY and aliased to
  `https://hbic.ca`. Vercel confirms source
  `4b66ef903a486d9aed7d19858a3f86b60d5251c5`, containing both calendar and audio
  changes. Existing domains and projects are unchanged.
- Fresh HTTP checks passed for home, Quran, Academy, donations and display API.
  Production Academy JS contains the month-grid controls. Headless real-reciter
  playback at the live Quran page confirms loop property, 0.75× and 1.5× rates,
  preserved pitch, pause/replay/stop, no phone overflow and no page errors.
- iOS/Watch build 35: EAS `86287949-b99b-4c69-8b9c-83032c222990`.
- Android build 40: EAS `7810be14-dd84-4ac7-bc4b-480f66165756`.
  Both builds use `e155c08cfa05483023cb90601b3acf21d515525f`, existing credentials
  and production configuration. Build/upload/review completion must be recorded
  separately once confirmed.
- Apple version `94c6a880-fa90-4ca5-8ff8-1de57a9d98ca` is prepared as 1.7.6,
  with release-after-approval, updated notes and 32 retained verified asset
  placements. The preceding 1.7.5 release is READY_FOR_SALE.
- Signed iOS artifact SHA-256:
  `241f73ab68c0c53b2c4c41abb4b0eddb461d12ebc96455cc543b02d5d738d057`.
  All four bundle IDs have 1.7.6/build 35. Deep strict signature, purpose strings,
  own-app keychain group, Watch Quran executable and latest audio/calendar JS
  markers passed. No private credential was found in the bundled JS.
- Apple upload `50906745-044a-468f-b180-b0b74f3dd5e1` completed. Apple processed
  build `927d8733-ad9f-45f2-ade8-3c63917d84ba` as VALID. Review submission
  `90d484bf-74f5-4a36-af37-d4f761da9cf9` and the 1.7.6 version both report
  WAITING_FOR_REVIEW. This is a completed review submission, not public approval.
- Additional headless mini-player component checks passed at widths 320, 390 and
  768, with normal and 1.5× text scale, loop actions, bounded speed controls,
  replay and no horizontal overflow. These use explicit native-view adapters;
  they do not claim new physical-device or native Mac interactive qualification.
- Android build 40 finished. Signed artifact SHA-256:
  `477f1f7e586275a63bc610a204ee4afca2747b84395cff8519d8ec458ae1d651`.
  Package/version, latest JS controls, camera/microphone-related permission
  preservation, absence of unused foreground-service permission and no bundled
  private credentials passed. R8-renamed classes remain 88.4%; all 42 checked
  arm64/x86_64 libraries meet 16 KB alignment. JAR signature verification passed.
- Google Play accepted versionCode 40 with the exact verified checksum. The
  production edit was committed with `changesNotSentForReview=false`; the
  production track confirms `Masjid Bilal 1.7.6 (40)`, versionCode 40, status
  completed (full intended rollout). Six existing verified phone screenshots were
  retained. The update was sent for review; track status alone is **not** proof
  that Google review and public propagation have finished.

The website is live; both app-store submissions are complete. Apple/Google
review approval and public availability remain controlled by those providers.
