# Prayer persistence and Academy receipt totals

## Requested behavior

- Disconnect the retired AWS prayer adapter entirely, including legacy environment overrides.
- Adhan comes directly from Iqamah.ca's official date-keyed timetable at `https://iqamah.ca/salahschedule.js`, the same data source its website loads. This is data parsing, not remote script execution.
- HBIC staff controls iqamah and Jumuah. Existing enabled manual iqamah overrides become persistent without changing their selected values. Automatic weekly expiry and upstream next-week promotion are removed.
- Public content, prayer display and mobile/Watch/widget snapshots retain the canonical contract. Obsolete upcoming-week values are no longer exposed to older clients.
- Visible change alerts are processed only by the authenticated weekly job, scheduled for Sunday 00:00 America/Edmonton (Saturday night). Normal public reads and draft previews cannot send these alerts.
- Weekly claims are transactional and date-keyed; unchanged weeks stay quiet, and replay/concurrent invocations cannot double-send. An ambiguous provider failure is recorded rather than blindly retried.
- Current Vercel team is Hobby: the weekly cron is configured for midnight, but actual invocation can be within that hour. Exact-minute delivery is not guaranteed by this hosting plan. See https://vercel.com/docs/cron-jobs/usage-and-pricing.
- Production `CRON_SECRET` already exists on the public project. No new secret, account, domain or hosting project is required.

## Academy totals

Overview previously showed the non-exempt operational tuition allocation while Payments also showed actual retained receipts. These measure different things after exemptions/withdrawals.

Overview now uses the same actual cash/card receipt breakdown as Payments, with the month and cash/card amounts visible. The separate non-exempt tuition report remains clearly labelled; receipts, payments, exemptions, withdrawals and tuition charges are not modified by this display change.

## Verification before rollout

- 78 focused tests passed: prayer resolver, persistent overrides, source parser, AWS disconnection, outage backoff, canonical TV/Watch/widget contract, both prayer editors, weekly notification window/idempotency, prayer notification preferences, admin copy and Academy payment summaries.
- 104 actual Academy component layout checks passed, including synthetic Overview/Payments receipt equality; no live financial writes.
- 12 admin workspace browser tests passed across five widths, light/dark modes, reduced motion and accessible navigation.
- Public/admin typechecks and production builds passed. Existing unrelated lint/CSS warnings remain non-blocking.

## Production rollout

- Public: `dpl_CJinFsSB3QWkTTbrEAcXT1MxPHvo`, READY, source `e3eca3e962314204329b15baefe4b879b7574c7b` (deployment metadata uses its short SHA).
- Admin: `dpl_5jfq6onVeBjRR8KtYmc1tDdEDPHx`, READY, source `c64a2b99abc6072c5ed68c4e369f66bf71b4cae7`. This contains the full receipt-total and main prayer editor changes; the later public-only follow-up updates the separate display editor wording/persistence.
- The admin CLI reported an inherited public-alias conflict after its build completed. Independently checked the deployment and actual alias ownership: the admin alias points to the new admin build; public aliases remain on the public project. No domains/DNS were changed or transferred.
- Confirmed `hbic.ca`, `/prayer-times`, `/display`, `/display-admin`, `/quran-academy`, `/api/display?verify=final` and the admin production alias return HTTP 200 with real content.
- Compared all six live adhan times against the actual Iqamah.ca date record: exact match. Published iqamah and the display snapshot also match; no obsolete upcoming-week iqamah is exposed.
- Signed-in main admin's protected draft read shows the existing staff overrides as “Active — until changed.” No draft was saved or published during verification.
- Signed-in Academy Overview and Payments show identical real received totals, month and cash/card amounts. Non-exempt tuition remains a separately labelled allocation report. No family/payment/receipt records were modified to test this.
- Production weekly cron is enabled on the final public deployment with schedule `0 6 * * 0`; existing Academy jobs remain. Unauthenticated notification invocation returns 401. The Sunday clock window, changed-only behavior, concurrent/replayed job safety and ambiguous delivery failure handling are covered by isolated tests; a real future Sunday device delivery has not yet been observed.
