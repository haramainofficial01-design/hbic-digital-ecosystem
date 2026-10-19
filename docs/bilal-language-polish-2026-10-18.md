# Bilal — conversational tone, languages and interaction polish

## Scope

Bilal retains its public-information lookup architecture. This change adds no
model, provider, speech recording, account permission or paid service. “Voice”
means its written tone, not a new spoken-voice capability.

- Warmer introductions, greeting/thanks responses and kind but explicit handoffs.
  Full-message greetings cannot conceal questions about private accounts,
  religious rulings or elections. Missing facts remain refusals to guess.
- Authored Urdu, Dari and Arabic coverage for all fixed core topics, including
  live tuition, next prayer, Quran features/privacy/preview, app help and events.
  Prices/modes and adhan/iqamah remain derived from the same public sources.
  Source labels and approved donation category labels follow the chosen language.
  Original CMS program/notice prose and proper names are not automatically
  translated or invented: unmatched prose retains its original-source label.
- Expanded supported-topic vocabulary, Arabic/Persian letter variants and
  localized different-day prayer guards. Next-prayer intent is prioritized;
  Arabic audio recordings are not Academy registration. Public recording-storage
  help is distinct from a private family/payment lookup.
- Cleaner welcome, four icon-led shortcuts, simpler reply surfaces, clearer
  source actions and responsive small-screen layouts. Native two-column cards
  fall back to rows on narrow screens/enlarged text. Language changes cancel
  pending replies and clear old-language in-memory conversation.
- Finite entry/reply and press feedback only. Native transforms use the native
  driver and do not block interactions. Typing does not restart entry animations;
  Reduced Motion bypasses them. Hidden/background/private-route guards remain.
  No continuous dots, shimmer, animated gradient, render loop or background model.

The visual refinement draws on Impeccable's public examples of clearer hierarchy,
less nested framing and brief feedback: https://impeccable.style/. It retains
HBIC's own mark and navy, teal and gold identity; no external skill or dependency
was installed.

## Source checks

- Companion: **35/35** tests, including all fixed-topic translations, 21 natural
  supported-language questions, live-fee mode/evidence, stale dates, private
  handoffs, source safety, four-language tours, light/dark, narrow and keyboard
  layouts, idle/typing motion settlement and native press/Reduced Motion paths.
- Preserved checks: rating **27/27**, onboarding **4/4**, content lifecycle **3/3**,
  smart app link/QR **7/7**, prayer **24/24**, privacy **2/2**.
- Workspace typechecks pass. Lint passes with existing unrelated web warnings.
- Watch interface generation has **68** authored labels in each of four languages.

Rendering adapters are not physical iOS/Android/Mac/Watch validation or measured
battery/thermal proof. Authored translations and fixture coverage are not a claim
of perfect understanding, certified linguistic review, general AI or 99% Quran
recognition. No unrelated Academy, Stripe, prayer, notification, Quran inference
or signing behavior was changed.

## Release tracking

Source verification, website deployment, native package verification, store
submission and public approval are separate gates. The previous live web
deployment is `dpl_93MpvdsxNHhVJazc9ebyxkBkDjV3`; previous packages are iOS 46 and
Android 49. Those packages do not include this new native chat presentation.
Replacement artifact and deployment evidence is recorded after verification.

## Final native spacing correction

Visual inspection of the installed Android 50 package exposed asymmetric panel
margins: `width: 100%` plus a right margin made the left edge reach the screen.
Both horizontal insets now belong to the keyboard-aware overlay, not to the
full-width panel. A new panel identifier supports direct boundary checks, and
the iOS/Android/Mac rendering checks require both margins to remain inside the
viewport. All **35/35** companion checks and mobile typechecking pass again.
iOS 47 was uploaded but was not attached to App Review; it and Android 50 are
superseded by the corrected native packages. Their evidence is retained rather
than treated as verification of the corrected packages.

## Verified deployment and final artifacts

- Web/backend source: `e5a04292a1f68e206522a5ab59780d77f5a4c300`.
  Deployment `dpl_46YRgpU9X68B2uymxHjz4cztYqN5` was staged and checked before
  promotion to `https://hbic.ca`. Domain resolution was subsequently verified as
  that READY deployment. Rollback: `dpl_93MpvdsxNHhVJazc9ebyxkBkDjV3`.
- The deployed checks passed for exact canonical current prayer answers, public
  fee evidence, private handoffs, unsupported questions/dates and the existing
  admin switch. Additional live checks covered 24 language/topic cases and five
  mobile/desktop layouts (English, Urdu, Dari, Arabic; light/dark; 320/390/1440 px),
  loaded branding, bounded panels, keyboard space and zero running animations
  while idle. Domain verification completed at `2026-10-18T21:27:16Z`.
- Existing smart download link and official-store fallbacks passed again after
  promotion. No hosting, admin or prayer-display configuration was changed.
- Final native source: `e6ea863838ab54534fb726c2fe6ab73205982c36`.
  iOS **1.7.8 (48)** IPA SHA-256:
  `f03b55fbf95bfa0649997a5941a68c2460aa269fd9eb9e90e753b1e8c4f25c51`.
  All four phone/Watch/widget targets carry the same build, exact existing
  signing identity, privacy strings, keychain group and Mac true-screen-size
  support. Watch Quran, Bilal, four-language resources and language bridge remain.
- Android **1.7.8 (51)** AAB SHA-256:
  `ae501cd1dc69cf58167edbf799358d8a81bf7c50e8243168b9894c31e6278d71`.
  Signature, package, 42 aligned native libraries, 16-KB support, R8 optimization,
  correct logo pixels and expected feature/privacy markers pass.
- The final AAB-derived QA APK SHA-256 is
  `880c1c93bafc9564e8c43dbcc1442daed671094468e7890b5566180d74f81d31`.
  **14 installed-app flows** passed at `2026-10-18T21:42:23Z`: welcome, tour,
  balanced margins, restart persistence, actual soft keyboard/safe-area layout,
  live prayer answer, clear, private handoff, dark appearance, Quran exclusion,
  Arabic tour and fresh-install introduction. Panel bounds were x=32…1049 on a
  1080-px display at density 2.625; both margins pass. Header stays below the
  63-px status bar, input above the 1517-px keyboard boundary.
- Two additional untouched-package first-open trials each left Home idle for
  15 seconds and automatically received the tour; both passed at
  `2026-10-18T21:43:07Z`. Only the disposable QA installation was cleared.
  Host microphone was disabled and no user audio was recorded.
- The Swift Watch model passed both intercepted-request checks and actual public
  HBIC API requests in all four languages, including source validation and
  session clearing. These are not Watch hardware or energy measurements.
- Apple processed build 48 as **VALID**, build ID
  `d8c6cf3a-3402-41fa-ab94-bc6e3c465032`, after upload submission
  `506cb95d-ac9c-4796-9d06-8ff426368621` finished. The older build 46 review was
  canceled only after replacement processing and final-package checks passed.
  Its COMPLETE cancellation/DEVELOPER_REJECTED version state is a developer
  replacement, not an Apple rejection of build 48.

No public approval, physical-device battery result, native Mac visual certification
or perfect translation/recognition claim follows from package or simulator checks.

## Review submissions

- iOS **1.7.8 (48)** is attached to review
  `82fd276f-c0d5-48c2-8a05-5019f3c229a6`, **WAITING_FOR_REVIEW**.
  Existing English-Canada listing and **32 real-app placements** were preserved.
- Android **1.7.8 (51)** was uploaded with matching SHA-256, its production edit
  validated and committed with `changesNotSentForReview=false`. The existing
  **6 real-app phone screenshots** were retained. This is a review submission,
  not independent confirmation of Google approval or worldwide public rollout.
- No mass notification, OTA update, paid build upgrade or new account permission
  was used. Source commits were pushed to `feature/quran-reader-practice` in the
  canonical private GitHub repository. Native presentation reaches users through
  the replacement store update; server-authored core replies are already live.
