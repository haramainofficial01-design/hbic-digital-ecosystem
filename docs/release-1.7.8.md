# Masjid Bilal 1.7.8 — Bilal

## Current requested expansion

The user subsequently requested richer finite motion, a unique Bilal mark,
Apple Watch availability and broader shared-surface/battery refinement. This
new work supersedes the iOS 45 / Android 47 release candidates described below;
they were not submitted for review. See
[current refinement and qualification](bilal-motion-watch-2026-10-18.md).

## Latest revision: localized introduction and tour

Website source `529b4383041a3643458fe3c408de2ed2e00286fe` and final native source
`209d2277a9246f60897976f12775383fd5bbcb8b` are committed and pushed. The later
native commits do not change the website/admin bundle.
Public deployment `dpl_2aRs8PSo96ToBZmgwRbZJPmfEvRa` and admin deployment
`dpl_6VE3jyDdB55LzCB5LneBzpTyHRxL` were verified READY, then promoted.
Alias API checks independently confirm `hbic.ca`, `www.hbic.ca` and the existing
admin domain point to those exact deployments. Public automatic Git metadata
matches the source; admin was built from that commit's archive with only its
staging hosting configuration changed. Both correct workspace build targets
were confirmed. Final-domain checks passed at `2026-10-18T01:51:57.410Z`, including
actual tour/once-only persistence, four-language interface, canonical live
prayer/tuition evidence, secure handoffs and the published admin control bundle.
The same final-domain checks passed again at `2026-10-18T13:08:45.890Z`, against
the current-day canonical schedule and content version 20.

Superseded replacement builds, source-identical to the website feature commit:

- Android **1.7.8 (44)**: `1a324849-047c-49ad-bb29-aa896ba7aaf8`.
- iOS/Watch **1.7.8 (39)**: `b72391a9-1e8e-4bc1-af42-081cc45d4536`.

Both packages passed signature/identity/content checks. Initial Android UI
automation did not find the launcher; those runs did not establish a reliable
product root cause. The launcher intentionally disappears when the automatic
tour opens, and the old harness could race that transition. These packages
were held, not release-qualified. iOS 39 was uploaded but not submitted to App
Review; Android 44 was not uploaded. Build creation/upload is not review
submission or public approval.

The first native-layer revision (`056d0e6`) produced Android 45. Its actual tour
displayed and completed, but the old restart check did not find the launcher.
That bundle is also held and was not sent to Google. The next revision
(`f9bfa1f`) hosts only the focused-screen launcher inside `AppScreen`, removing
the earlier FullWindowOverlay approach. One root provider retains the chat,
persistence, privacy and notification/route guards. Diagnostic-only packages
helped separate fresh-content/automatic-tour timing from real failures; they
were never counted as final-artifact validation or uploaded to stores.

The unchanged Android 46 AAB-derived QA package then passed all 11 native flow
checks: first Home tour, completion, restart/no repeat, actual soft keyboard,
canonical current prayers, clear chat, private-payment handoff, dark mode,
Quran exclusion, Arabic/RTL tour and the new-install introduction. Its release
AAB SHA-256 was
`12c92e2137116285ccd8e09ba5f40d10861871ddb148f6b07e0c903d1873a2c1`.
Visual review nevertheless caught the keyboard pushing the header under the
Android status bar. Source `209d227` reserves the top safe area even when the
keyboard shrinks the panel. A regression covers both platform adapters, and a
separate native diagnostic confirmed the header at y=135 below the 63-pixel
status bar and the input ending at y=1297 above the y=1517 keyboard boundary.
These diagnostic measurements are not final package qualification. Android
46 and iOS 44 are superseded, not submitted for review.

Expo's free iOS cloud allowance is exhausted until November 1. No plan upgrade
or extra charge was authorized. A local build alternative uses existing Xcode
27.1, existing production profiles and existing distribution identity. A local
same-name certificate conflict was isolated: the profiles include fingerprint
`EE937C9DDDAB3186A5A766585884CB1920ACE2A7`, while the login keychain also has an
older certificate with the same common name. Archive selection and IPA export
must both pin the matching existing identity. No certificate/profile was
regenerated or revoked; temporary local signing keychains were cleaned by EAS.
No failed local package is release-qualified. The isolated local export tool
also pins that exact fingerprint for export, not just archive signing; it is
not a repository/global tool or an account credential change. The successful
superseded iOS 44 package passed deep signatures and all four target checks,
was uploaded and processed VALID, but was held before App Review for the final
safe-area fix. The corrected replacements are iOS 45 (local) and Android 47.

## Final package checks and submission

Both final builds use source `209d2277a9246f60897976f12775383fd5bbcb8b`.

- iOS **1.7.8 (45)**: locally built with the existing production identity;
  deep strict signatures, all four Apple target versions/identifiers, Watch
  Quran code, Mac true-size support, privacy purpose strings and own-app
  keychain entitlement pass. No private credential, external AI endpoint or
  research-only model is present in the JavaScript runtime. SHA-256:
  `86604fb396460ab4651cf4dfd5d087ee327193052e44eab25f3ca5aa36fca7fd`.
  EAS upload submission: `17c96dd1-a4c2-479e-a66f-95d694ef2871`.
- Android **1.7.8 (47)**: EAS build
  `706f4773-2d1d-4f88-ad56-c116db4656ad`. Signature, package/version/source,
  42 native libraries' 16-KB alignment and R8 optimization checks passed.
  Neither release runtime contains the temporary diagnostic logging markers.
  AAB SHA-256:
  `0e301723df089b338c23cf751ee5057cf5d8b73250e5b366898d7219660cddb8`.
  Its exact AAB-derived universal QA APK (debug-signed only for the disposable
  emulator) has SHA-256
  `9286be51a72eaf3eef7b87bf3813573aed9c232347ecb790cdb26a32ca811279`.

The final Android native flow suite passed **12/12** checks at
`2026-10-18T13:42:15.852Z`, including the additional header safe-area assertion.
The real keyboard geometry matched the earlier diagnostic: header y=135 is
below the 63-pixel status bar, input ends at y=1297 above keyboard y=1517.
Light/dark, Arabic/RTL and new-install screenshots were visually inspected.
Host microphone remained disabled and no audio was recorded.

Earlier final-build attempts are retained in the private ignored reports:
the first stopped at Home entry; the second passed 11 checks before failing
to find the launcher after completing onboarding. Neither is silently counted
as a pass. A cold restart recovered the actual tour, and subsequent diagnostic
runs showed the expected focused/eligible/loaded state. The final harness
force-stops before clearing only the disposable app, launches a clean activity
task, allows the onboarding transition to settle and then checks actual UI
controls. The release package was restored and its installed hash checked;
the successful flow report is not a patched diagnostic APK. This narrows the
observations but does not claim a proven universal explanation for every
earlier emulator observation.

Apple processed build 45 as **VALID**, build ID
`9ea91add-4317-4982-a571-ec2712daabe5`. Store review submission states are recorded
below only after independently confirmed. Compilation/signatures and
adapter checks do not establish physical-device, Mac-runtime or voice-accuracy
qualification. Diagnostic-only APKs are excluded from release evidence.

## Feature and regression scope

The assistant is named **Bilal**, with a persistent one-time Home tour for
existing installations and an integrated new-user introduction. English,
Urdu, Dari and Arabic interface/tour copy, RTL layout, authored core replies,
source-language fallback, replay, keyboard viewport handling and restrained
glass transitions are included. Native notifications, foreground/route changes,
onboarding, current prayer quiet windows and important-screen exclusions defer
or close it. The pending tour takes priority over the rating invitation.

Latest checks: **26/26** companion/tour checks; **27/27** rating, **24/24** prayer,
**4/4** onboarding, **2/2** privacy regressions. Workspace typechecks and public/
admin production builds pass. Native UI-adapter checks cover both platforms,
Mac-sized layout, all four languages and enlarged text, but are not physical
device proof. Final signed replacement artifacts and store states are recorded
only after verification, separately from these software checks.

The initial iOS 38 review was withdrawn solely to include the user's requested
rename/tour changes. App Store Connect now reports **DEVELOPER_REJECTED**, not
an Apple rejection of this feature. Initial iOS **38** and Android **43** are
superseded and must not be submitted as this final tour revision. No OTA is
configured. Replacement production builds are required. No new paid service,
provider permission, private-record mutation or mass notification is involved.

The initial website revision was subsequently hardened with the cancellation
handoff at `94c293da7bcf9081fa28d0871c1f864d5263da00`, production deployment
`dpl_3gMLqUxdLRL5Puw784uoWA6vbpJF`. The following records describe the initial
feature release preparation, before the replacement tour revision.

## Historical initial preparation (superseded native UI)

## Scope and cost boundary

The requested HBIC-owned information assistant uses no external AI inference,
provider account, API key, model download, additional native dependency or new
paid service. Existing hosting/build traffic still uses HBIC's existing services.
This is supported-topic public-information matching, **not** a trained general-
purpose chatbot or a promise to answer every possible question. English source
answers, source links and explicit unknown/private/religious handoffs preserve
that distinction. Urdu/Dari/Arabic interface labels state the source-language
limitation. See [feature boundaries](bilal-companion-2026-10-17.md).

## Verification

- Companion software and actual website-component checks: **15/15**.
- Rating integration/regression checks, including deferring both platforms'
  rating campaigns during chat: **27/27**.
- Canonical prayer regression checks: **24/24**; existing privacy checks: **2/2**.
- All workspace typechecks and lint pass. Existing unrelated web lint/CSS and
  dependency-export warnings remain; no new assistant lint warning remains.
- Public/admin production builds, iOS/Android Hermes exports and four Apple
  target/identifier checks pass. No claim of new native Mac, physical iPhone,
  thermal, real-voice or recitation-accuracy qualification is made.
- Live staged and final-domain checks independently match every adhan/iqamah
  to the canonical prayer snapshot, current tuition to the public billing API,
  private/unknown/date handoffs, external-AI-off status, real deployed mobile/
  desktop light/dark chat flows, route exclusions and the admin-control bundle.
  A staged check caught “my Academy payment” receiving generic tuition text;
  its explicit secure-support handoff was fixed and verified before promotion.

## Source and live website

- Main feature source: `d5b1156c937d385f3586ef97b3f9453951bea5f6`.
- Additional server-side date guard: `03a818b34c3f663cb64f11404db93877e8b34e6a`.
- Additional server-side personal-payment guard and final website source:
  `8785b4ed948b9031342cfb1dc4112d1407ef2f4a`.
- Public production: `dpl_GQzqrbjUzHo8ea9PKwW4FbB1Y85B`, confirmed READY and
  assigned to `hbic.ca`; Vercel's automatic `githubCommitSha` matches the final
  website source. Its secondary hand-entered `hbicCommitSha` label was mistyped
  `971-check`; that label is not used as source evidence. The immutable
  automatic Git metadata and deployed functional checks identify the source.
- Admin production: `dpl_D485qFyRZga9g3CcVktvc3oWPzZu`, confirmed READY and
  assigned to `hbic-calgary-admin.vercel.app`, with the admin build command and
  original main-feature source. Public feature controls include the published
  `bilalCompanionEnabled` switch. No CMS/prayer/payment record or push was sent.
- Both production aliases were promoted only after staged verification.
  Previous deployments remain available for rollback. Private reports and
  real website screenshots are under ignored `output/bilal-companion/`.

## Native release identities

Existing Expo project `79283015-cb87-48ef-9761-81ab87641205`, owner
`hbiccas-team`, package/bundle `ca.hbic.calgary.app`. Existing production
credentials, four Apple targets, notification/widget/Watch configuration and
Quran/Academy/Stripe features were preserved. No configured OTA is available.

- Android **1.7.8 (43)**: EAS build
  `331dbe8a-6a4f-424d-9c3b-a4f221a1c78f`, main feature source `d5b1156`.
- iOS/Watch **1.7.8 (38)**: EAS build
  `779cbafe-fdaa-43ad-990f-4c2d3c4a5265`, source `03a818b`.
- The native builds contain the same companion UI/client. The later shared
  matching guards execute on HBIC's live server, not in the native UI; both
  native clients therefore receive the hardened answers without an OTA.
- Signed IPA SHA-256:
  `ccf38baf623e576b2885b4c3373effd24e37a6eb284fa4779042d05a7ff835b6`.
  Deep signature verification, all four version/identifier checks, existing
  purpose strings, keychain entitlement, Mac true-size compatibility, Watch
  Quran markers and compiled companion/no-external-AI markers pass. No private
  credential or research-only model was found in the runtime.
- Apple upload submission `9c5d5c37-346a-4552-b14e-916143064dfc` completed;
  upload/processing is distinct from App Review submission and approval.
  Version metadata retains 32 existing real-app placements. Adapter fixtures
  are not submitted as store screenshots.

The final signed Android verification, exact-AAB native UI smoke results and
store review confirmations are recorded after they complete. An upload or
Google intended `completed` rollout is not independent public approval.
