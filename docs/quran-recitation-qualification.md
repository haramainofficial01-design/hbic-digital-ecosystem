# Recite Assist qualification — updated 12 October 2026

**Authorized only as an optional early preview, not a qualified assessment.**
After reviewing the limitations, the user explicitly requested publishing the
detector for personal testing. The release flag enables it with an explicit
download/microphone consent and prominent warnings that it misses many mistakes
and may misidentify words. This decision does not change the measurements below
or establish dependable recitation/Tajweed accuracy. No microphone audio was
uploaded or added to Git. Academy, prayer data and signing are unchanged.

## 12 October: real recording/tracking integration, still not qualified

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
