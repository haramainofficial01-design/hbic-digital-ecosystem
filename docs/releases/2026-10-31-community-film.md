# Community film update — October 31, 2026

The website community film was rebuilt with a consistent navy/gold composition, rounded picture-in-picture scenes, eased entrances, 0.4-second dissolves, simplified captions, facilities before/after imagery and a closing masjid mark with the donation address. The source remains real HBIC footage. No generated scene, synthetic voice or new music was introduced. The complete 206.9-second duration and original remaster audio packet sequence are preserved.

Rebuild with `scripts/media/render-community-film.mjs <approved-source-folder> <fresh-output-folder>`. By default the immutable input remaster is expected alongside the source folder; `HBIC_FILM_INPUT` can name it explicitly. Use a fresh output directory after changing edit decisions because finished scene renders are cached there. The existing private source-media backup remains outside Git. The prior website export is also retained outside Git for rollback.

## Media verification

- Final: 1920×1080, 30 fps, H.264/AAC stereo, fast-start MP4, 206.9 seconds.
- Full export: 53,998,332 bytes, reduced from the previous 78,156,533-byte film (about 31% smaller).
- SHA-256: `b6b2bfd3e0fb957e31b916c5cf810d89aa498c3ed89ee0d2780a4a38742dc0a8`.
- Full error-sensitive decode passed; no long full-frame black intervals were detected. Representative scene/contact-sheet inspection also caught and replaced a blank embedded source shot and an old patterned introduction.
- Audio packet SHA-256 matches the prior remaster exactly: `f96a4bee97cd30f4dc84253274e431993019164857b267e69eae03af4a603b67`. No new audio splice, loop or speed change was made.
- Technical audio measurements: −17.05 LUFS integrated, −1.82 dBTP true peak, 5.1 LU range. These are technical checks, not a subjective human listening certification. The preexisting music attribution/rights status documented in the August release is unchanged.
- Real encoded-file playback tests at 390px and 1440px passed: user-gesture unmuted start, one video element, pause/resume, seeks at 55/90/176/201 seconds, no page errors and no horizontal overflow.

## Website performance and controls

The full film retains manual, user-gesture playback and browser controls. The smaller silent preview uses `preload=none`, runs only while visible, pauses in hidden tabs, and stays still with reduced motion or data-saving enabled. The component behavior test verifies these states. The updated files remain static CDN media, outside server function bundles. The complete film does not run as a Vercel rendering function.

The interface refinement preserves the existing website design system. Scoped finish review returned `ship` for the reviewed web player and representative media frames. No new global design tokens were introduced. Preexisting PRODUCT.md attendance wording is unrelated and was not changed.

No native binary is required for these web/static media updates. A separate YouTube channel-trailer upload is not implied by deploying the website file.
