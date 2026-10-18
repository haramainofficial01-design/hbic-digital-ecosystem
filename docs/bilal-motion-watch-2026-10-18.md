# Bilal — identity, motion and Watch refinement

## Implemented scope

- One canonical, custom vector mark: mosque silhouette, three conversation
  points, gold arc and teal speech-tail. The existing masjid/app identity remains
  unchanged. Website SVG and small phone/Watch raster assets share this source;
  `sync-bilal-brand.mjs` reproduces the raster exports.
- Native chat/tour/replies use finite 260-ms opacity/translation animation on the
  native driver. Typing does not restart it; cleanup stops it, and Reduced Motion
  bypasses it. There is no continuous mascot, animated gradient, shader or frame
  callback. Website controls retain finite press/entry transitions and small-area
  glass, with Reduced Motion/Transparency and forced-colour fallbacks.
- Backgrounding the website immediately removes the panel, cancels pending chat
  requests and suspends the first-tour timer. Existing native foreground/private-
  route guards remain. These are code/lifecycle checks, not battery-life percentages.
- Shared app cards now use opaque tonal surfaces, a single edge highlight, fewer
  decorative layers and no Android card elevation. Shared headings/buttons use a
  calmer weight. This refines common surfaces without removing feature controls,
  changing prayer resolution, migrating private data or redesigning every screen.

## Apple Watch

Native `WatchBilalView` is reachable from Watch Home. It has suggested questions,
system text entry, bounded questions, a current response, vetted source links,
clear/session controls, privacy and four-language selection. Its requests use
the existing public HBIC assistant endpoint and the same server boundaries.
There is no model, microphone capture, stored conversation, account lookup,
background polling or new provider/dependency. System text entry may offer its
normal OS-managed dictation; HBIC does not access or record audio for Bilal.

The client uses an ephemeral cookie/cache/credential-free URL session, finite
timeouts, a 20-question session cap, duplicate/busy guards, strict response/source
validation and cancellation/clearing on disappearance/backgrounding. Always-On
and Low Power/Reduced Motion paths suppress motion or requests. The phone's
selected language is sent as a small additional field through the existing
WatchConnectivity application context; existing prayer bytes and identifiers
are unchanged. Repeated identical snapshot/language pairs do not re-send context.
The Watch also supports changing Bilal's language directly.

## Verified so far

- Companion software checks: **28/28**, including native motion configuration,
  hidden-page cancellation/no tour polling, four languages, light/dark, bounded
  layouts, persistence, privacy and sources. Native rendering adapters are not
  physical iOS/Android or battery proof.
- Existing rating **27/27**, onboarding **4/4**, prayer **24/24** and privacy **2/2**
  checks pass. Workspace typechecks, mobile/web lint and public production build
  pass, with existing unrelated web warnings retained.
- Watch model tests compile/run against an intercepted URL session: activation,
  no polling, fractional timestamps, Arabic request, limits, 429, clearing,
  cancellation and source isolation. No real user was queried or recorded.
- The new SwiftUI view typechecks for watchOS; the complete Watch simulator
  target builds, and a dedicated headless 40-mm Watch preview was launched and
  visually inspected. The compact logo/header and first action are readable;
  further actions and privacy information scroll. No simulator screenshot is
  represented as a real-device battery test or automatically uploaded to stores.
- A full iOS build against the old generated local project failed in stale
  prebuilt dependency/Watch asset settings before the new phone bridge compiled.
  It is not a source compilation pass. A fresh production-native build is still
  required. Existing generated files were preserved; no signing credentials or
  account permissions were changed.

## Release gate

This revision supersedes the previously prepared iOS 45 / Android 47 packages;
those do not contain the new Watch/identity work and must not be submitted as it.
The previous Android package passed 12 native flows, but an extra idle automatic-
launch run failed after earlier intermittent Home/loading observations. Reports
are retained, not reclassified as successes. Subsequent diagnostics and a cold
emulator restart successfully displayed the tour. The current clean JavaScript
bundle is being checked separately; a patched diagnostic APK is never signed
store evidence. Final exact artifacts must pass independently before submission.

No physical-device energy/thermal baseline, all-platform battery certification,
99% recognition qualification or general-purpose AI capability is claimed.
Website deployment and native store submission/public approval remain separate.

## Live website and first-launch diagnosis

The website refinement from `598c5ab9179245b1e8d017a71ce1bd3e89e01aa2`
is live at `https://hbic.ca`, production deployment
`dpl_BP7FTgwj1SjQ3GymHaAMdVsnT5vi`. It was staged, checked, then promoted;
the existing admin deployment and hosting configuration were retained. Live
checks passed again at 2026-10-18T19:38:28Z for canonical current prayer answers,
public tuition, private handoffs, three translated reply languages, no guessed
future times, honest preview limitations, real mobile/desktop tour controls and
the existing admin switch. The deployed SVG matches the canonical source:
SHA-256 `82734b7e18d1e13364dfeb8cafc3f2e9c4eece2e5b90a99296b56e2a1bd9393f`.
Actual deployed logos loaded in 390-px light/Reduced-Motion and 1440-px dark
viewports, with panels inside both viewports. This is not native-app validation.

A diagnostic-only Android run captured `source: api`, `loading: true`,
`onboarding: false`, `foreground: true`, with no refresh error and a disabled
launcher. The shared content provider has a startup race: foreground activation
can own a **silent** refresh before the initial cache read completes; the
ordinary startup request joins it, but the silent owner's old `finally` never
cleared the initially true loading state. This also leaves the refresh indicator
running and suppresses features that correctly wait for Home to finish loading.
The owner now always clears loading on settlement, without changing prayer
resolution, data, caches, scheduling, overrides or notification registration.

`npm run test:content` drives the real provider with controlled native lifecycle,
cache and transport adapters. Before the fix, the foreground-first success and
failure regressions failed (2 of 3); after the one-line fix, all 3 pass, covering
single-flight joining, normal startup/manual refresh, same-object retention,
cached/offline outcomes and listener cleanup. The 28 companion checks and mobile
typecheck also pass. Diagnostic logging is not part of the committed source.

A separate failed diagnostic run was terminated by Android's WebView package
auto-update, as recorded by `ApplicationExitInfo` reason `PACKAGE UPDATED`;
it is not evidence of a JavaScript crash. Play Store updates were disabled only
inside the disposable read-only QA emulator for repeatable tests. Previously
failed reports remain failed. Final untouched-artifact startup/lifecycle checks
and replacement signed packages are still required before store submission.
