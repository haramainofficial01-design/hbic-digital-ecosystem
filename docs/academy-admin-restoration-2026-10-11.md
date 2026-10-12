# Academy admin feature restoration — October 11, 2026

## Cause

The release branch used by the refreshed admin omitted the Academy work in
`c12b01a`, `7b9196e`, `900092c`, `6980656` and `3b50139` on the separate
Academy preview branch. The layout refresh itself did not delete those controls;
they were absent from its source baseline. Restore only the relevant Academy
features, not that branch's separate Checkout refactor or test environment.

## Restored and protected

- Staff-approved per-student tuition exemption controls, family/student listing
  and search filter; fully exempt families are clearly separated from tuition due.
- Exempt students remain enrolled, keep their pass and appear on attendance.
- Unpaid/future tuition uses the non-exempt child count; approved card exemption
  updates use no proration, pause all-exempt collection and never create a charge.
- Paid ledgers and receipts remain unchanged. Repeated exemption requests do not
  duplicate Stripe operations or audit entries. Withdrawn registrations cannot be
  modified through the exemption endpoint.
- Actual cash/card receipts are distinct from operational non-exempt tuition
  summaries. Later exemptions and withdrawals cannot erase money already received.
  Academy tuition is not mixed with donations or represented as bank payout totals.
- Separate boys/girls/unassigned attendance rosters with editable staff grouping.
  Existing explicit assignments take precedence over editable name suggestions.
- Valid Monday/Thursday date selection and explicit closure validation, including
  class-specific closures. Public holidays remain ordinary class dates.
- Existing registrations, withdrawal history, class placement, pass replacement,
  check-in, cash receipt, payment arrangements, undercharge preview, announcements,
  calendar, pricing and contact controls retained.
- The refreshed layout, authenticated access and hidden-camera cleanup retained.
  Attendance uses page scrolling instead of clipped nested rosters; narrow-screen
  date/class selectors and exemption checkboxes remain readable.

No family is exempted, charged, paid, checked in or migrated from a test database
merely to validate this release. No mobile build, prayer-source change, domain or
new hosting project is required.

## Verification

- Focused Academy regression coverage: exemptions, cash reminders, webhook,
  cancellation/Checkout safety, payment reports, term dates and attendance.
- Both admin/public typechecks and production builds pass (existing unrelated
  lint warnings remain warnings).
- Actual React Academy component exercised in Chromium with synthetic records:
  104 section/viewport/theme checks, no horizontal overflow or browser errors.
  Attendance save/group change and exemption confirmation tested without live writes.
- Phone and desktop screenshots use synthetic test records only.

## Production verification

- Release source: `348bdb735909220146092641bcd4bf508868debe`.
- Public/backend: `dpl_6FMeEvAeXMgr8fNSwqRvd3w65JkE`, READY production,
  existing `hbic.ca` and aliases preserved, `npm run build:web` confirmed.
- Admin: `dpl_FbPk5k8d6AJxX25aSRP2sbD3XHNK`, READY production,
  existing `hbic-calgary-admin.vercel.app` preserved, `npm run build:admin`
  confirmed. Both deployment metadata records identify the exact release SHA.
- Public Firebase remains `hbic-calgary-prod`, live billing remains live,
  and existing sensitive server environment values were preserved, not replaced
  by placeholders or preview credentials.
- Fresh no-cache HTTP 200 with actual content: website, Academy, admin and
  `/api/display`. The new exemption route returns 401 before any write for an
  unauthenticated request, rather than 404 or public access.
- Verified through the existing signed-in production Chrome session: records
  load in live mode; existing exempt-family records appear; the exemptions tab,
  actual cash/card breakdown, non-exempt tuition breakdown and correction preview
  are present; separate attendance rosters, group selectors and valid class dates
  render. No live exemption, attendance, receipt or card change was submitted.
- The focused regression suite has 45 tests, plus the 104 browser checks.

Mobile/store binaries were not rebuilt; this is a dashboard/backend restoration.
