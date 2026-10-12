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
- Compatible Vision Pro simulator build/install/launch passed; initial interaction automation was blocked by a system deep-link confirmation. A clean-launch qualification is being rerun separately. No full Vision runtime pass is asserted yet.
- Designed-for-iPad/iPhone Apple-silicon Mac build passed with true-screen-size support. The initial embedded widget development profile did not cover the Mac; the local build refreshed that profile with the same existing identifiers/team. The latest application still needs a foreground interaction pass; compilation is not treated as runtime verification.

## Release boundaries

Mac support here means the compatible iPhone/iPad app on Apple-silicon Macs, not Intel Mac, Catalyst or a new standalone macOS bundle. Vision support means a compatible window, not an immersive spatial application. Existing store availability settings were already enabled; this work does not falsely mark Mac Verify Compatibility.

No App Store/Google Play binary or review submission is changed. The latest explicit instruction to obtain approval for a new store build remains in force. Academy, Stripe, prayer overrides, Watch identities, Firebase and published event records remain untouched.

Production website deployment and final runtime evidence will be recorded after verification.
