# Recite Assist qualification — updated 13 October 2026

**Authorized only as an optional early preview, not a qualified assessment.**
After reviewing the limitations, the user explicitly requested publishing the
detector for personal testing. The release flag enables it with an explicit
download/microphone consent and prominent warnings that it misses many mistakes
and may misidentify words. This decision does not change the measurements below
or establish dependable recitation/Tajweed accuracy. No microphone audio was
uploaded or added to Git. Academy, prayer data and signing are unchanged.

Latest development follow-up: [broader real-audio safety checks and practice
controls](quran-recitation-safety-evidence-2026-10-13.md). The new all-observation
exercise found three false warnings on labelled-clean natural clips; a complete
fresh rerun after history/uncertainty fixes has 0/126, but still detects 0/2
wording locations. The safer current tracker finds 5/36 controlled operations,
with 83.33% precision and 13.89% recall. New decoding/candidate experiments were
rejected; neither 99% qualification nor production/store release is established.

Newer development follow-up: [approved streaming-model access and real controlled
evaluations](quran-streaming-recognition-evidence-2026-10-13.md). Both approved
Quran-Lab streaming variants were actually tested. Fixed quiet compaction removed
two observed pause-related false alerts, but the clearer v3 comparison still
finds only 13/18 mistakes on the other control split: 92.86% precision and
72.22% recall, not 99% natural accuracy. The experimental models are not shipped.

Latest approved research benchmark: [599 distinct recordings / 600 publisher
entries and further phone-model comparisons](quran-research-benchmark-2026-10-13.md).
Every entry was actually analyzed. A bounded level experiment gives
7.114% raw canonical-phone character error after de-duplication; this is not
word/mistake-detection accuracy and does not pass the 99% release gate.

Earlier development follow-up: [competing acoustic evidence and real
voice-following](quran-recitation-competing-evidence-2026-10-13.md). A real-model
word-navigation indicator was verified; the best joint offline detector achieved
13/18 controlled operations on the comparison split, with 81.25% precision,
72.22% recall and 0/30 negative alerts. It is **not integrated or qualified at
99%**; production and stores remain unchanged.

## 13 October: fresh alternative recognition, 99% still NOT established

The unchanged current tracker remains at the 12 October measured **6/36
controlled operations**, with **0/2 natural reviewed wording locations** found.
This follow-up does not relabel those results as new inference or a 99% result.

### Official Qwen3-ASR comparison (offline only, not shipped)

Added explicit pinned-asset preparation and a strict waveform-only local worker
for the official Apache-2.0
[Qwen3-ASR models](https://github.com/QwenLM/Qwen3-ASR), using the
[native Transformers implementation](https://huggingface.co/docs/transformers/model_doc/qwen3_asr).
The recognizer receives only mono 16 kHz PCM and the Arabic language hint, never
the expected ayah, its word list, a Quran prompt, grammar or forced alignment.
The model does not provide validated Arabic word timestamps: the worker returns
`null` for timestamps and acoustic confidence instead of fabricating them.

All 48 existing calibration controls are measured, not a cherry-picked success
subset: 18 approximate waveform mistakes and 30 negative controls. The raw
transcript comparison checks the exact operation **and canonical word index**.
Each additional predicted difference counts against precision. Missing or
truncated inference fails the run; repeated inspected controls cannot become a
fresh held-out qualification corpus. Generated reports retain model/revision,
code hashes, original waveform hashes, transcripts, differences and runtime.
They stay in ignored development output, with **no audio stored or uploaded**.

| Actual 0.6B inference | MPS, bfloat16 | CPU, float32 |
| --- | ---: | ---: |
| Analyzed cases / failures | 48 / 0 | 48 / 0 |
| Exact controlled operation detections | 10/18 | 10/18 |
| Omission / repetition / substitution | 2/6 · 2/6 · 6/6 | 2/6 · 2/6 · 6/6 |
| Negative controls with any raw difference | **28/30** | **27/30** |
| Predicted raw differences | 116 | 114 |
| Raw difference precision | **8.62%** | **8.77%** |
| Script-reference word edits | 107/192 (55.73% WER) | 105/192 (54.69% WER) |
| Desktop inference median / p95 | 260 / 711 ms | 386 / 498 ms |

These are **diagnostics, not live-tracker or natural learner accuracy**. Splice
boundaries are approximate, speeds change pitch, and the controls were selected
using an earlier model's successful transcription. Neither recognizer/pipeline
combination has passed 99%. Both precision variants fail the calibration screen:
this is not merely low-precision arithmetic. The 0.6B candidate is rejected as
a replacement; its high raw false-difference rate must not reach learners.

Pinned 0.6B repository: `Qwen/Qwen3-ASR-0.6B-hf`, revision
`7f1569a48a89f3e3f4dc3a5c9d28bddd903bc76c`, model SHA-256
`d3f212dd20abecd315d830bc54ae3865e56ebfc3276484e57b771288ba27fd35`.
Runtime: torch 2.10.0, numpy 2.3.4 and isolated Transformers 5.19.0, without
upgrading the existing evaluation environment. No mobile model, browser worker,
native dependency, public release flag, production setting or store build changed.

The stronger official 1.7B model was then evaluated on those identical 48
waveforms, in both precision modes, with zero inference failures:

| Actual 1.7B inference | MPS, bfloat16 | CPU, float32 |
| --- | ---: | ---: |
| Exact controlled operation detections | **8/18** | **9/18** |
| Omission / repetition / substitution | 1/6 · 1/6 · 6/6 | 2/6 · 1/6 · 6/6 |
| Negative controls with any raw difference | **26/30** | **26/30** |
| Raw difference precision | 8/93 (8.60%) | 9/90 (10.00%) |
| Script-reference word edits | 80/192 (41.67% WER) | 78/192 (40.63% WER) |
| Desktop inference median / p95 | 369 / 514 ms | 748 / 932 ms |

It also fails calibration and is **not promoted or tested as a held-out
qualification candidate**. The better script-reference transcription does not
make its excessive false differences safe. Pinned repository
`Qwen/Qwen3-ASR-1.7B-hf`, revision
`bcd2b5b7f32b480ab5790554cfa8347f246a14f3`, model SHA-256
`2db53c7d81bd9b8cbc6a074e89be2c968a0d373fb4ee68bb1b1e14f7042dfee1`.
This is not mobile-compatible qualification or a natural accuracy measurement.

The downloader verifies fixed byte lengths, Git blob hashes for small assets and
SHA-256 for weights/tokenizer before loading. Large transfers use four bounded
parallel byte ranges, written in order into a resumable contiguous prefix, not
duplicate weight files. Transport regressions cover range/order failures and
truncation; they are explicitly **not recognition-accuracy evidence**.
Source-only RAM control serving now writes its own report rather than
overwriting the prior inference report by default. One initial source-only run
overwrote the ignored default `waveform-controls.json` before this guard was
added; other frozen inference/replay reports remain. No report was reconstructed
or passed off as the lost original.

Reproduce with the public licensed RAM controls on loopback 3011:

```sh
node apps/mobile/scripts/prepare-qwen-recitation.mjs 0.6B
npx tsx apps/mobile/scripts/evaluate-recitation-qwen.mts 0.6B auto
npx tsx apps/mobile/scripts/evaluate-recitation-qwen.mts 0.6B cpu-f32
node apps/mobile/scripts/prepare-qwen-recitation.mjs 1.7B
npx tsx apps/mobile/scripts/evaluate-recitation-qwen.mts 1.7B auto
npx tsx apps/mobile/scripts/evaluate-recitation-qwen.mts 1.7B cpu-f32
```

**Verification:** 92 mobile/shared and 19 browser/shared Quran regressions pass
(111 total); mobile and public-web typechecks, strict evaluation-script typecheck,
Python/Node syntax checks and diff checks pass. Browser tests use controlled
worker observations for lifecycle/UI assertions, not real recognition accuracy.
The unchanged qualification gate returns its expected **FAIL** on known controls.
No app/backend production code changed here, and no new build/release is claimed.

### Quran-specific phoneme experiment (offline only, not shipped)

The MIT-tagged [Quran Muaalem checkpoint](https://huggingface.co/obadx/muaalem-model-v3_2)
was then evaluated locally. Every encoder and all eleven classifier heads load
with **strict state matching**, using the published architecture and all five
verified assets. Only the phoneme head is evaluated: no Tajweed/sifat grade is
implemented. Runtime is CPU float32, torch 2.10.0, Transformers 5.19.0, numpy
2.3.4. This is a reconstructed offline runtime, not a qualified native export.

The recognizer's input is **PCM only**, not the expected ayah/phones or a grammar.
Its greedy output is checked independently against its actual acoustic
log-probabilities. A separate comparison process converts the canonical text
with MIT `quran-transcript` 0.6.4 and explicit Hafs duration attributes. That
conversion is **not a human-verbatim phonetic transcript**, and does not cover
all accepted readings/durations. The two processes do not send the reference
into recognition. Simple phonetic differences therefore cannot be called
learner mistakes, false corrections, word error rate or Tajweed accuracy.

All four actual runs cover the identical **48 calibration waveforms**, with
zero failures. Neither controls nor decoder variants are independent speakers
or fresh held-out evidence:

| Actual acoustic diagnostic | No quiet tail | Fixed 600 ms quiet tail |
| --- | ---: | ---: |
| Initial greedy canonical phone edits | 252/1,464 | 229/1,464 |
| Initial negative controls with any phone difference | 22/30 | 23/30 |
| Repeat greedy run, canonical phone edits | 252/1,464 | 229/1,464 |
| Reference-free CTC prefix search, canonical phone edits | 247/1,464 | 231/1,464 |
| Prefix-search negative controls with any phone difference | **21/30** | **22/30** |
| Positive controls with any phone difference, either decoder | 18/18 | 18/18 |
| Repeat inference median / p95 | 380 / 548 ms | 405 / 598 ms |
| Added prefix-search median / p95 | 13 / 20 ms | 15 / 21 ms |

The quiet tail preserves every spoken sample and adds only zeros; original and
inference-waveform hashes are retained separately. It can recover ending sounds,
but does **not** improve the negative-control case count. Prefix search sums
acoustic CTC paths using a fixed width of 16, **without any language model or
expected answer**. Its retained path score is not a calibrated correctness
probability. It preserves same-token repetitions separated by blanks and final
emissions; brute-force small-path tests verify the math, not speech accuracy.
The remaining differences include duration, reference-conversion and acoustic
issues that cannot responsibly be diagnosed as student errors from these data.
Word-location diagnostics are explicitly unqualified, even when a minimum-edit
path looks plausible.

This candidate **does not pass calibration as a direct correction pipeline**.
It remains an isolated experiment. No 99% score, validated word-error recall,
pronunciation assessment or native/battery suitability is inferred. Its weight
file is 2,423,124,012 bytes: it has not been bundled into the phone app or loaded
on users' devices. No live engine, model download, release flag, backend,
production environment or store build changed.

Pinned model revision: `01a1ef9fbe40d144ef845101e89ff924aed3fef5`; SHA-256
`6b6a2e85303d17ff0f3af5e1fc79ac83daecee409c756ddf27f0ced59393bb41`.
All reports preserve runtime, asset/code/audio hashes, raw phonemes and
comparisons, but **no audio or full acoustic arrays on disk**. Original runs:
`muaalem-phoneme-calibration-1791913435695.json` and
`muaalem-phoneme-calibration-1791913571943.json`; prefix-search runs:
`muaalem-phoneme-calibration-1791913733383.json` and
`muaalem-phoneme-calibration-1791913762656.json`. These stay in ignored
`output/quran-development/muaalem-comparison`, not private-data commits.

Reproduce after preparing the explicitly pinned, isolated development libraries
and serving the same public licensed RAM controls on loopback 3011:

```sh
node apps/mobile/scripts/prepare-muaalem-recitation.mjs
npx tsx apps/mobile/scripts/evaluate-recitation-muaalem.mts cpu 0
npx tsx apps/mobile/scripts/evaluate-recitation-muaalem.mts cpu 600
```

**Verification:** 108 mobile/shared and 26 browser/shared focused checks pass
(one shared playback test runs in both suites: 133 distinct tests). Both
mobile/public-web typechecks and strict comparison-script typecheck pass.
These protect existing Quran features and transport/privacy boundaries; they
are **not** evidence of 99% acoustic recognition. Production and stores remain
unchanged. Model access alone does not supply the independently reviewed natural
learner errors needed to improve and qualify the detector.

### Independent evidence access remains unresolved

- [Quran-Lab's 600-clip benchmark](https://huggingface.co/datasets/Quran-Lab/quranic-asr-benchmark):
  manual approval and research-only voice-data terms still required; requested
  the user's authorized approval, without accessing gated audio or accepting terms.
  This is an ASR benchmark, not automatically a double-reviewed lexical-error
  corpus or proof of training-speaker exclusion for every third-party model.
- [IqraEval QuranMB.v2](https://huggingface.co/datasets/IqraEval/QuranMB.v2),
  revision `75afc3391e47ca005af286b2518d8a2edf98da5d`: no declared dataset
  license and no grant for this HBIC use found. Its authors' related
  [license discussion](https://huggingface.co/datasets/IqraEval/Iqra_train/discussions/1)
  leaves the specific commercial-product evaluation and QuranMB questions
  unanswered. Public availability is not permission; no audio downloaded.
- [RetaSy's learner corpus](https://huggingface.co/datasets/RetaSy/quranic_audio_dataset),
  revision `b1fcc39cbc045f367bb07e39025a0e3aaeabf34f`: the card lacks explicit
  data licensing. Its six clip-level labels are not word-location transcripts.
  The paper's license does not establish rights to the recordings. No new audio
  imported or treated as verified word-error gold.
- The September 2026
  [transcript-event annotation study](https://arxiv.org/abs/2609.12085)
  explicitly keeps its selected gold answers private. Text-only event annotation
  is not acoustic accuracy or permission to use those private records.

The unchanged qualification gate still fails on the existing evidence. Genuine
progress requires both improved acoustics **and** permissioned, independently
reviewed natural learner speech with a fresh representative held-out cohort;
neither repeated tests nor a permissive threshold can establish 99% accuracy.

## 12 October follow-up: requested 99% accuracy is NOT established

New development verification: **118 focused Quran regressions pass**, mobile
and public-web typechecks pass, the evaluation scripts pass their strict
typecheck, the public-web build passes with existing lint/CSS warnings, and both
iOS/Android Hermes exports pass. These are not new native/store binaries or
physical-device acoustic/battery qualification. The actual production WASM worker
browser check was rerun successfully: three observations of public licensed
audio, `ورفعنا لك ذكرك`, one shared recording/recognition capture, closed tracks,
local review/deletion, and zero browser errors. No personal microphone was used.

### Alignment safety improvement

Retracted words cannot act as anchors. A substitution now also needs stable
exact anchors on both sides, not merely a stable wrong-looking token. This fixes
a calibration false correction exposed by the alternative recognizer. Low or
conflicting evidence remains visibly uncertain, never silently correct.

Saved actual current-model acoustic evidence replay:

| Measurement | Latest result |
| --- | ---: |
| Controlled operation detections | **6/36 (16.67%)** |
| Omission / repetition / substitution | 2/12 · 4/12 · **0/12** |
| Negative-control false alerts | **0/60**, previously 1/60 |
| Wrong operation alerts on positive controls | 0 |
| Natural clean clips with any alert | 0/126 (held-out 0/37) |
| Natural complete-following clips | 24/126 (held-out 10/37) |
| Natural reviewed wording locations detected | **0/2** |

These are immutable-evidence replays, not fresh current-model inference or proof
of 99% accuracy. The controls retain approximate cuts and baseline-success
selection; zero observed false alerts and 6/6 case precision do not demonstrate
a zero real false-positive rate or dependable mistake recognition. Both natural
wording locations remain missed. Native simulator parity for the newest anchor
guard has not been rerun.

### Stronger local NVIDIA experiment (not shipped)

Reconstructed the missing decoder from the original
[NVIDIA Arabic FastConformer checkpoint](https://huggingface.co/nvidia/stt_ar_fastconformer_hybrid_large_pcd_v1.0),
revision `7f32349d952f42a28dce979ba73270aa2bbdfa89` (CC BY 4.0). Original archive
SHA-256: `d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31`.
Its actual CTC head, RNNT predictor/joint, SentencePiece model, mel filterbank and
STFT window are used, not guessed weights. Checkpoint loading uses
`weights_only=True`; no archive paths are extracted. Greedy RNNT is independently
implemented following the documented
[NeMo v2 decoder equations](https://github.com/NVIDIA/NeMo/blob/v2.0.0/nemo/collections/asr/modules/rnnt.py).

The experimental encoder remains the
[community ONNX export](https://huggingface.co/dev-ahmedhany/stt_ar_fastconformer_hybrid_large_pcd_v1.0-sherpa-ctc),
revision `9137361f6f29fa5162aa7aa3d730bdda1e703bf2`, SHA-256
`a74e77489a9e48d689bac080a30c5e54b35e5f54171273771dba9c72752eade3`.
419/607 named initializers exactly match original checkpoint arrays, with zero
directly matched discrepancies. The other initializers/graph transformations
have not been independently proven equivalent; this is **not an official complete
export or production-qualified model**. No native runtime/model download changes
were made. Models, Python venv and transcripts stay in ignored development output.

No expected ayah, grammar, prompt, hotwords, language-model rescoring or forced
alignment is supplied to the recognizer. Original public waveform hashes are
verified before inference; PCM only crosses a private local pipe and is erased.
CTC and RNNT timings/confidences come from real emissions. RNNT tokens are not
incorrectly CTC-collapsed. Confidence remains an uncalibrated acoustic statistic.

Same 48 calibration controls / 192 scripted spoken words:

| Decoder / input | Word edits | Live operation detections | False alerts |
| --- | ---: | ---: | ---: |
| CTC, complete original clip | **20/192 (10.42% WER)** | Not measured | Not measured |
| RNNT, complete original clip | **16/192 (8.33% WER)** | Not measured | Not measured |
| CTC, production rolling/compaction/tracker | 36/192 (18.75% WER) | **0/18** | 0/30 |
| RNNT, production rolling/compaction/tracker | 23/192 (11.98% WER) | **1/18** | 0/30 |

All runs have zero inference failures. Whole-clip recognition is an exploratory
diagnostic, not live correction: one observation cannot establish temporal
stability. RNNT's 91.67% scripted word agreement is **not natural-recitation
accuracy or 99% mistake detection**. Both decoders sometimes restore a removed
canonical word. RNNT fails the calibration screen and is not evaluated on the
held-out controls or promoted. Warm desktop inference is approximately 21–25 ms
median / 26–36 ms p95, not microphone-to-feedback or phone/battery measurement.

CTC additionally had a frozen diagnostic 48-case held-out run: 2/18 operation
detections (both repetitions), two wrong positive-operation alerts, 1/30 negative
false alerts, 51/208 controlled word edits. It is worse than the current tracker
and is **rejected as a replacement**. These previously inspected development
controls cannot be reused as a fresh 99% qualification cohort.

Reproduce with the existing public RAM control server running on loopback 3011:

```sh
npx tsx apps/mobile/scripts/evaluate-recitation-nvidia.mts calibration ctc whole
npx tsx apps/mobile/scripts/evaluate-recitation-nvidia.mts calibration rnnt whole
npx tsx apps/mobile/scripts/evaluate-recitation-nvidia.mts calibration ctc rolling
npx tsx apps/mobile/scripts/evaluate-recitation-nvidia.mts calibration rnnt rolling
```

Use an isolated ignored venv with torch 2.10.0, numpy 2.3.4, sentencepiece 0.2.1,
onnxruntime 1.24.3 and PyYAML 6.0.3. The evaluator never installs dependencies,
provisions an online service, downloads gated files or enables recognition in
production. Its twelve-second whole-clip mode is offline-only; live app windows
remain six seconds. No cloud voice upload or paid service was authorized.

### Offline 99% qualification gate

Added `recitationQualification.ts` and `qualify-recitation.mts`. This is an
explicit development report generator, **not automatic enforcement in hosting,
store submission or the parent UI**. It exits nonzero on failure/malformed input.
No qualification PASS has been obtained. Unit fixtures verify the mathematics
only and are explicitly disallowed as model evidence.

The gate requires verified usage rights/voice consent, two independent reviews
of verbatim audible natural speech, frozen speaker/recording-disjoint evaluation,
and exclusion of training-speaker overlap. Controlled splices, fixture outputs,
missing analyses and reused test sets fail. Failed inference cannot inflate WER
using a cached perfect transcript. Wrong error categories or word locations are
not correct detections. Blanket abstention fails recall.

All three mistake-category recalls, correction precision, clean specificity and
an additional exact-spoken-transcript agreement safety check must independently
reach a 99% lower bound at familywise 95% confidence. Speakers, not correlated
words/windows/clips, are the independent units; every relevant utterance per
speaker must pass. This conservative gate is stronger than a 99% word-level
point estimate. Even a completely successful sample needs **477 independent
speakers relevant to each metric** under this rule; 600 clips of one speaker
remain one unit. Sampling coverage still requires human audit, not just counts.
Verbatim held-out WER must also be at most 1%.

Running the gate against existing controls deliberately returns **FAIL**:
speaker identities/consent and independently reviewed natural-error transcripts
are absent; artificial controls and already-inspected development data cannot
establish the target. Reports retain code/evidence hashes, never source audio.

```sh
npx tsx apps/mobile/scripts/qualify-recitation.mts \
  output/quran-development/qualification/known-controls-unqualified-evidence.json \
  output/quran-development/qualification/99-percent-gate-result.json
```

### Evaluation-access limits

The apparently larger
[public test dataset](https://huggingface.co/datasets/sobolev210/quran-recitation-errors-test)
revision `a5efade58cdb5df3a40f9619907279bc76a8ee32` has 1,042 metadata rows but
exactly the same 172 reviewed Hafs clips and two wording clips already evaluated:
**zero new reviewed cases**. Unreviewed or other-riwayah rows cannot silently
become trusted clean gold.

At the earlier investigation, the
[Quran-Lab benchmark](https://huggingface.co/datasets/Quran-Lab/quranic-asr-benchmark)
was gated and only its public card was inspected. On 13 October the user accepted
its separate research-only terms, authors granted access, and the complete
permitted benchmark was actually evaluated as documented above. Data approval
does not automatically grant commercial model rights or qualify lexical errors.
No dependable pronunciation/Tajweed capability is established by that follow-up.

**Remaining release blockers:** a recognizer that preserves learner mistakes
rather than restoring canonical wording, permissioned independently transcribed
teacher-reviewed natural-error evidence, fresh representative held-out evaluation,
and actual native acoustic/performance qualification of any replacement. Repeating
the same checks cannot replace these. Production and store releases are unchanged.

## Earlier 12 October: real recording/tracking integration, still not qualified

The normal native recording button previously invoked the audio-only recorder;
automatic recognition was a separate action. It now invokes Recite Assist's
owned PCM capture, records from that same input, and follows the existing private
retention/review setting. Test mode uses the same real recognizer with concealed
reference text and explicit correction hints. Self-reported memorization remains
separate from recognition; no automatic score is fabricated.

The website now similarly records and recognizes through **one microphone
stream**. It can review, loop, change pitch-preserving playback speed, download
or delete an explicitly requested browser-local recording. Pause/background/
navigation discard unfinished browser recordings and release capture. Older
browsers retain a clearly labeled audio-only fallback rather than losing the
previous recording feature. Browser audio is never uploaded or auto-downloaded.

Additional pipeline changes:

- Exact lexical alignment replaces the upstream fuzzy/substring judge. Different
  words no longer silently turn green. Quran orthographic aliases are comparison
  only; the displayed canonical Quran is unchanged.
- Conflicting overlapping hypotheses retract old green/stable evidence. A
  one-letter acoustic confusion stays uncertain, not a pronunciation judgment.
- A bounded three-check quiet tail can finish the final spoken word. It consumes
  actual capture samples, never generated silence in the live app, and cannot
  run indefinitely or on initial silence. Normal pacing remains 2.5 seconds.
- Skipped/substituted/repeated word hints index the canonical reference, not
  generated recognition text. Recognized speech is labeled separately and stays
  hidden while test text is concealed.
- Browser pause/resume rejects old responses before clearing the new inference
  state; review recording cannot open a second microphone or close borrowed
  recognition tracks. Browser confidence/timing now share one CTC decoding pass.

### Updated measurements (not a production accuracy claim)

On all 96 actual waveform controls with final quiet-context checks:

| Measurement | Result |
| --- | ---: |
| Correct operation detections | **6/36 (16.67%)** |
| Wrong operation alerts on positive controls | 0 |
| False alerts on negative controls | **1/60 (1.67%)** |
| Operation-case precision | 6/7 (85.71%; small selected sample) |
| Omission / repetition / substitution | 2/12 · 4/12 · **0/12** |
| Held-out detections / false alerts | 3/18 · 0/30 |
| Controlled script-reference WER | 85/400 (21.25%) |
| Desktop inference median / p95 | 76 / 119 ms |

These remain approximate waveform splices with baseline-success selection, not
human-recited mistake gold. The three quiet-context observations are not three
independent recitations. Current native simulator parity with this new cadence
has **not** been rerun; the native results below are the earlier 8 October run.

Replaying the existing 172 natural clips' actual acoustic observations through
the final lexical tracker gives **0/126** clean clips with any alert (held-out
0/37) but just **23/126** completely followed clips (held-out 9/37). Both natural
reviewed wording locations remain missed (**0/2**). This is saved-evidence replay,
not a new model inference run, and is not a word-recognition accuracy estimate.

The headless browser end-to-end check runs the **unmodified production WASM
worker**, verified model and real AudioWorklet/MediaRecorder on public licensed
RAM audio. It transcribed `ورفعنا لك ذكرك`, emitted three actual observations,
opened one shared capture, produced a browser-local review, closed the tracks,
and deleted the review without errors. No host microphone or user voice was
used. This proves wiring/lifecycle for that case, not general correction accuracy.

105 focused Quran regression tests pass. Real-browser UI tests cover recording,
pause/resume/stale responses, concealed test speech, permission denial,
background deletion, loop/speed, and unsupported-recognition fallback. Those UI
tests use explicitly identified worker fixtures and are **not** ASR measurements.
Mobile/public-web typechecks, public-web production build and iOS/Android Hermes
exports pass; exports are not store binaries or physical microphone checks.

### Additional recognizer investigation

- [Moonshine Arabic legacy base](https://huggingface.co/moonshine-ai/moonshine-base-ar),
  using the [Sherpa maintainers' quantized export](https://k2-fsa.github.io/sherpa/onnx/moonshine/index.html),
  was evaluated locally on 48 calibration waveform controls only. Identical
  lexical normalization gives 48/192 scripted word edits (25.00%). It was not
  promoted or tested on held-out controls after failing the calibration screen.
  The [upstream license](https://github.com/moonshine-ai/moonshine/blob/main/LICENSE)
  distinguishes MIT streaming models from Community-licensed legacy Arabic
  base/tiny; no HBIC commercial-release license or registration was assumed.
- [NVIDIA Arabic FastConformer](https://huggingface.co/nvidia/stt_ar_fastconformer_hybrid_large_pcd_v1.0)
  is CC BY 4.0, but the inspected pinned community CTC export contains an
  80-feature input and 512-channel encoder output, not a complete waveform-to-word
  recognizer. It was not substituted for a working engine or assigned invented
  accuracy. A complete frontend/CTC head/export remains required for evaluation.
- [Quran-Lab streaming license](https://huggingface.co/Muno459/fastconformer-quran-streaming)
  is gated and restricts revenue-linked use. HBIC tuition functionality does not
  justify assuming a licensing exception. No gated weights or new permissions
  were obtained.

**Release status:** these changes are development improvements, not a newly
deployed dependable correction feature. Production and store submissions remain
unchanged. Recognition still misses 30/36 controlled mistakes and both natural
wording locations. A better licensed recognizer and permissioned, independently
transcribed teacher-reviewed natural-error data remain the accuracy blockers.
No user audio is sent to an online provider without explicit opt-in authorization.

Reproduce the actual browser wiring check after starting the existing public
RAM corpus (`RECITE_SERVE_ONLY=1 RECITE_SERVE=1` on the control evaluator):

```sh
npx tsx apps/public-web/scripts/evaluate-recitation-browser.mts
```

Evidence stays in ignored `output/quran-development/qualification/`: the actual
96-case run is `utterance-tail-final-controls.json`; final tracker/hint replay is
`utterance-tail-hints-replayed.json`; natural replay is
`lexical-final-replayed.json`; browser run is `actual-browser-recitation.json`.
These retain source/code hashes, not audio or private accounts.

## Earlier 8 October qualification (retained for comparison)

## What actually changed

- Native greedy CTC now exposes approximate word emission times and conservative
  per-word acoustic confidence. It never force-aligns canonical Quran into speech.
- Quiet-pause compaction preserves a mapping back to original capture samples.
  Six-second rolling windows retain an absolute timeline.
- Temporal merging replaces fuzzy string stitching. Later interior observations
  can revise an early guess; distinct repeated words retain distinct timestamps.
- A standalone SentencePiece `▁` is a real word boundary, not clipped speech.
- Canonical text remains exact. Nonspoken annotations do not become missing words;
  joined Quran orthography can align with two spoken ASR tokens. Dagger-alef
  alternatives are comparison-only; no phonetic folding certifies lexical anchors.
- Clipped/unheard openings and neighboring ayahs are not automatically called
  omissions/extra words. Suspected internal differences need stable acoustic
  evidence. Weak canonical-looking tokens remain uncertain and cannot certify
  completion. This deliberately trades sensitivity for fewer false accusations.
- Completion requires distinct capture boundaries. Unchanged capture does not
  trigger inference. Native inference is serialized, foreground-only, bounded,
  and disposed on stop. The Quran-wide candidate search no longer runs each tick.
- Automatic next-ayah navigation retains the bounded rolling audio while text
  loads; manual passage changes/pause/stop erase it. Natural continuous-ayah
  advancement is still unqualified, not implied by this lifecycle fix.

## Public evaluation provenance

[quran-recitation-errors](https://huggingface.co/datasets/sobolev210/quran-recitation-errors)
revision `d196cd3132c69cd361d28cf6a8b442ae4e0bf0b4` declares MIT in its
publisher's dataset card. Evaluated all **172 reviewed Hafs clips**, from 31
recording groups: 126 clean, two `Wording`, 44 pronunciation-only. Other riwayat,
unreviewed clips and ayah-zero rows are excluded explicitly.

Source audio and transformed controls stay in RAM and are erased afterwards.
Reports use hashed clip/group identities; reviewer names/IDs are not retained.
The publisher does not document speaker consent, demographics, speaker IDs or
verbatim erroneous transcripts. MIT publication permits this offline evaluation;
it is **not** evidence of independently collected consent or speaker coverage.

Recording-disjoint calibration/held-out groups are fixed before revised detection.
They are not proven speaker-disjoint. All natural `Wording` clips are held out.
Only calibration failures informed fixes; one remaining held-out false alert was
not used to retune thresholds.

## Natural recordings: actual results and limits

The first report's 49 clean alerts was confounded by model-added Basmala and
standalone marks. Frozen baseline replay uses the **actual Tanzil ayah text**:

| Clean-recording outcome | Previous pipeline | Revised pipeline |
| --- | ---: | ---: |
| Possible-difference clips | 38/126 (30.16%) | 1/126 (0.79%) |
| Held-out possible-difference clips | 12/37 (32.43%) | 1/37 (2.70%) |
| Calibration possible-difference clips | 26/89 | 0/89 |
| Complete-following clips | 80/126 | 25/126 |
| Fully uncertain clips | 2/126 | 25/126 |

The revised result checks **any displayed alert**, not just the final frame.
Cadence/word evidence differ between pipelines, so this is not an isolated model
accuracy gain. The reduced completion coverage is a real limitation, not hidden.
No Quran memorization score is derived from these figures.

The two natural `Wording` cases have **0/2 correct erroneous-word localization**.
Labels identify an expected word but do not provide what was actually said or a
skipped/substituted/repeated subtype. They cannot qualify general category recall.
Pronunciation-only labels are not mislabeled as lexical mistakes or clean speech.

**True natural-speech WER is not established.** Many clips include neighboring
ayahs absent from the one-ayah metadata reference. Baseline whole-file
reference-scope WER (353/543 = 65.01%) is therefore invalid as recognition
accuracy. The 86 clean, at-most-six-second baseline clips give a diagnostic
52/323 = 16.10%, but this also lacks independently checked spoken boundaries.
Do not advertise either as HBIC's word-recognition accuracy.

## Actual waveform controls

12 fixed short sources across 12 recording groups, six per split, were selected
from the **prior** baseline's exact-reference success, not revised detection.
96 cases cover correct recitation, silence inserted as a pause, low noise,
0.8x/1.2x speed resampling, internal omission, repetition and substitution.
Substitution donors stay in their own split. No waveform crosses split groups.

These are real audio/model inferences, not simulated transcripts or feedback.
However, CTC emission-midpoint splice boundaries are approximate; edited audio
is **not naturally recited learner-error gold**, and speed resampling changes
pitch. Baseline-success selection overestimates general recognition coverage.

| Final operation-case measurement | Desktop | Native iOS simulator | Native Android emulator |
| --- | ---: | ---: | ---: |
| Evaluated cases | 96 | 96 | 96 |
| False alerts on correct/pause/noise/speed controls | 0/60 | 0/60 | 0/60 |
| Correct operation detections | 3/36 | 3/36 | 3/36 |
| Operation precision | 3/3 (100%; tiny sample) | 3/3 | 3/3 |
| Operation recall | 8.33% | 8.33% | 8.33% |
| Omission | 1/12 | 1/12 | 1/12 |
| Repetition | 2/12 | 2/12 | 2/12 |
| Substitution | 0/12 | 0/12 | 0/12 |
| Inference median / p95 | 71 / 122 ms | 80 / 135 ms | 491 / 875 ms |

Held-out controls: 2/18 operation detections, zero false alerts in 30 negative
controls. Controlled script-reference WER is **84/400 = 21.00%**; held-out
52/208 = 25.00%. These have known scripted word sequences but approximate cuts,
so are not natural-speech WER. Confidence values are not calibrated correctness
probabilities. Zero observed false positives does not imply a zero real rate.

Latency is inference only, not microphone-to-feedback latency. The app observes
every 2.5 seconds; stable feedback can require further observations. Final quiet
padding follows that same cadence and is not a second independent recitation.
Simulators do not establish real-device battery, acoustic or microphone accuracy.

Both native runs release all leases/model resources after completion. Results
agree across real native ONNX runtimes, not a JavaScript mock model.

Focused regression: phone/public-web tests and typechecks, mobile lint,
evaluation-script typechecks, and both phone Hermes exports pass. Android native
silence capture passes start/pause/resume/stop/review/restart/background cleanup;
the host microphone remains disabled. A first QA restart assertion was too short
for cold model preparation; a bounded readiness wait verifies the real restart.
iOS actual denied-permission UI returns to enabled Start, displays the decline,
emits zero PCM samples, and leaves zero inference leases. Its OS permission stays
denied: no Mac microphone was enabled. Human microphone/voice accuracy is not
inferred from these lifecycle tests.

## Alternative models and Tajweed

- Current [Tilawi model](https://huggingface.co/muhdur/tilawi-fastconformer-quran):
  pinned revision `e9448a0e84f3adb64c28b7a8db501dd8e0e59a84`, CC BY 4.0;
  upstream code MIT. All four asset digests are checked. Its studio verse-ID
  results do not establish learner word-mistake accuracy. It can restore a
  removed canonical word; weak evidence now cannot certify that word.
- [Tarteel Whisper base](https://huggingface.co/tarteel-ai/whisper-base-ar-quran):
  official Apache-2.0 model evaluated separately offline with pinned MIT
  whisper.cpp. On the same 96 controlled RAM waveforms: 22/36 correct operations,
  but 32/60 negative controls falsely flagged (53.33%) and 13 additional wrong
  operation alerts. Raw lexical-alignment precision is 32.84%, recall 61.11%;
  this is not the confidence-abstaining live tracker or a fair product comparison.
  Median/p95 cold CPU CLI process time is 454/514 ms, not warm phone latency.
  The community GGML conversion's verified original header contradicted its
  actual 448-position tensor. Only an explicitly documented four-byte experimental
  metadata copy was used; no weight bytes changed. Original/derived/source hashes
  are retained in ignored evidence. It is not shipped or called official.
- [Quran Muaalem](https://huggingface.co/obadx/muaalem-model-v3_2): MIT-tagged
  phoneme/multilevel CTC research model, approximately 0.6B parameters, requiring
  its own frontend/output mapping and separate teacher-reviewed phoneme testing.
  No phone performance or validated HBIC Tajweed claim is inferred from its paper.
- [Quran-Lab streaming](https://huggingface.co/Muno459/fastconformer-quran-streaming)
  and [phoneme model](https://huggingface.co/Quran-Lab/zipformer_p-arabic-v3):
  gated/non-profit/share-alike terms are not equivalent to an unrestricted model
  license. No gated acceptance or licensing exception was assumed for HBIC.

No Tajweed, pronunciation score, numeric memorization grade or fake recognition
result is enabled. The available review labels cannot qualify those capabilities.

## Reproduce safely

Use the existing local ONNX runtime/model cache, FFmpeg and ignored output folder.
No HBIC account, backend credential, paid provider, or production endpoint is used.

```sh
npx tsx apps/mobile/scripts/evaluate-recitation.mts
npx tsx apps/mobile/scripts/replay-recitation.mts
npx tsx apps/mobile/scripts/report-recitation.mts output/quran-development/qualification/temporal-replayed.json
npx tsx apps/mobile/scripts/evaluate-recitation-controls.mts
```

`RECITE_SERVE=1` on the controlled evaluator serves a temporary GET-only loopback
corpus from RAM for `evaluate-recitation-native.js` in a development Hermes
session. Stop the server after testing; SIGINT/SIGTERM erase the corpus. Reports
retain source/model hashes and split/selection limits, never audio or credentials.

## What prevents qualification beyond early preview

**Detection sensitivity and natural-speech qualification, not an account setting.**
The model misses 33/36 controlled mistakes and all two natural reviewed `Wording`
locations. Substitution detection is implemented but has no successful detection
in the larger controls. Stable automatic progression is too incomplete to qualify.
A materially better recognizer and independently transcribed, teacher-reviewed,
permissioned natural mistakes/negatives must pass held-out testing before a
dependable automatic assessment can be claimed.
No model card, fixture suite, compile result, or polished reader can substitute
for that evidence. Release authorization is limited to the honest opt-in preview.
