# HBIC Quran Academy release handoff

This branch is a private Academy candidate. It is not a payment-tested public release. The live website deployment `dpl_Ak8x6KNKBqSuEDW7GFHJoTG8nxfJ` contains the prayer rollover correction but keeps `ACADEMY_PREVIEW_ENABLED` unset, so Academy registration and private routes remain closed. The preceding website rollback deployment is `dpl_3GZqGN7wBWRecxptuzYf65EEitNg`.

## Confirmed decisions

- Registration opens October 1, 2026, Calgary time; first class is Monday, October 5.
- Mondays and Thursdays, 6:00–7:30 p.m.; first alternate fun Thursday is October 15.
- CAD $50 per child monthly. A mid-month card signup is prorated immediately; renewals are on the 1st. A signup on the 1st starts a full monthly subscription.
- Each child can be canceled independently; the next renewal quantity is reduced without retroactive proration. Current paid-period access continues to its end.
- Cash starts without a card. Staff record the actual in-person receipt. Cash reminders are scheduled three days before and on the 1st only after the first confirmed cash payment.
- The optional server reminder cron runs daily at 15:00 UTC (8 or 9 a.m. Calgary depending on DST), targeting only a family's registered app devices. Configure a strong `CRON_SECRET` and set `ACADEMY_SERVER_CASH_REMINDERS=true` only after testing the protected `/api/academy/cash-reminders` route. A device switches off its local cash reminders only after server-push registration succeeds. Families without an app device or OS notification permission still need an HBIC manual/email follow-up; no email provider has been configured.
- The approved Stripe account is `Coding` (`acct_1U3EFyDdobLbZdFy`). Its live Academy product is `prod_VKwgaqYYsHIk1Y`; verified live CAD $50 monthly per-unit price is `price_1UKGnKDdobLbZdFyj2VvW5P7`. No real family was charged by creating these objects. The price's tax behavior is unspecified; HBIC must confirm any applicable tax treatment before collecting live payments.

## Payment activation (do not skip sandbox validation)

The current Vercel project `haramain-team/hbic-calgary` has no Academy or Stripe environment variables. Stripe restricted keys cannot be retrieved through the connected account API. The HBIC owner must create a **test-mode restricted server key** privately in the Coding Stripe Dashboard with Checkout Sessions read/write, Prices read, Subscriptions read/write, and Billing Portal Sessions write. Do not paste it into chat or commit it. Configure it securely as `ACADEMY_STRIPE_RESTRICTED_KEY` for a test deployment, with `ACADEMY_STRIPE_BILLING_MODE=test`.

Create a test-mode CAD $50/month recurring price and configure `ACADEMY_STRIPE_PRICE_ID` to that price. Create the test webhook for `https://<test-host>/api/academy/stripe-webhook` with `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted`; put its signing secret in `ACADEMY_STRIPE_WEBHOOK_SECRET`. Set `ACADEMY_STRIPE_BILLING_READY=true` only after the signed webhook and successful/failed/renewal/cancellation paths pass. Set `ACADEMY_PREVIEW_ENABLED=true` only in the isolated test deployment. It also needs the existing Firebase server/client configuration.

After sandbox validation, create a **separate live restricted key**, live webhook, and switch to `ACADEMY_STRIPE_BILLING_MODE=live`, the verified live price above, the new live webhook signing secret, and `ACADEMY_PREVIEW_ORIGIN=https://hbic.ca`. Add those as Vercel production secrets/settings, verify the Stripe account and webhook delivery, then explicitly enable `ACADEMY_STRIPE_BILLING_READY=true` and `ACADEMY_PREVIEW_ENABLED=true`. Never mix test and live keys, prices, or webhook secrets. No mobile build should expose Academy until this backend is ready and a real device test passes.

The Stripe Billing Portal is deliberately restricted to updating the payment card. Child cancellation uses the HBIC per-child flow; a direct Stripe subscription deletion is reflected as a withdrawn family by the signed webhook. A complete server-side receipt/reminder and cancellation test must precede production activation.

Apple Wallet and Google Wallet issuer/pass credentials were not present in the repo or deployment configuration. The secure in-app/web QR pass remains the fallback; native Wallet buttons must stay hidden until real issuer credentials and pass update/revocation tests exist. No imitation Wallet pass should be shown.

## Mobile release safety

Mobile commands run only from `apps/mobile`, existing Expo project `@hbiccas-team/hbic-calgary-app` / `79283015-cb87-48ef-9761-81ab87641205`, owner `hbiccas-team`, iOS bundle and Android package `ca.hbic.calgary.app`. The Academy navigation is controlled by `EXPO_PUBLIC_ACADEMY_PREVIEW_ENABLED=true`. Do not set it in production EAS builds until web API, payment, class, cash, notification, and device QA succeed. Do not create new signing credentials or EAS projects.

## Prayer incident

The existing API continued returning Fajr 6:20 and Asr 5:30 as current values on Sunday, with `nw_i_fajr=6:30` and `nw_i_asr=5:15`. `/api/display` was publicly verified on September 27 showing Fajr 6:30 and Asr 5:15. Manual override precedence is preserved. The website's previous known-good deployment is retained for Vercel rollback.
