# Push repair and Maghrib default — October 12, 2026

## Root cause and previous sends

Ordinary admin announcements explicitly included `data: undefined`. The sender
dispatched to Expo before writing that object as the Firestore log. Firestore
rejected the undefined value, returning an error despite possible prior delivery.
The affected announcement has no durable tickets/log to prove its destinations.
It must not be resent to Everyone without explicit approval.

Read-only production checks found registered iOS and Android devices and valid
receipts for an earlier saved iqamah notification: 49 APNs OK, 58 FCM OK and four
Android failed receipts. This confirms prior provider handoff, **not** the failed
admin announcement, on-device display/sound, or a new private test. No old
announcement or test was replayed. No registered device was labelled as the
owner's authorized test phone, so latest-device selection must not be used.

## Changes

- Notification-specific document sanitizer removes nested undefined map values,
  uses null for undefined array slots, preserves Firestore/native value types,
  detects cycles and leaves the shared Firebase configuration untouched.
- Send intent is saved before any provider call. Per-batch tickets are saved
  as they arrive. Actor-scoped request IDs atomically reserve sends; replay does
  not dispatch again. Network/5xx uncertainty never triggers automatic resend.
- Platform audiences and preference filtering remain. Audiences lacking a
  verified device membership mapping are rejected rather than broadcasting.
- Receipt status includes immediate failures, pending receipts and stored final
  receipts that survive Expo expiry. "Delivered" explicitly means APNs/FCM
  receipt, not proof the phone displayed a banner or played sound.
- Send Test to My Device uses a 15-minute phone-generated pairing code and the
  private admin endpoint. Code creation requires the registered token plus its
  installation proof; raw tokens are never returned or displayed to admin.
  Codes are hashed in a private collection. No latest/random phone fallback.
- App Notifications adds Create Private Test Code. Permission, sound channels,
  local prayer tests/scheduling and notification navigation remain unchanged.
- Maghrib's automatic iqamah is today's Iqamah.ca adhan + 10 minutes; explicit
  staff override wins. Outages retain the last confirmed adhan + 10 minutes.
  Other staff iqamah times, Jumuah and provider isolation stay unchanged.

## Qualification

Focused strict-Firestore/provider tests, authenticated-route tests, receipt and
private targeting tests cover the repaired failure cases. Existing payload,
permission, deep-link, prayer sync and weekly scheduling regression tests remain
required. Headless admin UI checks exercise private targeting, request retry,
status labels and narrow layout. These are not real-device banner/sound tests.

## Live verification

The owner explicitly waived physical-phone testing and authorized one new,
clearly labelled test to Everyone. The failed earlier announcement was not
replayed. Announcement opt-outs remained respected. The new test was dispatched
once at 2026-10-12T21:55:55Z, with a durable actor-scoped request ID.

- Expo accepted 177 messages; none were rejected at submission.
- APNs receipts: 71 OK, one BadDeviceToken (HTTP 400).
- FCM receipts: 99 OK, six DeviceNotRegistered.
- Total: 170 provider-confirmed handoffs, seven failed, zero pending.
- Expired registrations are disabled, not retried. A BadDeviceToken retires only
  that invalid registration; unrelated provider/credential errors do not disable
  otherwise-valid devices. Reopening the installed app can register its current
  token. No new provider credentials or Firebase permissions were added.
- Receipt error causes persist privately; admin receives only aggregate counts.
  A mixed result is labelled partial, not an all-device failure or success.
- Actual phone banners, sound and tap behavior remain unverified, as requested.

Initial production release of source `41865b1` was confirmed READY:
public `dpl_3JnN6xy4vsWEW42syjBPjrP23qzH`, admin
`dpl_94JpyX8f384nEvVTifeajX5em5zw`. Both existing aliases returned 200; anonymous
send and private-test calls returned 401. The served admin bundle includes the
private device-test control. Admin deployment must package the entire monorepo
with its existing admin build configuration, not just the app folder.

The authenticated production diagnostics confirmed Iqamah.ca as the sole adhan
provider and no Maghrib override. Today's public snapshot shows 6:50 PM adhan and
7:00 PM iqamah. Additional regressions cover subsequent weeks, DST and January;
an explicit manual Maghrib override persists until staff clears it.

48 focused tests passed, including the real headless admin component; public,
admin and mobile typechecks passed; both web builds passed. The added phone
pairing-code UI still requires a store build: existing 1.7.6 iOS build 35 is
WAITING_FOR_REVIEW and Android code 40 is the submitted production release.
These existing builds must not be represented as containing the new pairing UI.

Final production source `42f6443` is confirmed READY on both existing aliases:

- Public: `dpl_AzBzzgGnHUZsDe3amKS5vkRNC584`.
- Admin: `dpl_5KtUSoyGmo33oMw2jqZr31hkqqNg`.

The authenticated live receipt endpoint now reports partial, 170 successful,
seven failed, zero pending, with DeviceNotRegistered = six and BadDeviceToken =
one. All seven invalid registrations are disabled; six opted-out registrations
were not included in the test. Repeating the exact actor-scoped request returns
the original log with replayed = true and does not send again.

Store builds for the pairing-code UI were queued with existing frozen signing
credentials, without changing app identifiers, permissions or app version:
Android code 41 `31c3d5e2-ca2b-4508-a467-757f09666907`, iOS/Watch build 36
`2e640f17-e6b6-4240-aa39-bf87a5a4b8bf`. Build completion, signed-artifact verification,
upload, submission and store approval are separate states; none is implied by
queueing these builds. The existing build-35 Apple review remains untouched
until its replacement is processed and verified.

Receipt retirement now uses a transaction: it cannot recreate deleted tokens or
disable registrations refreshed after the original dispatch. Replaying stored
receipts retains their historical failure count without disabling an app that
has since re-registered. Dedicated fresh-receipt and cached-receipt regressions
cover this behavior.

iOS/Watch build 36 completed and its signed IPA passed all four target identity,
privacy-purpose, keychain, embedded Watch Quran and new pairing-UI checks. Apple
processed it VALID as `b58d53c5-7bec-469b-9308-03334a9ffd71`. Only then was the older
build-35 queue superseded. New review `8cc549e6-e90b-4281-ad7d-d58e774ebde2` is
WAITING_FOR_REVIEW. Existing screenshots, contact details, privacy listing and
automatic-after-approval release settings remain; no public Apple approval is
claimed. Android code 41 is still compiling at this checkpoint.
