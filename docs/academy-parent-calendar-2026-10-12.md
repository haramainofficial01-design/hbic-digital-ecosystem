# Parent Academy calendar

The authenticated website and shipped app now use the same calendar component.
The Expo Academy route remains the existing secure website WebView, not the
retired native registration screen. No registration, billing, staff calendar,
holiday, notification, or database behavior is changed.

## Access

- Website: sign into Quran Academy. The calendar is immediately after the parent
  account heading, before updates, children and tuition. The compact signed-in
  header also links directly to it.
- App: Quran Academy has a Calendar shortcut beneath its toolbar. It scrolls and
  focuses the same parent calendar; before sign-in it goes to the account panel.
  It is disabled outside the HBIC Academy page, including Stripe Checkout.
- Both: next class, readable date/day, Calgary time and a Monday-first month grid
  with previous/next month buttons. Tap a marked day for its schedule and notes.
  A View full schedule button also groups all upcoming entries by month. Special Thursdays,
  explicit closures and changed times have distinct text labels, not just color.
  Staff notes remain visible. Past dates are excluded. A future enrollment start
  is respected for the next-class summary; shared notices remain available.
- Final February 1 class and the Ramadan/Eid break remain clear. The UI does not
  invent any classes or restart dates. Authenticated API data is authoritative.

## Verification

Focused model tests cover real month grids and leap years, sorting, calendar-only date formatting, past/invalid
dates, next-month starts, explicit closures, special Thursday, Thanksgiving
class, final class and break. Existing attendance tests verify schedule behavior
remains unchanged.

Headless Chromium renders the actual parent component and CSS at 320, 390, 768
and 1280 pixels with an explicitly synthetic authenticated session. It verifies
prominent placement before tuition, no horizontal overflow, month navigation,
day selection, expansion/collapse,
staff changed-time notes and refresh failure/recovery. Authenticated content
requests are retained. The app shortcut is exercised separately against a DOM
adapter for HBIC, Stripe, reduced motion and missing targets.

Optional screenshots (`HBIC_ACADEMY_CALENDAR_SCREENSHOTS=1`) are fixture QA
images, **not** real-family records, live production verification or store
screenshots. No interactive device windows or foreground apps are needed.

Changes are source-only until separately released through the existing workflow;
no production deployment or store submission is implied by committing them.
