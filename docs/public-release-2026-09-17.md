# Public release implementation record — 2026-09-17

Status: IN PROGRESS. No store publication authorized by this brief.

## Baseline checklist

- Existing: Expo 54 / RN 0.81.5, native Expo Router tabs, local file persistence, community content and notification preferences.
- Existing: Swift Apple Watch, WidgetKit, complications, App Group and WatchConnectivity bridge.
- Existing: centrally resolved public schedule, absolute prayer instants, Adhan/Iqamah transitions, dated cache and notification reconciliation.
- Existing: website, TV and admin apps. Preserve current TV layout and effective prayer schedule.
- Missing: persisted first-launch tutorial, replay and contextual permission introduction.
- Missing: dedicated Wear OS application, Tiles, complications and Android Data Layer bridge.
- Unverified: visible native Liquid Glass in current build, all current simulator/device release gates, store build numbering and current signing readiness.
- Partial: Urdu coverage; new untranslated copy must use the existing English fallback until reviewed.
- Partial: Android widget source is archived under widgets/android; do not promise it in onboarding.
- Environment: Xcode 27 installed; simulator discovery currently stalls. Android SDK not in standard Library/Android/sdk; inspecting existing local tooling.
- Preservation: pre-existing tracked and untracked changes retained. CODEX_HANDOFF.md absent. README and REPOSITORY_STRUCTURE contain old machine paths; actual checkout is Documents/Coding/HBICCalgaryApp.

## Design and onboarding contract

Impeccable 4.3.1 installed through `npx impeccable install --providers=codex --scope=project --yes`. Context command run against apps/mobile/app. Applied onboard, native audit, iOS, Android, animate and craft-floor references. User briefs already settle audience, scope, aesthetics and direct implementation; no new concept approval round needed.

Operate mode. Preserve current branding and native navigation. Welcome uses approved artwork; prayer step uses the real shared-data component; community step uses actual content; glance step is platform-specific; permissions are requested only on a deliberate action; completion opens Home. A single horizontal pager communicates progress, with scrollable large-text content, persistent skip and back controls. Reduced motion disables animated paging. No AI mockups or decorative generated assets.

## Verification ledger

Pending implementation and gates. Do not infer runtime, physical-device or publication status from source or compilation.
