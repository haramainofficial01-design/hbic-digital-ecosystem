# iPhone Duo Mushaf · iOS 1.7.12

The Madinah reader uses UIKit’s reserved division region to keep both Arabic pages and the reading controls clear of the fold. The wide and book poses show the 15-line edition as a right-to-left spread. In the tabletop pose the page sits above the hinge, with page turns, audio, bookmarks, and meaning below it. The cover display shows one page. The selected ayah and reading position carry across pose changes.

## Verification

- Built the release configuration for the iPhone Duo simulator with Xcode 27.2 (`27B52`) and ran it on iOS 27.1 (`24A94232`).
- The native test loaded real Quran Foundation pages, turned a spread from pages 1–2 to 3–4, and verified that tabletop controls were reachable and separated from the paper. The tabletop test used dark appearance and accessibility-medium text. Moving between tabletop, open, book, and cover preserved page 4. Focused reading also used the split layout.
- The final simulator build opened pages 5 and 7 from the number pad in portrait and page 5 from the native number pad action in tabletop. Page 5 remained selected on unfolding, and a direct inner-display capture showed both repaired pages 7–8. The production archive included the existing scene-sized native tab host, also verified on a simulator cold start.
- The pagination tests exercised all 604 Madinah page positions, first and last page boundaries, and measured hinge layouts. TypeScript, lint and diff checks passed on the changed sources.
- No physical Duo hardware or independent Recite Assist accuracy evaluation was used in this verification. UIKit fold detection is iOS-only. This release targets iOS.

## Live Quran page delivery

Portrait testing exposed production HTTP 502 responses for pages 5 and 7. Quran Foundation encodes the first word of 2:26 and 2:44 with two QCF V2 glyphs separated by one ASCII space. The validator now preserves those glyphs together in a single selectable word. Native tests opened spreads 5–6 and 7–8 using the number pad and verified that both leaves loaded.

The web/API fix from `45c4b2f` was promoted as `dpl_Gki3bpkjXiZE4XzVvvtDjmSCcbgF`. Staged and live checks confirmed eight 15-line pages (1, 2, 4, 5, 6, 7, 8 and 604), exact compound glyphs on pages 5 and 7, and six service checks covering the homepage, Quran, Academy, prayer display, billing availability and admin route protection. `dpl_9ojX2NREeJy8QWBFMMUnra6iLkCZ` is the previous public deployment.

## App Store

App Store Connect prepared 1.7.12 (`8f9931cd-ae22-475b-8c8d-0573e517f493`) for the existing Masjid Bilal listing. The spread, tabletop and cover captures passed Apple’s image processing and lead the ten-image iPhone Duo gallery. The existing live version’s screenshots are recoverable in the asset library.

Signed build 61 came from `995ba0fb52bf3105505fdb86f2d221fb4fdfe92f`. The archive passed signature, SDK, expected iOS/Watch/widget bundle, version and Mushaf bridge checks. SHA-256 `de8673b3ec1ce6d294fa911632395c08ce0bbb8ecb35d3230c9025f317f3af18`. The transport upload completed. Earlier builds were superseded during checks before App Review.

Apple validated build 61 (`b66e5375-b307-4190-b4f9-69d9ec5220f5`) and accepted review submission `5ac5be23-7283-4ca6-a5ad-ed3548bfbf76`. App Store Connect reports `WAITING_FOR_REVIEW` with automatic release after approval. Public distribution and the public badge remain pending verification.

Apple describes the product-page badge in its [iPhone Duo preparation guide](https://developer.apple.com/iphone-duo/prepare/). Store review, public availability, the public badge and editorial featuring are separate from simulator verification.

## Follow-up verification

The next build synchronizes selection between the two facing pages without reloading their fonts. The Xcode simulator opened ayahs 2:41 and 2:49 from opposite leaves in sequence, then displayed the highlight only on the left for 2:49. Both the light and dark screenshots had zero pixels of the respective selection color on the right leaf. The dark capture used accessibility-medium text. The updated simulator also reopened the live spreads 5–6 and 7–8, and all 18 focused contract, page layout and selection tests passed.

The follow-up iOS 1.7.13 build 62 from `6c12f25` passed signature, SDK and bundle checks. App Store Connect reports `VALID` (`844576a8-e6f7-4ef1-9d6f-22cea467b7f1`). Its SHA-256 is `7a4be83548b66e4c11d2b88a210a274b37e8cafc3abb6a43ee8779c84ec885fd`. Apple's 1.7.12 review remains in place. App Store Connect requires the preceding version to reach Ready for Distribution before creating the follow-up version for review.

The live responses for pages 5 and 7 each include one legitimate multi-glyph word that the shipping Android 1.7.11 client rejected. This prompted a separately verified Android build using the same corrected shared validator. The dedicated iPhone Duo layouts remain an iOS feature.

Android 1.7.12 build 60 from `8fbf6e2` passed bundle validation, signing, target API 36, and 16 KB alignment across 42 native libraries. The exact bundle-derived APK opened both pages on Android 16 and exposed the expected ayahs through the reader's accessibility tree. The emulator uses 4 KB pages. Signed AAB SHA-256 `64c5642c33777a31f84f620adddfd3474bfc630815fa30afb5e09f59cd98472e`. QA APK SHA-256 `03bde328aacf07ba4ee68198e047a626ac20eb477aa65f29fd6558dcefcecadf`.

Google Play accepted edit `11873509176799267161` for production review. A fresh track read returned version code 60 and the requested `completed` rollout status. The public Canadian listings for both stores still showed 1.7.11 at the time of verification.
