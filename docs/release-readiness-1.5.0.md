# Masjid Bilal 1.5.0 release readiness

Checked on August 23, 2026.

## Existing store state

- Google Play production: `Masjid Bilal 1.4.0 (16)`, released August 9, 2026, at 100% rollout.
- Apple App Store public version: `1.4.0`, released August 10, 2026.
- App Store Connect's private pending-version state still requires an authenticated console session.
- EAS is configured with `appVersionSource: remote` and production `autoIncrement: true`.

## Next release identity

- Marketing version: `1.5.0` on iOS and Android.
- Google Play release name: `Masjid Bilal 1.5.0 (17)` if EAS confirms version code 17 at build time. Never reuse version code 16.
- Apple version: `1.5.0`; use the next EAS-provided build number after confirming the remote counter.
- Android track: production draft first, followed by a deliberate rollout only after device acceptance.
- iOS submission: upload to the open `1.5.0` version train only after App Store Connect confirms it is editable.

## Release notes

Use the following English release notes on both stores:

> Prayer notifications are now scheduled reliably on your device from Masjid Bilal's published Calgary prayer times. Choose individual prayers, optional advance reminders, Jumu'ah reminders, and notification sound preferences. Notification diagnostics and test alerts are clearer, event and prayer notifications open the right destination, and updates published by the masjid refresh the app, widgets, Watch, and website more quickly. This release also improves responsive layouts, accessibility, and the Apple Watch prayer experience.

An optional Madinah Adhan excerpt is available for users who explicitly choose it. Store notes may mention it only after the physical-device custom-sound checks below pass.

## Required acceptance before build or submission

- Physical iPhone: permission, local alerts in foreground/background/terminated/locked states, sound-off behavior, tap routing, remote push, and schedule revision reconciliation.
- Physical Android: Android 13+ permission, visible high-priority channel behavior, local alerts, reboot/app-update restoration, sound-off behavior, tap routing, and remote push.
- Watch: forwarding/routing and refresh behavior on simulator or paired hardware.
- Apple Vision Pro: the Designed for iPad/iPhone Xcode build and launch must pass, followed by pointer navigation, audio, notification, deep-link, resizing, and external-link checks in the visionOS simulator. Physical Vision Pro acceptance and App Store Connect availability remain separate gates.
- Provider: production APNs and FCM credentials confirmed in EAS, followed by provider receipts and visible-device evidence.
- Adhan: verify the WAV is present in the signed IPA/AAB, the `prayer_adhan_v3` channel reports a custom sound, preview playback works, and actual scheduled notifications play the excerpt on physical iPhone and Android hardware.

Status: `BLOCKED` for native store build/submission until the acceptance items above pass. No store binary from this work has been created or uploaded.
