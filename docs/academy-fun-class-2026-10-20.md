# Academy Fun Class — last Thursday

The shared Academy schedule now labels the last Thursday of each month **Fun
Class**, replacing the previous third-Thursday default. The 2026–2027 term dates
are October 29, November 26, December 31 and January 28. Regular class time remains
5:30–7:00 PM Calgary time. The term still ends February 1, 2027.

The parent calendar, next-class summary, date badges and legend use the same
label. The admin calendar type is also named Fun Class. The new parent-facing
label and monthly-rule sentence have Urdu, Dari and Arabic translations in the
existing shared catalogue.

Staff-authored special-class overrides still replace that month's default;
explicit closures and changed times still take precedence. This change does not
write any calendar, enrollment, payment or notification records, and does not
rewrite previously accepted tuition policies.

## Verification

- 28 focused tests pass: Academy schedule, tuition/enrollment regressions,
  attendance, calendar presentation and shipped app calendar navigation.
- The separate server-context holiday/closure regression passes (1 test).
- Schedule cases cover four/five Thursdays, December–January rollover,
  mid-month loading, term boundaries and no duplicate special class after a
  staff override.
- Actual parent components/CSS pass headless Chromium at 320, 390, 768 and 1280
  pixels, including Fun Class selection, refresh failure/recovery, closures,
  changed times, month navigation and no horizontal overflow. Parent data and
  authentication in this test are explicitly synthetic.
- The actual admin component passes its 104 light/dark responsive checks,
  existing exemption/payment/attendance regressions and the Fun Class option
  assertion. No live record is written.
- Shared, public-web and admin-web type checks pass. Both production builds
  pass with existing unrelated CSS/lint warnings.

## Delivery

The shipped iOS and Android `quran-academy` route loads
`https://hbic.ca/quran-academy` in its existing authenticated WebView. Website
deployment delivers the calendar change to those installed apps when Academy is
reloaded; no new native dependency, OTA, binary or store approval is needed for
this web-backed change. This does not claim a physical-device test.

## Live release

Source `ffe67a2b8f862199fb86ff793c16746a798c9935` is committed and pushed to
`feature/quran-reader-practice` in the canonical private repository. Both uploads
were made from isolated exports of that exact commit, without local secrets or
output caches. Only the admin export's root hosting configuration was replaced
with the existing `vercel.admin.json`, as required by the established workflow.

- Public deployment: `dpl_EWGi8BsydqxAVrQ6TVhVNrfhXhQR`.
- Admin deployment: `dpl_AR6oi4jg8rm75RnPc4QGj8LUfqBN`.
- Both are READY. Vercel API checks confirmed the exact source metadata and the
  correct workspace build commands/output directories.
- Staged public/admin checks passed before promotion. Final alias checks confirm
  `hbic.ca` and `www.hbic.ca` point to the public deployment, and
  `hbic-calgary-admin.vercel.app` points to the admin deployment.
- At `2026-10-20T23:32:15.253Z`, the live Academy page returned HTTP 200 and all
  14 referenced client scripts loaded; the published code contains the new
  monthly rule and Fun Class badge. The live admin's eight client scripts
  include the renamed special-class option.
- Both unauthenticated Academy-content endpoints still return HTTP 401 without
  calendar/private parent content. The www Academy URL redirects to the
  canonical URL with HTTP 308.
- No real-family signed-in session was inspected. Local rendered interaction
  tests use synthetic records; they are not claimed as production-family or
  physical-device tests. No notification was sent or existing record rewritten.

Previous public deployment `dpl_46YRgpU9X68B2uymxHjz4cztYqN5` and admin deployment
`dpl_6VE3jyDdB55LzCB5LneBzpTyHRxL` remain available as rollback references.
