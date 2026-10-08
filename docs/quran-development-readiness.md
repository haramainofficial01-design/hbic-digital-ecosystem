# Quran & Recite — development verification, 8 October 2026

This branch is **not a store-release approval**. Existing production, Academy,
payments, prayer data, Watch/widget identifiers, and signing remain unchanged.
No new store binary has been submitted.

## Implemented

- Native phone reader: all 114 surahs, ayah navigation, Arabic/English keyword
  search and references, translations/reciter preferences, bookmarks, last read,
  continuous verse audio, repeat/range/speed/seek controls.
- Selectable **Madinah Hafs 15-line Mushaf**, using Quran Foundation's real QCF V2
  page/line/word positions and page-specific fonts, alongside Ayah View. All 604
  pages are navigable; opening pages retain their special layout. Page requests
  are bounded, cached and cancellable; failed fonts never show substitute glyphs.
  Tapping an ayah opens native audio/bookmark/meaning actions; switching to Ayah
  View preserves the current reference.
- Saheeh International is the default English translation (verified resource 20).
  The Clear Quran is offered only if the authorized provider actually lists it;
  it was absent from the production catalog checked on this date. No guessed
  edition IDs or other translations are presented. Unlinked footnote markers are
  removed without changing the translation's wording.
- Professional capitalized memorization choices, visible selected state, native
  scrolling and short native-driver reading/view transitions. Reduce Motion is
  respected; no perpetual animation or countdown/background frame timer was added.
- Memorization and Test Mode: conceal Arabic/meaning, hints, reveal, randomized
  questions, temporary review, explicit self-reported progress, private recordings.
- Full-surah listening: official MP3Quran Hafs catalog, separate recording/verse
  IDs, partial collections shown honestly, persistent selection, safe streaming.
- On-device English/Arabic voice navigation, capability-dependent; typed search
  remains available. No HBIC cloud speech upload or required Quran login.
- Apple Watch: exact offline Quran text, surah/ayah navigation, adjustable Arabic,
  live reciter catalog and native player. Progress observer is five seconds while
  visible, removed off-screen; playback pauses when wrist/app becomes inactive.
- **Recite Assist**, development-only: native PCM, local pinned inference model,
  canonical-word feedback for possible differences, silence/uncertainty safeguards,
  concealed text in Test Mode, bounded six-second audio window, one inference at
  a time, two-minute session cap, explicit download/microphone consent, no upload.
  Pause releases microphone capture; resume restarts it. Stop/background exit
  releases capture and inference resources; an in-memory, unscored session review
  reports observations and uncertainty without retaining or uploading audio.
  Stable-completion navigation guard requires two complete observations; it never
  awards memorization scores. Full microphone/progression qualification is pending.

## Verified evidence

- 34 focused Quran/provider/storage/audio/recognition/navigation/Mushaf/permission tests pass;
  phone and public-web typechecks pass; mobile lint has no errors/warnings.
- Phone native Debug builds compile on iOS and Android, including voice search,
  PCM recording, ONNX runtime 1.24.3 and sandbox-restricted native file hashing.
- Public-web build and both Hermes phone exports pass. These are local validation
  artifacts, not production deployments or signed store submissions.
- Provider production Content and Search requests succeed. English `mercy`
  returns 12 real references, first `1:1`; results are resolved through Content API
  instead of rendering search snippets as Quran. Arabic search was also exercised.
- Tanzil import independently matches all 6,236 source verses byte-for-byte.
- Phone UI exercises hidden recall, hints, reveal, self-review, completion,
  bookmarks and playback. Android native full-surah streaming has an advancing
  clock and working pause/resume/stop. iOS streaming controls also exercised.
- Actual iOS/Android native UI checks pass for Mushaf pages 1/2/3, verified fonts,
  current-reference preservation on switching, and capitalized progress choices.
  Twelve additional real-font browser renders (pages 1/2/3/50/106/604 at 320 px
  light and 390 px dark) retain exact word/line positions without overflow.
  Cached-font rendering also survives a delayed Android WebView bridge.
- Android runtime navigation invokes one 180 ms native-driver transition. With
  the emulator's system Reduce Motion setting enabled, navigating to Search skips
  that transition; the original emulator setting was restored after verification.
- Android Recite Assist lifecycle passes start, ungraded emulator silence,
  pause/resume, stop/review, restart and background cleanup. Permission regressions
  cover already-granted access, first consent, decline and leaving the app during
  consent. A granted permission no longer reopens an Android permission Activity.
- Android private recording passes actual AAC capture/save, nonempty local file,
  advancing native playback clock, pause/stop and deletion of both file and saved
  metadata. The emulator host microphone was disabled; only emulator silence was
  recorded. The single test recording was deleted, with no existing records altered.
- Watch UI exercises offline reader, next ayah, real catalog, player and stop on
  both 40 mm and 46 mm simulators. Actual Bluetooth/device playback and energy
  measurement are not implied by simulator UI tests.
- Native iOS **19/19**, Android **19/19** controlled reference tests: correct,
  omission, repetition, substitution, pause, low noise, silence and twelve correct
  reference clips. Correct-reference clips produce **0/12 false-difference flags**;
  eleven reach completion, one short two-word ayah remains uncertain/ungraded.
  Whole-word anchors reject clipped suffixes previously accepted as substring
  matches. These results are fixture evidence, **not** measured human microphone
  accuracy. The substitution example can produce an additional possible-word flag.
- Inference tests use actual phone native runtimes, streamed authorized reference
  audio held only in RAM, and the same bounded window/feedback code. No live
  microphone or private user audio was collected for these tests.
- Native preparation measured **1,271 ms iOS / 2,192 ms Android**, versus prior
  JavaScript file verification **83,105 / 82,161 ms**, respectively, on simulators.
  This is startup timing, not a claimed percentage of real-device battery savings.
- Native integrity rejects out-of-sandbox paths on both phones. After native
  inference/disposal: zero leases, no pending initialization/closure/native session.
- Voice capability check: iOS simulator English supported, Arabic not installed;
  Android emulator reports on-device speech available. Actual language recognition
  must still be tested with consented input; capability is not delivery proof.

Private local evidence is under ignored `output/quran-development/`: native
evaluation JSON, focused test/build logs, screenshots and XCTest result bundles.
Neither evidence caches nor provider credentials are committed.

## Content and attribution

- Quran Foundation approved backend application: `HBIC Quran & Recite`.
  Client credentials remain server-only. Production enablement is still gated by
  `HBIC_QURAN_PUBLIC_ENABLED`; store UI also requires both existing Quran flags.
- QCF V2 Madinah layout/font URLs are supplied by Quran Foundation and loaded from
  its authorized font CDN. The embedded renderer only typesets validated canonical
  glyphs; network/script policy is restricted and all interactive controls remain
  native. Fonts are not repackaged as a standalone downloadable product.
- Tanzil Uthmani 1.1, CC BY 3.0, full original notice retained. Source XML SHA-256:
  `8c5aeae20363a98f6963720d29fce040ca8b56a8e75f8b564c257fce7f6d0417`.
- Noto Naskh Arabic: SIL Open Font License, bundled notice retained.
- MP3Quran official API and public HTTPS recordings: streamed, not redistributed.
  Verified catalog contains 218 Hafs reciters; 18 curated current Haramain voices
  plus requested famous voices have real playable reference URLs.
- Recite Assist: Tilawi code MIT; pinned FastConformer Quran model CC BY 4.0,
  revision `e9448a0e84f3adb64c28b7a8db501dd8e0e59a84`; all four file hashes checked
  before loading. Runtime and user-facing attribution are retained. No Tajweed
  grading, numerical score, generated Quran text or training on user audio.
- Watch resources are regenerated from the phone's exact licensed masters during
  target configuration. Generated resource copies/native projects are ignored.

## Remaining release gates

1. Qualification of natural microphone/voice-search input across different voices,
   natural mistakes, pauses and ordinary noise. Simulator/reference-fixture checks
   do not establish expert-reviewed human detection accuracy or natural sequential
   progression. Development Recite Assist must not be presented as reliable
   production mistake detection before this passes; no physical-device connection
   is requested because the user authorized simulator/emulator work instead.
2. Four current imams lack verified recordings in the approved catalogs:
   **Saleh bin Humaid, Osama Khayyat, Faisal Ghazawi, Saleh Al-Maghamisi**.
   Obtain an authorized recording source before claiming all current Haramain
   imams. No substituted voice, invented reciter ID or dead playback button.
3. Actual Watch audio-route import/playback and phone/Watch energy measurements.
4. Configure approved backend credentials securely at release, enable only after
   gates pass, then use next unused phone/store build numbers and existing IDs.

No physical iPhone/Android device was connected during this verification. The
user explicitly authorized continuing with simulators/emulators rather than
requesting a connected phone. Do not ask for that connection again. Substitute
simulator tests where practical, while retaining honest accuracy/energy limits.
No claim of final release readiness is made.
