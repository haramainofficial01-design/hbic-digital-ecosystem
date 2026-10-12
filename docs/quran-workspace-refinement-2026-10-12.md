# Quran compact and expanded workspace

Continues the existing Quran reader on `feature/quran-reader-practice`; no provider, Quran text, recognition engine, billing, prayer, CMS or store-version changes.

## Interface

- Read / Listen / Practise / Library primary navigation, with contextual recite, memorization, self-test and collection controls.
- Focus Reading hides navigation/settings/search chrome while keeping the exact Quran text and an explicit exit control. Website Escape exits; Command/Control-K restores and focuses search outside editable fields.
- Website search and ayah jump are expandable rather than permanently competing with the reader. Compact introduction, bounded Arabic columns, light/dark layouts and mobile touch targets remain.
- Native home groups practice and collection actions, retains resume reading, and uses two columns in expanded windows. The virtualized sidebar now scrolls its shortcuts and search header on short windows.
- Native glass remains confined to navigation, with a reduced-transparency fallback and listener cleanup. No extra provider calls, playback timers or recognition work are introduced.
- `UISupportsTrueScreenSizeOnMac` supplements existing tablet and indirect-input support, without changing the existing app identity or demanding phone-only hardware.

## Verification

- 26 fixture-browser regressions passed across 320–1920 pixels and both color schemes, covering the existing tools, exact Arabic preservation, focus exit/search, recovery, bookmarks, Qibla and mobile prayer-panel minimizing. Three opt-in live Madinah checks are separate; no fixtures are published to production.
- Public production build and public/mobile typechecks passed. 29 focused native workspace, Mushaf, rendering/performance and private-review tests passed. These are not a physical-device thermal measurement.
- iPhone 15 simulator interaction test passed against the real configured Quran content: Read, Focus Reading, leave focus, contextual practice, self-test hints/reveal, library/bookmarks, search and preferences. Captures were visually inspected.
- Compatible Vision Pro simulator build/install/launch and Quran interaction test passed on visionOS 27.0. Read, Focus Reading, exit focus, contextual practice, self-test hint/reveal, library/bookmarks, search and preferences were exercised against real configured content. Initial automation was blocked by a system deep-link confirmation; the clean-launch test and current More → Quran label resolved the test harness issues. The actual full simulator display was inspected with `simctl io screenshot`: the expanded sidebar and all four primary tabs fit the window. App-only XCTest snapshots crop a scaled compositor layer on this runtime; `XCUIScreen.main.screenshot()` returned a 1×1 blank image. Neither is suitable for store assets; the harness retains its app-only snapshots as diagnostics, and full-display inspection is separate.
- Designed-for-iPad/iPhone Apple-silicon Mac build passed with true-screen-size support. The initial embedded widget development profile did not cover the Mac; the local build refreshed that profile with the same existing identifiers/team. Both decoded profiles include the test Mac. The local launch still did not produce a foreground application window: the process stalled at `dyld_start`, and an LLDB attach could not pause it. Mac runtime qualification remains incomplete; no missing user credential is inferred from this observation. Compilation and the verified Vision wide-window layout are not treated as a Mac runtime pass.

## Release boundaries

Mac support here means the compatible iPhone/iPad app on Apple-silicon Macs, not Intel Mac, Catalyst or a new standalone macOS bundle. Vision support means a compatible window, not an immersive spatial application. Existing store availability settings were already enabled; this work does not falsely mark Mac Verify Compatibility.

No App Store/Google Play binary or review submission is changed. The latest explicit instruction to obtain approval for a new store build remains in force. Academy, Stripe, prayer overrides, Watch identities, Firebase and published event records remain untouched.

## Production website

Public deployment `dpl_5y722bt7Zq6vKA3uypm3MetvRQ48` is READY and aliased to `hbic.ca`, with source metadata `c826b2657c84afb409b258753ee0c98790109353`. Live `/quran` returned 200. Browser checks at 390px light and 1440px light/dark used the real API, compared Al-Fatihah 1:1 against the verbatim licensed source, checked a nonempty approved translation, and exercised focus/exit, hints/reveal, keyboard search and overflow. All passed, without microphone use, model downloads or private payment/data writes. Live captures were inspected.

Final iPhone/Vision result bundles report one passed interaction test each, no failures and no runtime warnings. Local captures and build/test logs remain ignored; signing credentials and generated native projects are not committed.
