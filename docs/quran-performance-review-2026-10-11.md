# Quran performance and private practice — 11 October 2026

Scope: phone Quran reading/listening performance, clearer navigation, private
practice recordings/word review, optional community challenges and their staff
controls. Academy, Stripe, prayer data, Watch/widget identifiers, signing, app
versions and production/store deployments are unchanged.

## Measured rendering change

`quranAudioRendering.test.mts` compares the actual audio hook at `fdd2e97` with
the revised hook using a controlled native-event adapter in React/Chromium.
After settling the initial load transition, 60 steady playback-progress events
produce:

| Component | Before | After |
| --- | ---: | ---: |
| Reader renders | 60 | 0 |
| Mini-player progress renders | 60 | 60 |

All subscriptions are released on unmount. This proves isolation of recurring
progress redraws, not a measured real-device CPU, battery or temperature gain.
Physical iPhone 15 thermal testing remains necessary. No physical device was
connected for this check.

Repeated live-blur content cards are replaced by calm, theme-aware surfaces.
Existing navigation, Mushaf fonts/positions, text, translation and audio remain.
The reader and recording library stay virtualized. Identical reading-position
and word-feedback updates no longer rewrite local storage.

Recite Assist remains an explicit early preview, with the same pinned model,
thresholds and existing default 2.5-second overlapping observation cadence.
One native inference thread, shared CTC timing/quality work, bounded ring-buffer
copies, silence/fresh-audio checks and adaptive idle time remove waste. No new
recognition-accuracy, pronunciation or Tajweed claim is made; existing limits
remain in `quran-recitation-qualification.md`.

## Audio storage and privacy

- Reference reciter audio streams from the existing verified providers with
  `downloadFirst: false`. No complete reciter library is installed. Operating
  systems can retain temporary streaming buffers.
- A personal manual recording starts only when requested, with microphone
  permission. New captures use mono 64 kbps AAC and stop at five minutes.
- Optional Recite Assist review audio is off by default, streamed into a local
  mono WAV, limited to two minutes/3,840,044 bytes including its header.
- **Keep** stores personal audio in the private `quran-practice` Documents
  directory and its metadata in the existing private local Quran state.
  **Session only** uses `quran-session` cache, deleted on exit/background unless
  the user chooses Keep. Interrupted session files are cleared on next opening.
- My Library supports replay, approximate review-point playback and individual
  audio/metadata deletion. It has a 100-recording bound; a full library refuses
  another kept clip rather than silently deleting an older recording. Legacy
  longer recordings remain available.
- Possible-word flags are local and clearly unverified. Three distinct complete
  clean recognizer attempts clear a flag; repeated observations, unclear audio
  and incomplete attempts do not. A user can dismiss a false flag.
- The separate optional recognition download is about 104 MB. Removing it does
  not delete recordings, bookmarks or word review. The model is unloaded when
  stopped and cannot be deleted while leased.

Idle recognition no longer deactivates another feature's microphone. Owned
capture cancellation waits for an in-flight native start before releasing it.
Recording failures show recovery guidance, not raw native exception dumps.
The pinned iOS audio dependency's delayed player-pause deactivation now respects
recording ownership. Preparing/active capture keeps its session; ending recording
releases idle audio again. The native prebuild guard is repeatable and rejects
changed upstream implementations rather than silently omitting the protection.
Interruption pauses now reject the Android audio library's automatic foreground
resume until an explicit user command. An owned recorder is stopped even when
the native lifecycle paused it first. Session-only saves cannot reappear after
background exit, including a quick return while file finalization is pending.

## Optional community challenges

No event or prize has been invented, published or awarded. Staff must configure
actual dates/rules and explicitly approve prize details in **Quran Challenges**.
Only a verified, approved director/super-administrator account may publish.
Dates/rules/prizes cannot silently change after an event starts.

Adult participants explicitly opt in with a nickname and public-time consent;
parents may participate under their own nickname. Existing HBIC account sign-in
is optional and never creates an Academy registration. Anonymous Quran use is
unchanged. Public responses expose rank/nickname/time, not account identifiers,
emails, recordings or word-review history. Leaving removes the standing.

Time is conservatively bounded by authenticated server-clock sessions, at most
five minutes per lease and one lease per account across devices. Finish retries
are idempotent; withdrawn/invalid leases fail closed. An engaged foreground
reader, actual audio playback or active practice capture can count. Idle reading
pauses after 60 seconds without interaction. No offline credit is fabricated.
The opted-in clock uses refs on a ten-second internal interval, not UI redraws
each second; network work is batched and errors back off. This is not proof of
recitation accuracy, attention or prize eligibility. Staff must review results.

New collections use server access only; existing Firestore rules grant no
direct client access. No Firebase architecture or permission changes were made.

## Verification

- 90 focused Quran/provider/audio/storage/recognition/navigation/onboarding and
  challenge tests pass, including controlled render counts and server timing,
  replay, consent, opt-out and event-boundary regression tests.
- Mobile, public-web and admin typechecks pass; mobile lint has no source
  warnings/errors. Public and admin production-mode **local builds** pass.
- iOS Release simulator and Android Release/R8 APK **local QA builds** pass.
  They are not signed store submissions, and release versions were not changed.
- Native iPhone 15 simulator UI passes three flows: reader/reference stream,
  private preferences/hide/hint/reveal; self-test/reveal/hide/advance; and personal
  temporary capture/play/keep/replay/delete. Playback stays paused on background
  return; background capture stops and session-only audio is discarded.
- Native Android emulator checks reader, library, hide/hint/reveal, self-test,
  personal capture/temporary play/keep/replay/delete, real Mishary reference
  streaming/pause/resume/stop, background interruption and dark reader. Its host
  microphone is disabled; capture is emulator silence, not learner speech.
- Real UI PNGs are local ignored artifacts under `output/quran-optimization`.
  Simulator/emulator checks do not establish human microphone accuracy or
  physical thermal/battery performance.

Production and store releases remain unchanged. Community participation needs
the new backend/admin code to be deployed and actual staff-approved events to
be published before it can be described as live.
