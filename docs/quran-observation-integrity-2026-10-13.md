# Recite Assist — malformed observation safety

Development follow-up from `c7bf135`, 13 October evening (14 October UTC).
**This does not improve or establish 99% recognition accuracy. No deployment,
OTA publication, store upload or review submission was performed.**

## Reproduced failure and scoped fix

The tracker previously skipped invalid individual recognized tokens and aligned
the remaining tokens. A controlled evidence-contract fixture with an interior
word whose confidence is NaN reproduced a **false omission at word index 2**
after two observations. Other fixtures exposed out-of-scope/backward token
timing and stale historical stability. The initial three new regression tests
failed on the original tracker; its SHA-256 was
`2b94bbb74f3035fb922cd57cdc4dbcd5d07966e30f6846c86d7e29ced5deb025`.
These are malformed-output fixtures, not actual learner mistakes or measured
natural false-positive rates. No model confidence threshold was tuned to gold.

The shared mobile/browser tracker now validates an entire fresh observation
before accumulating support, aligning words or choosing a voice-following
cursor. Confidence and quality must be finite and in [0,1]; all word spans must
remain chronological and within the original capture, with nonempty lexical
text and an explicit edge flag. Fractional CTC sample boundaries remain valid.
Low **valid** confidence keeps its existing uncertainty behavior.

If a fresh observation is malformed, the tracker returns uncertainty without
mistakes, completion or a cursor and withdraws cached history. It retains the
capture clock: replaying the same failed samples cannot supply fresh stability.
Valid subsequent observations must build support again. Invalid capture bounds
cannot advance that clock. Canonical Quran text, the acoustic model, native
capture, recording retention, review flags and all unrelated functionality are
unchanged. Reading/listening do not start recognition.

New tracker SHA-256:
`71f81062ce8f83d9d69ac3acef6b0068cd17cf7aca1fe3cec06b599c4cc1f1ef`.

## Saved real-model replay — no new inference

`replay-recitation-safety.mts` verifies frozen input hashes and complete case
counts, then replays every saved observation from the existing greedy and
experimental beam results. It does not fetch recordings, run ASR, infer new
teacher labels, print transcripts or treat already-inspected sources as fresh
held-out evidence. The beam remains experimental/unshipped.

| Historical source | Cases | Observations per decoder | Malformed observations | Changed feedback per decoder | Analysis failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| Natural development recordings | 172 | 817 | 0 | 0 | 0 |
| Approximate waveform controls | 96 | 387 | 0 | 0 | 0 |

Total: **268 cases, 2,408 decoder observations**, not independent people or
2,408 newly recognized recordings. No valid feedback changed. Natural results
still have 0/126 labelled-clean alerts and 0/2 historical wording locations found;
9/172 cases have stable complete following, not a voice-navigation accuracy
score. Controlled event results remain 5/36 true detections, 6 predicted events,
1 false event, 0/60 negative-control alerts: **83.33% precision / 13.89% recall**.
Raw ASR/script WER and experimental phone-character scores are unchanged and
are documented separately. No Tajweed or pronunciation qualification is made.

Frozen inputs (existing ignored reports):

- `acoustic-beam-natural-1791921616295-e36543ff-3d7d-4e32-908d-d41f75723922.json`:
  SHA-256 `f175c9a9b67ff864b5df19319394da858c91828278ce0d57ef4dcdd843f4b48a`.
- `acoustic-beam-controls-1791922340454-c9c67dff-9b96-49f5-8406-c199e26aa05e.json`:
  SHA-256 `ffa329a70c19ad3a40f74aebaf8f039e0d39b2d0ae6317d67c905461f479092e`.
- Replay script SHA-256:
  `bc4216193136d1f0bc738ba567168230869dbfa22b91de5adcad75500d6f7a34`.

Reproduce without audio/model/browser access:

```sh
npx tsx apps/mobile/scripts/replay-recitation-safety.mts
```

## Validation and release status

Five new unit checks cover malformed confidence/quality, timing/order, complete
history withdrawal, same-sample retry, fresh recovery, cursor rejection and
legitimate fractional timing. Headless web UI additionally receives a malformed
worker observation and checks that its old cursor disappears and no correction
appears. These are explicit synthetic interface fixtures, not speech-accuracy
or physical microphone tests.

An initial headless run passed that guard but timed out at the unrelated
audio-only fallback's recording-download wait (test line 88). Its fixed 150 ms
capture could stop before a real MediaRecorder data event. The test now observes
actual recorded byte events and waits for one before stopping; it does not
fabricate a recording, alter product recording code or hide a failure.

**65 mobile/shared tests and 3 web capture/UI tests passed** (68 distinct),
including all five new unit checks and the malformed-result UI check. The
headless rerun completed in 4.87 seconds with no failure. Mobile/public-web
typechecks, strict replay-script typecheck, mobile lint, diff checks, public-web
build and both iOS/Android Hermes exports passed. The web build retains existing
Academy/media/Quran lint/CSS warnings; mobile exports retain existing Noble
package-resolution warnings. Exports are **not signed native release builds or
native lifecycle/battery qualification**. No visible screen was changed.

Release remains unqualified: independent permitted natural-error verbatim/gold
labels, representative frozen speaker-disjoint evaluation, training separation,
dependable lexical recognition and native microphone/performance checks remain
missing. The 99% gate has not been relaxed; no user voices were collected.
