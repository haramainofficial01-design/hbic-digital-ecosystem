# Masjid Bilal one-time rating campaign

## Implemented scope

- Existing and new installations are eligible after completed onboarding, a
  loaded home layout/image, fresh published configuration and 15 seconds of idle
  foreground home time. No new-install-only condition exists.
- Android uses the requested HBIC navy/teal/gold invitation and exact English
  title, message, Rate Our App ⭐ and Not Now copy. Urdu, Dari and Arabic are
  supported through the existing interface dictionary. Back and outside dismissal
  are also safe. Small screens and enlarged text use a scrollable presentation.
- iOS automatically requests Apple's native StoreKit review interface at the
  same safe moment. Apple disallows custom review prompts, so the custom Android
  invitation is deliberately never presented on iOS. No new native package is
  added: StoreKit is exposed by the existing MasjidAppleBridge module.
- Both More and Settings always offer **Rate Our App**, independently of remote
  campaign activation. These voluntary buttons use direct official store links.
- No five-star request, review incentive, sentiment gate, login requirement,
  campaign analytics or claim that a review was actually submitted is added.

## Store identities verified October 13, 2026

- Apple's official Canadian lookup response for `6790937097` identifies
  **Masjid Bilal**, bundle `ca.hbic.calgary.app`, currently version **1.7.6**.
  The existing EAS `submit.store.ios.ascAppId` is also `6790937097`.
- Google's official listing URL responds successfully and identifies Masjid
  Bilal and `ca.hbic.calgary.app`.
- iOS voluntary review URL:
  `https://apps.apple.com/app/masjid-bilal/id6790937097?action=write-review`.
- Android native review-section URL:
  `market://details?id=ca.hbic.calgary.app&showAllReviews=true`.
  HTTPS fallback:
  `https://play.google.com/store/apps/details?id=ca.hbic.calgary.app&showAllReviews=true`.

Android opens the listing's reviews section; Google has no equivalent guaranteed
direct write-review composer. Apple decides whether an automatic native request
actually displays. Production quotas, user settings and TestFlight suppression
mean requesting is not confirmation of display, rating or review submission.

## Remote control and persistence

Admin **Settings → App rating campaign** edits the existing CMS field:

```json
{"settings":{"ratingCampaign":{"id":"hbic-rating-2026-10","enabled":false}}}
```

Use the existing authenticated save/publish workflow. Keep the ID unchanged when
pausing/resuming the same campaign; use a new deliberate ID only for a new
campaign. IDs permit lowercase letters, digits, underscores and hyphens, at most
64 characters. Old/malformed content defaults to **disabled**.

Rating-only activation, pausing and campaign-ID changes publish **without a
device refresh push**. The authenticated publishing endpoint supports the
explicit `signalDevices: false` choice; its default remains the existing device
signal for ordinary content/prayer changes. Admin compares public projections
to avoid treating private-field redaction or refresh bookkeeping as a content
change. Incomplete ID edits remain visible and cannot be saved or published.

Only fresh API content can activate the campaign. Offline/cache fallback fails
closed. The normal existing app refresh (foreground/pull-to-refresh and five
minutes while active) receives changes; this is not instantaneous offline remote
control. A received disable immediately removes any open custom invitation.

Each installation keeps `hbic-rating-campaigns.json` in its private document
directory. Claims are serialized and written before requesting/presenting, so
restart, remount, repeated flags and simultaneous requests cannot repeat a
campaign. Not Now, Back and store visits count as attempted, not reviewed.
Storage errors/corruption suppress the invitation instead of nagging. A route or
notification interruption during persistence rolls back an unshown claim. A
native refusal before requesting is released for a later opening, with no
repeated native requests during the same opening. A voluntary permanent store
visit also satisfies the current campaign.

## Important-action safety

- Only the focused foreground home screen can present/request; Quran reading,
  recording, listening and Academy/check-in routes cannot trigger it.
- Existing Quran playback pauses on leaving its screen; that behavior is
  unchanged. No Quran, Academy, tuition, donation, prayer scheduling or push-send
  functionality is rewritten. The only publication addition is the optional
  no-push choice described above.
- Home touches/scrolling reset the idle delay. Native transitions must finish.
- Launch notification routing finishes first. Any received/tapped notification
  defers a pending campaign for two minutes and dismisses an open invitation.
- The canonical prayer snapshot suppresses the campaign from two minutes before
  through ten minutes after adhan, iqamah and Jumuah. Missing schedules and urgent
  visible announcements suppress it too. No new per-second work is added.
- Backgrounding/onboarding cancels presentation and preserves ordinary app use.

## Validation

Reproducible focused suite: `npm run test:rating` (real React effects with explicit
native-event/storage adapters; no simulated claim of store delivery).
Onboarding, language and private-notification regression tests are also run.
Final qualification on October 13, 2026:

- 26 campaign checks pass, including real React lifecycle/actions, local
  persistence, small/enlarged-text/dark layouts, real admin control interactions,
  authenticated silent publication and unchanged default device propagation.
- Eight existing onboarding, four-language and private-notification-route
  regressions pass. Total: **34 automated checks**, no failures.
- Mobile/shared/public/admin typechecks and mobile lint pass. Both Next.js builds
  pass with existing unrelated warnings. Both production Hermes exports pass.
- Native iOS simulator and Android debug builds pass. Native iOS XCTest passes
  one runtime scenario with zero failures: remote off/on, completed onboarding,
  loaded home/native request path, no custom iOS invitation, persistent one-time
  claims after restart, and permanent More/Settings actions. Final result:
  `/tmp/hbic-rating-ios-final.xcresult`.
- Real Android emulator checks pass: remote disabled, exact branded invitation,
  Not Now/restart persistence, and foreground store/browser handoff. This emulator
  lacks Play Store and opens the official HTTPS fallback through Chrome, whose
  first-run setup is provider-owned. It is not a claim that a review was posted.
  The real native invitation was visually inspected at 320 × 640; both actions
  are clear and reachable. Capture: `/tmp/hbic-rating-android-invitation.png`.

Native Android testing caught and fixed an unbound `Linking.openURL` invocation;
both permanent and campaign actions now preserve React Native's method binding.
The rendering adapter reproduces that requirement to prevent regression. Native
QA also identified the fetch cache-buster query; the private fixture correctly
routes by pathname instead of requiring an exact query-free URL.

Native QA uses only a loopback fixture at port 9221, which rejects push,
registration, payments and other production writes. Its campaign IDs start
`qa-`. No fixture, simulator app or QA campaign is deployed. The standalone
XCTest runner ad-hoc signs only a simulator artifact; it never touches release
credentials, identifiers or artifacts. A known Expo debug banner caused by that
artifact's missing distribution keychain identity is dismissed only in QA.

## Release readiness / approval gate

**Not OTA-deliverable to the existing installed binary.** `expo-updates` is not
installed, `app.json` has no updates URL/runtimeVersion, EAS profiles have no
update channel, and the generated Expo.plist has `EXUpdatesEnabled=false`.
The iOS StoreKit bridge also requires a new binary. Do not publish an EAS Update
that existing installations cannot receive. No OTA architecture or release
configuration has been changed merely to add this campaign.

Required approval: **build, qualify and submit the scoped iOS/Watch + Android
store update, and roll out the admin/API campaign control through existing projects**.
Prepare version 1.7.7 using fresh build numbers from existing remote versioning;
do not reuse the already uploaded 1.7.6 iOS 36 / Android 41 (or any later used
number). Enable `hbic-rating-2026-10` only after the qualified update is
available. Then existing installations that receive it are eligible on their next
safe home opening, even though onboarding was completed before this campaign.

Current feature branch also contains unrelated, unqualified recognition work in
`5188592`/`d82d621`. Prepare the store release by applying only the completed
rating-campaign commit(s) onto the verified release baseline `4798f76` (or a newer
confirmed released descendant). Do not submit the entire development branch as
an implicitly verified recognition upgrade. Re-run the focused checks on that
scoped release branch and signed artifacts before submission.

No production campaign is activated, OTA published, mass push sent, store build
uploaded or review submitted by this task. Preparation is not public release.

Release notes: "A new, optional way to support Masjid Bilal with an app review.
Find Rate Our App in More or Settings, with a one-time invitation at a quiet
moment after opening the app."

## Provider references

- [Apple review-prompt policy](https://developer.apple.com/app-store/review/guidelines/#app-store-reviews)
- [Expo's documented direct review links and native prompting limits](https://docs.expo.dev/versions/latest/sdk/storereview/)
- [EAS Update native prerequisites](https://docs.expo.dev/eas-update/getting-started/)
- [Official Apple lookup](https://itunes.apple.com/lookup?id=6790937097&country=ca)
- [Official Google Play listing](https://play.google.com/store/apps/details?id=ca.hbic.calgary.app)
