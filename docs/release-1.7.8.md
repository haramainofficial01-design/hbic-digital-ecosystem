# Masjid Bilal 1.7.8 — Bilal

## Latest revision: localized introduction and tour

Source `529b4383041a3643458fe3c408de2ed2e00286fe` is committed and pushed.
Public deployment `dpl_2aRs8PSo96ToBZmgwRbZJPmfEvRa` and admin deployment
`dpl_6VE3jyDdB55LzCB5LneBzpTyHRxL` were verified READY, then promoted.
Alias API checks independently confirm `hbic.ca`, `www.hbic.ca` and the existing
admin domain point to those exact deployments. Public automatic Git metadata
matches the source; admin was built from that commit's archive with only its
staging hosting configuration changed. Both correct workspace build targets
were confirmed. Final-domain checks passed at `2026-10-18T01:51:57.410Z`, including
actual tour/once-only persistence, four-language interface, canonical live
prayer/tuition evidence, secure handoffs and the published admin control bundle.

Replacement builds, source-identical to the above feature commit:

- Android **1.7.8 (44)**: `1a324849-047c-49ad-bb29-aa896ba7aaf8`.
- iOS/Watch **1.7.8 (39)**: `b72391a9-1e8e-4bc1-af42-081cc45d4536`.

Both packages passed signature/identity/content checks. The exact-AAB Android
test then found the root launcher absent above native navigation. These builds
are held, not release-qualified. iOS 39 was uploaded for processing but was not
submitted to App Review; Android 44 was not uploaded. The correction supplies
an explicit full-size root and native overlay host (including the existing iOS
FullWindowOverlay), with another exact native test required before submission.
Build creation/upload is not review submission or public approval.

The assistant is named **Bilal**, with a persistent one-time Home tour for
existing installations and an integrated new-user introduction. English,
Urdu, Dari and Arabic interface/tour copy, RTL layout, authored core replies,
source-language fallback, replay, keyboard viewport handling and restrained
glass transitions are included. Native notifications, foreground/route changes,
onboarding, current prayer quiet windows and important-screen exclusions defer
or close it. The pending tour takes priority over the rating invitation.

Latest checks: **25/25** companion/tour checks; **27/27** rating, **24/24** prayer,
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
