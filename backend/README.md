# HBIC Calgary Backend

This backend scaffold uses Firebase because it is a practical fit for Expo, web admin auth, Firestore content, Storage, Cloud Functions, and push notifications.

## Collections

- `settings`
- `prayerTimes`
- `iqamahTimes`
- `jumuahSchedules`
- `ramadanSchedules`
- `eidSchedules`
- `announcements`
- `events`
- `programs`
- `donationCategories`
- `mediaItems`
- `volunteerOpportunities`
- `pushNotificationLogs`
- `users`
- `adminRoles`
- `auditLogs`
- `notificationTokens`

## Admin Roles

- `superAdmin`: everything
- `director`: announcements, events, prayer, notifications, settings
- `caretaker`: iqamah, Jumu'ah, urgent announcements, notifications
- `editor`: events, media, programs

Use Firebase custom claims:

```bash
firebase auth:import ...
```

Then set `adminRole` with a controlled script or Firebase Admin SDK.

## Seed Demo Data

After configuring Firebase credentials:

```bash
npm install
npm run seed
```

The seed writes demo prayer, iqamah, Jumu'ah, Ramadan, Eid, announcements, events, donations, media, volunteers, and audit logs.

## Push Notifications

`sendCommunityNotification` is a callable Cloud Function. It restricts sending to `superAdmin`, `director`, and `caretaker` roles and writes a notification log.
