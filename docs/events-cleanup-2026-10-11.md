# Event cleanup and Academy poster

## Scope

- Keep five discontinued lecture records privately, with visibility, featuring, registration and reminders disabled. The obsolete History of Fiqh publication flag cannot restore current listings.
- Update `event-quran-academy` in place: Monday/Thursday, 5:30–7:00 PM, $50 CAD per child/month, existing registration flow, October 5–February 1 term and Ramadan/Eid break. No changes to billing, enrollment or calendar closures.
- Keep Summer Camp 2026 in a separate completed archive and Media. Its July–August program has no registration or reminders.
- Verified public HBIC Youth reel: https://www.instagram.com/hbicyouth/reel/DeLkPvEB-Qq/ — caption identifies Summer Camp 2026; published October 7. Open the official permalink instead of downloading/rehosting the video.
- Use one exact supplied Academy poster, served by the website and reused remotely by mobile. SHA-256: `30c86a7b3de28e724dd5b772352a4d08ad7c65cb4042f78c4c8252365d52bc6f`. Its three original QR codes resolve to Academy registration and the existing App Store/Google Play listings.

## Backward compatibility and publication

`lifecycle`, `archived` and `highlightUrl` are optional. The public content projection separates `pastEvents` from current `events`; older clients ignore the additional archive collection. Staff edit retained original records through Current & Upcoming or Archived & Past.

Raw production draft/published/publication records were backed up privately before any changes; the original publication version was 14. The publication operation checks both original documents and the expected version, changes only events/programs/announcements/media/obsolete event flag, and uses the existing draft-save/publish endpoints. It must not overwrite unrelated draft edits or send cancellation notifications.

## Qualification

- 62 focused shared/mobile tests passed, including historical retention, repeat-safe cleanup, native registration destination, archive/no-enrollment wording, Quran layout/audio/performance regressions and existing prayer contracts.
- Public, admin and mobile typechecks passed.
- Public and admin production builds passed.
- Four browser layout checks passed at 320, 390, 768 and 1440 pixels. Academy details, poster aspect, registration, completed camp, matching Media permalink and absence of horizontal overflow were checked.
- iOS simulator native Debug compilation/install/launch and live event/archive navigation passed. Actual rendered screenshots were inspected; the existing native registration entry and completed highlight entry are present, with no cash/payment/enrollment operation performed. Native Android runtime verification was unavailable because no Android SDK/emulator is installed at the usual location or on PATH.

## Production verification

Published CMS version **15**, publication revision **12**, device refresh signal **accepted**. Draft and published content agree. All seven original event records remain in the private CMS; only Academy is current, and Summer Camp is exposed separately as completed. The five discontinued programs have reminders disabled. No cancellation push was sent.

Production website: `dpl_CKUBmWVcBHzPAJYS1h6k55SPr8BP`; admin: `dpl_Hb1DKb4bfXm2hNeaCddaQNDhM8m4`. Both existing production domains return 200 and resolve to these READY deployments, from source `7e2a4ed0f337cc432d92da6e4973b8a98016d9c6`.

Twenty actual live-page layout checks passed across Events, Programs, Youth, Media and Home at four viewport widths. The served poster's original SHA-256 matches. The live public API exposes only Academy under current events and the camp under `pastEvents`, with the same verified reel in Media. The protected admin draft view separates five Discontinued records, one Completed camp and the active Academy.

The existing publication workflow also normalizes legacy iqamah override expiry metadata to the already-approved persistent policy. Staff-selected prayer values and override timestamps remain unchanged; no prayer resolver or timing logic was edited for this task. All other non-target CMS fields compare unchanged.

Live Academy Overview and Payments still agree: $1,150 non-exempt tuition, cash $750 and card $400. Thirty active students remain enrolled. No enrollment or financial record was modified.

The final mobile pass fixed a bundled-image intrinsic-size overflow in the camp archive card by reusing the identical original poster served by the website. Academy's full title, concise summary and Mon/Thu badge remain readable. The final iOS navigation suite passed again and the rendered full camp poster was visually inspected. This mobile-only follow-up is not part of the already-live web binary and awaits a new approved mobile release.

## Mobile release boundary

Live CMS corrections can propagate to existing clients. The new native archive, corrected hardcoded Home/Youth presentation and wider Quran workspace require a new mobile binary. Prepare/test these changes, but do not submit a new store build without the user's approval. No app version/build numbers or store submissions changed in this work.
