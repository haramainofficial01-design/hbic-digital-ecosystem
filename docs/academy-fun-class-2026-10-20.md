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

Production deployment and alias verification are recorded separately after the
verified source is committed. Existing authenticated calendar endpoints remain
private; anonymous requests must not expose parent data.
