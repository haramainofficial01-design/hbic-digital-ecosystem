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
