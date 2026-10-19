# Repository Structure

## Canonical paths

- Repository root: `/Users/temporary/Documents/HBICCalgaryApp`
- Mobile app: `/Users/temporary/Documents/HBICCalgaryApp/apps/mobile`
- Public website: `/Users/temporary/Documents/HBICCalgaryApp/apps/public-web`
- Admin dashboard: `/Users/temporary/Documents/HBICCalgaryApp/apps/admin-web`
- Backend functions: `/Users/temporary/Documents/HBICCalgaryApp/backend/functions`
- Android project: `/Users/temporary/Documents/HBICCalgaryApp/apps/mobile/android`
- Apple target source: `/Users/temporary/Documents/HBICCalgaryApp/apps/mobile/targets`
- Shared Apple model: `/Users/temporary/Documents/HBICCalgaryApp/apps/mobile/targets/_shared`
- iOS widgets: `/Users/temporary/Documents/HBICCalgaryApp/apps/mobile/targets/masjid-prayer-widgets`
- Watch app: `/Users/temporary/Documents/HBICCalgaryApp/apps/mobile/targets/masjid-bilal-watch`
- Watch complications: `/Users/temporary/Documents/HBICCalgaryApp/apps/mobile/targets/masjid-watch-complications`
- Native Apple bridge: `/Users/temporary/Documents/HBICCalgaryApp/apps/mobile/modules/masjid-apple-bridge`

## Open this in Xcode

```bash
open "/Users/temporary/Documents/HBICCalgaryApp/apps/mobile/ios/MasjidBilal.xcworkspace"
```

The workspace is canonical because it loads both `MasjidBilal.xcodeproj` and the CocoaPods project. The referenced `.xcodeproj` is required by the workspace and must not be deleted.

## Do not open for normal development

- `/Users/temporary/Documents/HBICCalgaryApp/apps/mobile/ios/MasjidBilal.xcodeproj`
- `/Users/temporary/Documents/HBICCalgaryApp/apps/mobile/ios/MasjidBilal.xcodeproj/project.xcworkspace`

These project-only entries omit the full CocoaPods workspace context. Native Apple development and local builds should use `MasjidBilal.xcworkspace`.

The generated `ios` and `android` directories are local prebuild products. Durable custom native source lives under `targets`, `modules`, and `plugins`; Expo prebuild regenerates the platform projects from those tracked inputs.
