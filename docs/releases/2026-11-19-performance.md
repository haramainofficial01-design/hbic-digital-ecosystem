# Performance update — November 19, 2026

Release candidate 1.7.11 preserves existing prayer resolution, published overrides, billing, Academy and recognition behavior.

## Changes

- Qibla releases its heading subscription when the native screen loses focus or the app becomes inactive. A session epoch retires asynchronous permission/location/watch starts, so a late sensor cannot restart after navigation or backgrounding. Repeated starts replace the prior subscription. Compass animations stop when superseded.
- Quran listening bypasses pitch correction at normal speed. Altered speeds retain high-quality pitch correction and existing loop/interruption handling.
- Prayer schedule highlighting now uses the existing focus-aware 30-second clock instead of becoming stale after opening the screen.
- The website prayer rail renders at minute boundaries instead of every second, and suspends its clock while hidden. Public timetable polling cadence is preserved.
- Public version polling projects six Firestore metadata fields from both supported stored schemas, avoiding transfer/decoding of the full CMS document. Authentication, payment and private Academy responses retain their existing cache policies.

## Evidence and limits

Sensor race, duplicate-start, minute alignment, hidden-tab, audio speed/loop/interruption and content lifecycle regressions pass. TypeScript checks pass for mobile and public web. Public cache/prayer tests pass when run with the required react-server condition; an initial run without that condition failed at the server-only import and did not indicate a production regression. An initial timer test advanced ten minutes in one mock step; corrected to advance each minute so recursively scheduled timers are measured correctly.

The minute-clock fixture performs ten scheduled updates in ten minutes instead of 600 at the previous one-second cadence, plus the initial render. This is a component wakeup count, not measured device energy or account-wide CPU savings. Existing audio regression shows zero reader rerenders for 60 playback progress events; that optimization predates this release.

Physical iPhone/Android thermal profiling remains outstanding. No simulator or unit result establishes that the owner's reported heating is resolved. Native store approval and public availability must be recorded independently from builds and upload.

## Website deployment

Staged production deployment `dpl_FjeNrU5Hu6SspZ7t2gcFU77bHgy1` built successfully. Home, Quran, Academy, version, display and billing routes returned 200; the billing configuration reports card availability. Anonymous admin diagnostics returned 401. The verified deployment was promoted to the existing production project. Post-promotion checks and native artifact/review statuses are retained separately as they complete.

## Play requirements

Official Google documentation requires API 36 for new phone app updates and 16 KB native-library compatibility. The existing Expo 54 configuration and previous artifact targeted API 36; each new release artifact must still be inspected. Sources: https://developer.android.com/google/play/requirements/target-sdk and https://developer.android.com/guide/practices/page-sizes . No claim of current Play Console policy clearance is made from source configuration alone.

## Final mobile candidates and validation

The first candidates (iOS 54, Android 58) were superseded after catching iOS's transient inactive state during its first location permission sheet. Final source `8641632` preserves that permission request while still retiring real background or screen-exit work. Three sensor-policy/race tests pass. No initial candidate was selected for review.

Final iOS 1.7.11 build 55 passed signature, four target version/identifier, privacy purpose-string and bundled feature-marker checks. SHA-256: `29174444efd1aa7f8cdb8c3b5faa689dc297f82bbaaba2941bad6ba272fa671b`. Apple processing is VALID, build ID `be8d950c-dfec-4530-8dc5-bb624c149cb2`. Review submission `560e29e4-2543-45c4-aa97-439ea8af2a25` reports WAITING_FOR_REVIEW. Public approval is not established.

Final Android 1.7.11 build 59 passed signature, target API 36, all 42 native-library 16 KB alignment checks and existing feature-marker checks. The exact AAB-derived QA APK passed all six prayer interface trials: light/dark at 100%, 130% and 200% system text. Its SHA-256 is `c6a52d98cb10d12d6cbb8b995c695b1a32229b077ea5754b56daacc1b5469f63`. Emulator runtime uses 4 KB pages; ELF alignment validation is not a claim of executing on a 16 KB device. Google Play accepted the production edit with changes sent for review. A fresh production track read returned version code 59 with rollout status completed. This track status describes the intended rollout. Public storefront availability remains unverified. The signed AAB SHA-256 is `e9f318e97a045515a9cc36132afd13e394a73bbaa451040a0c84c5aab8dd5dd5`.

Post-promotion live checks confirm home, Quran, Academy, version and display responses, working billing availability and anonymous admin protection. Website screenshots at 390, 430 and 1440 pixels had no horizontal overflow. The 430-pixel capture used the browser's dark preference; it was not a large-text native test. No broad visual redesign was made as part of these focused changes.

Vercel's billing command returned unavailable cost data for the current free-team cycle. This does not establish zero usage or sufficient monthly headroom, and account-wide CPU reduction remains unmeasured.
