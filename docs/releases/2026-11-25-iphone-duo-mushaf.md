# iPhone Duo Mushaf · iOS 1.7.12

The Madinah reader uses UIKit’s reserved division region to keep both Arabic pages and the reading controls clear of the fold. The wide and book poses show the 15-line edition as a right-to-left spread. In the tabletop pose the page sits above the hinge, with page turns, audio, bookmarks, and meaning below it. The cover display shows one page. The selected ayah and reading position carry across pose changes.

## Verification

- Built the release configuration for the iPhone Duo simulator with Xcode 27.2 (`27B52`) and ran it on iOS 27.1 (`24A94232`).
- The native test loaded real Quran Foundation pages, turned a spread from pages 1–2 to 3–4, and verified that tabletop controls were reachable and separated from the paper. The tabletop test used dark appearance and accessibility-medium text. Moving between tabletop, open, book, and cover preserved page 4. Focused reading also used the split layout.
- The pagination tests exercised all 604 Madinah page positions, first and last page boundaries, and measured hinge layouts. TypeScript, lint and diff checks passed on the changed sources.
- No physical Duo hardware or independent Recite Assist accuracy evaluation was used in this verification. UIKit fold detection is iOS-only. This release targets iOS.

## Live Quran page delivery

Portrait testing exposed production HTTP 502 responses for pages 5 and 7. Quran Foundation encodes the first word of 2:26 and 2:44 with two QCF V2 glyphs separated by one ASCII space. The validator now preserves those glyphs together in a single selectable word. Native tests opened spreads 5–6 and 7–8 using the number pad and verified that both leaves loaded.

The web/API fix from `45c4b2f` was promoted as `dpl_Gki3bpkjXiZE4XzVvvtDjmSCcbgF`. Staged and live checks confirmed eight 15-line pages (1, 2, 4, 5, 6, 7, 8 and 604), exact compound glyphs on pages 5 and 7, and six service checks covering the homepage, Quran, Academy, prayer display, billing availability and admin route protection. `dpl_9ojX2NREeJy8QWBFMMUnra6iLkCZ` is the previous public deployment.

## App Store

App Store Connect prepared 1.7.12 (`8f9931cd-ae22-475b-8c8d-0573e517f493`) for the existing Masjid Bilal listing. The spread, tabletop and cover captures passed Apple’s image processing and lead the ten-image iPhone Duo gallery. The existing live version’s screenshots are recoverable in the asset library.

Apple describes the product-page badge in its [iPhone Duo preparation guide](https://developer.apple.com/iphone-duo/prepare/). Store review, public availability, the public badge and editorial featuring are separate from simulator verification.
