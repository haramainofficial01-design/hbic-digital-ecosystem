# Academy billing communication — 30 September 2026

This note supersedes the launch-state and class-time statements in the older 27 September handoff. Current tuition is CAD $50 total per child monthly, with no added tax; classes are Monday and Thursday, 5:30–7:00 p.m. The September registration period has no September tuition. Billing runs October 1 through January 1; the February 1 class is included and there is no February charge.

## Source of truth

- A new registration is `CONDITIONAL` independently of the payment state. Staff check-in makes it `ACTIVE`; staff cash confirmation alone does not.
- Card payment becomes paid only from a signed Stripe `invoice.paid` webhook. The card receipt email is queued in the same Firestore transaction as that invoice ledger update; zero-dollar setup invoices do not generate a receipt.
- Cash payment becomes paid only after an approved administrator records receipt of actual cash. Its numbered receipt, ledger update, audit event and email queue entry are written atomically.
- Cash reminder emails and eligible app push reminders are queued three Calgary days before the first and again on the first, only after a first confirmed cash payment and only while another billed month remains unpaid. A reminder does not mark payment paid.
- Card-to-cash changes stop renewal at Stripe's next period end; cash-to-card opens Stripe-hosted Checkout. An already-paid month keeps its original method and receipt; changes apply to the next unpaid period. Individual-child cancellation continues to stop only that child's future renewal.
- Re-registration after withdrawal/ended enrollment creates a new pass and QA reference. Old months are archived privately; old Stripe webhook events cannot alter the new registration.

## Email delivery setup

The email queue is not evidence of delivery. To activate sending in the existing `haramain-team/hbic-calgary` Vercel Production project, connect a transactional sender, verify `hbic.ca` (or an approved sending subdomain), then set sensitive server-only `ACADEMY_RESEND_API_KEY` and `ACADEMY_EMAIL_FROM` to a verified sender address such as `academy@hbic.ca`. Do not put either key in Expo or `NEXT_PUBLIC_` variables. `CRON_SECRET` already protects the daily `/api/academy/email-dispatch` retry route. A signed card webhook and cash confirmation also attempt immediate dispatch.

Before describing email as live, send a controlled test to an HBIC-owned inbox, confirm actual receipt and sender authentication, inspect the outbox `sent`/provider ID, and verify a repeated event does not duplicate the email. No real tuition transaction should be fabricated to test this. Until then, payment status and cash receipts remain available in the authenticated parent dashboard.
