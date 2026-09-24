# Public web and welcome-film release — August 28, 2026

## Live deployments

- Public website: https://hbic-calgary.vercel.app
- Existing alternate public address: https://hbic-calgary-app.vercel.app
- Admin dashboard: https://hbic-calgary-admin.vercel.app
- Remastered film: https://hbic-calgary.vercel.app/media/videos/hbic-welcome-story.mp4?v=20260828-remastered
- Public deployment: `dpl_BrxszYHwwgs2rJXVeBoqY4xtqFkc`, production / READY, August 28.
- Public deployment URL: https://hbic-calgary-3gkmaflhh-haramain-team.vercel.app
- Admin deployment: `dpl_4uPU2FPcRn5hToords78twcHn6QS`, promoted to production August 27.
- Admin deployment URL: https://hbic-calgary-admin-ee17yxau4-haramain-team.vercel.app

The accumulated working-tree website changes were deployed without resetting the repository, removing untracked files, or replacing either application. The public and admin projects remain separate Vercel deployments. A public media replacement does not create a new App Store or Google Play binary.

## Film edit

The existing story, its two original spoken passages, bathroom-completion sequence, and donation closing remain. The fragmented music bed was replaced with one continuous 206.9-second source at its original tempo. There are no loops, reordered verses, or abrupt music splice points. Music fades down beneath speech and returns smoothly afterward.

- Opening speech: original timeline 6.45–15.50 seconds. Word-timing checks place the final word before 15.30 seconds.
- Closing speech: original timeline 136.30–146.90 seconds, now 161.80–172.40 seconds after the inserted footage.
- The original speech excerpts contain some baked-in background sound; these are not claimed to be isolated studio voice recordings.
- New material: 25.5 seconds from HBIC Brothers Night, November 2025, inserted at 1:26. Four portrait shots use a restrained black/gold layout: gathering for knowledge, a reader, time together, and table tennis. They do not duplicate footage already in the original film.
- No additional spoken halaqa excerpt was used: the available fragments did not form a sufficiently clear, relevant standalone message. The new footage is muted under the continuous nasheed.
- Final card is held with the complete donation message, then fades to black.

Source folder supplied by the user: https://drive.google.com/drive/folders/11LGb4a7-urAXsmaWRFfLS4hfjLgbyDSD

Selected source files, from the Brothers Night folder:

| File | Drive file ID | Selected interval |
| --- | --- | --- |
| `IMG_0916.MOV` | `1FPnaFRpveRlTwlHYmy_px9nN6StoJs7c` | 0.15–5.65 s |
| `IMG_0965.MOV` | `1ZUvOut98M6kWsRykwY6zvG8HcaRx1-_8` | 0.10–3.10 s |
| `IMG_0984.MOV` | `1HK9G1CVrzwRLmS_ZPDwPAdrtLv_Dnp73` | 0.20–7.70 s |
| `IMG_0987.MOV` | `1DCwlKN9qBULT593yZ4KPows88KKTBZFx` | 0.60–10.10 s |

Nasheed: **Hona Marro — Mubarak al Nwaibet**, sourced at the user's direction from https://www.youtube.com/watch?v=YKcWczXS-bw. The source description references https://soundcloud.com/mnwaibet/rnq1lrpmoblo. Artist credit is retained in the MP4 metadata. This task did not establish a redistribution licence; do not describe the recording as royalty-free or licensed by this work.

## Media and player verification

- Export: 1920×1080, 30 fps, H.264 High / level 4.1, Rec.709, AAC stereo 48 kHz, fast-start MP4.
- Video and audio both start at zero and have duration **206.900 seconds**; 6,207 video frames.
- Export size: **78,156,533 bytes**.
- Full audio/video decode with FFmpeg `-xerror`: passed.
- Measured final loudness: **−17.05 LUFS**, true peak **−1.82 dBTP**, loudness range **5.10 LU**.
- Nine two-second source-correlation checks, distributed from 0:02 through 3:19 outside speech, scored 0.99965 or higher at unchanged time offsets. This verifies that the replacement music stays in source order without timing drift.
- Inspected original/new sequence frames and the completed final card.
- Downloaded the production MP4 and verified its SHA-256 exactly matches the local export.
- Production byte-range request: HTTP 206 with the correct file length and `video/mp4` content type.
- Both public aliases serve the new versioned film reference and the 3:27 label.
- Live browser: one-click playback starts unmuted; the silent preview is removed, leaving one video element. Playback time advances. Pause, resume, and seeking to the community insert and final card work. No browser error/warning messages were reported during the playback checks.
- Technical audio timing, levels, and playback were checked. A subjective human listening review, physical-device Safari playback, and speaker/headphone quality are not certified by these checks.
- A requested 390-pixel browser viewport override did not change the observed 1280-pixel viewport and was reset. No phone-width browser acceptance is claimed from that attempt.

SHA-256, original:

```text
669702d406864f892c7bff5ee6bc453d3029d8ca138627a75e56b1185ab96cf3
```

SHA-256, remaster and downloaded production copy:

```text
9ef493c99677a19f2daed9dbbe65f8b941b79a043742bff096342b65729535d9
```

## Verification gates — kept separate

| Gate | Evidence / current limit |
| --- | --- |
| Public web | August 28: `npm run build:web`, then `npm run typecheck --workspace @hbic/public-web`, both passed in that order. Production build passed. Existing image-optimization lint warnings remain. |
| Admin web | August 27: `npm run build:admin`, then admin workspace typecheck passed. Live admin UI reads Firestore published content v5 and uses the canonical public API. |
| Regression tests | August 28: prayer 20, halal 5, community 5, notifications 15, notification payload 5, privacy 2 — all 52 passed. |
| Live HTTP checks | Both public homepages, admin homepage, community, halal directory, privacy, prayer times, content version, prayer snapshot, and the Madinah Adhan audio asset returned HTTP 200. Prayer snapshot schema is 2 and its generated timestamp was current on August 28. |
| Authenticated publishing / propagation | **Not verified end-to-end.** The available admin publish key returned HTTP 401 from production diagnostics. No key was rotated and no artificial live content edit or broadcast was sent. A valid production admin key is needed to test publishing and device propagation. Draft saves intentionally do not publish; the Publish Changes action publishes. |
| Expo/native apps | Not rebuilt or changed in this film release. The user reported submitted updates in review; private store status was not independently verified here. Unit tests are not physical notification-delivery evidence. |
| Widgets / Watch / visionOS | No new acceptance result from this web/media release. Their native verification gates remain separate. |
| Notification providers | APNs/FCM credentials, receipts, locked/terminated-device delivery, and scheduled Adhan playback were not certified by this web release. |
| Signing / store release | No signing changes, new binary upload, review submission, or store rollout was performed for this film replacement. |

## Backups and reproducibility

Original media, the original player component, selected sources, the higher-quality source master, the final export, the decode log, and the render script are preserved outside the repository:

```text
/Users/sahlshafiq/Documents/HBICCalgaryMediaBackups/2026-08-27/
```

The original production video is `hbic-welcome-story-original.mp4`; the remaster is `hbic-welcome-story-remastered-20260828.mp4`. The reproducible FFmpeg pipeline is `rebuild-film.mjs`. Source media are in `sources/`. No original Drive media or local source footage was deleted or overwritten.

The public component retains user-gesture playback for Safari/iOS, pauses the preview before the full film starts, respects reduced motion for the preview, and displays a direct-link fallback if playback fails.

For a later admin deployment, use an isolated upload staging directory whose **root** `vercel.json` is the admin configuration. Passing only `--local-config apps/admin-web/vercel.json` from the monorepo root did not reliably select the correct remote build: the uploaded root configuration was still public-web. The successful admin release used a staged root config and verified the admin build before promotion.
