# Community film typography and motion revision

The complete website film now uses licensed Montserrat Black lettering with lit faces, a short dimensional extrusion and diffused glow. Rounded photographic planes have a restrained illuminated rim, depth shadows and eased entrances. Staggered title entrances, a slowly moving navy background and selected soft directional/blur transitions replace the previous uniform treatment. The footage, captions, 206.9-second timeline and continuous audio sequence are preserved.

The unlisted original HBIC fundraiser was inspected through the authorized channel manager session as an editorial reference. Its visibility is unchanged. The revised introduction is a separate asset; publication to YouTube and Instagram must be confirmed independently of the website deployment.

## Verification

- 1920×1080, 30fps H.264/AAC stereo, fast-start MP4, 57,957,496 bytes.
- SHA-256: `eb4dbc20657c4af8da1d03539fd9d46faa8ed25c0b4e941fa6e79b24e01fe823`.
- Full error-sensitive decode passed and no long full-frame black interval was detected.
- Audio packet SHA-256 is unchanged: `f96a4bee97cd30f4dc84253274e431993019164857b267e69eae03af4a603b67`.
- Technical audio measurements: −17.05 LUFS integrated, −1.82 dBTP, 5.1 LU range. These do not constitute a subjective listening certification or a new music-rights clearance.
- Actual encoded-film playback passed at 390px and 1440px: user-gesture unmuted start, one player, seeks through the final section, pause/resume, no page errors and no horizontal overflow.
- Representative frame/transition inspection covered the complete film. Typography is pre-rendered into static video, so the lighting and depth effects add no client animation loop or server rendering work.
- The website preview remains silent, visibility-aware and reduced-motion/data-saving aware. It is 194,516 bytes, uses `preload=none` and requires a deliberate action to open the full film.

The licensed editing fonts and renderer are retained in source. Intermediate renders, private source footage and publication sessions remain outside Git. No native app dependency or binary change is required for this static website asset.

## Live website publication

Functional source `4ad2570` was deployed and promoted as `dpl_6zYn2jnxjVNET68AtnNKc9G7hddy` (`hbic-calgary-8h7qy5e9w-hbic.vercel.app`). The complete staged video matched the verified SHA-256. All production website aliases expose the new versioned film and October celebration link; byte-range streaming reports the expected full file length. The preceding Academy-reel deployment `dpl_CZBNo1SUqTsun85XcWffspjf4Zqu` remains recoverable.

Canonical app/display parity passed after the Calgary date changed to November 1: Fajr adhan 6:59 AM, iqamah 7:09 AM. Other staff-entered times, Academy card-payment availability, admin sign-in barriers and both approved recognition photo endpoints passed. The native release remains 1.7.9; these static web changes do not require a new app binary.

The social artwork and publication copy are committed separately in `assets/community-film`. YouTube/Instagram upload and channel/profile placement remain pending Chrome's file-URL upload access. YouTube channel customization additionally requires the account owner's passkey verification. No successful social upload or public social publication is asserted.
