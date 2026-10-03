# Repository Structure

## Canonical paths

- Repository: https://github.com/haramainofficial01-design/hbic-digital-ecosystem (private)
- Mobile app: `apps/mobile`
- Public website: `apps/public-web`
- Admin dashboard: `apps/admin-web`
- Backend functions: `backend/functions`
- Android project: `apps/mobile/android` (generated locally)
- Apple target source: `apps/mobile/targets`
- Shared Apple model: `apps/mobile/targets/_shared`
- iOS widgets: `apps/mobile/targets/masjid-prayer-widgets`
- Watch app: `apps/mobile/targets/masjid-bilal-watch`
- Watch complications: `apps/mobile/targets/masjid-watch-complications`
- Native Apple bridge: `apps/mobile/modules/masjid-apple-bridge`

## Open this in Xcode

```bash
open apps/mobile/ios/MasjidBilal.xcworkspace
```

The workspace is canonical because it loads both `MasjidBilal.xcodeproj` and the CocoaPods project. The referenced `.xcodeproj` is required by the workspace and must not be deleted.

## Do not open for normal development

- `apps/mobile/ios/MasjidBilal.xcodeproj`
- `apps/mobile/ios/MasjidBilal.xcodeproj/project.xcworkspace`

These project-only entries omit the full CocoaPods workspace context. Native Apple development and local builds should use `MasjidBilal.xcworkspace`.

The generated `ios` and `android` directories are local prebuild products. Durable custom native source lives under `targets`, `modules`, and `plugins`; Expo prebuild regenerates the platform projects from those tracked inputs.
