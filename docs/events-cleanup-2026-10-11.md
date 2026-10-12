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
- iOS simulator native Debug compilation/install/launch succeeded; content/navigation runtime qualification follows the CMS publication.

## Mobile release boundary

Live CMS corrections can propagate to existing clients. The new native archive, corrected hardcoded Home/Youth presentation and wider Quran workspace require a new mobile binary. Prepare/test these changes, but do not submit a new store build without the user's approval. No app version/build numbers or store submissions changed in this work.
