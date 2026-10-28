# Academy Star of the Month certificates

Two coordinated US Letter landscape certificates, 11 × 8.5 inches. Print at
100% / Actual size on landscape Letter cardstock. The outer ink starts a
quarter inch inside the sheet; no edge-to-edge printer is required.

The brothers' edition uses deep petrol, teal and warm gold with engraved
geometric corners. The sisters' edition uses plum, rose and warm gold with
botanical corner details and a finer folded award seal. Both use the official
HBIC Qur'an Academy seal, with its central masjid mark, cream paper, real
Didot and Baskerville type, Snell Roundhand for the recipient, and Avenir Next
for supporting labels. Frame ornaments, stars, ribbons and seals are vector
geometry. The PDFs embed font subsets; original font files are not distributed.

The name field stays blank until a recipient is confirmed. Teacher and
Masjid Director signing spaces remain genuinely blank, one on each side at
the bottom. The certificate recognizes
Qur'an reading and recitation, kindness, good character, and respect for
classmates and teachers, for October 2026. The presentation date is
29 October 2026.

## Personalization

Run `Render Certificates.py` using a Python runtime with ReportLab installed.
The renderer uses locally installed macOS fonts and the repository's official
central masjid emblem. The original Academy seal is retained beside the
renderer as an identity reference. Its photographed outer rim was off-centre
and contained a stray line, so the certificate uses concentric vector circles
and real circular typesetting with the same Academy and masjid wording.
Both rim strokes, the navy disc and the central emblem share one exact centre.
The central emblem artwork itself is unchanged. Pass
recipient names with `--brothers-name` or `--sisters-name` and an
optional private output folder with `--output`. Omitting a name produces a
blank recipient line. Default output is under ignored `output/pdf/`.

Keep personalized PDFs, images and recipient information outside Git. Only
the reusable renderer and these non-personal design notes belong in source.

The final PDFs were rendered for visual review. Check page size, text,
embedded fonts, name spelling, and signing space before each personalized
edition is delivered. Companion images should be exported at 300 dpi.
