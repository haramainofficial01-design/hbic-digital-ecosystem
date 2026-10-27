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

Pending production build, verification and promotion. Existing deployment
`dpl_G5qRjq1C3P8FwbdTchi24mbxbL8j` is the rollback reference.

Old-deployment cleanup requires the owner's separate choice. A candidate
inventory excludes other projects, all aliased deployments and the three most
recent ready deployments per HBIC web project. No old deployment has been
deleted as part of this source work.
