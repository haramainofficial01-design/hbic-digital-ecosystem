# Node.js security response — October 23, 2026

## Verified advisories and scope

- [Node.js October 21 security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases): minimum fixes are 22.23.4, 24.22.1 and 26.12.1. This includes the Brotli decoder memory-corruption issue CVE-2026-111497.
- [Vercel advisory](https://vercel.com/kb/bulletin/node-js-security-advisory): managed Node 22/24 patch versions are controlled by Vercel. Its automatic WAF protection does not cover malicious fetched responses or replace runtime patching.
- [Next.js image-processing advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw): existing 15.5.24 also needed the 15.5.28 maintenance patch and sharp >=0.35.5.

No successful compromise has been established. Patching, limited log review and
credential rotation are separate tasks; this document must not be read as a
forensic clearance or confirmation that all credentials were rotated.

**Current status: application security hotfix and emergency application-level
Brotli containment are live. The owner-saved production payment-key setting
has been deployed and passed a real Stripe price read. Independent old-key
expiry verification, separate webhook-secret replacement and the managed
runtime patch remain unresolved. Containment is not a patched runtime or a
complete security clearance.**

### Emergency containment release — October 26, 2026

Source `8371b031eda4a936209319662722088a773834b1` was committed, pushed,
exported into clean staging directories and built without the previous cache.

- Public deployment: `dpl_5jzKBWSUsZGLNcR7yx5G6TExeuxC`.
- Admin deployment: `dpl_EyJwpPZWe3RRSECzErxk1v6ikRT6`.
- All four existing public domains resolve to the public release; the existing
  `hbic-calgary-admin-hbic.vercel.app` alias resolves to the admin release.
- Previous public `dpl_5AgbifSEhSEFMP19SiA6M4xbJBPz` and admin
  `dpl_BYVoQY23zYQYP7QnARaYaFzm9QyY` remain recoverable. Rolling back removes
  the additional containment and is not a security remediation.

Both apps use Next's documented startup instrumentation. On an unpatched Node
instance, the safeguard replaces the four public Node Brotli decompression
entry points with a local rejection before native decoding. Streaming errors
are asynchronous so HTTP clients can attach their error handlers. Existing ESM
named exports are synchronized using Node's documented builtin-export API.
Server fetches negotiate gzip/deflate instead. No TLS validation, authentication,
webhook validation or account permission is weakened. Patched instances retain
their original decoder and fetch implementation.

This is **application-level containment**, not a Node patch. It does not claim
to cover native addons, references captured outside startup control or other
vulnerabilities in the unpatched runtime. Legitimate Brotli-only upstream
responses are deliberately rejected until the runtime is patched. The native
image-processing dependency was separately updated in the earlier hotfix.

Eight runtime/containment tests pass. A separate process with simulated
unpatched evidence verifies six decoder entry-point cases, 12 ordinary/gzip/
deflate response cases across four clients (including an already-loaded native
fetch), eight Brotli/redirect rejections carrying the containment error, and
preservation of POST bodies, request credentials and cancellation. Test input
is ordinary valid compressed fixture text, never an exploit payload. The 28
payment/webhook/authentication/donation/prayer regressions also pass with the
containment active. Both hosted builds and all relevant type checks passed.

The staged deployment successfully read the existing Stripe monthly price and
reported `cardAvailable: true`; no live charge, subscription, refund or payout
was created. Public content, display settings and billing configuration matched
the pre-release baseline, apart from routine prayer-import timestamps. Content
version remained 21. The scoped staged runtime error query returned no records.
After promotion, the home, Academy, donation, display, billing, display API and
weather routes returned 200; anonymous diagnostics remained 401.

Live evidence at `2026-10-26T14:51:37.279Z`, domain `hbic.ca`, region `pdx1`,
reported `HBIC_BROTLI_CONTAINMENT` with `nodeVersion: 24.21.0`, `active: true`,
`mode: decoder-blocked`. Separate diagnostics still report the upstream fix
marker absent. Do not label the runtime patched because containment is active.

An isolated, SSO-protected alternate-runtime preview reported Bun 1.3.14 and
no decoder-fix marker. Bun's official advisory requires 1.4.4. It was rejected
as an alternative and never received a production domain. Its result is retained
privately; the disposable probe is removed separately from release history.

A fresh fully paginated seven-day Stripe inventory contains 38 events. This is
an event inventory, not a complete request-log investigation or proof that every
event was authorized. Raw financial records remain private outside Git.
Metadata-only inspection confirms the application's production restricted-key
environment variable was last updated September 27; no replacement value was
read. The browser tool still reported disabled after the owner confirmed enabling
it. The owner has been given the exact Stripe account/key name and existing
Vercel production field for the required credential-entry handoff. No completed
key rotation or old-key expiration is claimed.

Primary implementation references:
[Next.js startup instrumentation](https://nextjs.org/docs/app/guides/instrumentation),
[Node builtin export synchronization](https://nodejs.org/api/module.html#modulesyncbuiltinesmexports),
[Bun's security advisory](https://github.com/oven-sh/bun/security/advisories/GHSA-663w-cv8g-jj2p).

### Owner-saved payment-key release — October 26, 2026

The owner reported completing and saving the payment-key replacement.
Metadata-only inspection confirmed the existing Production restricted-key
variable was updated at `2026-10-26T20:51:27.483Z`. The value was never read,
printed or written into a local environment file. The webhook-secret and
Preview-variable metadata remain unchanged; those were not silently replaced.

The exact previously verified containment source
`8371b031eda4a936209319662722088a773834b1` was rebuilt without cache against
the current Production environment in the existing public project. Deployment
`dpl_HaHQ7rH3Z21vyecG3Wu5hvHhr1FY`,
`https://hbic-calgary-9ryv9bzqu-hbic.vercel.app`, completed its hosted build on
Node 24.22.1. Existing unrelated lint/CSS warnings remain. No new application
feature, billing rule, Firebase setting, mobile build or account permission
was changed for this release.

Before promotion, the staged billing endpoint returned `cardAvailable: true`,
which requires a successful server-side read and validation of the existing
Stripe monthly price using that deployment's saved credential. Display and
weather APIs returned 200 and anonymous diagnostics returned 401. This proves
that the saved configuration works for that read; it does not establish all
write permissions, a new charge or independent confirmation of which key
Stripe generated.

The verified deployment was promoted. Alias records confirmed all four existing
public domains, including `hbic.ca` and `www.hbic.ca`, resolve to it. Live checks
at `2026-10-26T20:55:28Z` returned 200 for home, Academy, donation, display,
billing, display weather, published app content, prayer snapshot and the current
admin alias. Billing still reports the existing per-child monthly configuration
and `cardAvailable: true`; content version is still 21. Anonymous diagnostics
remains 401. No real charge, subscription, refund, payout or webhook replay was
created to test this change. The scoped release log query returned no error or
fatal records.

The new deployment's serving-runtime diagnostic at `20:54:33.168Z` in `pdx1`
still reports Node 24.21.0, `patched: false` and the Brotli fix marker absent.
Its startup containment markers confirm decoder blocking remains active.
The patched build machine therefore must not be confused with a patched server.

Browser control is disabled again. Independent inspection of Stripe's resulting
key/expiration state is pending, as is the separate webhook signing-secret
replacement. The owner was asked to re-enable browser access for those steps.
No early expiration or revocation was performed by the agent. After any old-key
expiry, previously built deployments and the unchanged Preview environment
must not be assumed to retain working billing. For rollback, rebuild the desired
verified source against current secrets instead of promoting an old deployment
with an expired embedded credential. Release history remains recoverable.

### Owner handoff and request review — October 26, 2026

Browser access is now working. The correct Stripe account's existing restricted
key rotation dialog is prepared with a 24-hour expiration overlap. The existing
Vercel Production variable's write-only edit form is also prepared. No rotation
was submitted, no replacement credential was generated or entered, and no
environment variable was saved. The browser's credential-change handoff rule
requires the owner to complete those final steps. This supersedes the earlier
browser-disabled observation; it does not establish a completed rollover.

Stripe's Suspicious API Activity view reports **No suspicious activity found**,
with automatic request blocking already On. No security setting was changed.
The Workbench request listing was reviewed from `2026-10-19T19:26:40Z` through
the inspection at approximately `2026-10-26T19:28Z`. Dashboard, API and MCP
sources were confirmed selected, without an IP, user-agent, key, account,
HTTP-method or status restriction. After loading older entries until no further
load control remained, the listing contained 32 entries, all HTTP 200 GET:
23 price reads, four directory searches, two event reads, and one each of
account, charges and payouts reads. This is a bounded listing review, not
independent attribution of every request, coverage of other accounts or a
forensic clearance. Raw records and screenshots remain private outside Git.

The existing active Academy webhook's **This week** overview reports four event
deliveries and zero failed deliveries. Its delivery list shows successful
checkout, paid-invoice and subscription-update acknowledgements. The old
disabled endpoint remains disabled. No event was resent, endpoint changed,
signing secret revealed or financial write performed.

Read-only health checks at `2026-10-26T19:26:40Z` and `19:30:19Z` confirmed:
home, Academy, donation, prayer display and current admin alias return 200;
published app content, prayer snapshot and display weather APIs return JSON
with 200; display content version remains 21; billing still reports
`cardAvailable: true` and the existing per-child monthly tuition configuration.
Anonymous diagnostics still returns 401. These are service checks, not a new
physical-device test or end-to-end charge test.

Retained production startup markers at `19:18:05.123Z` in `iad1` and
`19:19:15.947Z` in `pdx1` still report Node 24.21.0 with the decoder containment
active. These are recent retained startup observations, not new cold starts
at the health-check timestamp. The official provider advisory still describes
runtime patch rollout as ongoing. No unchanged deployment was repeated.

### Fresh production recheck — October 26, 2026

A read-only request to the existing protected diagnostics route returned HTTP
401 and emitted fresh cold-start evidence at `2026-10-26T11:49:44.423Z`.
The serving public deployment remains
`dpl_5AgbifSEhSEFMP19SiA6M4xbJBPz`, region `pdx1`. Its log reported:

- `nodeVersion: 24.21.0`
- `minimumPatchedVersion: 24.22.1`
- `patched: false`
- `brotliDecoderFixPresent: false`

This is a new production observation, not a reused build log. The managed
runtime issue is therefore still unresolved on this observed instance. The
official Vercel advisory, fetched again on October 26, still says managed
runtime patching is rolling out and that inbound WAF protection does not
cover fetched responses. No new deployment, account configuration change or
financial write was performed for this check.

The existing Stripe CLI account still matches the account in the notice.
No new credential rollover has been performed or independently verified in
this recheck. The earlier limited activity review is not a current forensic
clearance, nor proof that exposed credentials were never used.

**Latest provider response:** the authenticated Vercel Help conversation is
complete. Its automated assistant declined a deployment-specific support case,
tracking or ETA for this centrally managed rollout. No further owner login is
needed. The serving-runtime patch remains unverified; the provider conversation
does not establish that the patch has reached HBIC.

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

The fresh Fire TV deployment `dpl_A9wH1uA5kLa9cHtiPCfs6Yctak72`
(source `100411258877e4ba83052df4777f8a201c1cab1d`) completed an uncached
build on patched Node `24.22.1`, but its protected diagnostics cold start at
`2026-10-24T03:33:13.133Z` in `pdx1` again reported Node `24.21.0`,
`brotliDecoderFixPresent: false`, `patched: false`. Redeployment alone has
therefore not resolved the managed-runtime gap. The diagnostics GET remained
401 for an unauthenticated caller; no secrets were returned.

The owner subsequently confirmed signing in to Vercel Help. Browser control
was unavailable because local browser access is disabled in Work settings,
so no authenticated Help form or support case could be submitted. No alternate
credential extraction, login bypass or public support post was attempted.

## Authenticated Help response — October 23, 2026

The owner re-enabled the browser connection. The existing signed-in Help tab
was accessed in the background, selecting the existing HBIC Hobby account.
The authorized report included only the runtime/build versions, project and
deployment identifiers, region, exact observation timestamp and public
advisory link. No credentials, customer records, payment data or raw log files
were sent. No plan upgrade, account permission or new resource was requested.

[Authenticated Help conversation](https://vercel.com/help?product=vercel&teamSlug=hbic&c=true&thread=2fe23d49-08e7-477c-97cf-32f904c8b99a)

Vercel's automated support assistant responded that:

- It cannot open or track an individual support case, verify a deployment's
  patch coverage, accelerate this rollout or provide a project-specific ETA.
- Build machines and serving Functions are separate environments; a patched
  build does not prove a patched serving runtime. Versions can differ between
  warm instances, executions and regions during rollout.
- Managed 24.x runtime patches arrive automatically. Changing patch-version
  settings or making repeated deployments is not required to receive them.
- There is no customer-controlled Vercel platform setting that substitutes for
  the runtime fix on fetched responses. The inbound WAF does not cover them.
- Rollout-completion information is published in the official
  [Vercel advisory](https://vercel.com/kb/bulletin/node-js-security-advisory).

The published advisory was rechecked and still described the managed-runtime
rollout as ongoing. The latest retained production cold-start evidence remained
Node `24.21.0` at `2026-10-24T03:34:01.388Z` in `pdx1`, below the upstream
`24.22.1` floor, with the decoder-fix marker absent. An anonymous diagnostics
GET at `2026-10-24T03:43:09.260Z` remained 401. A warm invocation or a missing
new log must not be presented as fresh patch evidence.

This supersedes the earlier plan to obtain an individually tracked support
case: the provider assistant declined that route. A screenshot and the local
verification journal are retained outside Git. This was an automated support
exchange, not a human engineering acknowledgement or confirmation of a fix.

Next required evidence is the provider's completed rollout and a confirmed
patched serving runtime. Then complete the documented owner-controlled Stripe
credential rollover and verify both public/admin payment consumers. The
rollover and historical Workbench request-log review are still incomplete.
