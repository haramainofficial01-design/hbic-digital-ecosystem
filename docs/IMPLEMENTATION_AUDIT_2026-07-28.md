# Masjid Bilal Corrective Release Audit

Audit date: 2026-07-28

Repository: `/Users/temporary/Documents/HBICCalgaryApp`

Branch and baseline commit: `main` at `cb4169dcd251de75a708d4efeabe0cf74efc5924`

This matrix records the state discovered before the corrective release work. A route, field, target, or placeholder is not counted as a completed feature without the required runtime or visual evidence.

| Requirement | Files | Current state | Missing work | Required evidence |
| --- | --- | --- | --- | --- |
| Apple production team | `apps/mobile/app.json`, `apps/mobile/ios/MasjidBilal.xcodeproj/project.pbxproj`, installed provisioning profiles | TESTED | No code change required. `ZJ58VWNTX3` is authoritative; `ZJ58WWNTX3` is not present in production configuration. | App config, Xcode settings, and all four installed profiles agree on `ZJ58VWNTX3`. |
| Canonical prayer engine | `packages/shared/src/prayer.ts`, `packages/shared/src/widgetSnapshot.ts` | PARTIAL | Complete versioned contract, schedule revision, tomorrow Fajr, stale reason, structured Hijri and Jumu'ah state, malformed/missing-data handling, shared fixtures. | Cross-consumer fixture suite and target builds. |
| Maghrib to Isha | `packages/shared/src/prayer.ts`, `packages/shared/test/prayer.test.ts` | TESTED | Expand boundary matrix and prove every consumer uses the snapshot result. | Regression test currently passes; mobile, web, Watch, widget, and complication fixture agreement remains. |
| Isha to tomorrow Fajr | `packages/shared/src/prayer.ts`, `packages/shared/test/prayer.test.ts` | TESTED | Add exact-boundary, midnight, missing-tomorrow, and stale-schedule cases. | Shared boundary tests and snapshot fixtures. |
| Calgary timezone and DST | `packages/shared/src/prayer.ts` | PARTIAL | Add device-timezone-independent and DST transition fixtures. | Tests for `America/Edmonton`, DST start, and DST end. |
| Apple shared snapshot | `packages/shared/src/widgetSnapshot.ts`, `apps/mobile/targets/_shared/PrayerSnapshot.swift`, `apps/mobile/modules/masjid-apple-bridge` | PARTIAL | Version the expanded contract, preserve v1 decoding, reject malformed snapshots, and keep newest-revision ordering. | TypeScript and Swift contract tests plus all Apple target builds. |
| Watch synchronization | `apps/mobile/modules/masjid-apple-bridge`, `apps/mobile/targets/masjid-bilal-watch/WatchPrayerStore.swift` | PARTIAL | Carry the canonical schema version and schedule revision, improve stale conflict rules, date rollover, and refresh evidence. | Watch tests and paired Simulator run. |
| Watch countdown | `apps/mobile/targets/_shared/PrayerSnapshot.swift`, `apps/mobile/targets/masjid-bilal-watch/WatchViews.swift` | PARTIAL | Replace terminal `0m` with `<1m`, trigger transition recomputation, and test negative/transient boundaries. | Swift tests and Watch Simulator evidence. |
| Hijri date | shared prayer/content code, mobile hero, public prayer table, Apple snapshot | PARTIAL | Make one canonical adjusted Hijri state with Gregorian equivalent, effective override support, cached consistency, feature flag, and admin preview. | Unit tests, published API fixture, platform screenshots. |
| White Days | shared Hijri helper, Apple snapshot, mobile/web labels | PARTIAL | Upcoming dates, opt-in reminder preference, feature flag, adjustment and month-rollover tests, approved localization. | Unit tests and rendered platform evidence. |
| Jumu'ah door notice | content types/data, mobile prayer page, public home/prayer pages, admin panel | PARTIAL | Independent enabled/title/body/localization/effective-date/exception model; Watch/widget propagation and audit metadata. | Published content test and platform evidence. |
| History of Fiqh draft | supplied poster outside repository | NOT PRESENT | Import poster derivatives and create a hidden draft without inventing dates. | Admin draft preview; feature remains disabled. |
| Community hub | `apps/mobile/app/community.tsx`, `apps/public-web/app/community/page.tsx` | PARTIAL | Data-driven modules, feature flags, hide empty/unapproved modules, approved content and admin workflow. | Mobile/web screenshots and publish test. |
| Halal coming soon | `apps/public-web/app/halal-restaurants/page.tsx`, mobile Community copy | PARTIAL | Complete mobile experience, feature flag, notification-interest path, verification explainer, accessibility. | Mobile/web screenshots and route tests. |
| Halal directory data model | None | NOT PRESENT | Add private production-ready model, moderation states, evidence separation, sponsorship separation, validation, and rules. | Typecheck, backend tests, Firestore rules tests. |
| Restaurant interest form | None | NOT PRESENT | Server validation, rate limiting, spam protection, private storage, duplicate handling, consent, admin inbox. | API/security tests and admin workflow evidence. |
| New Muslim Resources | Community placeholder only | PARTIAL | Structured content, private mentor request routing, feature flag, admin workflow; keep hidden until approved. | Admin draft and disabled public-state test. |
| Local Muslim Services | Community placeholder only | PARTIAL | Structured directory, moderation, feature flag, approved content requirement. | Admin draft and disabled public-state test. |
| Volunteer | shared opportunities, mobile/web events, admin panel | PARTIAL | Capacity/state/age/skills model, feature flag, application action, validation. | Publish flow and platform evidence. |
| Ask the Masjid | Community contact link only | PARTIAL | Private categorized submission, spam protection, status/routing, no public responses, admin inbox. | API/security tests and hidden-empty state. |
| Daily Benefit | None | NOT PRESENT | Reviewed source model, publication dates, admin workflow, feature flag; keep hidden without approved content. | Admin validation and disabled public-state test. |
| Seasonal mode | settings plus Ramadan/Eid content | PARTIAL | Effective dates, feature flag, data-driven client visibility, admin preview. | Boundary tests and platform evidence. |
| Feature flags | None | NOT PRESENT | Add all required flags with safe defaults and normalization. | Shared tests and admin/public behavior. |
| Native iOS 26 Liquid Glass | React Native custom tabs only | NOT PRESENT | Implement supported native iOS 26 tab/header/action surfaces with availability fallbacks and no fake blur. | iOS 26 Simulator screenshots and Release build. |
| iPad adaptive navigation | responsive width helpers only | PARTIAL | Native/adaptive tablet navigation, landscape and resizable layout verification. | 13-inch iPad Simulator screenshots. |
| watchOS 26 glass treatment | material-based custom Watch UI | PARTIAL | Apply supported native glass APIs selectively with pre-26 fallbacks. | watchOS 26 Simulator evidence. |
| iOS widgets | `apps/mobile/targets/masjid-prayer-widgets` | BUILD-VERIFIED | Consume expanded canonical state, add Hijri/White Day/Friday notice where appropriate, stale/privacy/tint verification. | Widget Simulator screenshots and all families built. |
| Watch complications | `apps/mobile/targets/masjid-watch-complications` | BUILD-VERIFIED | Consume expanded canonical state, fix transition/countdown behavior, verify all supported families. | Complication Simulator screenshots and target build. |
| Android widget | `widgets/android` scaffold | PARTIAL | Decide safe integration after core release stability; currently not wired into the generated Android app. | Android compile and widget host evidence if integrated. |
| Android Material/adaptive UI | React Native screens and adaptive grid | PARTIAL | Phone/tablet/foldable visual QA, edge-to-edge, RTL, dark mode, canonical prayer fixture. | Android phone/tablet screenshots and compile. |
| Notifications | mobile Expo client, Vercel notification store/routes | PARTIAL | Preserve provider receipt verification; repeat one-device visible/tap/deep-link test on corrected client. | DEVICE-VERIFIED delivery and tap evidence. |
| Admin publish | admin dashboard, public API/content store | IMPLEMENTED | Extend for new models/flags, authorization tests, preview and audit coverage. | Draft to publish to API to clients test. |
| Public website | Next.js routes on Vercel | DEPLOYED | Add completed corrective features, security workflows, accessibility/SEO QA, redeploy and verify. | Production build and live route checks. |
| English | public clients and admin | PARTIAL | Move new strings to localization keys and audit consistency. | String audit and screenshots. |
| Urdu/RTL | small shared dictionaries and Apple `.strings` files | PARTIAL | Expand only with reviewed translations; use English fallback for unreviewed copy. | RTL screenshots and reviewed-string inventory. |
| Accessibility | labels on selected mobile/Watch controls | PARTIAL | Full VoiceOver/TalkBack, Dynamic Type/font scale, focus, keyboard, contrast, reduce motion/transparency review. | Platform accessibility QA evidence. |
| History/store releases | iOS build 5 and Android code 11 exist | BLOCKED | Build 5 is evidence only and must not be submitted. Replacement artifacts wait for functional, visual, and build gates. | New unique builds only after all gates pass. |

## Confirmed Baseline Evidence

- `npm run test:prayer`: 3/3 tests pass.
- `npm --workspace @hbic/mobile run native:test:snapshot`: passes.
- `npm --workspace @hbic/mobile run native:verify:targets`: all four target names, schemes, and bundle identifiers pass.
- Canonical workspace contains `MasjidBilal`, `MasjidPrayerWidgets`, `MasjidBilalWatch`, and `MasjidPrayerComplications`.
- App config, Xcode project, and all four installed profiles identify production Team `ZJ58VWNTX3`.
- No excluded Janazah, funeral, burial, or inheritance feature text was found in source.

## Release Gate

iOS build 5 and Android version code 11 are not treated as the corrected final release artifacts. No paid or store build should start until canonical prayer, Watch, content/security, native visual, simulator, and local build gates are complete.
