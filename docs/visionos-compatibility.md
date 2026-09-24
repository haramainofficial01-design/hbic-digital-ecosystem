# Apple Vision Pro compatibility

Checked on August 24, 2026.

## Product path

Masjid Bilal uses Apple's compatible iPad/iPhone app path for Apple Vision Pro.
This is the same application and bundle identifier (`ca.hbic.calgary.app`), not
a second scaffold or disconnected store listing. The Expo configuration keeps
`ios.supportsTablet` enabled and allows all supported orientations, so the full
React Native interface runs in a resizable visionOS window.

This choice preserves all existing features and the same admin publication
feed. A separate visionOS-SDK/immersive app would be a different product and is
not required for compatibility.

## Verified locally

- Xcode exposes `MasjidBilal` for an Apple Vision Pro simulator as `Designed
  for [iPad,iPhone]`.
- The signed Debug build succeeded for the Apple Vision Pro visionOS 27.0
  simulator, including the React Native/Expo dependency graph, Adhan resource,
  notification module, iOS widget, Watch app, and Watch complications.
- The app installed, launched, loaded its Metro bundle, and rendered its Home
  screen in a scalable spatial window.
- The Home interface, tab bar, published prayer data, current announcement
  content, responsive cards, and bundled brand media rendered without a crash.

## Remaining acceptance

- With the Mac unlocked, exercise every tab, deep-link route, notification
  permission state, prayer alert scheduling, notification tap routing, external
  links, and Adhan preview using the visionOS simulator pointer.
- Repeat audio, notification, network, and window-resizing checks on physical
  Apple Vision Pro hardware before calling the platform device-accepted.
- In App Store Connect, confirm the iPhone/iPad app is available on Apple Vision
  Pro. This is an app-level availability gate separate from iPhone/iPad review.
- Do not claim immersive, volumetric, RealityKit, or native spatial features;
  this release is a compatible windowed app.

## Xcode gate

After `expo prebuild` and CocoaPods installation, first confirm the exact
destination emitted by the installed Xcode version:

```bash
xcodebuild -workspace apps/mobile/ios/MasjidBilal.xcworkspace \
  -scheme MasjidBilal -showdestinations
```

Then build using the Apple Vision Pro simulator UDID shown by Xcode:

```bash
xcodebuild -workspace apps/mobile/ios/MasjidBilal.xcworkspace \
  -scheme MasjidBilal -configuration Debug \
  -destination 'platform=visionOS Simulator,id=<VISION_PRO_UDID>' build
```

The compatible app intentionally links against the iOS Simulator SDK. That is
Apple's documented Designed for iPad/iPhone runtime behavior, not evidence that
the visionOS gate was skipped.
