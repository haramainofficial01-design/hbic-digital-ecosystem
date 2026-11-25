# Masjid Bilal community film · November 25, 2026

This edit rebuilds the opening, quotation cards, Ramadan and outdoor galleries, Brothers Night, Qur’an class, facilities update and closing around one visual system. Avenir Next titles, the ink and warm ivory palette, and the same rounded edge treatment carry across portrait and landscape footage. Chapter changes use 12-frame eased dissolves. The individual footage cuts keep their natural pacing where the source permits it.

The 3:26.9 story and both spoken passages are preserved. The re-edit uses the original archived 1080p film and four verified 4K Brothers Night camera originals. Where typography or effects are baked into the archive, the video is reframed or trimmed around them and the on-screen wording is typeset again. The opening now begins in the occupied prayer hall before returning to the archive footage of the unfinished space. The original Masjid Bilal mark anchors the closing invitation and `hbic.ca/donate`.

The soundtrack is copied from the verified November 20 master. It retains both spoken passages, the continuous vocal bed, and the closing fade at their original times. The AAC packet SHA-256 is `6561a07432f7162dd3b8430f19c4eafa0128f2f7615b95cfaf618163aa8532ee`. Nasheed credit remains Hona Marro by Mubarak al Nwaibet.

The public homepage uses separate, versioned assets for the film, poster and silent eight-second preview. The full film plays on demand. Preview playback continues to respect visibility, reduced motion and data saving.

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

- [YouTube](https://youtu.be/ve2xJi9khW0) is public on Bilal Islamic Centre (`@HBICYouth`). Studio saved the new video in both Home spotlight slots, and the public channel Home page linked to the new ID. YouTube’s initial check reported no Community Guidelines issues and a music claim that could affect earnings. The superseded HBIC upload (`7u1o84wnYAY`) and the temporary private duplicate (`Z3IGOG4P07k`) were permanently deleted in Studio. The public trailer remained available after both removals.
- [Instagram](https://www.instagram.com/reel/DgLM4ITNfa2/) is live on `@hbicyouth` with the widescreen film. The app played the reel, and the profile grid showed its pin after refresh. Instagram confirmed deletion of the old reel (`DfMss34O7w4`), after which the profile still showed the new reel pinned.

## Matching covers

The covers share the frame at 00:33.367, where the speaker looks forward with his eyes open. The Instagram edition keeps the portrait, title and mark inside the profile-grid crop. The website shows a still cover by default and plays the existing silent teaser on mouse hover when viewing conditions allow. Touch, reduced motion and data-saving modes retain the still until the viewer presses play.

- [YouTube artwork](../../assets/community-film/YouTube%20Thumbnail.jpg) · 1920 × 1080 · 330,224 bytes · SHA-256 `6070d184257964c2d2c2101dded0307cc446ffd8b15d7ba4d5ee1e1205432230`
- [Instagram artwork](../../assets/community-film/Instagram%20Cover.jpg) · 1080 × 1920 · 240,567 bytes · SHA-256 `9c05b9d049f388d5bfde3ff3333a43d062e8197a671a80eaab90f60987980790`
- Website artwork · 1536 × 864 · 142,392 bytes · SHA-256 `dae7a868e977243fa85d3c7560fc662931eada9c08fe6c57f07c148e488e67c3`

The website cover and unobstructed play control are live from source commit `51abcf8` on Vercel deployment `dpl_47sBChRVckzHVE2VfeveU6HsYTCL`. The production poster matched the artwork hash, video byte ranges returned HTTP 206, and the prayer-display and Academy-card availability checks passed. At 390 and 1440 pixels, the poster appeared before any video request and the full film played on tap or click.

The updated YouTube artwork is live on the existing public trailer. The published thumbnail matched the new speaker crop after saving in Studio. The Instagram portrait artwork is ready. The existing reel is live with its earlier cover while the in-place cover update is pending.
