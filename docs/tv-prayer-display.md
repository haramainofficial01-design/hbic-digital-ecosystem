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

The kiosk updates its clock and countdown every second and checks the display endpoint every minute. It refreshes immediately after the Fire TV reconnects and at Calgary date rollover. Current weather refreshes every 15 minutes and is omitted silently if unavailable, so weather can never obscure or interrupt prayer times.

Each successful prayer payload is stored as the last-known-good browser snapshot. During a network interruption the display keeps showing that confirmed schedule and labels it as cached while retrying. A recovered connection updates the screen without navigation or a full-page reload.

## Fire TV installation

1. Open Amazon Silk on the Fire TV.
2. Visit `https://hbic.ca/display` and add it as a favourite/bookmark.
3. Put Silk into full-screen mode and disable the screen saver/sleep timer for the display device.
4. Confirm the television’s date and time are automatic. The kiosk itself renders all prayer logic in `America/Edmonton`.
5. Verify the full schedule is inside the television’s safe area. The page is designed for 1280×720, 1366×768, 1920×1080, and 4K without scrolling.

Keep the previous television system available until staff have verified the production URL on the actual Fire TV and deliberately switched the input/bookmark.

## Staff publishing

1. Open `/display-admin` from a trusted staff computer, or choose **Prayer Display** in the existing web admin dashboard.
2. Enter the existing admin publish key and select **Load protected draft**.
3. Edit canonical iqamah/Jumu’ah values or the small set of presentation options.
4. Choose **Save & publish everywhere** and confirm.
5. Wait for the success message confirming both the published content version and live `/api/display` verification.

The optional notice is limited to 140 characters and can have a start and expiry time. Use it for one immediately useful message, such as Jumu’ah door closure or parking guidance. Do not use it as an event feed or rotating banner.
