# Recite Assist — corrupt acoustic output must not become a Quran mistake

14 October 2026 follow-up from `b68d001`.
**Shared app/web safety correction, not a 99% recognition result.**
No production deployment, OTA, signed store build/upload/submission, visible
application change, new account permission or collection of user recordings.
Models, decoder choices, confidence thresholds and canonical Quran are unchanged.

## Reproduced failure (fault injection, not a natural speech measurement)

A synthetic nine-frame/five-token CTC tensor described four words, with blank
separators. One interior winning value was deliberately changed to NaN. The
original argmax silently ignored it, decoded only three words, and returned
acoustic quality **0.989999999954961**. Two fixture observations then produced
a false **omission at word index 2**. This is a real shared-code failure under
corrupt input, not evidence that such a numeric fault occurred in an HBIC user's
recording, an actual model-error rate, or a simulated speech-accuracy result.

The existing malformed-*word* observation guard could not catch this: the broken
raw acoustic value had already disappeared before valid-looking words reached
that guard. Filtering an invalid interior frame was not safe abstention.

## Implemented safeguard

The combined single-pass word/quality decoder now rejects the **entire** acoustic
observation for NaN, positive infinity, positive log probabilities, impossible
blank IDs/shapes or a frame with no finite winner. Negative infinity remains
allowed as a zero-probability alternative when the frame has a finite winner;
valid blank-only silence remains ordinary quiet input, not an inference failure.
The legacy offline acoustic-quality helper follows the same raw-value rules.

Rejected decoding returns no words, quality 0 and explicit `evidenceValid:false`.
The shared tracker treats this as invalid fresh evidence, clears cached support,
preserves the capture clock, and withholds correction, completion and navigation.
A retry of the same captured samples cannot rebuild support; fresh observations
must recover normally. Normal silence and valid low-confidence handling retain
their existing behavior. Invalid evidence does not create a skipped-word label.

Both native and browser producers suppress the corrupt decoded text. Both actual
practice components clear stale recognized speech on that failure, rather than
leaving old text beside the uncertain state. Existing selected-ayah bounds,
concealment, review markers, microphone ownership, recording opt-in and resource
cleanup remain in place. No ASR word is restored from the expected Quran.

Checks are part of the existing argmax pass: no additional model inference,
posterior-array pass, provider request, model download or dependency is added.
This is not a measured iPhone/Android thermal or latency improvement.

## Verification

- **197 checks pass**, including four new shared fault/shape/recovery tests and
  an extended headless real-component browser test. Fault tests cover winning
  and nonwinning corruption, invalid blank IDs, impossible frames, valid zero-
  probability alternatives, silence, stale retries and fresh recovery.
- The browser test uses explicitly declared worker/UI fixtures and synthetic
  non-speech capture, not fake ASR qualification. It confirms invalid evidence
  clears recognized text/cursor, produces no mistake warning, preserves private
  recording review/deletion and pause/resume/stale-message handling, and retains
  concealment/denied-permission/audio-only behavior. No foreground app opened.
- Both app typechecks pass. The initial return-union typing error was caught
  and repaired with the explicit shared evidence return type; no failing build
  was published or counted as a pass.
- Public-web production build and both local iOS/Android **Hermes exports pass**.
  Existing CSS/hook/image warnings and Metro package-export/color warnings remain;
  builds are not warning-free. These are local compilation checks, **not** signed
  store submissions, physical microphone tests or native performance qualification.

The changed decoder was also exercised on **12 permitted historical public source
clips** through the actual pinned CPU ONNX model, using the existing RAM-only
adapter. The publisher-MIT card, metadata, baseline, source audio and model hashes
are the same previously verified inputs. No model was redownloaded, and no voice
was intentionally written to disk or uploaded for inference. Public-source
consent/demographic/training-independence gaps remain as already documented.

All **12/12** sources retained identical selection, word emissions, confidences
and sample boundaries, with **0 exclusions / 0 failures**. The adapter prepared
96 historical variants but performed **no new full control benchmark**; all 48
calibration variant PCM hashes/sample counts matched the frozen old baseline.
This is a regression of the changed raw-output guard on known valid model
outputs, not 96 new recitations, fresh speakers, natural error gold or a new WER.
The verified owned loopback server was stopped normally and its PCM cleared.
No unrelated process or user file was changed.

## Exact provenance

| Code/artifact | SHA-256 |
| --- | --- |
| Updated shared tracker/CTC adapter | `2897ed4567502c9a9a9cc16eba9c736ddcc5733f6fc1993ed908eedcbe87178c` |
| Updated quality helper | `c918ce045a6dd82ea96a03bb28d3ac85ac9586fe40dbd36362fee2b67f507ff3` |
| Native producer | `d15de3c67aabd12e650d50a2fd5936439df3f1a7f4a67114a72801c4b85aa600` |
| Native practice component | `ff0047d63b5d11a5f32db0c9682105dc8a47db8bbd6aa181a00d0c19d215ca57` |
| Browser worker producer | `27ece3c921e9da7a0d37a7832ad224de6c18d81e7c6a917de28a3c5bfe1a62a7` |
| Browser practice component | `71881bf87928001d9ec6f345e5650d61dfd625c3af3004889b7b2425b02aaf7f` |
| Shared regression tests | `65321fdc0e5d044f0384340cd1bb356ebfe5b461e2dee8998a07c27674f8dd67` |
| Browser regression test | `b2677bdcde3cae0da5bfbb83669001b9f5d31a1ef7ddf5e50866e4602f176d96` |
| `ctc-integrity-ram-source-20261014.json` (ignored) | `9c285bf6ee76f2ed1802620b8dfb3090ba044818b84f2e631193e6e1ee5f9ce0` |
| iOS local Hermes bundle (ignored) | `229e975c425f39662ba8a1ac4fc6bbb31d12c9a4c21cb9cc25635568847c45f4` |
| Android local Hermes bundle (ignored) | `5d5076f45b236f9517872df9676bd96b4dd1c251b809bd5606fbfb3889a4ffa5` |

Reports retain the unchanged dataset/model/source pins and failure counts, not
audio. No raw research recording, private transcript, credential, generated
bundle or output cache is committed.

```sh
node --import tsx --test apps/mobile/test/quran*.test.ts \
  apps/public-web/test/quran*.test.ts apps/public-web/test/quranReciteRendering.test.mts
```

This prevents the reproduced corrupt-output false warning, but does **not**
improve the model's known lexical omissions/substitutions/repetitions or qualify
its acoustic confidence as correctness probability. Previous script WER,
raw-phone-character and live-error precision/recall remain frozen under their
original pipeline hashes; none is relabelled as a post-change result. Fresh,
representative permitted speaker-disjoint natural-error gold with independent
reviews and necessary native lifecycle/performance checks is still missing.
**99% remains unverified and release readiness remains separate from deployment.**
