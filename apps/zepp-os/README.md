# Masjid Bilal for Zepp OS

Native Zepp OS 4 mini program using the official Device App + Side Service architecture.

- Side Service fetches `https://hbic.ca/api/content/prayer-snapshot`.
- Device App validates schema/version/masjid/timezone, caches the last valid snapshot, and resolves only the absolute Adhan/Iqamah instants supplied by HBIC.
- Offline, failed, stale, and expired states remain explicit; upstream failure never erases the last valid timetable.
- The source supports round 480px and square 390px device families through responsive Zepp layouts.

Before store publication, HBIC must create a Zepp Open Platform application and replace the development placeholder `appId` in `app.json`. Simulator/device preview also requires the Zepp OS Simulator or a compatible Amazfit device in Zepp Developer Mode.
