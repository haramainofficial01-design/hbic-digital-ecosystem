# Recite Assist qualification — 8 October 2026

**Authorized only as an optional early preview, not a qualified assessment.**
After reviewing the limitations, the user explicitly requested publishing the
detector for personal testing. The release flag enables it with an explicit
download/microphone consent and prominent warnings that it misses many mistakes
and may misidentify words. This decision does not change the measurements below
or establish dependable recitation/Tajweed accuracy. No microphone audio was
uploaded or added to Git. Academy, prayer data and signing are unchanged.

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
