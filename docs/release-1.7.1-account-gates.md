# HBIC 1.7.1 account gates

The owner explicitly requires live Academy email and both Wallet systems to be verified before final mobile builds. Do not consume new EAS build numbers or submit older binaries while these gates remain open.

## Apple Wallet

- Existing Apple Team: `ZJ58VWNTX3`; phone and extension identifiers are unchanged.
- Registered Pass Type ID: `pass.ca.hbic.calgary.app.academy`.
- Issued Pass Type signing certificate: `RPZZH7LUWP`, named HBIC Quran Academy Wallet, expires November 2, 2027 UTC.
- The downloaded certificate matches the newly generated private signing key; it is issued by Apple's WWDR G4 intermediate.
- Private signing material is preserved locally under ignored `.local-secrets/apple-wallet/`. Never commit it, paste it into chat, or expose it to browser/mobile bundles.
- Signed server-side `.pkpass` generation is deployed on hbic.ca in deployment `dpl_4oAJ5tnnZN8KsDh1mcGXAxXZwKRH`, release source `85b47c2`. The previous deployment `dpl_CZm3A5qKEfiKbopFk8qBmp6gT2WF` remains the rollback point.
- The real signed package passed archive/manifest/signature checks and opened in the native iOS Wallet import sheet. An authorized live issuance returned HTTP 200, resolved the current pass, and left the paid ledger unchanged; its manifest and CMS signature also passed. Actual Add/import remains required before PASS.
- Downloads use a five-minute encrypted capability, recheck the current live pass, and include only the opaque lookup URL in the QR. Downloading/scanning never confirms a card payment or enrollment.

## Email

- Resend domain setup: https://resend.com/domains/add/46360a9d-83fb-4756-afe1-bc229277fc7b
- DNS account required: https://hpanel.hostinger.com/domains/dns
- The accessible Hostinger session showed no domains to manage. Access to the account controlling hbic.ca is required; do not register a replacement domain or alter nameservers, website records, or existing MX records.
- Add only Resend's current sending verification records, then verify the domain. Keep the production sending-only API key in sensitive Vercel Production configuration.
- Required variables: `ACADEMY_RESEND_API_KEY`, `ACADEMY_EMAIL_FROM=academy@hbic.ca`.
- Actual inbox delivery, not merely an API success response, is required for PASS. Do not fabricate payments or enrollment records to test mail.
- Registration, card/cash receipts, cash reminders, and explicitly opted-in Academy announcement/calendar emails now use the existing durable email queue. Legacy missing announcement consent is not treated as consent. Template/consent tests pass; actual delivery is still pending domain/key setup.

## Google Wallet

- Issuer setup: https://pay.google.com/business/console/
- The accessible session showed the initial business setup form, not an issuer dashboard. The owner must complete required business/legal acceptance using the authorized HBIC Google account.
- Issuer identity, production publishing approval, service-account authorization, real pass generation, and import are not yet verified. Never show a dead Add to Wallet button or advertise demo-only issuance as public production support.

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
- Final release gates are not passed by compilation/source checks alone. Email inbox delivery, Google issuer production setup, Apple Wallet import, widget/complication runtime snapshots, and physical push presentation remain required. No final EAS build or submission was initiated.
