# Quran playback controls

App and website playback now expose continuous **Loop On/Off**, with explicit
0.5×, 0.75×, 1×, 1.25×, 1.5× and 2× speed choices. The app uses decrease/increase
buttons in its always-visible mini-player; the website uses a labelled selector.
Normal playback is 1×. Pitch correction remains enabled when changing speed.
Replay and existing app 15-second back/forward controls remain separate from
continuous looping. The website player can now replay its current recording.

The controls apply to reference ayahs, full-surah streams and local personal
recording review. Website private recording review has its own controls next to
its HTML audio player. Playback speed is retained during the mounted session;
starting a different clip or pressing Stop resets looping to Off. No audio
downloads, cloud uploads, new stored preferences or background playback are
introduced. Native/browser audio looping is used, not a one-second polling timer.

Qualification includes real Chromium HTML media playback with a short silent
PCM fixture for looping, pitch-preserving rate properties, sequential ayah
advance, pause/replay/stop and narrow player layouts. This is not a real-reciter
accuracy test. React/native-event adapter tests verify stream and local-recording
properties, interruption protection, cancellation and listener disposal. They
also retain the zero-reader-renders-for-60-progress-events regression check;
they are not physical-device temperature measurements.

All work is done headlessly. No production deployment or store submission is
implied. Existing speech recognition and Academy billing behavior is unchanged.
