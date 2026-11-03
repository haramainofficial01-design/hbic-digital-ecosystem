# Prayer schedule readability — mobile 1.7.10

The Home schedule and full Prayer timetable now keep Adhan and Iqamah visually separate. The previous fixed-width time labels had no inter-column gap and could wrap AM/PM differently from one row to the next as text grew.

Each time now has an aligned numeric value and period. Phone rows deliberately place AM/PM below the number; sufficiently wide tablet/Mac panes show the pair inline. Both columns have an explicit gap, matching header geometry and tabular numerals. Column space grows with the system text scale. When the prayer name and both time columns cannot fit, the row shows the prayer name above labelled time groups, which can reflow vertically at accessibility sizes. Text remains scalable rather than being shrunk or truncated. Time groups retain left-to-right ordering inside the existing right-to-left interface.

The canonical prayer resolver, published values, manual overrides, next-prayer/alert highlighting, Sunrise's missing Iqamah and unavailable-data states are unchanged. This patch adds no dependencies, network work, timers or animation.

## Verification

- The shipped component passes 48 geometry configurations: 320/390/768/1280 widths, 100%/130%/200% text, and English/Urdu/Dari/Arabic, with light and dark coverage. Checks require exact fixture times, complete numbers and AM/PM, separation between cells and no horizontal overflow.
- Eight additional configurations cover full/compact schedules, both themes, unavailable data, Sunrise and prayer-alert highlighting.
- Existing Mac prayer-selector, content-pane and navigation regressions pass after isolating the unrelated Bilal launcher in their native adapter. Shared prayer/timezone tests pass. The combined run passes 28 tests.
- Mobile TypeScript checking and production-mode Hermes exports for iOS and Android pass from `apps/mobile`, using the existing app configuration. These exports are bundle checks, not signed store builds.
- Layout captures use explicit React Native-style browser adapters. They are not native screenshots or physical-device validation. The final signed Android AAB was subsequently converted to a QA APK and tested on a headless Android emulator: all six light/dark configurations at 100%, 130% and 200% text passed. Native Academy recognition, registration navigation, Dari month labels, wide layout and existing Bilal interface checks also passed. These are emulator results, not physical-device or iPhone visual acceptance. An attempted iOS simulator inventory did not complete; the command was stopped without changing the user's visible screen.

## Release status

Version 1.7.10 was built from `e42ec0b792cd109c099d817b0e536ba1624c1a95`. iOS build 53 passed signature and embedded-target checks, uploaded successfully, processed VALID and is WAITING_FOR_REVIEW. Android build 56 passed signature, bundle checksum, native-library alignment and final AAB-derived emulator checks; its production edit was validated and committed with changes sent for review. A subsequent track query confirms version code 56. Google’s track status of completed describes the intended rollout, not proof that review has finished or the binary is publicly downloadable. No OTA was published. See the 1.7.10 release record for exact artifact hashes and review identifiers.

Suggested store release note: “Improved prayer timetable readability, with clearer Adhan and Iqamah columns and better support for larger text.”
