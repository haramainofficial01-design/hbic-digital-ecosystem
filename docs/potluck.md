# October 2026 Academy potluck

The public signup page is `/potluck` (intended production URL:
`https://hbic.ca/potluck`). It coordinates one shared list for the class party
on **Thursday, October 29, 2026, 5:30–7:30 PM in Calgary**, for approximately
**35–40 people**. This attendance estimate is event context, not a participation
count or signup goal. No names, signups, participation counts or goals are
fabricated in the public list.

Food guidance is halal, easy to serve, without sauces or messy, crumbly foods.
If possible, parents should bring food in two separate dishes for the brothers’
and sisters’ sides. There are no separate signup lists for the two sides.

## Parent workflow and privacy

Parents do not need an account or parent login. They choose an item, select
**Add my name**, and enter a first name and required quantity or servings.
First names and quantities are publicly visible beside their items. Parents
can edit or remove their own signups on the same browser/device that added them
while the signup controls are available.

Ownership uses a random, HTTP-only `hbic-potluck-owner` cookie, scoped to
`/api/potluck`, with SameSite=Lax, Secure in production and a 30-day lifetime.
Only the SHA-256 hash of its token is stored with the record. Clearing cookies,
switching browser profiles or moving to another device loses that ownership;
parents should ask Academy staff to remove an inaccessible entry. The first
name is optionally remembered in local storage for convenience; it is not an
authentication mechanism. Public responses do not expose owner hashes and use
private, non-cacheable responses that vary by cookie.

**Suggest an item** requires the item, first name and quantity. Pending and
declined suggestions stay out of the shared public list. The submitting device
can see its own suggestion title and status. Staff approval adds the suggested
item and the submitter’s signup to the public list; declining keeps it private.

## Staff workflow

Open **Admin > Potluck** in the existing administrator interface (the Potluck
navigation entry is in the Overview group). Sign in using an approved personal
Firebase account. The server requires a personal `firebase-account` session
with the `superAdmin`, `director` or `caretaker` role; shared publishing
credentials do not grant potluck moderation access.

The panel provides a link to the public page, refresh, pending suggestions with
**Approve** and **Decline**, and active signups with **Remove**. Removal asks for
confirmation. Review suggestions against the food guidance above before
approval. Staff receive first names, quantities and suggestion status, without
device-owner hashes. Staff authorization is checked on every API request.

## Closing and public-name retention

The dates are defined in `apps/public-web/lib/potluckModel.ts`:

| Boundary | Stored UTC instant | Calgary local time |
| --- | --- | --- |
| Signups close | `2026-10-30T01:30:00.000Z` | October 29, 2026, 7:30 PM MDT |
| Public signup entries stop being returned | `2026-11-06T01:30:00.000Z` | November 5, 2026, 6:30 PM MST |

The local retention time changes because daylight saving time ends between
these instants. At closing, new parent signups, edits and suggestions are
rejected and the public form controls disappear. The API still permits an
owner’s removal after closing; staff retain moderation access. At the retention
boundary, the public API returns no signup entries, including names and
quantities. Approved item titles remain available. This is public visibility
retention, not automatic deletion: stored records and the staff view are not
purged by this feature, and the device can still receive its own suggestion
titles and statuses.

## Storage and bounded writes

The existing server-side Firestore adapter stores the shared list in
`academyPotlucks/october-2026`. Mutations use a transaction. Removed entries are
marked cancelled rather than deleted. Staff writes record the reviewing UID.
The public path enforces same-origin writes, JSON requests up to 4 KiB,
validated UUIDs, text length limits and device ownership.

Successful non-staff writes are limited to **100 per IP per fixed hourly
bucket**, transactionally tracked in `potluckRateLimits`. The key hashes the
event, hour and forwarded address; a missing address uses the shared `unknown`
bucket. Rate records carry an `expiresAt` value two hourly boundaries after
the bucket begins; this code does not configure or verify Firestore TTL
deletion. Staff writes bypass this public rate limit. Additional limits are
350 stored entries, 20 active entries per device, 80 suggestions in total and
five suggestions per device. The list does not impose invented item targets
or claim an item is fully covered from a signup count.

This is an extension of the existing infrastructure. It does not change
Firebase configuration or rules, Stripe or Academy billing configuration, or
the canonical prayer API/resolver/cache, manual overrides or TV flow.

## Design and verification evidence

The implementation preserves the existing Academy seal and navy, teal and cream
identity, with Georgia headings and inherited sans-serif body text. The
public page uses a restrained shared list and inline forms; the staff panel
reuses existing admin cards and action controls. This ordinary extension does
not replace the incumbent visual system or create a new global design system.
Evidence checked includes `apps/public-web/PRODUCT.md`, the public component
and its scoped stylesheet, both potluck API routes, the model/store and the
admin panel/navigation, plus the existing public/admin global styles.

Completed local checks reported for this change:

- Nine potluck unit/privacy tests passed.
- Public and admin application typechecks passed.
- Mocked local Playwright signup, edit, reload and remove flows passed; a
  suggestion remained hidden until approval.
- Overflow was checked at desktop width 1440 and mobile widths 390 and 320.
- A fresh finish reviewer returned **SHIP**. Its only nonblocking copy polish
  was applied: the public error action now says **Refresh list**.

Screenshots are local QA fixtures: `output/potluck/desktop.png`,
`output/potluck/mobile.png` and `output/potluck/mobile-form.png`. They contain
the synthetic “Test parent” / “Dates” fixture and the development indicator;
they are not evidence of live public signups. No design detector ran. No
signed-in staff end-to-end moderation test is claimed; the approval visibility
check used mocked local data.

Existing documentation gaps/drift were observed without unrelated repairs:
neither web app has a `DESIGN.md` in its application directory, and the older
`docs/release-handoff-2026-09-17.md` still describes personal administrator
access as awaiting MFA setup, whereas `docs/admin-auth-security-audit.md`
documents the current approved personal password-sign-in model.

## Pending deployment

**Production deployment is not yet verified.** Local checks and the SHIP
design disposition do not establish production availability or a production
staff session. Update this section with the actual deployment reference and
post-deployment public page/API, privacy and staff-access verification before
claiming the feature is deployed. No app-store upload, review submission or
public approval is established by this document.
