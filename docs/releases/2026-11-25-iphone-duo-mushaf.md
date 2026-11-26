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

Apple validated build 61 (`b66e5375-b307-4190-b4f9-69d9ec5220f5`) and accepted review submission `5ac5be23-7283-4ca6-a5ad-ed3548bfbf76`. The review is complete, App Store Connect reports `READY_FOR_DISTRIBUTION`, and Apple's Canadian storefront lookup verified version 1.7.12 and its iPhone Duo release notes. The badge itself was not observable on the public web listing checked.

Apple describes the product-page badge in its [iPhone Duo preparation guide](https://developer.apple.com/iphone-duo/prepare/). Store review, public availability, the public badge and editorial featuring are separate from simulator verification.

## Follow-up verification

The next build synchronizes selection between the two facing pages without reloading their fonts. The Xcode simulator opened ayahs 2:41 and 2:49 from opposite leaves in sequence, then displayed the highlight only on the left for 2:49. Both the light and dark screenshots had zero pixels of the respective selection color on the right leaf. The dark capture used accessibility-medium text. The updated simulator also reopened the live spreads 5–6 and 7–8, and all 18 focused contract, page layout and selection tests passed.

The follow-up iOS 1.7.13 build 62 from `6c12f25` passed signature, SDK and bundle checks. App Store Connect reports `VALID` (`844576a8-e6f7-4ef1-9d6f-22cea467b7f1`). Its SHA-256 is `7a4be83548b66e4c11d2b88a210a274b37e8cafc3abb6a43ee8779c84ec885fd`. After 1.7.12 cleared review, the follow-up retained all ten ordered Duo screenshots and was submitted under `5080fd60-17e3-4718-b314-9322ac595087`. The submission reports `WAITING_FOR_REVIEW`, with automatic release after approval.

### November 26 simulator orientation checks

On Xcode 27.2 and iOS 27.1, the simulator build from the 1.7.13 source opened the live Madinah spread at pages 7–8 and selected ayah 2:49 on the left page. The tests checked that the selected page stayed available as the app switched displays and verified that both leaves loaded whenever a spread was shown. Focused reading also ran in dark appearance with accessibility-medium text.

| Pose | Verified interface orientations | Reader layout |
| --- | --- | --- |
| Fully open at 180° | Portrait, upside down, landscape left, landscape right | Right-to-left two-page spread |
| Partially folded at 130° | Portrait and upside down | Page 8 above the hinge. Page navigation, audio, bookmark, and meaning below. |
| Partially folded at 130° | Landscape left and landscape right | Two facing pages with a gutter at the hinge |
| Additional angles at 90° and 165° | Portrait in focused reading | Page and controls on opposite sides of the hinge |
| Low-angle tent at 30° | Landscape left and landscape right | Single page on the cover display |
| Closed at 0° | Portrait, landscape left, landscape right | Single page on the cover display |

The background simulator controls used different rotation values depending on the pose. The matrix uses the app scene's reported orientation and a Core Motion hinge reading to establish the actual configuration. The open and partially folded inner display passed all eight preset angle and orientation combinations in focused reading and preserved page 8 at the two additional portrait angles. The cover passed all three supported orientations. When upside-down rotation was requested on the closed cover, iOS stayed in landscape and the reader remained usable. This agrees with Apple's [iPhone orientation guidance](https://developer.apple.com/documentation/uikit/uiviewcontroller/supportedinterfaceorientations).

The two tent rotation assertions reported interface values 3/4 and 4/3 (observed/requested) at 30°. The screenshots and scene logs confirm that both actual landscape orientations loaded page 8 in focused reading. That yields 15 observed configurations with readable content, plus one unsupported cover rotation attempt. SHA-256 of the local evidence manifest for those 16 captures and four device/test logs is `680432f4d37c9ebae330def044d3a189ae8bbbb12f89d3b6580d33e622234acc`.

App Store Connect still returned `WAITING_FOR_REVIEW` for 1.7.13, and the Canadian storefront returned 1.7.12. All ten Duo screenshot placements for the live version are active and the media assets are approved. Both versions use the same ordered screenshot gallery. Apple's [Duo preparation guide](https://developer.apple.com/iphone-duo/prepare/) describes this gallery as the trigger for the product-page badge. The simulator lacks the native App Store and no physical Duo was connected, so the badge could not be visually confirmed.

The live responses for pages 5 and 7 each include one legitimate multi-glyph word that the shipping Android 1.7.11 client rejected. This prompted a separately verified Android build using the same corrected shared validator. The dedicated iPhone Duo layouts remain an iOS feature.

Android 1.7.12 build 60 from `8fbf6e2` passed bundle validation, signing, target API 36, and 16 KB alignment across 42 native libraries. The exact bundle-derived APK opened both pages on Android 16 and exposed the expected ayahs through the reader's accessibility tree. The emulator uses 4 KB pages. Signed AAB SHA-256 `64c5642c33777a31f84f620adddfd3474bfc630815fa30afb5e09f59cd98472e`. QA APK SHA-256 `03bde328aacf07ba4ee68198e047a626ac20eb477aa65f29fd6558dcefcecadf`.

Google Play accepted edit `11873509176799267161` for production review. A fresh track read returned version code 60 and the requested `completed` rollout status. The public Canadian Play listing showed 1.7.11 at the time of that submission check.

## Immersive Mushaf and Night Stand · iOS 1.7.14

The Duo reader hides its section navigation and native status bar while the Madinah Mushaf is active. It restores the normal bars on exit. Fully open landscape recovers 84 points of width for the reader. In tabletop, the page stays above the reserved hinge while the toolbar, page turns, bookmarks, audio and meaning sit below. The cover layout keeps the camera inset where required.

Night Stand opens in a low-angle landscape tent while the Mushaf is open. It shows the current surah and reading position with a dim palette. The user can play the selected ayah or return to the same page. The cover also has a manual Night Stand control. Opening the device again returns to the reader.

The 1.7.14 source passed 16 native checks on iOS 27.1 in Xcode 27.2 after the simulator bundle and executable were matched byte for byte with the installed copies. The checks covered all four orientations fully open and at 130°, the three supported cover rotations, both tent directions at 30°, dismissal, reopening and navigation away from the reader. Both tent cases activated automatically and preserved page 8 and ayah 2:49. The run used light and dark appearance with accessibility-medium text. Ten focused source tests, TypeScript and lint passed.

A separate iPhone 18 Pro simulator check passed with typical single-page reading and the standard Quran navigation. SHA-256 of the local evidence manifest for the 16 captures and three logs is `27ba6c285e209de15eac5923a02ec2f8c5d2682979c810f4cacb29d7d4883bf5`.

The visual review used native captures at enlarged text. Night Stand leaves the surah and two actions in view, with at least 11.45:1 contrast for its text and buttons. Pose changes add no independent animation or timer. A separate check confirmed Reduce Motion was active through UIKit, opened the reader, entered focus mode and returned to Quran home. The run log SHA-256 is `78cac6c733a33b2d368adf80f091a582fc0cb3d0e296d6404c90bad5ece1a59e`. The review drew on [Taste Skill](https://github.com/Leonxlnx/taste-skill), [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), [Emil Kowalski's motion guidance](https://aiforui.dev/skills/animate), and the [Apple design reference](https://getdesign.md/apple/design-md), within the existing Masjid Bilal design.

The signed iOS 1.7.14 build 65 from `dfc1b92662e21bbc29a0efa126052dd088dc2df3` passed signature, SDK and app, Watch and widget bundle checks. SHA-256 `6bc90d8cb78c902e79976caa70c45c8f3bfaca74541402d4ce9ea83723bf3511`. EAS completed the upload and App Store Connect reported `VALID` for build `f7b86012-60f8-4571-a2c0-25e4e28bd396`.

App Store Connect rejected creation of the 1.7.14 version record with HTTP 409 while 1.7.13 was waiting for review. The existing 1.7.13 submission remains queued for automatic distribution after approval. The public Canadian listing still reported 1.7.12. [Apple’s version creation requirements](https://developer.apple.com/help/app-store-connect/update-your-app/create-a-new-version/)
