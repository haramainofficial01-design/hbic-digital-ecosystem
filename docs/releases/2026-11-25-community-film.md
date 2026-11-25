# Masjid Bilal community film · November 25, 2026

This edit rebuilds the opening, quotation cards, Ramadan and outdoor galleries, Brothers Night, Qur’an class, facilities update and closing around one visual system. Avenir Next titles, the ink and warm ivory palette, and the same rounded edge treatment carry across portrait and landscape footage. Chapter changes use 12-frame eased dissolves. The individual footage cuts keep their natural pacing where the source permits it.

The 3:26.9 story and both spoken passages are preserved. The re-edit uses the original archived 1080p film and four verified 4K Brothers Night camera originals. Where typography or effects are baked into the archive, the video is reframed or trimmed around them and the on-screen wording is typeset again. The opening now begins in the occupied prayer hall before returning to the archive footage of the unfinished space. The original Masjid Bilal mark anchors the closing invitation and `hbic.ca/donate`.

The soundtrack is copied from the verified November 20 master. It retains both spoken passages, the continuous vocal bed, and the closing fade at their original times. The AAC packet SHA-256 is `6561a07432f7162dd3b8430f19c4eafa0128f2f7615b95cfaf618163aa8532ee`. Nasheed credit remains Hona Marro by Mubarak al Nwaibet.

The original deployment used separate, versioned assets for the film, poster and silent eight-second preview. The full film played on demand, and the preview respected visibility, reduced motion and data saving.

## Rebuild

Run `scripts/media/render-hbic-community-trailer.mjs` with the archived original film, the November 20 social master, the directory containing the four camera originals, and an output directory. The input hashes, shot times and crop boxes are in `scripts/media/community-film-timeline.mjs`. The renderer uses the macOS Avenir Next font and an FFmpeg build with `zscale` and libx264. It produces a full master, web export, matching preview assets and social covers. Keep camera originals, working renders and the social master outside Git.

The previous web export is reachable at commit `46b2d12`. The previous Vercel production deployment is `dpl_FvLoqgbkuWd9Pgc6LkbTtvH6BLgL`.

## Verification

The full master and web export each decoded at 1920 × 1080, 30 fps and 6,207 frames. The audio packet hash matches the November 20 master. The frame review covered all 46 scene blocks and the joins between chapters. No full-field black interval exceeded 0.08 seconds.

Unmuted playback, 16 seeks, and pause/resume passed at 390 and 1440 pixels. The rendering test passed for viewport visibility, reduced motion and data saving.

- Web film · 70,568,411 bytes · SHA-256 `83f20787c4e9835bfcead4a6da247e9b32abac383df0b0ca346f521c79f44890`
- Poster · 287,698 bytes · SHA-256 `5b6a43c170f461d662ae4fbd365f859372c9db24fad083d5436d04d5e3779934`
- Silent preview · 596,152 bytes · SHA-256 `f753a70331cab2af5bd69d9cfe6e2ff26cb94a84fadf3b4b6db48676f1ff93fb`
- Social master · 210,308,360 bytes · SHA-256 `17e2a92aa78df5d0afae63a16d2c390b47a8997ba426189cf3031e0a744ce321`

## Production

Source commit `1640510` was promoted to the existing public-web project as `dpl_8Gqh4P8ptknCyhHTvsN6h6mvzCKp`. Both the staged deployment and `hbic.ca` served all three matching media hashes and the `20261125-community` reference. The film returned HTTP 206 for byte-range playback. Academy billing availability and the prayer display schedule responded normally.

## Social publication

- YouTube originally published the film (`ve2xJi9khW0`) on Bilal Islamic Centre (`@HBICYouth`) in both Home spotlight slots. YouTube’s initial check reported no Community Guidelines issues and a music claim that could affect earnings. The superseded HBIC upload (`7u1o84wnYAY`) and the temporary private duplicate (`Z3IGOG4P07k`) were permanently deleted in Studio.
- Instagram originally published and pinned the film (`DgLM4ITNfa2`) on `@hbicyouth`. Instagram confirmed deletion of the older reel (`DfMss34O7w4`).

## Matching covers

The covers share the frame at 00:33.367, where the speaker looks forward with his eyes open. The Instagram edition keeps the portrait, title and mark inside the profile-grid crop. The website shows a still cover by default and plays the existing silent teaser on mouse hover when viewing conditions allow. Touch, reduced motion and data-saving modes retain the still until the viewer presses play.

- [YouTube artwork](../../assets/community-film/YouTube%20Thumbnail.jpg) · 1920 × 1080 · 330,224 bytes · SHA-256 `6070d184257964c2d2c2101dded0307cc446ffd8b15d7ba4d5ee1e1205432230`
- [Instagram artwork](../../assets/community-film/Instagram%20Cover.jpg) · 1080 × 1920 · 240,567 bytes · SHA-256 `9c05b9d049f388d5bfde3ff3333a43d062e8197a671a80eaab90f60987980790`
- Website artwork · 1536 × 864 · 142,392 bytes · SHA-256 `dae7a868e977243fa85d3c7560fc662931eada9c08fe6c57f07c148e488e67c3`

The website cover and unobstructed play control shipped from source commit `51abcf8` on Vercel deployment `dpl_47sBChRVckzHVE2VfeveU6HsYTCL`. The production poster matched the artwork hash, video byte ranges returned HTTP 206, and the prayer-display and Academy-card availability checks passed. At 390 and 1440 pixels, the poster appeared before any video request and the full film played on tap or click.

The YouTube thumbnail matched the new speaker crop after saving in Studio. The Instagram reel kept its earlier cover.

## Withdrawal

Vercel promoted source commit `37c7a15` as `dpl_DoKwth3NaDVqdL3t2ejwTKszyspc`. The trailer is absent from the homepage, media page and published app content. All 20 checked requests for the former film, teaser and poster URLs across the four public aliases returned HTTP 404. The prior November 25 deployment URLs require Vercel sign-in. Academy card availability and prayer-display checks passed after promotion.

YouTube Studio saved the exact trailer as **Private** and its anonymous oEmbed request returned HTTP 403. Instagram archived the exact 3:27 reel and removed it from the HBIC Youth profile grid.

## First private review cut

The review cut retains the typography, centered wording, quotation cards, contour artwork and closing mark from the original edit. Four Brothers Night shots use the original contour backdrop with a warm, rounded frame and 12-frame dissolves. Short picture dissolves bridge two black gaps in the earlier cut. The soundtrack carries through at the same timings, including its closing fade.

Run `node scripts/media/render-hbic-original-style-review.mjs <original-film> <november-20-master> <graded-clips-directory> <private-output-directory>`. Use the original welcome film from the private Drive archive, the November 20 social master, and its four graded clips named `brothers-1.mp4` through `brothers-4.mp4`. The renderer verifies all six inputs by SHA-256.

The review MP4 decodes at 1920 × 1080 and 30 fps, with 6,207 frames and 206.9 seconds of synchronized audio and video. The full decode found no black interval of 0.10 seconds or longer. The AAC packets match the November 20 master exactly. Integrated loudness measured −16.5 LUFS and true peak measured −2.8 dBTP. The silence check at −54 dB for 0.12 seconds found only the opening and closing fades.

- `Masjid Bilal Trailer - Private Review.mp4` · 152,484,012 bytes · SHA-256 `1562cd81d3edb4e7489106db940fbb222c9ea7b4cb8f28398f597f0ed6caf848`

The review file is kept outside Git and public deployment.

## Wudu area and closing revision

The picture revision starts at 2:52.133 with a dissolve out of the final wudu quotation card. The before-and-after, wudu area and community support scenes use clean windows into the archival footage. The titles extend the wide lettering of the original opening, with the same centered placement and soft glow. The rounded frames carry through the facility shots. The thank-you and donation cards use the archival contour artwork and the original Masjid Bilal mark, including the source’s glowing “Donate Generously” line.

Run `node scripts/media/render-hbic-wudu-review.mjs <original-film> <first-private-review> <private-output-directory>`. The original lettering is embedded in the archived picture. The new title paths draw on its cap proportions, and the closing mark and donation line are extracted from the source.

The full 1080p export decoded cleanly. All 6,207 picture timestamps are continuous at 30 fps, and the first 5,080 decoded frames match the first private cut exactly. The 9,700 audio packets retain the same SHA-256 as that cut. There were no full-field black gaps of 0.10 seconds or longer, and the audio silence check found only the original opening and closing fades. The frame review covered each new hold, each dissolve and the final call to action.

- `Masjid Bilal Trailer - Wudu Area Revision.mp4` · 144,684,405 bytes · SHA-256 `3a8d21a9c03af11b8d5bd2d98f706001bba95564d4df0d1c2a8c48609acc54e2`

This export is for private review.
