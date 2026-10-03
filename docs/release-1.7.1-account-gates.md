# HBIC 1.7.1 account gates

The owner explicitly requires live Academy email and both Wallet systems to be verified before final mobile builds. Do not consume new EAS build numbers or submit older binaries while these gates remain open.

## Apple Wallet

- Existing Apple Team: `ZJ58VWNTX3`; phone and extension identifiers are unchanged.
- Registered Pass Type ID: `pass.ca.hbic.calgary.app.academy`.
- Issued Pass Type signing certificate: `RPZZH7LUWP`, named HBIC Quran Academy Wallet, expires November 2, 2027 UTC.
- The downloaded certificate matches the newly generated private signing key; it is issued by Apple's WWDR G4 intermediate.
- Private signing material is preserved locally under ignored `.local-secrets/apple-wallet/`. Never commit it, paste it into chat, or expose it to browser/mobile bundles.
- This is credential preparation, not a completed Wallet feature. Server-side generation, authorized current-pass validation, production secret configuration, and real Wallet import remain to be verified before PASS.

## Email

- Resend domain setup: https://resend.com/domains/add/46360a9d-83fb-4756-afe1-bc229277fc7b
- DNS account required: https://hpanel.hostinger.com/domains/dns
- The accessible Hostinger session showed no domains to manage. Access to the account controlling hbic.ca is required; do not register a replacement domain or alter nameservers, website records, or existing MX records.
- Add only Resend's current sending verification records, then verify the domain. Keep the production sending-only API key in sensitive Vercel Production configuration.
- Required variables: `ACADEMY_RESEND_API_KEY`, `ACADEMY_EMAIL_FROM=academy@hbic.ca`.
- Actual inbox delivery, not merely an API success response, is required for PASS. Do not fabricate payments or enrollment records to test mail.

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
