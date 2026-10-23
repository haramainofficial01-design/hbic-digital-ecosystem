# Node.js security response — October 23, 2026

## Verified advisories and scope

- [Node.js October 21 security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases): minimum fixes are 22.23.4, 24.22.1 and 26.12.1. This includes the Brotli decoder memory-corruption issue CVE-2026-111497.
- [Vercel advisory](https://vercel.com/kb/bulletin/node-js-security-advisory): managed Node 22/24 patch versions are controlled by Vercel. Its automatic WAF protection does not cover malicious fetched responses or replace runtime patching.
- [Next.js image-processing advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw): existing 15.5.24 also needed the 15.5.28 maintenance patch and sharp >=0.35.5.

No successful compromise has been established. Patching, limited log review and
credential rotation are separate tasks; this document must not be read as a
forensic clearance or confirmation that all credentials were rotated.

## Implemented safeguards

- Updated this Mac's Homebrew Node from 26.8.1 to 26.12.1 and its shared Brotli
  library from 1.2.0 to 1.2.1. Installed the patched 24.22.1 LTS runtime for HBIC
  verification. The default global Node remains patched 26.12.1.
- Pinned HBIC hosting to the patched Node 24 line, with `.nvmrc` set to 24.22.1.
- Both web applications reject unsupported/unpatched runtimes before dev, build
  or local start. The check verifies the version floor and upstream decoder-fix
  constant without running an exploit payload.
- The existing authenticated diagnostics endpoint includes non-secret runtime
  evidence. A cold-start log allows the actual serverless runtime to be checked
  without making diagnostics public or supplying a production administrator
  credential to a test. No environment values, keys or parent data are logged.
- Updated both Next.js applications to 15.5.28, sharp to 0.35.5 (prebuilt librsvg
  2.63.2), and compatible proxy-addr/shell-quote transitive security patches.
- Hosting installs use `npm ci` with the existing lockfile and disabled install
  scripts. Releases must use isolated committed-source exports, fresh builds
  without the previous build cache, and staged verification before promotion.
- No Stripe API version, billing rules, payment metadata, bank account, payout
  schedule, prayer configuration, mobile signing or store package is changed.
  These server/build changes do not require a native app-store release.

## Local checks

- Five runtime-security tests pass on patched Node 24.22.1 and 26.12.1.
- Twenty-eight payment, webhook-signature, authentication, donation-category and
  Academy schedule regressions pass after the dependency patches.
- Config/public/admin type checks and both production builds pass on 24.22.1.
- Safe PNG resizing succeeds with patched sharp; no malicious SVG or compressed
  exploit is sent to a service.
- The dependency audit's three critical findings are resolved. The audit still
  reports 23 high and 29 moderate findings across all workspaces, including
  older Firebase/Expo transitive dependencies. This is **not** a clean overall
  dependency audit. Those need separately verified compatible upgrades; no
  forced SDK downgrade or broad mobile/Firebase migration is included here.
- A scan of 1,711 reachable Git text/configuration blobs found no strings matching
  the documented Stripe secret/restricted/webhook credential patterns. This is
  not an exhaustive malware scan or proof that no secret was ever exposed.

## Investigation coverage and privacy

The existing Stripe CLI session matched the exact account identified in the
notice. A read-only, fully paginated seven-day snapshot is retained privately,
not committed here. Event records do not reveal every unsuccessful API call or
prove the activity was authorized. Full historical Workbench request-log review
remains separate; the CLI only tails new request logs.

Vercel rejected seven-day runtime/CDN log queries because of retention/plan
limits. A permitted last-30-minute runtime query returned no records before
release. No paid logging plan or additional account permission was enabled.
Firebase's existing CLI encountered a disabled API/permission error while listing
the project's functions; no Firebase
deployment or runtime is claimed verified or changed. The documented active
notification path remains Vercel/Expo, not the legacy Functions scaffold.

Private financial evidence and local audit output are stored outside Git under
`~/Library/Logs/HBIC Security/2026-10-23/`. Neither raw credentials nor private
charge/customer records belong in this repository.

## Required owner-controlled credential rollover

Follow [Stripe's key guidance](https://docs.stripe.com/keys#rolling-keys) after
the patched environment has been verified. This step is not complete merely
because the application has been deployed.

1. In the correct account's API Keys page, roll the existing HBIC restricted key
   with its current permissions. Do not broaden permissions or change payment
   settings. Keep a short overlap while deploying the replacement.
2. Enter the replacement directly into Vercel's sensitive production environment
   variable `ACADEMY_STRIPE_RESTRICTED_KEY`, not chat, source, a screenshot or a
   command-line argument. Preserve test/live separation and inspect any other
   consumer before expiring a shared key.
3. Redeploy the patched source. Verify authenticated/read-only Stripe access,
   Academy configuration, donation categorization and webhook delivery status
   without creating a live charge, subscription, refund or payout as a test.
4. Expire the previous key after the replacement deployment is confirmed. Audit
   other secret/restricted keys in the impacted account for exposure and usage.
5. Treat the webhook signing secret separately. If rolling it, use Stripe's
   overlap window, update `ACADEMY_STRIPE_WEBHOOK_SECRET` securely and verify the
   replacement before expiring the previous signing secret.

The owner must perform the credential-entry/confirmation actions. No key
rotation, previous-key expiration or webhook-secret rollover is claimed yet.
