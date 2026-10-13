# Quran streaming recognition: approved access and measured development results

**99%, 99.99% and 100% natural-recitation accuracy are not established.**
Production, OTA updates and store releases are unchanged. The newly tested
models remain isolated development experiments, not a replaced app recognizer.
No personal recording, credentials or gated model weights were committed.

## Access and provenance

The user reviewed and accepted the model's contact-sharing/no-profit terms.
The authors granted access, confirmed by a successful authenticated retrieval
of the pinned license and model files—not merely by being signed in.

[Quran-Lab/zipformer_p-arabic-v3](https://huggingface.co/Quran-Lab/zipformer_p-arabic-v3)
revision `3da514fc833b22c902ee466a7710cf399896f2f0`:

- v3 int8 ONNX: 72,705,392 bytes; SHA-256
  `6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb`.
- v3.1 int8 ONNX: same byte length; SHA-256
  `31755836528da336a6192121cd7bc82cb41752dddb65566fd000b89c8686da6b`.
- Original license, README and authoritative `tokens.txt` passed pinned Git-blob
  length/digest checks. The blank token is 250, not zero.
- License: Quran-Lab No-Profit License 1.2, retained with the isolated experiment.
  Do not charge for this model/access/powered features or present its output as
  an authoritative assessment. Automatic feedback can be wrong and does not
  replace a qualified teacher. Distribution review remains separate from access.

The developer worker uses actual cache-aware 99-input/output ONNX inference,
80-dimensional Kaldi/Povey fbank, 48-frame chunks and per-clip zero-initialized
states. Runtime: ONNX Runtime 1.24.3, isolated kaldi-native-fbank 1.22.3. Only
mono 16 kHz PCM reaches recognition. No reference text, expected mistake,
grammar, language model or forced-correct answer enters ASR.

The waveform-scale check is important: unscaled float PCM gave 198 raw
canonical-phone edits over 1,464 reference phones in the first comparison;
scaling to 32,768 gave 1,412 edits. The latter frontend is rejected. These are
raw diagnostics, not human-verbatim phone WER or word-detection accuracy.

## Controlled event comparisons

Each completed split contains all 48 historical development controls: 18
approximate waveform edits and 30 correct/pause/noise/speed controls. Exact
operation **and word index** must match; additional predictions count against
precision. These are not fresh teacher-reviewed naturally recited mistakes.

Independent saved RNNT and character-CTC transcripts propose substituted words.
Pure comparison-side Hafs phonetics describe unchanged/omitted/repeated/proposed
substituted paths. Fixed margins are uncalibrated likelihood scores, not the
probability that a learner is wrong. Complete-clip diagnostics do not qualify
live microphone word-following or already-paid parent/student functionality.

| v3 experiment | Split | Exact detections | Predictions | Negative alerts | Wrong positive classifications | Precision | Recall |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Initial longest-unit comparison | Calibration | 15/18 | 16 | 1/30 | 0 | 93.75% | 83.33% |
| Initial longest-unit comparison | Other controls | 13/18 | 15 | 1/30 | 1 | 86.67% | 72.22% |
| Fixed quiet compaction | Calibration | 15/18 | 15 | 0/30 | 0 | 100% | 83.33% |
| Fixed quiet compaction | Other controls | 13/18 | 14 | 0/30 | 1 | 92.86% | 72.22% |
| All unit segmentations + sound-run nuisance + event grouping | Calibration | 15/18 | 15 | 0/30 | 0 | 100% | 83.33% |
| All unit segmentations + sound-run nuisance + event grouping | Other controls | 13/18 | 15 | 0/30 | 2 | 86.67% | 72.22% |

The quiet-pause comparison retains original/processed sample spans; it removes
only bounded low-energy runs using the previously existing fixed RMS algorithm.
It eliminated the two observed pause-related false warnings, but does not prove
safe handling of all quiet voices. Recognition gets a disclosed 600 ms settling
tail. Original waveforms and processed waveforms have distinct hashes.

The clearer v3 compact comparison detects omission 6/6, repetition 5/6 and
substitution 2/6 on the other control split. CPU whole-clip inference median /
p95: 82 / 116 ms. These are desktop timings, not iPhone/Android battery, ANE,
microphone-to-feedback latency or an end-to-end native release measurement.

v3.1 did not improve this task: with the same compaction it found 13/18 on both
splits; calibration had four negative alerts, while the other split had zero
negative alerts and one wrong positive classification. It is not promoted.

Summing every compound-unit segmentation fixes a real scoring ambiguity; tiny
exhaustive path tests verify its probability math. Sound-run nuisance deliberately
cannot grade madd, gemination, Tajweed or pronunciation. Alternative forms of
the same operation/location do not compete with that location, and duplicate
phonetic paths add no mass. Two incomplete duplicate-path runs were preserved
as failures, not reported as perfect partial accuracy; complete fresh reruns
followed comparison-side de-duplication. The newer method is not a measured
accuracy improvement over the simpler compact comparison and is not shipped.

## Additional independent character-CTC model

Public Apache-2.0 model
[rabah2026/wav2vec2-large-xlsr-53-arabic-quran-v_final](https://huggingface.co/rabah2026/wav2vec2-large-xlsr-53-arabic-quran-v_final),
revision `b03a268c6ba1a693752307325ab376c86c3b12da`; safetensors SHA-256
`bf65674a26eb4ef7042cedade96c3c8f8cbd04f3a7d1a68eadceec8ed0f99ecb`.
It was run independently in local float32 MPS, without an expected-ayah prompt.

- Calibration: 12/18 operations, 54 differences, 13/30 negative controls with
  differences; raw precision 22.22%, recall 66.67%, script-reference WER 25%.
- Other controls: 12/18 operations, 48 differences, 18/30 negative controls with
  differences; raw precision 25%, recall 66.67%, script-reference WER 16.83%.
- Its 1.26 GB weights are ignored local experimental assets, not app downloads.
- Using its proposals with the existing phoneme comparison still found 13/18,
  16 predictions and three wrong classifications on the other control split.
  It is not a standalone replacement or qualified correction source.

## Reproducible evidence and next qualification step

Ignored local reports retain code/model/waveform hashes, all analyzed cases,
transcripts/phonemes, failures, score paths and runtime details; they contain
no saved audio. Key simpler compact reports:

- `zipformer-raw-calibration-1-1791926000854-c086bd67-c92e-4a48-8c95-81953f113355.json`
  SHA-256 `00906711e6bc7dcba73529ca99cfeb900b80878728d5a823066f4794d654be89`.
- `zipformer-raw-heldout-1-1791926006432-0d4d35d8-2acf-49b8-9ee6-b433d90a9e06.json`
  SHA-256 `7fa5867c92f791eb0bd5d24c98ec289f52922003300f8347affd149d59e96531`.

The model access grant does **not** grant access to the separate
[Quranic ASR research benchmark](https://huggingface.co/datasets/Quran-Lab/quranic-asr-benchmark).
Its 200 real phone recordings require separate research-only/no-audio-redistribution
consent and author approval. Do not bypass that gate or package its recordings
in the app. Such a benchmark can measure generalization, but still cannot
substitute for consented, speaker-disjoint, independently reviewed natural
mistake annotations, audible-scope checks and phone-native lifecycle testing.

Existing app/web recognizers, current release warnings, Academy/Stripe/Firebase,
prayer data and signing remain untouched. Separate 99% qualification gates
remain failed; neither a perfect small calibration column nor an access grant
establishes 99.99%, dependable correction or qualified Tajweed feedback.

Verification: 153 focused mobile/shared tests and 26 public-web/shared tests
passed (178 distinct tests because one shared playback test occurs in both).
Strict TypeScript checks cover both applications and the new experimental
scripts. Mobile lint, both worker syntax checks, public-web build, 14 browser
layout cases and both mobile Hermes exports passed. No signed native release
build, store upload/review or real-device ASR/battery qualification is implied.
