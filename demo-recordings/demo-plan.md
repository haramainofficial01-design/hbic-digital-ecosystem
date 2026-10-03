# HBIC Calgary Platform Demo Plan

## 1. Public Website Demo Flow

1. Start on the homepage and pause on the hero, prayer preview, announcements, and summer camp/program promotion.
2. Visit Prayer Times and show adhan, iqamah, Jumu'ah, and source/update messaging.
3. Visit Events and show the event cards, youth/program cards, and registration/contact paths.
4. Visit Donate and show the donation categories and donation call to action without entering payment details.
5. Visit Programs and Youth to show community services, youth content, and social links.
6. Visit Media and pause on Taraweeh 2025 Recitation and social follow links.
7. Visit Contact and About to show address, contact options, and community positioning.

## 2. Admin Dashboard Demo Flow

1. Open the dashboard overview in safe demo mode.
2. Show prayer, iqamah, and Jumu'ah management.
3. Show announcements, events, programs, donation content, media, contact, and seasonal settings.
4. Edit a small sample announcement or event.
5. Save draft.
6. Click Publish Changes and show the success state.
7. Show that the public site can read the published content through the API flow.

## 3. Mobile App Demo Flow

1. Open the iPhone simulator and launch HBIC Calgary.
2. Show splash/app logo if it appears.
3. Tap through Home, Prayer, Events, Donate, and More.
4. From More, open Media & Livestream, HBIC Youth, Programs & Services, Contact & Qibla, About HBIC, and Settings.
5. In Settings, briefly show theme controls and notification preferences.
6. Return to Home.

## 4. What To Show Director First

- Public website desktop recording.
- Mobile app recording.
- Admin dashboard recording after the public experience looks approved.
- Live public preview link only after confirming no demo/private wording is visible.

## 5. What To Hold Back Until Next Stage

- Source code.
- Production admin credentials.
- Vercel/Firebase tokens.
- Database console access.
- Unrestricted admin dashboard access.
- App Store, Play Store, push notification, and custom domain accounts.

## 6. Talking Points

- HBIC now has a public website, admin dashboard workflow, and mobile app experience designed around prayer times, iqamah, Jumu'ah, programs, media, donations, youth, and contact.
- The admin workflow supports draft edits and a Publish Changes path so normal content updates do not require a code deploy once production backend credentials are connected.
- The mobile app is designed to fetch published content from the same backend/API used by the website.
- Prayer and iqamah content is structured for internal live sync with manual admin override support.
- Widgets have been scaffolded for a next-prayer Home Screen and Lock Screen experience as a native follow-up milestone.

## 7. Payment/Staged Delivery Notes

- First stage: polished demo videos and public preview link.
- Next stage: connect production credentials, custom domain, real admin access, push notifications, and app store setup.
- Final stage: handoff source/admin access, production documentation, and maintenance plan after approval and payment milestones.

## 8. Remaining Production Requirements

- Confirm final director-approved content.
- Add real production `ADMIN_SECRET`, `REVALIDATION_SECRET`, and Firebase/Supabase/Postgres credentials in Vercel.
- Confirm the custom domain.
- Confirm donation provider and payment links.
- Confirm push notification certificates and Expo/EAS setup.
- Confirm App Store and Play Store accounts.
- Complete native widget integration after Expo prebuild.
