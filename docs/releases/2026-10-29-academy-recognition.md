# Academy recognition release — October 29, 2026

Website deployed and promoted through the existing HBIC Vercel workflow:
`dpl_DvzMyZbnDdgHDkXDegmPiuSA1jhi` (functional source `3da588523e3b961ca56798ebe4f2e7431e44518e`). The previous recognition deployment `dpl_Ebo39Q6GusKY6SiMaE8SKQvRsEs7` remains recoverable. The pre-feature website reference is `dpl_35SXTT2MwrtvuNHnnAnN6Je7BauU`.

Recognition follows the welcome hero on the website and prayer times on native Home. Approved photos remain until newer winners are published; earlier months retain names only above the new month. Sister photos are face-obscured. Actual learner names, images, private publication backups and credentials are excluded from Git.

## Verification

- Nine focused feature tests passed: shared lifecycle/validation/localization, controlled photo endpoint privacy, and native component adapters.
- Phone and desktop web layouts were checked at 320, 390, 900, 1440 and 2000 pixels. Live phone/desktop checks confirmed photos and the registration destination.
- Twenty-one staged service checks passed, including canonical prayer parity, payment availability, private admin access barriers, public content, Bilal, media ranges and potluck behavior.
- Ninety server traces passed the bundle budget; largest trace was 29.46 MiB. Photo bytes remain outside application/server bundles.
- Exact final AAB-derived Android build passed 14 native regression checks, two fresh-install checks, and recognition checks in light/dark, Dari Gregorian month, registration navigation and a wide native window.
- Both signed packages passed identity, artifact and existing-feature checks. Android native libraries passed 16 KB alignment and R8 checks. iOS Watch/widget identities, signing and Mac true-size compatibility settings were preserved.
- These checks do not claim physical iPhone, physical Mac or Vision Pro runtime validation. No new recitation-accuracy qualification is asserted.

## Store handoff

- iOS 1.7.9 build 51: uploaded, Apple processing `VALID`, attached to review submission and `WAITING_FOR_REVIEW`.
- Android 1.7.9 version code 54: exact signed AAB uploaded and committed to the existing production track with review requested. The intended full rollout remains subject to Google approval; submission is not proof of public availability.
- Existing store screenshots and review configuration were retained. No OTA publication or mass notification was used.

Artifact SHA-256:

- iOS: `5eefb2591f00281a72659b79c02217781d1bca2011237a0e393aeae4328cf204`
- Android: `70cf6cacd6b35cebdb2be4176c236c55b25b8c8d12942fa2a6cf7325a966fd45`

Native packages use source `3da588523e3b961ca56798ebe4f2e7431e44518e`; later documentation-only commits do not change the signed artifacts. Release artifacts and private checks are retained locally outside Git.
