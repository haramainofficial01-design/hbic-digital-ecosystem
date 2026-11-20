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
