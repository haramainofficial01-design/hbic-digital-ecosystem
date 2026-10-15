# Masjid Bilal TV prayer display

The prayer-hall display is a public, read-only kiosk page designed for Amazon Fire TV Silk and fixed screens. It intentionally shows only Masjid Bilal branding, Calgary date/time, compact current Calgary weather, next prayer/countdown, today’s prayer and iqamah times, Jumu’ah, one optional notice, hbic.ca, verified social accounts, and the website/app QR.

## URLs

- Public kiosk: `https://hbic.ca/display`
- Focused staff editor: `https://hbic.ca/display-admin`
- Public display JSON: `https://hbic.ca/api/display`
- Compact current weather JSON: `https://hbic.ca/api/display/weather`

The staff editor requires the same admin publish key as the main HBIC admin dashboard. The key is stored only in that browser’s local storage and sent in the existing `X-Admin-Secret` header.

## Canonical data rule

There is one prayer schedule. `/display` reads the same published content and generated prayer snapshot as the public website, iOS/Android apps, widgets, and Apple Watch.

- Adhan times come from the existing HBIC timetable integration.
- Iqamah edits in the focused editor update the canonical iqamah fields and existing shared override records.
- Jumu’ah edits update the existing canonical Jumu’ah schedule.
- Publishing uses the existing draft/publish transaction, version preconditions, page revalidation, and device refresh signal.
- Only the title, visibility toggles, weather visibility, QR visibility, and single short notice are TV presentation settings.
- There are no TV-only prayer, iqamah, Jumu’ah, source, or schedule overrides.

## Refresh and offline behaviour

The kiosk updates its digital seconds and analog hands every second. The minute-resolution countdown and prayer cards update at their next visible minute change or exact adhan/iqamah boundary, without unnecessary second-by-second rerenders. It checks the display endpoint every minute, refreshes immediately after reconnection and at Calgary date rollover. Current weather refreshes every 15 minutes and is omitted silently if unavailable, so weather can never obscure or interrupt prayer times.

The live clock has its own wall-second-aligned timer. The sky recomputes every 30 seconds; the prayer schedule wakes only when its visible content can change. When the page is hidden, live timers and network refreshes pause and recalculate immediately when it becomes visible again. Only the active weather scene is mounted. The six prayer tiles use static translucent layers instead of continuously repainting GPU backdrop blurs; the visible glass styling and weather effects remain. Identical display polls do not replace the rendered tree or rewrite its local cache, and stalled requests time out so later reconnects can retry. Browser storage is best-effort, so disabled or full local storage does not prevent the display from loading or refreshing.

Each changed, confirmed prayer payload is stored as the last-known-good browser snapshot. A newer cached snapshot is never overwritten by an older server response during startup, and a snapshot for yesterday is never selected for today. During a network interruption the display keeps showing the last confirmed schedule and labels it as cached while retrying. A recovered connection updates the screen without navigation or a full-page reload.

## Fire TV installation

1. Open Amazon Silk on the Fire TV.
2. Visit `https://hbic.ca/display` and add it as a favourite/bookmark.
3. Put Silk into full-screen mode and disable the screen saver/sleep timer for the display device.
4. Confirm the television’s date and time are automatic. The kiosk itself renders all prayer logic in `America/Edmonton`.
5. Verify the full schedule is inside the television’s safe area. The page is designed for 1280×720, 1366×768, 1920×1080, and 4K without scrolling.
6. On the actual Fire TV, leave the page open for several minutes and confirm the seconds and countdown advance smoothly, active weather remains visible, and reconnecting Wi-Fi refreshes without reloading. Browser emulation and a successful site build do not substitute for this device check.

Keep the previous television system available until staff have verified the production URL on the actual Fire TV and deliberately switched the input/bookmark.

## 15 October 2026 performance verification

The display-only optimisation keeps the same canonical prayer source, daily
rollover, Jumu’ah, notice, current weather, QR and social sections. Twelve TV
unit tests and the public-web typecheck/build pass. Headless production-render
checks at 1280×720 (clear), 1920×1080 (rain), and 3840×2160 (snow) show six
prayer cards, advancing clock seconds, no document overflow and no browser
exceptions. The rendered rain layout was visually inspected. A simulated
display API failure retained the last confirmed schedule while seconds
advanced; reconnect cleared the cached-state label without reloading.

These checks do **not** prove that Amazon's Downloader browser on the masjid's
Fire Stick will remain stable over a full prayer day. Staff should use the
documented Silk kiosk setup, test the updated public URL on the actual device,
and keep the previous display available until it passes that test.

## Staff publishing

1. Open `/display-admin` from a trusted staff computer, or choose **Prayer Display** in the existing web admin dashboard.
2. Enter the existing admin publish key and select **Load protected draft**.
3. Edit canonical iqamah/Jumu’ah values or the small set of presentation options.
4. Choose **Save & publish everywhere** and confirm.
5. Wait for the success message confirming both the published content version and live `/api/display` verification.

The optional notice is limited to 140 characters and can have a start and expiry time. Use it for one immediately useful message, such as Jumu’ah door closure or parking guidance. Do not use it as an event feed or rotating banner.
