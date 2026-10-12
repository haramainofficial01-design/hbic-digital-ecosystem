# Quran Mac workspace and qualification — October 12, 2026

## Scope

The existing Apple-silicon-compatible HBIC app now selects a distinct Quran desktop workspace from native host constants, not window width. Wide iPad and Vision windows retain their existing UI. This is not a new Intel Mac app, Catalyst distribution, AppKit conversion or separate bundle identity.

Desktop additions:

- A compact, searchable 224-point sidebar groups reading, listening, practice, private library and surahs. It can be hidden; narrow windows have compact navigation without losing practice subtools.
- A separate glass-material toolbar provides focus, search, preferences and sidebar/inspector controls. Quran text and the reading inspector remain opaque for readability and performance. Reduced Transparency disables the glass material.
- At 1280 points and above, an optional reading companion shows the starting ayah, bookmark, listening/practice/test actions, reference reciter and adjacent surahs. The same existing reader, recordings and payment-independent Quran services are reused.
- Command-1/2/3/4 selects Read/Listen/Practise/Library; Command-F searches, Command-comma opens Quran preferences and Command-backslash toggles the sidebar. Native command observation is enabled only while the Mac Quran workspace is mounted and removed on unmount/module destruction.
- Mac sidebar, inspector and Quran icon actions explicitly handle native accessibility activation; disabled controls cannot invoke that action. This addresses the inspected React Native accessibility callback path, but native VoiceOver/E2E qualification is still pending.
- The app's existing default keychain group is now explicitly signed. The observed Mac Expo installation-ID lookup reported a missing entitlement before this change. Its runtime resolution is not yet confirmed; signed entitlement and provisioning checks pass.

Design references: Apple's [sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars), [Liquid Glass adoption](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass), and [keychain access groups](https://developer.apple.com/documentation/BundleResources/Entitlements/keychain-access-groups). The native framework's available glass API is used where supported; an opaque fallback remains available.

## Verified in the background

- Mobile and public TypeScript checks pass.
- Focused Quran regression, rendering, audio lifecycle, recording, recognition-tracking and scene-geometry tests pass. The background rendering test executes the actual Mac React components with explicit native-view/glass adapters, across 640/900/1280/1512-point light/dark layouts. It verifies fit, filtering, sidebar/inspector visibility, focus/exit and callbacks. These are **component-layout tests**, not native Mac E2E or App Store screenshots.
- The local signed, self-contained Release build succeeds for the existing Designed-for-iPad Mac destination, including the unchanged Watch/widget targets. Deep strict code-sign verification passes. Signed keychain access is `ZJ58VWNTX3.ca.hbic.calgary.app`; app-group and bundle identifiers remain unchanged.
- The iOS Simulator build succeeds with the added native bridge and window commands. The Android Release APK builds successfully with the desktop code correctly gated off. Both are local builds, not new store deliveries.
- No current app version/build number, production deployment, App Store availability, submission or security policy was changed.

Ignored evidence is under `output/quran-workspace-v2/`: `mac-desktop-final-typecheck.log`, `mac-desktop-public-typecheck.log`, `mac-desktop-full-focused-regression.log`, `mac-desktop-final-regression.log` and `mac-desktop-final-build.log`.

## Native Mac verification is incomplete

Earlier standalone local wrapper launches stalled at `_dyld_start`; that is not an application compatibility pass. The proper Xcode Designed-for-iPad launch subsequently reached the actual AppKit/UIKit event loop and rendered the home screen from a self-contained Release bundle. Existing authorized signing credentials and both profiles were checked; no missing credential was established, and no macOS security protection was disabled.

The initial Mac XCTest runner required corrected executable metadata and arm64 selection. It then discovered the real app hierarchy but stalled synthesizing an interaction while another application was foreground. Background accessibility `AXPress` success did not prove navigation; a normal physical click was separately observed changing the app to More. No complete native Quran reader/audio/resize/shortcut sequence passed.

The user subsequently requested **no foreground screen switching**. Native UI activation/click testing was stopped; source builds and headless checks continued. The new desktop workspace and keychain fix have not been fully exercised in a native Mac window. Do not mark Mac Verify Compatibility, claim Mac E2E PASS, or submit these changes as fully qualified until that test completes. The prepared native `QuranMacUITests.swift` and runner preparation script are retained for a future permitted interactive check; preparing the runner does not itself activate the app.

## Broader current-source checks retained

Prior to the background-only instruction, the iPhone 15 simulator passed three real UI scenarios (stream progress/pause/resume/stop, self-test hints/reveal, denied-microphone recovery); the iPad workspace test passed; Watch passed licensed offline ayah navigation and actual streaming playback; Android Release passed private recording lifecycle and actual streaming playback. Android also prepared the real pinned recognition model and passed silence/pause/resume/restart/background cleanup without retaining audio. These completed runs predate the final Mac-only source additions; native regressions for the added scene commands must not be assumed from them.

The unchanged public deployment additionally passed live streaming, search and bookmark restoration, plus three real-data Madinah layouts. Compatible Vision window evidence remains valid for its previously tested source; no immersive visionOS app is claimed.

## Recite Assist remains an early preview

Current production decoder controls were rerun against 96 real waveform cases using the pinned licensed model: 0/60 false alerts, 3/36 correct operation detections (8.33% recall: omission 1/12, repetition 2/12, substitution 0/12). These edited waveform controls are not natural microphone ground truth. Desktop model inference p50/p95 was approximately 70/120 ms, not mobile end-to-end feedback latency.

Replaying the recorded natural acoustic evidence through the current tracker yielded 1/126 clean false alerts, 1/37 held-out clean false alerts, and 0/2 localized naturally reviewed mistakes. That replay was not a new microphone/ASR evaluation. No reliable Tajweed/pronunciation grading, general natural-word accuracy, real-device thermal/battery qualification or dependable automatic assessment is established. The user-authorized optional preview must not be described as a qualified teacher/reliable mistake detector.
