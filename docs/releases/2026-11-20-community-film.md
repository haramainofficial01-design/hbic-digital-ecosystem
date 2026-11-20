# Masjid Bilal community film · November 20, 2026

The edit retains the original 3:26.9 timeline, centered captions, spoken passages, graphics, and fundraiser closing. The four Brothers Night shots were rebuilt from the 4K HDR camera originals in the HBIC Drive archive and graded to Rec. 709 to match the rest of the film. Five short dissolves carry that sequence into and out of the original edit. A 28-frame blank shot at 0:34 was replaced with a dissolve between the adjacent original shots.

The existing continuous vocal bed and both spoken passages keep their original sync. The new mix evens out the dynamics and fades under the closing logo. The finished audio measures −16.5 LUFS integrated, 4.0 LU loudness range, and −2.8 dB true peak. A silence scan at −54 dB found 0.124 seconds at the start and 0.943 seconds at the end, with no other quiet intervals longer than 0.12 seconds.

- Both exports fully decoded at 1920 × 1080, 30 fps and 6,207 frames. The AAC payload matches between them. Its SHA-256 is `6561a07432f7162dd3b8430f19c4eafa0128f2f7615b95cfaf618163aa8532ee`.
- The website export is 76,178,724 bytes. Its SHA-256 is `362bea7cf816af74628b2a2fa60812bd8f0a8671807a75ca3e15c5e445b5ea22` and its cache marker is `20261120-continuity`.
- The higher-bitrate social master is 151,416,555 bytes. Its SHA-256 is `c9b1dcee88e321dd3edef7fdd1156d4d85a6deef61721a474b3a000e8deeb911`.
- Browser playback passed at 390 and 1440 pixels with audio enabled. Both sizes passed nine seeks across the film and pause/resume. The rendering test also passed for visibility, reduced motion and data saving.
- Outside the two edit regions, all 5,402 sampled frames had a same-position structural similarity of at least 0.985 at 320 × 180 against the previous website film.

The previous site export can be recovered from Git at `63b81a7`. The previous Vercel production deployment is `dpl_FjeNrU5Hu6SspZ7t2gcFU77bHgy1`. The new source checksums and edit timings are in `scripts/media/finish-community-film.mjs`. The script takes the prior site export, the four Drive camera files, the artwork from the previous render, and an output directory. Use FFmpeg with libzimg for the HDR conversion. Camera files, the social master and render caches are kept outside Git.

Vercel deployment `dpl_FvLoqgbkuWd9Pgc6LkbTtvH6BLgL` was verified before promotion and again at `hbic.ca`. The homepage links to the new film, the full download matches its SHA-256, and video byte-range requests return HTTP 206. The Academy card payment status and prayer display schedule both responded normally.

The social master and covers are ready. YouTube and Instagram uploads and profile placement are pending authenticated browser access. The November 1 publications are still in place.
