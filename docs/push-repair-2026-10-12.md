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

Production deployment IDs, current store statuses and authorized-device delivery
results must be appended only when actually verified. Real phone testing still
needs the owner's explicitly paired iPhone/Android; arbitrary registered parents
must not receive test messages.
