# Academy Star of the Month

The home pages display approved monthly Academy recognition alongside registration. Website placement is immediately after the welcome hero; native app placement is below prayer times. Month headings use the selected app locale. No notification is dispatched by this feature.

Publication uses the existing `academyStars` CMS field. Each entry has a `month` (`YYYY-MM`), approved `winners` (`side`, `name`, `photoEnabled`), and an optional real Instagram `highlightUrl`. Only the latest published, non-future month exposes photos. Older entries remain above it as names only. Photos remain visible across calendar boundaries until newer winners are added. An optional `photosUntil` provides an explicit privacy cutoff if required.

Approved, metadata-free WebP images are held in the private `academyStarPhotos` collection, keyed by month and side. The controlled image endpoint checks current publication eligibility before reading bytes. Sister photos also require the `faceObscured` flag after visual verification. Unblurred originals, private student information and publication credentials must never enter source control. Superseded photo URLs return 404; image cache lifetime is at most 60 seconds.

Adding a month must patch only this CMS field in published and draft content, preserving unrelated content. Never publish unrelated draft changes to add recognition. When a new month is published, remove old photo documents as part of the publication workflow after verifying names remain visible. Optional highlight links are omitted until supplied.

Verification covers monthly replacement, optional cutoff, invalid content, controlled URLs, private image failures, and native component behavior through explicit adapters. Adapter checks are not physical-device validation. Native app changes require a verified store build; this project currently has no OTA update configuration.

Locale formatting explicitly uses the Gregorian calendar for the `YYYY-MM` Academy month, including Dari; it must not silently relabel the month using the Persian calendar. Publication must also advance the existing content publication revision and revalidate Home so already-open pages refresh through the normal version check. The recognition operation must not send a mass announcement.
