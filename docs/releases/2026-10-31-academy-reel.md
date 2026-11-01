# October Academy celebration link

The approved October celebration reel is served through the existing `academyStars.highlightUrl` content field. The published and draft October entries are patched in place; existing photos, winners, privacy flags and other content remain unchanged. No unrelated draft content is published.

The homepage recognition section has a prominent navy/gold celebration link. The same section is now available below the Academy parent portal, with registration returning to its existing account form. It does not alter family sign-in, registration, payments or calendars. The reel opens Instagram only after a deliberate tap; no Instagram embed or autoplay script is loaded.

Native 1.7.9 already renders the supplied celebration link and opens it with the existing platform link handler. It receives this content through the published feed, requiring no new binary or OTA. The adapter verification covers the external destination at phone/tablet sizes and supported theme/language fixtures; this is not a claim of new physical-device validation.

## Live verification

Source `bc7599a` was deployed and promoted as `dpl_CZBNo1SUqTsun85XcWffspjf4Zqu`. The production homepage, Academy page and native published-content feed expose the approved reel. Phone (390px) and desktop (1440px) checks confirmed the link. Staged checks retained card-payment availability, staff-entered prayer times and private admin access barriers. Recognition privacy/lifecycle tests and native external-link adapter checks passed.

Both public store listings were checked after publication: iOS 1.7.9 is `READY_FOR_SALE` and the Canadian lookup reports 1.7.9; Google production is completed for version code 54 and its Canadian public listing reports 1.7.9. This release status does not imply additional Watch, Mac or Vision Pro physical-device validation.
