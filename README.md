# HBIC Calgary App Ecosystem

Standalone project for **Hazrat Bilal Islamic Centre** / **HBIC Calgary**.

This folder is intentionally separate from the Haramain Travel app and Haramain Central website.

## Structure

```text
hbic-calgary-app/
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
    ios/          WidgetKit scaffold notes
    android/      Android widget scaffold notes
```

## What Is Built

- Mobile tabs: Home, Prayer, Events, Donate, More, with dedicated Media, Youth, Programs, Contact, About, Settings, Notifications, Language, and Event Detail screens
- Mobile identity: app name is **HBIC Calgary**, with a modern crescent/masjid/calligraphic flame icon and matching splash mark
- Mobile appearance: Light, Dark, and System theme modes are persisted locally on device
- Prayer/iqamah system with adhan, iqamah, next prayer, countdown, Jumu'ah, Ramadan, Eid, and notification toggles
- Admin dashboard for prayer/iqamah, Jumu'ah, announcements, events, programs, donations, media, volunteers, push notifications, settings, users/roles
- Public website with Home, Prayer Times, Events, Media, Donate, Programs, Youth, Contact, About
- Firebase-ready backend, security rules, storage rules, Cloud Functions, and seed data
- Push notification architecture with Expo mobile registration and Firebase function sending scaffold
- English/Urdu translation structure
- Widget-ready data model and native next-step notes
- Branding/photo assets from the provided HBIC images

## Install

```bash
cd hbic-calgary-app
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
- Publish Changes validates content, writes the published document, stores a version copy, and revalidates public pages
- revalidated paths: `/`, `/prayer-times`, `/events`, `/donate`, `/programs`, `/youth`, `/media`, `/contact`, `/about`

If Firebase Admin credentials are missing, the public website and mobile app fall back to bundled default content. Admin saving and publishing fail clearly until credentials are configured.

Required production environment variables on the public web deployment:

```text
NEXT_PUBLIC_API_URL=https://hbic-calgary-app.vercel.app
ADMIN_SECRET=
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
NEXT_PUBLIC_API_URL=https://hbic-calgary-app.vercel.app
```

For local admin testing against the local public website server, set:

```text
NEXT_PUBLIC_API_URL=http://localhost:3100
```

The admin publish key is entered in the admin dashboard and sent to the public API as `X-Admin-Secret`. For a more advanced production setup, replace this simple server-side gate with Firebase Auth custom claims.

Required mobile build variable:

```text
EXPO_PUBLIC_API_URL=https://hbic-calgary-app.vercel.app
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

1. Create a Firebase project.
2. Enable Firestore, Auth, Storage, and Cloud Messaging.
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

- Adhan/prayer times are modeled as an iqamah.ca-linked timetable source.
- Iqamah baseline data can also come from iqamah.ca, then be reviewed by HBIC.
- Authorized caretaker/director/admin users can manually adjust iqamah times through the admin dashboard.
- Publishing prayer/iqamah values writes the shared published content record consumed by both the public website and mobile app.
- Every publish should write to `auditLogs`, including the source URL, imported timestamp, manual override status, adjustment notes, and actor.
- Jumu'ah has two khutbah/iqamah entries.
- Ramadan and Eid cards are seasonal and admin-controlled.

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

- users can save local notification preferences on device
- Expo push token registration is scaffolded in the mobile app
- notification taps route to the relevant screen such as Prayer, Events, Media, Donate, Youth, or Programs
- local reminder scheduling is available for safe on-device tests
- admin notification composer uses shared categories, default audience, tap route, schedule fields, and respectful-use guidance

Before production push launch:

- configure the Expo/EAS project for push credentials
- configure APNs/FCM credentials for production builds
- store device push tokens in Firebase/Firestore through an authenticated endpoint or Cloud Function
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

## Widgets

Native widgets are scaffolded in `widgets/ios` and `widgets/android`. Expo managed workflow needs native targets after `expo prebuild`.

Planned widgets:

- next prayer
- next iqamah
- Jumu'ah reminder
- Ramadan iftar/suhoor
- upcoming event

## Real Data Needed From HBIC

- Confirm official donation URL
- Current monthly prayer timetable source or CSV/PDF
- Current iqamah times
- Jumu'ah first/second khutbah and iqamah times
- Ramadan/Taraweeh/Qiyam timetable when seasonal
- Eid prayer date, times, and location
- Reviewed service descriptions
- Reviewed About/Mission text
- Admin user emails and roles
- Notification sending policy
- YouTube API key if automatic media sync is desired
