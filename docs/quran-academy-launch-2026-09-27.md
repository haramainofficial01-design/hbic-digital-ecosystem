# HBIC Quran Academy release handoff

This branch is a private Academy candidate. It is not a payment-tested public release. The live website deployment `dpl_Ak8x6KNKBqSuEDW7GFHJoTG8nxfJ` contains the prayer rollover correction but keeps `ACADEMY_PREVIEW_ENABLED` unset, so Academy registration and private routes remain closed. The preceding website rollback deployment is `dpl_3GZqGN7wBWRecxptuzYf65EEitNg`.

## Confirmed decisions

- Registration opens October 1, 2026, Calgary time; first class is Monday, October 5.
- Mondays and Thursdays, 6:00–7:30 p.m.; first alternate fun Thursday is October 15.
- CAD $50 per child monthly. A mid-month card signup is prorated immediately; renewals are on the 1st. A signup on the 1st starts a full monthly subscription.
- Each child can be canceled independently; the next renewal quantity is reduced without retroactive proration. Current paid-period access continues to its end.
- Cash starts without a card. Staff record the actual in-person receipt. Cash reminders are scheduled three days before and on the 1st only after the first confirmed cash payment.
- The optional server reminder cron runs daily at 15:00 UTC (8 or 9 a.m. Calgary depending on DST), targeting only a family's registered app devices. Configure a strong `CRON_SECRET` and set `ACADEMY_SERVER_CASH_REMINDERS=true` only after testing the protected `/api/academy/cash-reminders` route. A device switches off its local cash reminders only after server-push registration succeeds. Families without an app device or OS notification permission still need an HBIC manual/email follow-up; no email provider has been configured.
- The approved Stripe account is `Coding` (`acct_1U3EFyDdobLbZdFy`). Its live Academy product is `prod_VKwgaqYYsHIk1Y`; verified live CAD $50 monthly per-unit price is `price_1UKGnKDdobLbZdFyj2VvW5P7`. No real family was charged by creating these objects. HBIC approved CAD $50 as the final parent-facing total, without tax added; the legal GST classification should still be documented by its accountant.
- Academy policy `academy-payment-policy-v1` is displayed on web and mobile, accepted separately from recurring-card authorization, and stored with the server timestamp on each new family registration. Test cash receipts and the test admin view are explicitly marked as sandbox/test. This is code-verified only, not a real Stripe sandbox transaction.
- HBIC explicitly confirmed on September 27 that parents must be charged **CAD $50 total per enrolled child per month, with no GST or other tax added**. This is the approved commercial price. The code does not enable Stripe automatic tax. Legal GST classification is distinct from this pricing decision and should remain documented by HBIC's accountant; do not turn tuition into a donation receipt.

## HBIC tuition and GST evidence (September 27, 2026)

- The supplied 2025 Alberta annual-return proof establishes that HBIC is an active Alberta society (BN 806888830); it does **not** state Academy tuition, GST registration, or an approved tuition tax policy.
- [HBIC's own public About page](https://hbic.ca/about) and [CanadaHelps profile](https://www.canadahelps.org/en/charities/hazrat-bilal-islamic-centre/) identify charity number 806888830RR0001. [CRA's GST/HST guide RC4082](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4082/gst-hst-information-charities.html) says most services supplied by registered charities are exempt, with exceptions. Quran instruction appears to be a service, not one of the listed recreational/athletic exceptions, so exemption is plausible, **not an HBIC-specific tax ruling**. HBIC has confirmed CAD $50 total/no added tax as the parent-facing price; its accountant/authorized officer should document the applicable tax classification.
- The connected Coding Stripe account currently lists no Stripe Tax registrations. That alone does not establish whether HBIC should collect GST; do not enable Stripe automatic tax or create a registration by inference. The Academy price's tax behavior remains unset. Do not create charitable donation receipts for tuition; Academy receipts are payment receipts only.
- The Stripe connection available to Codex exposes Coding in live mode only. It does not expose its test sandbox or allow restricted API-key creation/retrieval. Neither a test restricted key nor a test webhook secret was found in local Academy environment variables. Therefore a real test Checkout, signed webhook, renewal, failed payment, and 3DS run have **not** happened. Keep `ACADEMY_STRIPE_BILLING_READY` off and Academy gated until they do.

## Payment activation (do not skip sandbox validation)

The gated website placement is ready: when `ACADEMY_PREVIEW_ENABLED=true`, Qur’an Academy is the second desktop navigation item (immediately after Prayer Times), the second mobile-menu item, and a Home introduction appears immediately below the prayer section. It is intentionally absent from live hbic.ca while the Academy flag is off.

The current Vercel project `haramain-team/hbic-calgary` has no Academy or Stripe environment variables. Stripe restricted keys cannot be retrieved through the connected account API. The HBIC owner must create a **test-mode restricted server key** privately in the Coding Stripe Dashboard with Checkout Sessions read/write, Prices read, Subscriptions read/write, and Billing Portal Sessions write. Do not paste it into chat or commit it. Configure it securely as `ACADEMY_STRIPE_RESTRICTED_KEY` for a test deployment, with `ACADEMY_STRIPE_BILLING_MODE=test`.

Create a test-mode CAD $50/month recurring price and configure `ACADEMY_STRIPE_PRICE_ID` to that price. Create the test webhook for `https://<test-host>/api/academy/stripe-webhook` with `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted`; put its signing secret in `ACADEMY_STRIPE_WEBHOOK_SECRET`. Set `ACADEMY_PREVIEW_ENABLED=true` only in the isolated test deployment. Once test keys and webhook are installed, set `ACADEMY_STRIPE_BILLING_READY=true` **in that test preview only** to exercise Checkout, signed webhook, renewal, failure, and cancellation; this is a test-mode switch, not permission to enable live charges. Keep both flags off in production until those paths pass. The preview also needs the existing Firebase server/client configuration.

After sandbox validation, create a **separate live restricted key**, live webhook, and switch to `ACADEMY_STRIPE_BILLING_MODE=live`, the verified live price above, the new live webhook signing secret, and `ACADEMY_PREVIEW_ORIGIN=https://hbic.ca`. Add those as Vercel production secrets/settings, verify the Stripe account and webhook delivery, then explicitly enable `ACADEMY_STRIPE_BILLING_READY=true` and `ACADEMY_PREVIEW_ENABLED=true`. Never mix test and live keys, prices, or webhook secrets. No mobile build should expose Academy until this backend is ready and a real device test passes.

The Stripe Billing Portal is deliberately restricted to updating the payment card. Child cancellation uses the HBIC per-child flow; a direct Stripe subscription deletion is reflected as a withdrawn family by the signed webhook. A complete server-side receipt/reminder and cancellation test must precede production activation.

Apple Wallet and Google Wallet issuer/pass credentials were not present in the repo or deployment configuration. The secure in-app/web QR pass remains the fallback; native Wallet buttons must stay hidden until real issuer credentials and pass update/revocation tests exist. No imitation Wallet pass should be shown.

## Mobile release safety

Mobile commands run only from `apps/mobile`, existing Expo project `@hbiccas-team/hbic-calgary-app` / `79283015-cb87-48ef-9761-81ab87641205`, owner `hbiccas-team`, iOS bundle and Android package `ca.hbic.calgary.app`. The Academy navigation is controlled by `EXPO_PUBLIC_ACADEMY_PREVIEW_ENABLED=true`. Do not set it in production EAS builds until web API, payment, class, cash, notification, and device QA succeed. Do not create new signing credentials or EAS projects.

## Prayer incident

The existing API continued returning Fajr 6:20 and Asr 5:30 as current values on Sunday, with `nw_i_fajr=6:30` and `nw_i_asr=5:15`. `/api/display` was publicly verified on September 27 showing Fajr 6:30 and Asr 5:15. Manual override precedence is preserved. The website's previous known-good deployment is retained for Vercel rollback.
