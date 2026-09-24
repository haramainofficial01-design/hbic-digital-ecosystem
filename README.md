# Masjid Bilal App Ecosystem

Standalone project for **Masjid Bilal** and **Hazrat Bilal Islamic Centre**.

This folder is intentionally separate from the Haramain Travel app and Haramain Central website.

## Structure

```text
HBICCalgaryApp/
  apps/
    mobile/       Expo React Native app for iPhone and Android
    admin-web/    Next.js admin dashboard
    public-web/   Next.js public website
  packages/
    shared/       models, default content, prayer helpers, i18n keys
    ui/           shared design tokens
    config/       app and Firebase config keys
  backend/
    firebase/     Firestore rules, indexes, storage rules
    functions/    Firebase Cloud Functions and seed script
  widgets/
    android/      preserved Android native widget source
```

## What Is Built

- Mobile tabs: Home, Prayer, Events, Donate, More, with dedicated Media, Youth, Programs, Contact, About, Settings, Notifications, Language, and Event Detail screens
- Mobile identity: public app name is **Masjid Bilal**, with a matching icon and splash mark
- Mobile appearance: Light, Dark, and System theme modes are persisted locally on device
- Prayer/iqamah system with adhan, iqamah, next prayer, countdown, Jumu'ah, Ramadan, Eid, and notification toggles
- Admin dashboard for prayer/iqamah, Jumu'ah, announcements, events, programs, donations, media, volunteers, push notifications, settings, users/roles
- Public website with Home, Prayer Times, Events, Media, Donate, Programs, Youth, Contact, About
- Firestore-backed content publishing, security rules, storage rules, Cloud Functions, and seed data
- Opt-in, deterministic on-device prayer/Jumu'ah scheduling plus protected remote community push, token rotation, delivery receipts, diagnostics, and publication refresh signals
- English/Urdu translation structure
- Native iOS/iPadOS widgets, Watch app, Watch complications, and shared prayer snapshot bridge
- Apple Vision Pro compatibility through the same iOS/iPadOS app and bundle ID, validated with Xcode's Designed for iPad/iPhone visionOS destination
- Branding/photo assets from the provided HBIC images

## Install

```bash
cd "/Users/temporary/Documents/HBICCalgaryApp"
npm install
```

## Run Mobile

```bash
npm run dev:mobile
```

Then open in Expo Go or a development build.

## Run Public Website

```bash
npm run dev:web
```

Default URL: `http://localhost:3100`

## Run Admin Dashboard

```bash
npm run dev:admin
```

Default URL: `http://localhost:3101`

## Content Publishing

The public website and mobile app read from one published content API:

```text
GET /api/content/published
```

The admin dashboard uses a draft/published workflow:

```text
GET  /api/admin/content/draft
POST /api/admin/content/draft
POST /api/admin/content/publish
```

Storage adapter:

- Active adapter: Firestore through Firebase Admin in `apps/public-web/lib/contentStore.ts`
- Published document: `cmsContent/published`
- Draft document: `cmsContent/draft`
- Version history: `cmsContentVersions/{version}`

Publishing behavior:

- admin edits are saved as draft content first
- public website and mobile app continue reading only published content
- Publish Changes validates content, writes the published document, stores a version copy, advances the shared publication revision, revalidates public pages, and signals registered native clients to refresh widgets/Watch and reconcile prayer alerts
- revalidated paths: `/`, `/prayer-times`, `/events`, `/donate`, `/programs`, `/youth`, `/media`, `/contact`, `/about`

If Firebase Admin credentials are missing, the public website and mobile app fall back to bundled default content. Admin saving and publishing fail clearly until credentials are configured.

Required production environment variables on the public web deployment:

```text
NEXT_PUBLIC_API_URL=https://hbic-calgary.vercel.app
ADMIN_EMAIL=
ADMIN_PASSWORD=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

You can also provide a full service account JSON instead:

```text
GOOGLE_APPLICATION_CREDENTIALS_JSON=
```

Required admin deployment variable:

```text
NEXT_PUBLIC_API_URL=https://hbic-calgary.vercel.app
```

For local admin testing against the local public website server, set:

```text
NEXT_PUBLIC_API_URL=http://localhost:3100
```

The two admin dashboards use the same shared HBIC email/password prompt. Production credentials are stored as `ADMIN_EMAIL` and encrypted `ADMIN_PASSWORD` Vercel environment variables and are checked by every protected API. The password is kept only for the active browser session. See `docs/admin-auth-security-audit.md` for the limitations of shared credentials and the recommended individual Firebase Auth + MFA target.

Required mobile build variable:

```text
EXPO_PUBLIC_API_URL=https://hbic-calgary.vercel.app
```

Optional future adapters are reserved in `.env.example`:

```text
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Firebase Setup

1. Use the existing production Firebase/Google Cloud project; do not create a second project.
2. Confirm Firestore, Auth, Storage, and Cloud Messaging are enabled for the authorized production account.
3. Copy `.env.example` to `.env.local` in each app as needed.
4. Add the public Firebase config values and Firebase Admin service account values.
5. Deploy rules from `backend/firebase`.
6. Set admin custom claims for approved admins when Firebase Auth is enabled:
   - `superAdmin`
   - `director`
   - `caretaker`
   - `editor`

## Seed Starter Data

Configure Firebase Admin credentials, then:

```bash
npm run seed
```

This writes starter prayer times, iqamah times, Jumu'ah schedule, Ramadan/Eid cards, announcements, events, donation categories, media items, volunteers, push logs, and audit logs.

## Updating Prayer and Iqamah

- The server-side effective HBIC schedule is the single prayer source for the TV, website, iOS, Android, Watch, widgets, and complications.
- Automatic prayer and iqamah values come from the existing HBIC Iqamah.ca adapter, with a five-minute server refresh window and last-successful Firestore fallback.
- Active admin overrides are resolved centrally as `override ?? automatic`; clearing one returns that field to the latest Iqamah.ca value.
- Authorized caretaker/director/admin users can manually adjust iqamah times through the admin dashboard.
- Mobile/native clients consume the resolved HBIC API and never fetch Iqamah.ca independently.
- Every publish should write to `auditLogs`, including the source status, sync timestamp, manual override status, adjustment notes, and actor.
- Jumu'ah has two khutbah/iqamah entries.
- Ramadan and Eid cards are seasonal and admin-controlled.

See `docs/prayer-master-schedule.md` for the verified flow and failure behavior.

## Donation Flow

The app and website hand off to `https://hbic.ca/` by default. Replace `settings.donationUrl` in Firebase/admin when HBIC provides the exact official donation URL.

No in-app payment is claimed or implemented yet.

## Media Videos

Place the Taraweeh recitation clip at:

```text
apps/public-web/public/media/videos/taraweeh-2025-recitation.mp4
```

Optional poster image:

```text
apps/public-web/public/media/videos/taraweeh-2025-recitation-poster.jpg
```

Recommended video:

- MP4 format
- compressed for web delivery
- kept under a reasonable file size where possible
- poster image included for faster first paint and a respectful thumbnail

The public Media page uses an HTML5 video player with controls, `preload="metadata"`, no autoplay, and no looping audio.

HBIC Youth links:

```text
Instagram: https://www.instagram.com/hbicyouth/
YouTube: https://www.youtube.com/@hbicyouth
TikTok: https://www.tiktok.com/@bilalyouth
```

## Notifications

Supported notification types:

- prayer reminder
- iqamah reminder
- Jumu'ah reminder
- announcement
- urgent announcement
- event reminder
- youth program reminder
- sisters program reminder
- Ramadan suhoor reminder
- Ramadan iftar reminder
- Taraweeh reminder
- Eid prayer reminder
- donation campaign reminder
- volunteer opportunity
- media update
- livestream alert
- iqamah change

Urgent announcements are intentionally separate so regular reminders do not become noisy.

Mobile notification support:

- users can save notification preferences on device
- Expo push token registration refreshes on launch and when the native token changes
- notification taps route to the relevant screen such as Prayer, Events, Media, Donate, Youth, or Programs
- local reminder scheduling is available for safe on-device tests
- admin notification sending records Expo ticket IDs and can check delivery receipts
- invalid or unregistered tokens are disabled after receipt processing

Before production push launch:

- enable Firebase on the existing `hbic-calgary-prod` Google Cloud project using an owner account
- register Android package `ca.hbic.calgary.app` and add its Firebase client configuration
- upload a dedicated least-privilege FCM V1 service account to the existing EAS project
- configure APNs for the existing Apple bundle identifier from a paid Apple Developer account
- send notifications from trusted admin/server code only
- never place push service secrets in the mobile app or public website

## Urdu Support

Translation keys live in `packages/shared/src/i18n`.

Current Urdu strings are starter translations for major navigation and prayer words. Expand them with reviewed community translations before launch.

## Assets

Used provided assets:

- main HBIC logo
- HBIC Youth logo
- secondary black HBIC logo
- masjid exterior photo
- winter exterior photo
- interior prayer hall photo

Mobile paths:

```text
apps/mobile/assets/brand/
apps/mobile/assets/photos/
```

Website/admin paths:

```text
apps/public-web/public/brand/
apps/public-web/public/photos/
apps/admin-web/public/brand/
```

## Apple Widgets And Watch

Tracked native Swift targets live in `apps/mobile/targets` and are regenerated by
Expo prebuild. The Apple implementation includes:

- iPhone and iPad Home Screen widgets
- Lock Screen accessory widgets
- a native Masjid Bilal Watch app
- Watch complications and Smart Stack content
- next-prayer, adhan, iqamah, countdown, and Jumu'ah data from the shared published snapshot
- validated App Group caching and WatchConnectivity updates

Run `npm run native:sync:ios` followed by `npm run native:verify:targets` from
`apps/mobile` after regenerating the native project. See
`apps/mobile/targets/README.md` for the exact architecture and build command.

## Apple Vision Pro

The existing Masjid Bilal iOS/iPadOS app is the visionOS-compatible version. It
uses Apple's Designed for iPad/iPhone compatibility path so prayer times,
published admin content, events, donations, media, settings, notification
controls, and the licensed Adhan preview stay in the same app and bundle ID.

Run the Xcode and simulator gate described in
`docs/visionos-compatibility.md`. Apple Vision Pro availability remains a
separate App Store Connect gate and must not be inferred from an iPhone build.

## Remaining Production Content

- Confirm official donation URL
- Ramadan/Taraweeh/Qiyam timetable when seasonal
- Eid prayer date, times, and location
- Reviewed service descriptions
- Reviewed About/Mission text
- Admin user emails and roles
- Notification sending policy
- YouTube API key if automatic media sync is desired
