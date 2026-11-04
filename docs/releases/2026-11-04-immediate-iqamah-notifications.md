# Immediate published iqamah alerts

Publishing a changed effective iqamah now dispatches the existing visible iqamahChange push immediately, any day of the week. Draft saves and ordinary reads remain silent. Previous and new publications are resolved against current canonical prayer data before comparing, so unrelated content publications and daily automatic adhan offsets do not cause a broadcast.

Each publication revision has a transactional claim before dispatch. Ambiguous errors are retained without automatic resend. The weekly baseline advances only for the prayers alerted immediately, avoiding duplicate Sunday announcements while retaining other weekly differences. Existing device registration, per-prayer preferences, notification permissions, sound channel and /prayer navigation are reused. Provider acceptance does not prove on-device display.

Verification: 27 targeted notification, publication and prayer regressions pass; public-web TypeScript passes. Includes concurrent claims, unchanged publications, Sunday duplicate suppression and ambiguous provider failure. No real timetable was changed and no mass test notification was sent. Backend-only change; existing native apps can receive this notification type without a new binary.
