# Masjid Bilal Apple Targets

These tracked native Swift sources are the durable source of truth for the generated Apple project.

Targets:

- `MasjidPrayerWidgets`: iPhone and iPad Home Screen and Lock Screen widgets.
- `MasjidBilalWatch`: native SwiftUI watchOS companion app.
- `MasjidPrayerComplications`: WidgetKit Apple Watch complications and Smart Stack content.
- `_shared`: the compact versioned prayer snapshot model linked to the main app and all targets.

The main application identifier remains `ca.hbic.calgary.app`. Derived target identifiers are configured in each `expo-target.config.js` file.

Shared data flow:

1. The Expo app fetches the same published content API used by the website.
2. `applePrayerBridge.ts` converts published prayer data into the compact versioned snapshot in `packages/shared`.
3. The native bridge validates and writes that snapshot to App Group `group.ca.hbic.calgary.app`.
4. WidgetKit reloads the iPhone/iPad widgets and Watch complications, while WatchConnectivity sends the same snapshot to the Watch app.
5. Each extension keeps the newest valid cached snapshot and presents a neutral unavailable state when no valid data exists.

No provider, API, synchronization, or admin-override wording is shown in public Apple UI.

Regenerate the local Apple project after adding or renaming target files:

```bash
npm run native:sync:ios
npm run native:verify:targets
```

Local verification commands:

```bash
npx pod-install ios
xcodebuild -workspace ios/MasjidBilal.xcworkspace -scheme MasjidBilal \
  -configuration Debug -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

The generated shared schemes must include `MasjidBilal`, `MasjidBilalWatch`,
`MasjidPrayerWidgets`, and `MasjidPrayerComplications`. The verifier fails if a
target, embed phase, bundle identifier, or shared scheme is missing.

Production archives require the paid Apple Developer account to provision the
App Group, Push Notifications, Watch app, widgets, and complications. Do not
change the main bundle identifier, Apple team, or App Group during regeneration.

Do not edit generated files under `ios/.targets` or manually recreate these targets in Xcode. Expo prebuild and `@bacons/apple-targets` register, embed, and regenerate them from this tracked directory.
