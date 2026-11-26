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

This cut was rendered with `scripts/media/render-hbic-wudu-review.mjs` at commit `e9b6ff8`. The original lettering is embedded in the archived picture. The new title paths draw on its cap proportions, and the closing mark and donation line were extracted from the source.

The full 1080p export decoded cleanly. All 6,207 picture timestamps are continuous at 30 fps, and the first 5,080 decoded frames match the first private cut exactly. The 9,700 audio packets retain the same SHA-256 as that cut. There were no full-field black gaps of 0.10 seconds or longer, and the audio silence check found only the original opening and closing fades. The frame review covered each new hold, each dissolve and the final call to action.

- `Masjid Bilal Trailer - Wudu Area Revision.mp4` · 144,684,405 bytes · SHA-256 `3a8d21a9c03af11b8d5bd2d98f706001bba95564d4df0d1c2a8c48609acc54e2`

This export is for private review.

## Motion review

The Drive original was retrieved and matched the local archive byte for byte. Its opening reveals the centered title rapidly with a short cursor hold. The wudu project introduces the before-and-after pictures from opposite edges and then moves the next view up from the bottom. The closing raises the logo before typing “Donate Generously.”

The comparison, wudu and community-support headings use the opening's reveal and keep their final centering while they type on. The rounded panels slide in from the sides for the comparison and rise in sequence for the wudu area. The thank-you card clears before the closing logo enters. The logo entrance, “Donate Generously” reveal and exit use the original animated frames over the contour background. The donation URL appears after the archived wording settles. A readable hold fills the continuous soundtrack through the final fade.

Run `node scripts/media/render-hbic-wudu-review.mjs <original-film> <first-private-review> <private-output-directory>`. The script checks both input files by SHA-256 and keeps the video outside the published site and Git.

The 1080p master decoded in software and on macOS hardware. All 6,207 picture timestamps are continuous at 30 fps. The first 5,080 decoded frames match the first private cut, and all 9,700 audio packets retain the same hash. The silence check found only the opening and closing fades. The last 0.10 seconds reach the near-black threshold as the end card fades. Frame review covered the entrances, partial title reveals, settled titles, and closing fade.

- `Masjid Bilal Trailer - Motion Review.mp4` · 145,151,051 bytes · SHA-256 `b872e5c075f207e1609892ff5b864173338697a249ebcc81da3cda0e46179fc2`

## Brothers Night motion review

The Brothers Night insert uses the original Drive film’s contour artwork, the opening’s centered type-on reveal, and the rounded panel motion from the archival galleries. The white title holds above the four November 2025 shots while the portraits slide across the frame. The table tennis shot rises into place, and the chapter dissolves back into the moving archive footage.

The two joins span 1:25.467 to 1:52.033. The four shot timings are anchored at 1:26.000, 1:31.500, 1:34.500 and 1:42.000. The 32-frame review covered the partial title reveal, each shot exchange and both joins.

Run `node scripts/media/render-hbic-brothers-night-review.mjs <original-film> <motion-review> <graded-clips-directory> <private-output-directory>`. The script checks the original Drive film, Motion Review and four graded clips by SHA-256.

The master decoded in software and with macOS hardware acceleration at 1920 × 1080. All 6,207 frames have continuous 30 fps timestamps. The 5,279 decoded frames outside the enclosing splice keyframes at 1:22.433 and 1:53.367 match the Motion Review exactly, including the wudu and closing sequences. Their combined frame SHA-256 is `dc043485e4b062a7982511ee4694bf48edece640d954f62b9f0c223d63493db5`. All 9,700 AAC packets match the Motion Review. The 206.9-second export passed the blackout check at 0.08 seconds, and the silence check detected only the opening and closing fades.

- `Masjid Bilal Trailer - Brothers Night Review.mp4` · 144,343,473 bytes · SHA-256 `b12cee820f41d29a7b22f4d076b2196d550e4fea93bf75ffeca64bc194635d0c`
- Private Drive viewing copy · 1920 × 1080 at 30 fps · 84,377,010 bytes · SHA-256 `04f8e170c862a68295d3817f3ae4becc555edae69c32bc8bc4ed0f3f8f8f6cae`. The downloaded bytes matched the local viewing copy, and Drive showed owner-only access.

## Full original style review

The full private trailer was compared with the verified 3:00 Drive archive. The review mapped the source at its original time before Brothers Night and 25.5 seconds later after the insert. Chapter comparisons covered the opening, both quotations, the prayer hall, Ramadan, Halaqa Night, Brothers Night, the outdoor gallery and hike, Qur’an Academy, and the facilities and closing sequences.

The archive supplies the original framing and authored title motion in 4,258 delivered frames. Two black gaps in the source, from 34.567 to 35.500 and from 43.833 to 44.000, use picture dissolves. The centered hike title reveals with the same wide lettering and cursor as Brothers Night. Its panel expands into the clean mountain shot at 2:01.033. The facility comparison restores the original line about community support and clears the previous panel images before the next views appear. The welcome card brings back the centre’s full name, then clears for the original logo animation and “Donate Generously” line at their full source scale. The donation link follows with a matching reveal.

Run `node scripts/media/render-hbic-full-style-review.mjs <original-drive-film> <brothers-night-review> <private-output-directory>`. The renderer verifies the two inputs by SHA-256 and assembles the picture against the 206.9-second review soundtrack. Keep the master, proofs and source recordings outside Git and public hosting.

The finished 1080p master passed software and macOS hardware decoding. All 6,207 frames have continuous timestamps at 30 fps, each of the 12 section entries is seekable, and the 9,700 AAC packets match the previous review. The 4,258 restored source frames were checked in five time-aligned ranges. Each range averaged under 0.072 of one 8-bit luma level of difference on a 96 × 54 comparison. The black and silence checks found only the opening and closing fades.

- `Masjid Bilal Trailer - Original Style Review.mp4` · 145,491,542 bytes · SHA-256 `0f98d14526cbf7bc243cf99938d138b543725656c4ecd1ee0ebf4a84bd1e9497` · local private master.

## Halaqa footage review

The Halaqa Night shot at 1:15.700–1:18.233 uses Ustadh Faheem’s August 8, 2026 camera recording from Drive. A new 1080p Rec. 709 extract from 40–47 seconds of the 4K original supplies the footage. The wide white title uses its original two-line placement, with the glow moved clear of the speaker. The cut returns to the original audience shot on its existing edit point.

Run `node scripts/media/render-hbic-halaqa-footage-review.mjs <original-style-review> <graded-august-8-extract> <private-output-directory>`. The script checks both input files and copies the picture outside the two edit points and the complete soundtrack. The graded extract contains 210 frames and has SHA-256 `f471bafb337558c41425333af415f5e51dbaad6198715ad6227e781402ebcc04`.

The full export decoded in software and macOS hardware. The 6,131 frames outside the replacement match the Original Style Review exactly. Their combined SHA-256 is `faa22e9301832478834b514fc609f76fd99ab88aba12dc0c2847a013de1065f9`. All 9,700 AAC packets match, and 6,207 video frame timestamps are continuous across 206.9 seconds.

- `Masjid Bilal Trailer - Halaqa Footage Review.mp4` · 146,958,677 bytes · SHA-256 `2294dbe652a4b15083350a35feb7329006b000fd4a79a795c64266cfa18ad53f` · local private master.

## March 27 Brothers Night release

The replacement gallery uses three audience clips from the supplied March 2026 archive and a 4K source recording of the same March 27 gathering. The chapter title now reads “March 2026.” It retains the centered lettering, contour artwork and portrait-panel motion. The first and last 10 frames of the gallery dissolve over the corresponding original film footage.

Run `node scripts/media/render-hbic-brothers-night-review.mjs <original-film> <halaqa-footage-review> <graded-march-clips-directory> <private-output-directory> --march-2026`. The renderer checks the source and all four graded selects by SHA-256.

| Select | Source | In point | Frames at 30 fps |
| --- | --- | ---: | ---: |
| `march-1.mp4` | March archive, wide audience view | 2.05 s | 165 |
| `march-2.mp4` | `IMG_4381.MOV`, March 27 speaker | 488.00 s | 168 |
| `march-3.mp4` | March archive, seated listeners | 0.15 s | 174 |
| `march-4.mp4` | March archive, audience pan | 6.05 s | 258 |

The graded selects are 448 × 796, 30 fps and BT.709 SDR. The speaker extract uses the 1216 × 2160 crop at x=1380 and y=0, with HLG converted to SDR. The supplied ZIP has SHA-256 `c6bb6c3a049676d18c4bb05f632730e9295ec46ddbe4ffa7038c47c9a728e117`. The 4K recording has SHA-256 `f5ca13a84e898e161df8e22e49ae963dcf18117a3c7981721fe9241a32c054c9`.

The 1080p master runs 206.9 seconds with 6,207 continuous picture timestamps. All 5,410 frames outside the Brothers Night splice match the Halaqa Footage Review (SHA-256 `83c6aa5690bc69370583acb85d199c1edfc60e25163bd06984bbf6e22659a007`). All 9,700 AAC packets match the previous review (SHA-256 `6561a07432f7162dd3b8430f19c4eafa0128f2f7615b95cfaf618163aa8532ee`). The hardware decode found near-black and quiet intervals only during the opening and closing fades.

- `Masjid Bilal Community Film.mp4` · 144,381,391 bytes · SHA-256 `e63e92268c4b13bb483b1baed7618240fd11612a09ea837f2ef2a9c193abb645` · full-quality upload master kept outside Git.
- Website MP4 · 70,296,228 bytes · SHA-256 `120ce591cc5602142245f05642c2bd3fd2618e45d88b6c12d65a4ac425ffa7c1` · asset revision `20261125-march`.

The web player passed play with sound, pause and resume, and 16 seek checks at 320, 390, 1024 and 1440 px across light and dark appearance. No video was requested before interaction. The two touch viewport checks used reduced motion.

Source commit `88662dd` is live on `hbic.ca` via Vercel deployment `dpl_9ojX2NREeJy8QWBFMMUnra6iLkCZ`. The staged deployment and live domain both served the verified film, poster, and preview bytes. The film honored byte-range requests, and the Academy card-availability and prayer-display checks passed. The prior deployment `dpl_DoKwth3NaDVqdL3t2ejwTKszyspc` is the rollback that withdraws the trailer from the website.

The March cut is awaiting YouTube upload and Home trailer selection, and Instagram upload and pinning. The signed-in publishing tabs were unavailable in this chat.
