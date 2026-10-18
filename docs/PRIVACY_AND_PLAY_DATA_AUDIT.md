# Masjid Bilal Privacy and Google Play Data Audit

Historical baseline: August 8, 2026. See the October 11, 2026 addendum below;
the historical account and direct-collection statements do not describe 1.7.5.

## October 17, 2026 — Bilal addendum

The optional native/public-web companion sends a bounded question and at most
four previous user questions to HBIC's HTTPS server for a public-information
lookup. It uses no external AI provider, account identifier or microphone.
Questions/answers remain in app/browser memory and are not written to an HBIC
database or application logs. Clear chat/reload/restart removes local history.
Hosting connection/security records remain governed by the existing policy;
the application limiter retains a bounded, short-lived salted address hash.
The canonical policy now explains this at `https://hbic.ca/privacy#bilal-companion`.
The introductory-tour campaign and interface-language preference are device-local
settings, not chat history. The existing privacy anchor remains backward compatible.

Google's [Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
requires ephemeral off-device processing to be considered in the form even
when it does not appear as collected data on the public listing. HBIC's existing
declaration already includes optional **Other user-generated content**, app
functionality, non-shared; some existing private form content is retained, so
the category as a whole is not exclusively ephemeral. The new companion's
question processing does not justify changing that entire category to ephemeral
or claiming HBIC collects no user content. The public Play Data safety page was
rechecked on October 17 and lists App interactions and Other user-generated
content, alongside the existing account, Academy/payment and device-ID types.
No declaration was silently weakened or replaced with a no-data claim.

Apple's [privacy definition](https://developer.apple.com/app-store/app-privacy-details/)
distinguishes real-time processing from retention beyond the request. No new
persistent chat collection, tracking, advertising or external AI processor is
introduced; existing retained forms/account/payment declarations remain.
These are scoped implementation/declaration checks, not independent legal
certification or a guarantee about future provider behavior.

## October 11, 2026 release addendum

- Canonical public policy: `https://hbic.ca/privacy`.
- Optional verified-account challenge participation collects account email/UID
  through Firebase, an adult's chosen nickname, consent, practice-time totals
  and bounded duplicate-credit session receipts for app functionality.
- Only nickname, time and rank are intentionally public after separate consent.
  Leaving removes the participant entry. Session receipts are not publicly exposed.
- Microphone recordings, personal word-review flags and reading preferences stay
  on-device and are not uploaded. Session-only recordings are discarded on exit
  or background. Kept recordings can be individually replayed/deleted.
- No analytics, advertising, tracking or recitation-accuracy prize claims were added.
- Store declarations must include the optional authentication/participation data;
  the old "No direct in-app collection" row below is a historical baseline only.

## Canonical policy

- Public URL: `https://hbic-calgary.vercel.app/privacy`
- Operator: Hazrat Bilal Islamic Centre
- Privacy contact: `info@hbic.ca`
- Public access: no login, geofence, or authentication required
- In-app path: Settings > Privacy & Legal > Privacy Policy

The former Play Console URL, `https://hbic-calgary-app.vercel.app/about`, was not a privacy policy and is not valid for the Play declaration.

## Mobile app data behavior

| Data | Behavior | Leaves device | Stored remotely | Purpose | Optional |
| --- | --- | --- | --- | --- | --- |
| Published masjid content | Downloaded from the public API and cached locally | Request only | Public source record | App functionality and offline display | No |
| Theme and language | Stored in the app document directory | No | No | App preferences | Yes |
| Notification categories | Stored locally and sent during notification registration | Yes | Yes | Deliver selected notifications | Yes |
| Expo notification token | Generated only after notification permission | Yes | Yes, protected Firestore collection | Notification delivery | Yes |
| Device platform | Sent with the notification token | Yes | Yes | Correct notification delivery | Yes |
| Qibla sensor readings | Used locally | No | No | Qibla direction | Yes |
| Precise or approximate location | Not requested by the current app | No | No | Not used | N/A |
| Advertising ID | Not used | No | No | Not used | N/A |
| Analytics or crash telemetry | No SDK enabled in the current app | No | No | Not used | N/A |

The Firebase client helper in `apps/mobile/src/services/firebase.ts` is not imported by the running mobile application. The app uses the public content API and the protected notification-registration route.

## Website form data

The privacy policy also covers optional website forms.

- Ask the Masjid: optional name, email, category, question, consent.
- Directory update request: email and consent.
- Restaurant interest: business/contact name, email, phone, business address, cuisine, website, current halal claim, message, consent, and acknowledgement.
- Request connection data is processed into a keyed anti-abuse fingerprint. Raw IP address and user-agent values are not stored in submission records.
- Authorized administrators can permanently delete question and restaurant-interest submissions.

## Play Data safety mapping

The declaration must be checked against the exact production AAB before submission. For the current mobile client:

| Google Play category | Collected | Shared | Required | Purpose |
| --- | --- | --- | --- | --- |
| Device or other IDs | Yes, notification token when enabled | No sale or advertising sharing | Optional | App functionality / notifications |
| Precise location | No | No | N/A | N/A |
| Approximate location | No | No | N/A | N/A |
| Personal information | No direct in-app collection | No | N/A | External phone/email/browser actions are handled by the chosen external service |
| App activity / analytics | No | No | N/A | No analytics SDK is enabled |
| Diagnostics | No app telemetry SDK | No | N/A | Standard hosting security logs are handled by infrastructure providers |

Additional answers:

- Data encrypted in transit: Yes, production endpoints use HTTPS.
- Users can request deletion: Yes, through `info@hbic.ca` and the public privacy policy.
- Account creation: No public account is required.
- Ads: None.

## Retention and deletion controls

- Mobile users can remove the current device from notification delivery in the Notifications screen. This deletes the stored push-token record and unregisters the device locally.
- Authorized admins can permanently delete private questions and directory submissions from the dashboard.
- Users can request access, correction, or deletion by emailing `info@hbic.ca` from the address used in the form.
- No claim of automatic deletion on a fixed schedule is made because the current backend does not run a scheduled retention purge.

## Third-party services

- Vercel: website and server hosting.
- Google Firebase / Firestore: protected content, form, and notification registration storage.
- Expo Push Service, Apple Push Notification service, and Firebase Cloud Messaging: notification routing when enabled.
- External donation, map, social, phone, and email services only when a user chooses those links or actions.

## Release verification

Before resubmitting Android:

1. Confirm `/privacy` returns HTTP 200 without authentication.
2. Confirm the Play privacy-policy field contains exactly `https://hbic-calgary.vercel.app/privacy`.
3. Confirm the AAB manifest targets API 36.
4. Confirm the Data safety answers match this audit and the final AAB.
5. Confirm the in-app policy link opens the canonical URL.
6. Confirm the notification-removal action deletes the device registration.
