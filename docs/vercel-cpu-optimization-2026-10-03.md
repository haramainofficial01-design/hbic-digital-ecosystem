# HBIC Vercel CPU incident — 2026-10-03

## Production evidence and recovery

Read-only checks of the authorized Haramain Team account confirmed:

- Plan: Hobby; billing status: active; no Spend Management budget.
- Soft block: `FAIR_USE_LIMITS_EXCEEDED`, resource `fluidCpuDuration`.
- Recorded unpause: **2026-11-02T20:47:43.705Z**. This is the platform timestamp, not a promise of an earlier support exception.
- Rolling 30-day Usage dashboard: team **4h 4m** active CPU; `hbic-calgary` **4h 3m (99.9%)**; admin **10s**.
- Function invocations: 335K; CDN requests: 524K; ISR reads/writes: 28K each; cron executions: 9.
- Only one authorized Vercel team was returned: Haramain Team, Hobby. No existing authorized alternative transfer destination was found.
- The account's actual upgrade dialog states **$20/month, $20 charged immediately**, plus taxes/other metered usage. No purchase or trial was activated.
- Final checks of `https://hbic.ca`, `/quran-academy`, `/api/display`, `/display`, and `https://hbic-calgary-admin.vercel.app` all returned **402 / DEPLOYMENT_DISABLED**.

Optimization cannot erase consumed quota or independently resume a team-wide suspension. Nothing in this change was deployed; no domains, DNS, credentials, payment configuration, hosting projects or plans were changed.

Vercel documents a 4 CPU-hour Hobby allowance and usually a 30-day pause after exceeding limits. Vercel staff say that, once rolling usage is below the limit, the owner can request an unpause at <https://vercel.com/help>. There is no confirmed immediate free restoration here.

Smallest immediate recovery action: **Haramain Team → Settings → Billing → Upgrade to Pro**, review the charge, and approve it. This requires the owner's billing decision. Afterwards deploy this verified scoped source to the existing public/admin projects and check all production aliases before declaring recovery.

Support request after usage falls below the allowance: “Please unpause Haramain Team (`haramain-team`). It was blocked for `fluidCpuDuration`; rolling active CPU usage is now below the Hobby allowance. We have corrected redundant polling, public caching and per-visitor rendering. Please confirm the team can resume.” Do not claim usage is below the allowance before checking it.

Creating a new Hobby account solely to reset quota would bypass the current team limit, not fix the root cause. No such account was created. Optimized Vercel Pro is the lowest-risk permanent choice, preserving every current URL, Next.js runtime, Firebase and Stripe integration. Hobby additionally restricts use to personal, non-commercial projects; reliable institutional tuition operations should not depend on quota pauses being waived.

## Measured route ranking

The free Vercel Functions dashboard displayed a **last-12-hour** window (`12h ago`–`1m ago`). It overlaps the pause, so these observations must **not** be extrapolated to a normal daily workload. Counts/CPU below are exactly the rounded dashboard values. Average CPU is arithmetic CPU/request; it is **not average wall-clock duration**, which this account's dashboard hides behind Observability Plus. Historical route metrics queries also require that paid feature; it was not enabled.

| Route | Invocations / sample | Active CPU / sample | Average CPU/request | Reason |
|---|---:|---:|---:|---|
| `/api/display` | 902 | 39s | 43.2ms | TV refresh; separate rail and occasion polls; timestamp cache-busters |
| `/api/content/version` | ~1.2K | 24s | ~20ms | Every visible public page polling every 15 seconds |
| `/` | 22 | 9s | ~409ms | Per-visitor server rendering with no-store upstream read |
| `/prayer-times` | 20 | 6s | ~300ms | Same per-visitor content/prayer resolution |
| `/events` | 13 | 3.67s | ~282ms | Same public-page SSR |
| `/quran-academy` | 23 | 3.37s | ~147ms | Registration/parent surface; kept dynamic |
| `/api/content/prayer-snapshot` | 84 | 3.13s | ~37ms | Mobile/widget canonical schedule requests |
| `/index` | 11 | 3.05s | ~277ms | Dashboard route label; not a separate source route |
| `/api/display/weather` | 57 | 2.42s | ~42ms | TV weather timestamp URLs defeating existing CDN TTL |
| `/programs` | 13 | 2.38s | ~183ms | Public-page SSR |
| `/contact` | 9 | 1.51s | ~168ms | Public-page SSR |
| `/privacy` | 11 | 1.36s | ~124ms | Public-page SSR |
| `/api/admin/academy` | 5 | 940ms | 188ms | Fresh family and month-ledger reads |
| `/api/content/published` | 34 | 568ms | ~17ms | Public content clients |
| `/about` | 3 | 510ms | 170ms | Public-page SSR |
| `/community` | 2 | 390ms | 195ms | Public-page SSR |
| `/media` | 3 | 390ms | 130ms | Public-page SSR |
| `/api/admin/academy/billing-method` | 3 | 240ms | 80ms | Explicit staff mutation; not polled |
| `/donate` | 9 | 190ms | ~21ms | Public page |
| `/youth` | 1 | 180ms | 180ms | Public-page SSR |
| `/api/admin/academy/scan` | 3 | 170ms | ~57ms | Authenticated, authoritative pass lookup |
| `/api/admin/academy/content` | 5 | 155ms | 31ms | Admin batch refresh |
| `/api/notifications/register` | 9 | 150ms | ~17ms | Device registration |
| `/api/academy/pass/google-wallet` | 1 | 110ms | 110ms | Explicit pass request |
| `/api/admin/auth/session` | 2 | 70ms | 35ms | Sign-in/session validation |
| `/api/admin/academy/family` | 3 | 70ms | ~23ms | Explicit staff requests |
| `/api/admin/academy/pricing` | 5 | 60ms | 12ms | Admin batch refresh |
| `/halal-restaurants` | 1 | 50ms | 50ms | Public page |
| `/api/academy/billing` | 1 | 40ms | 40ms | Explicit billing action |
| `/api/academy/stripe-webhook` | 1 | 20ms | 20ms | Real-time signed Stripe event |

No notification/reminder cron appears among the sampled functions. The rolling dashboard's nine cron executions and the single 20ms webhook in this sample do **not** support blaming cron/retry storms for this incident. Their correctness is retained.

## Waste removed

1. Public schedule/content/version APIs now have a **15-second hard shared-cache TTL**, bounded process-local read coalescing and publication invalidation. Private Academy, authentication, receipt and payment state remains **uncached**.
2. Rail and occasion styling share one canonical display read. Countdown ticks run locally; TV clocks/countdowns do not fetch data every second.
3. Replaced per-request timestamp query strings with shared stable URLs. Display's only query key is the canonical Calgary **service date**, preventing yesterday's CDN entry being reused across midnight. TV weather can now use its existing five-minute CDN cache.
4. Content-version polling: **15s → 60s**; refresh on focus/resume still works; hidden tabs and overlapping requests do not poll.
5. Admin Academy batch polling: **15s → 60s**, preserving explicit refresh and immediate refresh after staff actions; hidden tabs do not poll. Parent polling retains its existing 60s period, adds resume refresh/overlap protection, and reuses one current ID token across its batch instead of forcing four token refreshes.
6. Restored actual Next.js ISR for **13 public pages** using a tagged, daily-keyed, 60s data cache. Academy, TV and protected APIs remain dynamic. Admin publish invalidates cached public content; explicit publish/compare verification bypasses the public TTL.
7. One pricing-document read per admin family batch instead of one per family. Month/payment ledgers remain authoritative reads.
8. Ordinary days and the Ramadan billing pause skip cash-reminder family scans. Existing eligible reminder dates, opt-ins, paid-month suppression and deterministic dedupe remain unchanged; independent email dispatch still runs.
9. No writes of unchanged weekly prayer rollover state. An upstream outage with no cached feed uses a bounded five-minute retry delay instead of retrying for every request; forced synchronization still retries immediately. Source, manual overrides and canonical resolution are unchanged.

## Before/after — no invented CPU claim

- Before: `hbic-calgary` **243 CPU minutes / rolling 30 days = 8.1 minutes/day arithmetic mean**. This is not a measured last-day figure.
- Known public client recurring requests: **6/minute → 2/minute (~67% fewer)** for a continuously visible page with the rail (four version checks plus two independent display checks previously; one version check and one shared display check now).
- Known admin Academy recurring requests: **12/minute → 3/minute (75% fewer)** for an open Academy panel.
- Public-page function executions additionally become cache misses/revalidations rather than per-visitor rendering, and public API CDN hits can avoid function execution. These savings depend on real traffic distribution and cache-hit rates.
- **After Fluid CPU/day is not yet measurable**: the team is paused and the optimized code is not deployed. A whole-system 70–90% reduction is a target, not a verified result. Measure the same dashboard after resumption/deployment before asserting it.

## Verification and feature preservation

- **73/73 targeted tests passed**: canonical schedule/override/weekly rollover; after-Isha/midnight/timezone handling; cache TTL/invalidation/coalescing/failure retry; public `/api/display` response shape; Academy registration/start-date/multiple-child rules; card/enrollment separation; staff cash/payment-method behavior; protected auth; raw Stripe signature/retry behavior; Wallet identity/ticket expiration; reminder eligibility/paid suppression/dedupe; notification planning.
- Public and admin production builds passed in a credential-free isolated checkout. Build output confirms the 13 public pages are static/ISR with one-minute revalidation. Existing nonblocking warnings were not “cleaned up.” No mobile builds/dependency upgrades were made.
- Compiled public runtime: homepage, Academy, Prayer Times, TV, display/snapshot/version APIs returned **200**; admin compiled runtime returned **200**. Homepage/Prayer Times emitted `x-nextjs-cache: HIT`; display emitted the expected 15s shared-cache header.
- Desktop **1440×1000** and phone **390×844** browser checks: local countdown ticks caused no API requests over 10s; prayer controls opened/closed; both controls hidden on Prayer Times; no horizontal overflow or client JavaScript errors; Academy heading rendered.
- TV **1920×1080** browser check: no timer-driven API requests over 10s, no overflow or client JavaScript errors; real canonical source displayed. Clock, layout, weather and offline handling preserved.
- Anonymous family/staff scan/cash APIs returned **401**. No fake production registrations, receipts or cash payments were created. Live webhook is inaccessible during the team pause; the unconfigured isolated server correctly refuses webhook processing, and signed webhook fixture tests passed.
- No prayer API/source, manual override semantics, TV visual design, Academy tuition/enrollment/payment rules, wallet signing identities, notifications, Hijri logic, mobile/Watch/widget code or identifiers were removed or changed.
- Production end-to-end checks remain impossible while all aliases return 402. This document must not be interpreted as a claim that production is restored or that the source changes are live.

Rollback references retained: pre-optimization source `9c12f16`; public deployment `dpl_FJFxEaasyvopBXzNq4bTRty1DX8u`; admin deployment `dpl_Gr3JJjQGoDCTCGPmj6jsuoZF7qUG`. No history was rewritten.

## Primary references

- <https://vercel.com/docs/plans/hobby>
- <https://vercel.com/docs/functions/usage-and-pricing>
- <https://community.vercel.com/t/vercel-account-paused/45523/2>
- <https://vercel.com/docs/plans/pro-plan>
- <https://vercel.com/docs/projects/transferring-projects>
- <https://nextjs.org/docs/app/api-reference/functions/unstable_cache>
