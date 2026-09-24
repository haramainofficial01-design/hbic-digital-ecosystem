# Masjid Bilal notification architecture

Last audited: 2026-08-23

This document describes the implementation that exists in this repository and the production behavior that was observable during the audit. It does not treat an Expo ticket or receipt as proof that a user saw or heard a notification.

## Current production surfaces

- Canonical app/content API: `https://hbic-calgary.vercel.app`
- Legacy Vercel alias: `https://hbic-calgary-app.vercel.app`
- Organization website: `https://hbic.ca` (currently a separate website, not the Vercel app)
- Mobile package and bundle identifier: `ca.hbic.calgary.app`
- Expo/EAS project ID: `79283015-cb87-48ef-9761-81ab87641205`
- Masjid timezone: `America/Edmonton`

On 2026-08-23 the production prayer snapshot endpoint returned HTTP 200 with schema version 2, the current Calgary service date, a schedule revision, all six display rows, tomorrow Fajr, and `fresh`/`available` state.

## Architecture before this repair

### Remote community push path

```text
Admin dashboard
  -> POST /api/admin/notifications/send (X-Admin-Secret)
  -> apps/public-web/lib/notificationStore.ts
  -> Firestore pushTokens query and preference filtering
  -> Expo Push API
  -> Expo ticket stored in pushNotificationLogs
  -> optional Expo receipt check
  -> APNs or FCM
  -> operating system
  -> Expo notification handler
  -> notification response listener
  -> Expo Router destination
```

The active production path is the Vercel/Expo implementation. `backend/functions/src/index.ts` contains a second, older Firebase Messaging topic sender, but the mobile client does not subscribe to its `community` topic. It is not the active end-to-end path and must not be mistaken for the production sender.

### Registration path

```text
Notifications screen or app launch after prior permission
  -> Expo notification permission check
  -> Expo push token for the fixed EAS project
  -> POST /api/notifications/register
  -> Firebase Admin
  -> Firestore pushTokens/{base64url(expoToken)}
```

Stored fields are the Expo token, platform, notification preferences, enabled state, and timestamps. The public route returns only success and platform; it does not return raw tokens. The current implementation stores the raw token in the protected server-side document because Expo needs it for delivery.

The Firestore client rules still contain an obsolete `notificationTokens` rule. The active `pushTokens` collection is accessed only through Firebase Admin and therefore is not publicly readable through client Firestore rules.

### Prayer alerts before this repair

There is no prayer-time scheduler. The only local scheduling function creates a one-off test-style notification after a relative number of seconds. It does not consume the canonical prayer snapshot, persist a revision, use deterministic prayer identifiers, reconcile schedule changes, handle Calgary service-date rollover, or schedule the five prayers.

The existing `prayerReminders` preference defaults to `true`, but enabling it does not schedule a prayer alert. This makes the UI state misleading and violates the required opt-in behavior.

### Current foreground behavior

`apps/mobile/src/services/notifications.ts` installs a global Expo handler with banners/lists enabled but `shouldPlaySound: false`.

Expo's installed SDK states that on Android `shouldPlaySound: false` also suppresses the drop-down alert regardless of notification priority and overrides channel sound. This is a direct cause of foreground notifications being silent and potentially not visibly presented as a heads-up alert.

### Android before this repair

- The generated manifest receives `POST_NOTIFICATIONS` and `RECEIVE_BOOT_COMPLETED` from `expo-notifications` manifest merging.
- The app creates only the generic `default` channel.
- The channel has default importance but no explicit sound selection.
- Remote Expo payloads hard-code `channelId: "default"` and omit `sound`.
- There is no versioned prayer channel, quiet-reminder channel, community channel, or channel diagnostic.
- There is no custom audio resource under `res/raw`.
- The installed Expo scheduler stores scheduled requests and re-registers them after reboot/app replacement. On Android 12+, it uses exact alarms only when the OS reports exact-alarm access; otherwise it falls back to an inexact allow-while-idle alarm. The app does not declare either exact-alarm permission.
- Generated native folders are disposable prebuild outputs. Durable fixes must come from app configuration, plugins, modules, or tracked source outside those folders.

The Firebase Android configuration is present and matches `ca.hbic.calgary.app`. Provider credentials and actual device/channel state remain separate verification gates.

### iOS before this repair

- Expo requests standard alert, badge, and sound authorization when the user presses Enable Notifications.
- The generated app entitlement contains `aps-environment`; the checked generated project currently reflects development signing state.
- No Critical Alerts entitlement is present or requested.
- No custom notification sound is configured or bundled.
- There is no deterministic local prayer schedule.
- Foreground sound is explicitly disabled by the shared notification handler.
- APNs production credentials, Focus/Silent Mode behavior, lock-screen presentation, killed-app presentation, and tap routing have not been verified on this Mac or a physical iPhone during this audit.

### Tap and deep-link behavior before this repair

The root layout reads the last notification response and subscribes to response events. It accepts a small allowlist of static routes or maps a notification type to a static route.

Gaps:

- prayer identity is not carried into the destination;
- `/prayer?prayer=maghrib`-style focus is not supported;
- event IDs and announcement/community context are not carried;
- cold, warm, foreground, and background routes have not been device-verified;
- the allowlist omits newer Community and Halal routes.

### Apple Watch before this repair

The phone writes the versioned prayer snapshot to the shared App Group and sends the same JSON through WatchConnectivity. The Watch can fall back to the public prayer-snapshot endpoint. The Watch does not schedule independent prayer notifications.

Current notification behavior therefore relies on Apple's normal iPhone/Watch notification routing. This avoids deliberate duplicates, but custom sound behavior, haptics, locked/unlocked routing, and glance presentation have not been device-verified. The Watch fetches on launch only when its cached snapshot is missing or stale, so a newly published but not-yet-stale revision is not guaranteed to appear immediately.

### Web before this repair

The public web app has no browser prayer-alert preference, notification-permission flow, prayer transition monitor, or user-initiated Adhan preview. It cannot play audio when closed and does not claim to.

### Admin publication propagation before this repair

```text
Save Draft
  -> Firestore cmsContent/draft only

Publish Changes
  -> validated Firestore batch
  -> cmsContent/published + draft + version history
  -> Next.js revalidatePath for public routes
  -> public API exposes the new content version
```

The publication boundary is safe and intentional: draft keystrokes do not reach public clients. After publication, the website is revalidated immediately. Mobile clients learn about the version on launch, foreground refresh, or active polling. Widgets and Watch receive it only after a phone refresh/bridge update, or after a Watch refresh. There is no versioned content-update signal to prompt immediate client reconciliation and no admin evidence that every consumer observed the new version.

## Confirmed root causes and reliability gaps

1. No local prayer scheduler exists, so prayer alerts cannot be reliable at Adhan time.
2. The foreground handler disables sound; on Android this can also suppress the heads-up/drop-down alert.
3. Remote payloads omit `sound` and use an old generic Android channel.
4. Android channel configuration is not versioned, so previously created silent/muted channel state cannot be repaired in place.
5. Prayer reminders default on without consent and without corresponding scheduled alerts.
6. Token rotation registers the new Expo token but does not remove the old token document, allowing stale registrations until a later receipt disables them.
7. Registration status is inferred from a local token file rather than current OS permission, current Expo token, and backend registration together.
8. The diagnostics endpoint reports database availability and token count but not device permission, channel state, local schedule, revisions, or reconciliation timestamps.
9. Tap routing loses prayer/event context.
10. The legacy Firebase topic sender is disconnected from mobile subscriptions and creates architectural ambiguity.
11. Successful publication has no immediate, versioned signal to mobile/Watch consumers.
12. Provider acceptance and receipts from earlier testing do not prove visible delivery, sound, tap behavior, or Watch routing.

## Architecture after this repair

```text
Canonical live prayer snapshot (absolute ISO instants, Calgary timezone)
  -> validate schema, freshness, service date, revision, and prayer order
  -> local deterministic prayer schedule on the phone
  -> OS notification channels/categories
  -> visible alert and optional approved sound under user/system control
  -> Prayer screen with prayer-focused deep link

Admin community action
  -> protected Vercel API
  -> preference-filtered Expo push
  -> APNs/FCM
  -> visible community alert
  -> typed destination

Admin Publish Changes
  -> validated Firestore publication and version history
  -> immediate web revalidation
  -> versioned client refresh signal
  -> mobile content refresh and prayer-schedule reconciliation
  -> App Group/WidgetKit refresh and WatchConnectivity update
  -> admin diagnostics showing the published version and signal result
```

Prayer alerts and remote community pushes remain separate systems. The server will not send routine remote prayer pushes that duplicate local Adhan notifications.

### Local prayer scheduling

- Prayer alerts are off by default and require explicit user action plus OS permission.
- The scheduler consumes only schema-2, fresh, non-expired `America/Edmonton` snapshots for the current Calgary service date.
- Fajr, Dhuhr, Asr, Maghrib, and Isha are independently selectable; Sunrise is never scheduled.
- Current-day prayers plus the canonical tomorrow-Fajr instant form a bounded rolling schedule. The app does not calculate or invent an unavailable future timetable.
- Deterministic identifiers and a fingerprint of schedule revision plus preferences make reconciliation idempotent. A new revision replaces only Masjid Bilal-owned jobs; an unchanged revision creates no duplicate; stale/offline data preserves the last verified OS schedule.
- Pre-prayer reminders use a normal notification tone. Jumu'ah is an independent local Friday reminder and is never treated as Dhuhr Adhan.
- Scheduled jobs use absolute ISO instants. Travel or a device timezone change does not reinterpret Calgary prayer time.
- Expo's native Android receiver restores persisted scheduled notifications after reboot/app replacement. Exact alarm permission is not requested; Android uses exact delivery only when already allowed and otherwise uses its supported inexact allow-while-idle path.

### Permission, channels, and presentation

- The app explains the feature before requesting standard alert, sound, and badge permission. It does not request Critical Alerts or try to bypass Focus, Silent Mode, or Do Not Disturb.
- Foreground banners and lists are enabled. Android keeps `shouldPlaySound` true because the installed Expo SDK otherwise suppresses heads-up presentation; silent alerts use a dedicated no-sound channel instead.
- Versioned Android channels separate standard prayer alerts, silent prayer alerts, quiet reminders/Jumu'ah, and community updates. The custom-Adhan channel `prayer_adhan_v3` uses the bundled Madinah WAV and is created only after the upgraded app launches.
- Diagnostics show permission, sound access, registration state, masked token, active Android channel/sound/importance, owned scheduled count, next alert, service date, schedule revision, reconciliation, and test timestamps.
- Notification taps retain prayer identity or event identity and route to the focused Prayer or event-detail screen in cold and warm launch code paths.

### Remote community push

- Visible remote messages use high priority, the `community_updates_v1` Android channel for repaired clients, default system sound, and active iOS interruption level. Legacy registrations keep their existing `default` Android channel until the upgraded app launches and registers the new channel.
- Routine `prayerReminder` and `iqamahReminder` sends are rejected server-side to prevent duplication with local jobs. Jumu'ah and true community categories remain available remotely when deliberately sent by an administrator.
- Provider calls retry bounded 429/5xx failures, record Expo ticket IDs, support receipt checks, and disable `DeviceNotRegistered` tokens.
- Registration stores the delivery token, selected categories, platform, app version/environment, last-seen time, and a one-way hash of the app-generated installation identifier. A matching rotated token deletes the prior document; legacy rotated documents are disabled. Tokens are never returned by public/admin diagnostics.

### Publication propagation

- Main content publication, public Halal directory changes, and forced prayer synchronization advance one Firestore-backed publication revision. Draft-only edits and private moderation actions do not.
- A successful public mutation revalidates affected web routes and sends a short-lived, headless Expo data message containing the publication/content revision.
- A module-scope Expo background task refetches and caches canonical content while the native app is active, backgrounded, or eligible for headless execution. It then reconciles prayer jobs and, on iOS, reloads WidgetKit and forwards the same snapshot through WatchConnectivity.
- Open public-web tabs poll only the lightweight revision document and refresh their server component tree when a newer publication revision appears. They do not repeatedly invoke the external prayer feed.
- Watch refreshes from the phone or canonical endpoint on every launch and still accepts WatchConnectivity application-context updates from the phone.
- Admin publish and diagnostics surfaces report public API verification and propagation acceptance/failure instead of treating an Expo ticket as proof of user-visible delivery.

### Browser behavior

- Browser prayer alerts are local, explicitly enabled, and fire only while the page remains open across a canonical next-prayer transition.
- The browser runs a clearly labelled normal `Test Prayer Alert`; browser/device settings control presentation and sound.
- No service worker/PWA closed-page prayer promise is made. The page-open Adhan control requires an explicit local opt-in and successful user-initiated playback before it is enabled.

## Audio status

An authorized Madinah recording recited by Muhammad Marwan Qassas at Masjid an-Nabawi is bundled. HBIC's project owner confirmed authority to use this recording on 2026-09-01. The production derivative uses the 27.5-second opening, applies conservative filtering and loudness normalization, and remains below Apple's 30-second custom-notification limit. No music, instruments, sound effects, or artificial reverb were added. Exact source, processing, and derivative hashes are recorded in `apps/mobile/assets/audio/README.md` and `apps/public-web/public/audio/README.md`.

- Mobile bundle: `adhan_madinah_marwan_qassas_short.wav`; configured through the Expo Notifications plugin for iOS resources and Android `res/raw`.
- Android channel: `prayer_adhan_v3`; the new channel prevents existing Android installs from retaining the old cached sound.
- Mobile UI: the option remains opt-in, includes a preview, uses the public label “Adhan,” and never activates for an existing user automatically.
- Web bundle: `adhan_madinah_marwan_qassas_short.mp3`; page-open playback only after explicit local opt-in and a successful user gesture.

## Verification boundaries

The following remain unverified until evidence is collected independently:

- physical iPhone foreground/background/terminated/locked presentation and sound;
- physical Android foreground/background/terminated/locked/reboot/Doze behavior and channel state;
- APNs and FCM production credentials;
- Watch locked/unlocked routing, sound, and haptics;
- licensed Adhan playback and resource inclusion in the final IPA/AAB on physical devices;
- signing, store version trains, and production binaries;
- replacement or DNS routing of the existing separate `hbic.ca` site.
