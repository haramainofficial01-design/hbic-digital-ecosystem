# Individual student attendance history

Academy staff can open Attendance history from the Students list, each child in a family record, or the daily attendance roster. The selected history receives focus and shows newest-first dates, Present/Absent/Excused marks and totals. Missing marks are never inferred as absences. Closing history returns to the existing screen.

The new read-only endpoint requires the existing personal Academy administrator authentication, validates both IDs, confirms family/child membership and returns no-store responses. Only the selected child's bounded current-term document references are read, on demand. It returns attendance date/status, not staff contact information or another child's data. Payment, exemption and daily attendance editing behavior is preserved.

Ten targeted service/route/organization/pass-lookup tests pass, including cross-child isolation, invalid/missing marks, date ordering, authentication, invalid identifiers and missing students. Public/admin TypeScript checks pass. Synthetic headless browser checks exercise Students → attendance history → close at phone and desktop sizes. This is browser fixture validation, not a logged-in production record inspection.

The owner separately confirmed immediate removal of one previously canceled student. The student entry and eight attendance records were removed, the family marked withdrawn, and its pass revoked. Financial month records were compared before/after and retained. No Stripe call, charge or refund was made. Private exact identifiers, backups and operation results remain outside Git. No native app bundle change is required for these admin features.
