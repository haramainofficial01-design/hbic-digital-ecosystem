# Android 1.7.2 (34): release optimization

## Scope and result

Google Play accepted the signed `ca.hbic.calgary.app` Android App Bundle,
version `1.7.2`, versionCode `34`, on October 7, 2026. The existing production
track was updated to `Masjid Bilal 1.7.2 (34)` and changes sent for review.
A subsequent Android Publisher API read independently returned that release.
Acceptance/submission is not a claim that Google review is complete.

Built from source commit `46d8115` using the existing Expo project
`79283015-cb87-48ef-9761-81ab87641205` and existing Android signing credentials.
This was a local EAS production build, so there is no cloud EAS build ID.
Build number 33 was consumed by an abandoned local attempt and was not uploaded.

Local artifact: `output/release-1.7.2-r8/HBIC-1.7.2-34.aab`.
Artifacts and generated native projects remain untracked.

## Persistent fix

The registered `withAndroidReleaseOptimization` Expo plugin enables release
R8 minification, resource shrinking, full mode, and the optimized default
ProGuard configuration. Existing signing settings, debug behavior, native
consumer/JNI rules and app functionality are preserved.

Runtime testing identified and fixed two reflection compatibility requirements:

- Keep the manifest-loaded Expo `RNHeadlessAppLoader` constructor/class name.
- Keep Expo Kotlin record annotation defaults, required for native filesystem
  option conversion and onboarding/cache persistence.

The compatibility rules are narrowly scoped; obfuscation is not disabled.
Temporary diagnostics were removed before the final build.

## Verification

- Plugin regression tests: 4 passed.
- Existing visible-clock/onboarding tests: 6 passed.
- Mobile TypeScript check and lint: passed.
- Generated native release build and vital lint: passed.
- Signed AAB archive verification and bundletool validation: passed.
- Actual generated manifest: package/version/versionCode verified as above.
- Mapping file included in the AAB.
- Final AAB-derived APK installed and launched on Android API 36 emulator.
- Onboarding persistence, filesystem/cache, background/resume and native
  initialization exercised without the earlier reflection exceptions.
- Academy production WebView, Hijri rendering, notification settings and Quran
  maintenance screen exercised. Sunnah button launched the external browser
  with `https://sunnah.com/`.
- Existing widget provider retained in manifest and recognized by Android.
  No widget layout change was made in this patch.
- Bundled feature markers verified; temporary diagnostics absent.

## Measured artifact comparison

Compared with the previously submitted Android build 32:

- Raw DEX bytes: 28,557,820 → 7,280,956 (74.5% reduction).
- R8 mapping: 7,266 of 8,218 mapped classes renamed (88.4%).
- AAB bytes: 65,442,319 → 63,725,913.

These are local artifact measurements, not Google Play's independently computed
optimization percentages. Do not claim the old build 32 warning has disappeared
until the new build's Console report is available.

## Preservation

No iOS build, website deployment, Academy billing/backend, authentication,
Wallet configuration or unrelated dependency change was made for this patch.
Existing battery optimizations remain included in the Android bundle.
