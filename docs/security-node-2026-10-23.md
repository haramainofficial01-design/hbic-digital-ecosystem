# Node.js security response — October 23, 2026

## Verified advisories and scope

- [Node.js October 21 security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases): minimum fixes are 22.23.4, 24.22.1 and 26.12.1. This includes the Brotli decoder memory-corruption issue CVE-2026-111497.
- [Vercel advisory](https://vercel.com/kb/bulletin/node-js-security-advisory): managed Node 22/24 patch versions are controlled by Vercel. Its automatic WAF protection does not cover malicious fetched responses or replace runtime patching.
- [Next.js image-processing advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw): existing 15.5.24 also needed the 15.5.28 maintenance patch and sharp >=0.35.5.

No successful compromise has been established. Patching, limited log review and
credential rotation are separate tasks; this document must not be read as a
forensic clearance or confirmation that all credentials were rotated.

**Current status: application security hotfix deployed; managed Node runtime
patching and credential rollover remain unresolved.**

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

## Deployment and actual runtime evidence

Verified source `487faf7dc18fc12b56b01aa33454a413702ceda7` is committed and pushed.
Both deployments used isolated exports of that source, with the established
admin root-configuration packaging. Hosting logs confirm the old build cache
was skipped, `npm ci` ran, Next.js 15.5.28 was selected, and the builder passed
the Node 24.22.1 security check.

- Public hotfix: `dpl_7a2XHs2rmS8x5ZK2wFU3EuDoWkY9`.
- Admin hotfix: `dpl_BYVoQY23zYQYP7QnARaYaFzm9QyY`.
- Both were staged and verified before promotion. The public site, Academy,
  Donate, TV display, content version and public billing configuration returned
  HTTP 200. Card availability remains true. Diagnostics and parent calendar
  endpoints still return HTTP 401 anonymously without private data. A trusted
  local PNG passed actual server-side image optimization with HTTP 200.
- Post-promotion checks at `2026-10-23T22:25:29.727Z` confirm the public routes and
  existing admin domain remain available. No live payment object was created to
  test the hotfix.
- The post-commit text/configuration scan checked 1,724 reachable Git blobs and
  found no matching Stripe credential strings.
- Config/public/admin type checks, five runtime-policy tests, 28 payment/auth/
  schedule regressions, three parent-calendar interaction/adapter tests and the
  admin's 104 responsive light/dark checks pass after patching.

### Important: the builder is not the serverless runtime

The actual deployed function cold-start log at `2026-10-23T22:20:38.384Z`, region
`pdx1`, reported **Node 24.21.0**, `patched: false`, and
`brotliDecoderFixPresent: false`. This is below the published 24.22.1 floor even
though the builder is patched. Do not describe the managed Node issue as fixed.

A minimal authenticated preview probe of the supported Node 22 alternative
reported **22.23.2** with the decoder-fix constant absent, below 22.23.4. It had
no payment code or customer data, never received a production domain, and was
removed after its result was preserved privately. No release/rollback
deployment was deleted. No unsupported custom runtime or unverified payment
host migration was attempted.

The application/image-processing fixes were promoted to reduce the existing
exposure while preserving functionality; they do not resolve this provider
runtime gap. The next required external action is Vercel confirmation and
deployment of the patched **function runtime**, followed by a new cold-start
verification. No replacement key should be considered safe merely because the
build logs show the patched version. No support email or private log was sent
to a third party without owner authorization.

### Access containment and rollback

Enabled Vercel's no-cost Standard Protection for the public project
(`prod_deployment_urls_and_all_previews`). All four existing public website/API
domains still returned HTTP 200 with JSON content. A prior deployment URL now
redirects anonymous callers to authentication with HTTP 302. Existing admin
protection remains unchanged. This protects archived/preview URLs without
changing production domain access, purchasing a plan or deleting history.

Previous public `dpl_EWGi8BsydqxAVrQ6TVhVNrfhXhQR` and admin
`dpl_AR6oi4jg8rm75RnPc4QGj8LUfqBN` remain recoverable for reference. They contain
the earlier affected framework packages; reverting to them is not a security
remediation. Credentials, financial records and private audit results are not
part of either release commit.

## Authorized provider escalation

On October 23, the owner approved sending the measured runtime versions,
region and deployment identifiers to Vercel Security. The escalation was sent
to `security@vercel.com` at `2026-10-23T23:47:43Z` and its Sent status and recipient
were independently verified through Gmail metadata. Its subject is
“Urgent: HBIC managed Node function runtime below CVE-2026-111497 security floor”.

The email requests confirmation of the managed function-runtime rollout and
the exact safe remediation, distinguishes build/runtime evidence, and does not
claim a known compromise. No API key, customer/payment record, raw log
attachment or secret was included. Provider confirmation and credential
rollover remain pending; email submission does not resolve the runtime gap.

A read-only check at `2026-10-23T23:48:24Z` confirmed the live diagnostics route
still rejects anonymous access with HTTP 401, but returned no new cold-start
runtime evidence in the retained log window. It therefore does not establish
that Vercel has upgraded the function runtime since the earlier measurement.
The owner's selected browser tab was not navigated, focused or changed.

## Provider routing correction and owner handoff

Vercel's authenticated automated reply to the escalation says
`security@vercel.com` does not monitor support requests and directs account and
product security support to `https://vercel.com/help`. The email was sent, but
**no monitored support case or human acknowledgement has been established**.
This supersedes any implication that sending the email opened a support case.

The owner-approved runtime/deployment evidence was also submitted through the
official authenticated `vercel feedback` command, with product `functions` and
type `bug`. The command confirmed “Feedback sent”. No secret, customer record,
payment information, raw log attachment or new permission was included. This
is a confirmed feedback submission, not a support ticket or a runtime fix.

The Help page was inspected in a hidden, separate in-app browser without
changing the owner's Chrome tab. It is signed out and offers Log In. The owner
needs to sign in to Vercel Help to reach the account-specific support options;
no login popup, paid plan or public community post was initiated.

The owner opened Stripe's API Keys page in the correct account. Read-only UI
inspection confirmed the existing restricted key name, “HBIC Quran Academy
Production”, with a masked token. No Reveal, Roll, Create, Edit, Expire or
permission-change action was performed. The runtime patch remains unconfirmed,
and the credential rollover remains owner-controlled and incomplete.

## Runtime recheck during the Fire TV revision

The existing public deployment emitted another cold-start diagnostic at
`2026-10-24T03:06:11.777Z` in `pdx1`: Node `24.21.0`,
`brotliDecoderFixPresent: false`, `patched: false`. The official Vercel advisory
still describes managed-runtime patching as rolling out. This is direct evidence
that the application/dependency updates and patched build machine have **not**
yet established a patched production function runtime. No credential rollover
or full security clearance is claimed. An owner-authenticated Vercel Help case
and subsequent runtime verification remain necessary.
