# Quran website workspace refinement

The existing reader now has a compact introduction, icon-led navigation, a calmer surah library, segmented reading layout controls, consistent touch targets and bounded Arabic/translation columns. Glass depth is limited to navigation/audio controls; reading surfaces stay opaque. All existing listening, practice, memorization, self-test, bookmarks, settings, search, Madinah layout and Qibla actions remain.

Verified: public typecheck and production build; 21 fixture-browser tests across 320–1920px and light/dark modes, including every Quran tool, exact Arabic preservation, search, bookmarks, recovery and the dismissible audio player. Three opt-in live Madinah checks are separate from the fixture suite and were not enabled in this run. Browser screenshots were visually inspected. Fixtures are not production content.

Academy admin correction deployed separately as `dpl_4TZbLcgGmcBt9ekhLq1mLtSWSP4F` from `7f8b311`. Live protected Overview and Payments use the same non-exempt tuition total and cash/card split. A fully exempt scanned family showed no payment card, arrangement, history or currency; exemption management remained available. Financial records were not changed.

## Native compact/expanded workspace

Source commit `5d2c36c` adds a virtualized, locally searchable Surah sidebar for windows at least 1000 points wide, retains bounded reading columns and uses clearer Read/Listen/Practise/Library segmented tabs on compact windows. Existing memorization, self-test, listening, recording library, bookmarks and challenges remain. No extra content requests, audio timers or recognition changes are introduced by the sidebar. The app remains on its existing iPhone/iPad bundle with indirect input enabled, rather than creating separate Mac/Vision projects.

App Store Connect's existing Mac and Apple Vision Pro availability checkboxes are enabled for the compatible iPhone/iPad application. This is Apple-silicon Mac compatibility, not Intel Mac, Mac Catalyst or an immersive visionOS app. Xcode's Designed for iPad/iPhone Mac-target Debug build succeeded, but directly opening that raw iOS build on macOS failed with incorrect executable format: latest Mac runtime compatibility is not yet qualified and the store's Verify Compatibility setting was not falsely selected. The latest Vision runtime is not installed locally, so the new changes were not runtime-tested there. Earlier Vision simulator checks recorded elsewhere do not qualify this new revision.

Mobile typecheck and focused workspace/performance/audio/Mushaf tests passed. Native iOS simulator build/install/launch and the event navigation checks passed. The compact/expanded UI code is prepared; a new mobile binary needs approval before submission, in accordance with the latest event-cleanup instructions. Existing store build 1.7.5 (34) was observed Waiting for Review; this work did not submit another build or alter store version numbers.
