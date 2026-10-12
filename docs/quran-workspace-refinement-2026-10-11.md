# Quran website workspace refinement

The existing reader now has a compact introduction, icon-led navigation, a calmer surah library, segmented reading layout controls, consistent touch targets and bounded Arabic/translation columns. Glass depth is limited to navigation/audio controls; reading surfaces stay opaque. All existing listening, practice, memorization, self-test, bookmarks, settings, search, Madinah layout and Qibla actions remain.

Verified: public typecheck and production build; 21 fixture-browser tests across 320–1920px and light/dark modes, including every Quran tool, exact Arabic preservation, search, bookmarks, recovery and the dismissible audio player. Three opt-in live Madinah checks are separate from the fixture suite and were not enabled in this run. Browser screenshots were visually inspected. Fixtures are not production content.

Academy admin correction deployed separately as `dpl_4TZbLcgGmcBt9ekhLq1mLtSWSP4F` from `7f8b311`. Live protected Overview and Payments use the same non-exempt tuition total and cash/card split. A fully exempt scanned family showed no payment card, arrangement, history or currency; exemption management remained available. Financial records were not changed.
