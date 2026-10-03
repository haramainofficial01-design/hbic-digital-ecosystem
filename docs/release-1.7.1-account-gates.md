# HBIC 1.7.1 account gates

The owner requires Wallet verification and native runtime checks before final mobile builds. Email DNS verification is now explicitly an external domain-owner action and must not stop other release work. Do not submit older binaries or claim incomplete service gates are passed.

## Apple Wallet

- Existing Apple Team: `ZJ58VWNTX3`; phone and extension identifiers are unchanged.
- Registered Pass Type ID: `pass.ca.hbic.calgary.app.academy`.
- Issued Pass Type signing certificate: `RPZZH7LUWP`, named HBIC Quran Academy Wallet, expires November 2, 2027 UTC.
- The downloaded certificate matches the newly generated private signing key; it is issued by Apple's WWDR G4 intermediate.
- Private signing material is preserved locally under ignored `.local-secrets/apple-wallet/`. Never commit it, paste it into chat, or expose it to browser/mobile bundles.
- Signed server-side `.pkpass` generation is deployed on hbic.ca in deployment `dpl_4oAJ5tnnZN8KsDh1mcGXAxXZwKRH`, release source `85b47c2`. The previous deployment `dpl_CZm3A5qKEfiKbopFk8qBmp6gT2WF` remains the rollback point.
- The real signed package passed archive/manifest/signature checks and opened in the native iOS Wallet import sheet. An authorized live issuance returned HTTP 200, resolved the current pass, and left the paid ledger unchanged; its manifest and CMS signature also passed. The owner subsequently confirmed successful actual iPhone Wallet addition: Apple Wallet PASS.
- Downloads use a five-minute encrypted capability, recheck the current live pass, and include only the opaque lookup URL in the QR. Downloading/scanning never confirms a card payment or enrollment.

## Email

- Resend domain setup: https://resend.com/domains/add/46360a9d-83fb-4756-afe1-bc229277fc7b
- The owner cannot currently access the GoDaddy domain account. The accessible Hostinger session lists no domains. Send the prepared public Resend TXT/CNAME records to the domain administrator; use the existing authoritative DNS host and do not guess/change DNS elsewhere.
- Add only Resend's current sending verification records, then verify the domain. Keep the production sending-only API key in sensitive Vercel Production configuration.
- Required variables: `ACADEMY_RESEND_API_KEY`, `ACADEMY_EMAIL_FROM=academy@hbic.ca`.
- Actual inbox delivery, not merely an API success response, is required for PASS. Do not fabricate payments or enrollment records to test mail.
- Registration, card/cash receipts, cash reminders, and explicitly opted-in Academy announcement/calendar emails now use the existing durable email queue. Legacy missing announcement consent is not treated as consent. Template/consent tests pass; actual delivery is still pending domain/key setup.

## Google Wallet

- Issuer setup: https://pay.google.com/business/console/
- The accessible session showed the initial business setup form, not an issuer dashboard. The owner must complete required business/legal acceptance using the authorized HBIC Google account.
- Issuer identity, production publishing approval, service-account authorization, real pass generation, and import are not yet verified. Never show a dead Add to Wallet button or advertise demo-only issuance as public production support.
- The latest authorized business profile still shows no selected payments profile and incomplete business information. Required legal/business details must be completed by the account owner; the merchant business-profile identifier is not a Wallet issuer ID.

## Release identity

- Marketing version: `1.7.1`.
- Expo project: `79283015-cb87-48ef-9761-81ab87641205`, owner `hbiccas-team`.
- Bundle/package: `ca.hbic.calgary.app`; Apple App Store ID: `6790937097`.
- Remote version state last read before account setup: iOS 23, Android 29. Recheck before building, use the next unused values at least 24/30, and preserve remote auto-increment.
- No final 1.7.1 builds or store submissions were initiated during this account/repository setup pass.

## Focused verification on October 2

- Prayer/Hijri, notification payload/dedupe, TV, webhook signature, Wallet capability, and Academy registration/consent tests pass. Swift prayer snapshot boundary tests pass; all existing Apple target identifiers are preserved.
- Public production Stripe delivery returned HTTP 200. The existing October paid ledger remains CAD 50 paid and its event marker remains unchanged; no new payment was created.
- Expo receipts for the October 2 prayer-change notification confirmed 126 successful deliveries and 14 `DeviceNotRegistered` failures, with no pending receipts. Receipt results were recorded and the 14 stale token records disabled; no new alert was sent. Provider receipts do not substitute for a physical-device visual check.
- Android's existing Expo native module now includes the real home widget. Kotlin compilation and a local debug APK build pass. The Pixel launcher widget retrieved the live canonical Fajr schedule, displayed a ticking countdown, and remained readable at large text size.
- Current Watch app, iOS widget, and Watch complication targets compile for their simulators. Watch runtime snapshots at 40 mm and 46 mm show the live schedule/countdown without clipping the prayer card.
- Android and refreshed iOS simulator runtimes show the polished Quran/Recite maintenance screen. Each platform's actual Hadith button handler opened Sunnah.com in its external browser.
- On iOS resume from Safari, Home displayed Friday October 2 and 21 Rabi’ II 1448 AH while the device UTC date was October 3. Fajr 6:08 AM / iqamah 6:30 AM and the countdown agreed with the canonical next-day snapshot. Calendar rendering was also checked locally. Deterministic rollover tests cover boundaries; a midnight physical-device check is not claimed.
- Local iOS simulator QA required refreshing the existing Pods and an iOS 17 simulator build override for the Xcode 27 SDK; no production deployment target, dependency version, identifier, or signing credential was changed.
- Public-web production build, mobile typecheck/lint, and client-secret-pattern scan pass. No signing key or local secret file is traced into the Wallet function output.
- Final release gates are not passed by compilation/source checks alone. Email inbox delivery, Google issuer production setup, widget/complication runtime coverage, and physical push presentation remain outstanding where noted. Apple Wallet import is confirmed. No final EAS build or submission was initiated.

## Follow-up native and cash verification

- The real iOS home-widget renderer exposed dark text on its fixed navy surface in light mode. Small/medium/large home widgets now resolve text in the dark surface appearance; lock-screen widgets remain unchanged. All three native Home Screen sizes now render readable prayer/iqamah text without overflow; small/medium countdowns are live, and the large layout keeps its intended schedule overview.
- Apple Watch rectangular complications now use a native continuously ticking timer, as the circular complication and Watch app already do. The updated native targets and deterministic shared snapshot boundary tests pass. A dedicated 46 mm watchOS 26.5 simulator installed the real rectangular widget in Smart Stack: its provider fetched the public canonical snapshot with HTTP 200, showed Dhuhr adhan 1:25 PM / iqamah 2:00 PM, and counted down from 4:58:56 to exactly 4:58:00 at 8:27:00 AM Calgary time while the app was closed. All three lines remain inside the widget bounds. The actual Solar Dial face also showed the correct Dhuhr 1:25 PM corner complication without edge clipping. The actual Activity Digital face showed the circular countdown at 4:32:02 at 8:52:58 AM and 4:28:59 at 8:56:01 AM Calgary time, correctly counting down to 1:25 PM without clipping. Its native inline complication displayed `DHUHR 1:25 PM` inside the bottom slot. All four supported prayer complication families were inspected on installed runtime surfaces, not gallery placeholders; physical Watch battery/refresh behavior and every Watch size are not inferred from those simulator checks.
- Wear OS now has HBIC branding, a round-screen-sized next-prayer hero, live countdown/iqamah, the canonical Hijri label, scrollable daily prayer rows, explicit cache status and refresh, and rotary scrolling. Countdown updates stop when the app is not resumed. Debug compilation, unit tests and actual round-emulator rendering pass. The existing live next-prayer Tile also renders without clipping.
- Wear OS next-day Fajr previously reused today's display label despite counting down to tomorrow's canonical instant. The label and next-day iqamah now use the same canonical snapshot, with before/exact/after-prayer and Calgary DST tests. No independent prayer calculation was added.
- Wear OS remains a separate native target with an unsigned local release configuration. It is not automatically included in the Android phone EAS build; signed wearable distribution must use the existing Play app signing identity. Do not advertise wearable store availability from a debug emulator build.
- Read-only live reminder inspection found three cash families, two with a first cash payment, but zero enabled Academy devices for those families. No live reminder or fake payment was sent. An owner-authorized existing test family and registered device are required to verify actual physical delivery.
- Four isolated reminder-job tests pass: correct cash-parent targeting, month/stage dedupe, paid/withdrawn/billing-break suppression, and advance reminders for the next unpaid month. A no-device run no longer consumes that day's push reminder; email enqueue remains independently idempotent. Email sending remains unconfigured, not claimed delivered.
- Staff payment arrangements use the existing paid-month-preserving billing flow. Cash changes and card-setup requests require an approved director/super-admin and an audit reason. Staff cannot authorize or charge a parent's card; the parent completes existing secure Checkout. An isolated real-function test verifies paid ledger preservation, actor/reason audit, idempotent card requests and withdrawal/lock rejection. No live family billing was changed for testing.

## Live follow-up deployment

- Website/admin source: `aca6c1764fc348097de56f7994225936e7341c86`.
- Public website deployment: `dpl_petHmpaqU8MkdtyUVQfia1sVuh2H`, verified at `https://hbic.ca`. Previous `dpl_4oAJ5tnnZN8KsDh1mcGXAxXZwKRH` remains recoverable.
- Admin deployment: `dpl_GnkiPzxj1ua7t55A3c692SoL6a5j`. The usual `https://hbic-calgary-admin.vercel.app` alias was explicitly moved to this release and its public bundle verified to contain the new staff controls; the automatically assigned team-suffixed URL alone did not update that existing alias. Previous admin `dpl_GZAfBpEGHL7yyXKT1QL4WpPs8Cde` remains the rollback point.
- Post-deploy checks: Academy HTTP 200; card billing publicly available at CAD 5000 cents; prayer snapshot HTTP 200 with `America/Edmonton` and the current service date; `/api/display` HTTP 200; unauthenticated staff billing and reminder requests HTTP 401; unsigned Stripe webhook HTTP 400. No fake live tuition/payment/receipt was created.
- Public/admin production builds and mobile typecheck/lint pass. The new staff controls and cash-reminder safeguards are deployed; native watch/widget code still requires the final signed mobile/wearable release and is not claimed publicly available.

## October 3 release-gate follow-up

- The existing Cloud project `626062649957` now reports `androidpublisher.googleapis.com` as `ENABLED` through the authorized Service Usage API. This does not by itself prove Play Console upload permissions or an accepted store binary.
- The three prepared Resend DNS verification records still have no public DNS answers. Sending and inbox delivery remain unverified; do not claim receipt/reminder email delivery.
- A repeated read-only cash-reminder check still found no enabled Academy reminder devices and no previously sent reminder runs. No fake payment, receipt, registration, or live reminder was created. Actual device delivery requires an authorized existing test family opting into Academy app notifications.
- Re-reading the authorized Google Wallet business-profile page reports an incomplete business profile and no selected payments profile. A subsequent direct Wallet onboarding check established that this payments-profile warning is not the current issuer-creation blocker; see the exact Wallet action below. No issuer identity was invented.

## October 3 Play access and exact Wallet owner action

- The existing EAS submission service account initially received Android Publisher HTTP 403 despite the API being enabled. The authorized Play Console had no access entry for that account.
- Added the existing `firebase-adminsdk-fbsvc@hbic-calgary-prod.iam.gserviceaccount.com` to the existing Masjid Bilal app only (`ca.hbic.calgary.app`), without account-wide, financial, order, user-administration, or unrelated-app access. Granted app read access and production/testing release permissions. Google automatically includes its disabled policy/deep-link permission dependencies with production release access; no policy declaration or deep link was edited.
- The Console now reports the account Active. Using the actual existing EAS submission credential in memory, Android Publisher accepted an empty edit (HTTP 200) and a production-track read (HTTP 200). The exact temporary edit was discarded (HTTP 204), not committed. No artifact was uploaded and no release, signing key, or package was changed. Upload authorization is verified; acceptance of a new 1.7.1 binary remains pending.
- Existing production-track metadata includes completed `Masjid Bilal 1.7.0 (22)` and an empty draft labelled `1.7.0 (29) – Quran Academy Update`. These existing entries were only read, not uploaded, published, removed, or selected as the new candidate.
- Opened the authorized HBIC Wallet product page and clicked **Build your first pass**. The exact remaining account-owner action is the displayed Google Wallet API Terms of Service agreement checkbox and **Continue**. The owner must personally review/accept this agreement at `https://pay.google.com/business/console/products/passes/BCR2DN7TTD77Z42C`. The modal is left open; no agreement was accepted by automation.
- Once accepted, inspect the resulting issuer ID, authorize the existing service account, configure the Generic Pass, verify real issuance/import, and follow Google's publishing-access process. Demo mode is not production availability. The merchant-profile ID above must never be used as a numeric Wallet issuer ID.
