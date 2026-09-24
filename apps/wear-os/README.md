# Masjid Bilal for Wear OS

Native Kotlin + Compose Material 3 Wear OS app using the canonical HBIC prayer snapshot.

- Package: `ca.hbic.calgary.app` (must match the Android phone app for Data Layer security)
- Direct source: `https://hbic.ca/api/content/prayer-snapshot`
- Paired source: Google Play services Data Layer path `/hbic/prayer-snapshot-v2`
- Cache: last validated schema-v2 snapshot, with explicit cached/expired UI
- Surfaces: app, next-prayer tile, short/long text complication providers
- Time semantics: absolute instants issued by HBIC in `America/Edmonton`; the watch does not calculate a local mosque timetable

Build with the Android SDK/JDK documented in the release report:

```sh
../mobile/android/gradlew -p . test assembleDebug bundleRelease
```

The release bundle is intentionally unsigned locally. Google Play submission requires the same Play App Signing identity as the phone app.
