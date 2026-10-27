# Public hosting usage optimization — October 27, 2026

## Scope

Preserve the current public website, display, published prayer resolver, manual
overrides, Academy/payment APIs, security safeguards and media availability.
No hosting plan, credentials, billing permissions, app-store build or automatic
deployment settings are changed by this source update.

## Changes

- Cache up to 16 native ICU date and Hijri formatter instances per formatter
  type. Dates, effective timezones and approved Hijri adjustments are still
  evaluated on every call; no schedule result is cached by this change.
  The registered mobile Hijri formatter retains precedence.
- Bilal's first-visit tour reads the existing shared display client, coalescing
  the rail, occasion styling and tour requests. Existing prayer quiet-window,
  hidden-page and one-time-tour safeguards remain.
- Generate the public video catalogue before local development and production
  builds. The Media page checks this catalogue instead of calling a dynamic
  filesystem existence check. That check previously caused the entire public
  directory, including a 78.16 MB film and 12.36 MB browser WASM runtime, to be
  traced into the Media server function. The files remain CDN assets. Wallet
  generation still includes its required logo.

## Verification

- 59 prayer, formatter, synchronization, display and read-cache tests passed.
- Nine companion/browser/public-read tests passed, including shared requests,
  quiet-window suppression, hidden pages, persistence and all supported tour
  languages. Two of the public-read tests overlap the first suite.
- Public web and shared package typechecks passed. Scoped lint found only the
  pre-existing Media fallback image warning.
- The local production build passed. The Media function trace is 9.96 MB and
  contains no public assets; the Wallet route still traces its required logo.
  The generated catalogue matches the shipped public videos.

A paired local benchmark compared the original implementation at
`0c94984` with this update, using the same in-memory content and five fixed
instants (including the existing Alberta-time transition). Each implementation
ran 3 batches of 100 snapshots per instant: 1,500 snapshots per implementation.
Full snapshot objects were equal at every instant. Mean measured process CPU
time was 3.9413 ms before and 0.4650 ms after (88.20% reduction for this specific
operation). This is not a claim of an 88% reduction in total Vercel CPU or cost.
Raw batches, snapshot hashes and benchmark source hash remain in local ignored
QA evidence under `output/usage-optimization/verified.json`.

## Deployment

Source commit `546d3af7665ee9a5c7ed56311619eb4a9a79d69f` was pushed, built
and promoted through the existing public Vercel project:
`dpl_AwegsTqcjsShhgDHziHFnZ1wkDdf` (https://hbic.ca). The hosted function
bundle shown by Vercel is 3.36 MB, compared with 98.46 MB in the previous
public build. This is the reported bundle-size comparison, not total
deployment storage: public CDN assets still exist.

The staged release passed 13 checks: public/home, Media, display and potluck
pages; card-payment availability; canonical adhan/iqamah and instant equality
with prior production; the app-content contract/version; Bilal; capacity
limits; private-route authorization; and range serving of the community film.
After promotion, live pages, app-facing APIs and billing availability remained
healthy; the existing admin entry still rendered its sign-in and navigation.
No payment was initiated, and private payment workflows were not exercised.

Rollback references retained include the previous public deployment
`dpl_G5qRjq1C3P8FwbdTchi24mbxbL8j`, its predecessor
`dpl_ARFvcQKWgu5dB5kMye78BuzcHjZY`, and the unchanged admin deployment
`dpl_6r2kGVLE3cqfC2uVp9D7bZt1qqG7` plus its previous two ready releases.

## Owner-approved deployment cleanup and retention

The owner approved removal of superseded, unaliased HBIC deployments while
protecting current deployments, two recent rollback versions per project and
every aliased deployment. The complete paginated inventory was checked.
105 superseded HBIC deployments were deleted through Vercel (67 public and
38 admin); no deletion failed. Seven public and four admin deployments remain,
including current releases, protected recovery versions and aliased releases.
Other projects were excluded. Every existing alias name was retained;
only the verified public promotion changed its production targets. Detailed
inventory and deletion results remain private outside the repository under
`~/Library/Logs/HBIC Usage/2026-10-27/`.

To prevent new accumulation, the public and admin projects now retain
superseded production and pre-production deployments for seven days, and
cancelled/errored builds for one day. The pre-existing `deploymentsToKeep: 10`
setting remains unchanged. Vercel's production-alias/recent-release exceptions
still apply. Both settings were saved in the dashboard and confirmed through
the project API. No team-wide policy or unrelated project was changed.

Build/install commands, framework, output/root directories, Node major,
resource settings, cron settings, environment credentials and deployment
protections were compared before/after and remained equal. No paid plan or
add-on was enabled.

Usage is not a real-time free-disk counter. Vercel records daily project
storage maxima and aggregates them across the billing period; deletion and
smaller future outputs do not erase historical consumption. See
[Vercel Deployment Storage](https://vercel.com/docs/deployment-storage) and
[retention exceptions](https://vercel.com/docs/deployment-retention).
