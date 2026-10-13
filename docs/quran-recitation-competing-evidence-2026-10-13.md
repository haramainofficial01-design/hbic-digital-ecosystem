# Recite Assist: competing acoustics and real voice-following

Development only. **99% natural-recitation accuracy is not established.** No
production deployment, OTA update, store submission or customer audio upload.
The experimental desktop models are not bundled into the mobile application.

## Actual word-following improvement

The app and website now have a navigation-only current-word indicator driven
by the existing recognizer's **actual timestamped acoustic tokens**. It does not
wait for whole-ayah assessment, fill missing speech with the reference, mark
words correct, create a mistake or bypass the existing completion guard.

- A unique selected opening may follow immediately with strong acoustic support.
- Other positions require consecutive exact word anchors and enough context to
  identify a unique location. Repeated phrases cannot pick an arbitrary repeat.
- Weak, clipped, conflicting, invalid or stale observations clear the indicator.
- Exact joined Quran orthography is supported without fuzzy word substitutions.
- Concealed tests still conceal the passage and recognized speech.
- This follows the selected practice passage; it is not qualified automatic
  surah discovery or word-by-word tracking throughout the Mushaf page.

The real production WASM worker, Web Audio and MediaRecorder were tested
headlessly with public licensed RAM audio, not mocked recognition. The model
recognized `ورفعنا لك ذكرك`; its observations drove one supported word cursor.
One shared capture, closed tracks, local recording review/deletion and zero
browser errors were verified. There was no personal microphone recording.
This is a wiring test, not real-device or 99% accuracy qualification.

## Competing acoustic hypotheses, not forced correct answers

A separate offline comparison scores unchanged, omitted, repeated and proposed
substituted-word phonetic paths against the **same actual acoustic posteriors**.
The recognizer receives PCM only. Reference conversion is a separate process;
no canonical text, expected operation or expected location enters ASR.

Every interior omission/repetition position is included. Independent NVIDIA
RNNT observations supply substitution proposals. Reference-side vocalizations
come from unchanged licensed Tanzil forms; transparent clitic composition must
preserve the full observed lexeme. Missing proposal coverage counts as a miss,
not an excluded case. Different vocalizations of the same event use their best
path, while distinct locations still compete. Identical paths count once.

The diagnostic margins remain log(100) against unchanged speech and log(10)
against another event/location. They are **uncalibrated model scores**, not a
probability that a learner is wrong. An unchanged winning path does not establish
correct recitation. Partial utterances cannot be classified by this experiment.

A separate phone-run comparison treats repeated length/gemination tokens as a
duration nuisance for **lexical events only**. Different consonants/vowels and
multi-phone word repetitions remain distinct. Raw phonemes/duration differences
remain in reports. This deliberately cannot validate Tajweed, gemination,
pronunciation, accepted duration variants or all riwayat.

### Actual calibration results

All 48 existing calibration waveform controls were analyzed per completed run:
18 approximate edited mistakes and 30 negative controls. No failed cases were
silently omitted. These sources were selected using an earlier model's success;
they are biased controls, not natural teacher-reviewed error gold.

| Method | Exact operations | Predictions | Wrong positive classifications | Negative alerts | Precision | Recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| CTC competing omission/repetition paths | 11/18 | 14 | 3 | 0/30 | 78.57% | 61.11% |
| Add independent RNNT substitution proposals | 16/18 | 17 | 1 | 0/30 | 94.12% | 88.89% |
| Add exact observed clitic composition | 17/18 | 17 | 0 | 0/30 | 100% | 94.44% |
| Lexical phone-run duration nuisance | 18/18 | 18 | 0 | 0/30 | 100% | 100% |

**The tiny perfect calibration result is not 99% accuracy.** The last method
was frozen before the second control split was run. That split was historically
inspected during earlier development, so it is not a fresh qualification cohort.

### Frozen comparison result: below target

All other 48 waveform controls: **12/18 exact operations**, 15 predictions,
three incorrect positive classifications, **0/30 negative alerts**. Precision
is **80%**; recall is **66.67%**. Omission: 6/6; repetition: 5/6; substitution:
**1/6**. Missing substitutions are still the major gap. CPU inference median /
p95: 406 / 571 ms; additional reference-free prefix decoding: 14 / 21 ms.
These are desktop timings, not microphone-to-feedback or phone battery figures.

### Additional independent transcription proposals

The official MIT
[`openai/whisper-large-v3-turbo`](https://huggingface.co/openai/whisper-large-v3-turbo)
was evaluated locally, not through an online API. Official OpenAI
[transcription documentation](https://developers.openai.com/api/docs/guides/speech-to-text)
was checked separately; no paid API or new provider account was used. Pinned
revision: `41f01f3fe87f28c78e2fbf8b568835947dd65ed9`; weight SHA-256:
`542566a422ae4f3fd23f1ba11add198fca01bbf82e66e6a2857b3f608b1eb9d1`.
Its 1.618 GB weight file remains in ignored development storage, not users' apps.

The actual model receives PCM and an Arabic language hint only, with a fixed
five-path beam. It receives no Quran prompt, reference or expected mistake.
Word timestamps and acoustic confidence are explicitly `null`, not fabricated.
All ten assets are verified before loading, with no remote code execution.

Half-precision MPS output was unusable/truncated and the run stopped at its
second case. That failure remains in the evidence; it is not an accuracy result.
Full float32 CPU and MPS runs then completed every calibration case. An initial
concurrent report-name collision was found: that shared artifact is not used for
comparison or dual-runtime claims. Both runs were repeated with mode and UUID
in their names. Every new experiment now has a unique evidence filename.

| Whole-clip raw transcript diagnostic | Calibration CPU | Calibration MPS | Other split MPS |
| --- | ---: | ---: | ---: |
| Cases / failures | 48 / 0 | 48 / 0 | 48 / 0 |
| Exact controlled operations | 10/18 | 10/18 | 8/18 |
| Omission / repetition / substitution | 4/6 · 0/6 · 6/6 | 4/6 · 0/6 · 6/6 | 3/6 · 0/6 · 5/6 |
| Negative clips with raw differences | 12/30 | 12/30 | 12/30 |
| Raw difference precision | 21.28% | 21.28% | 17.78% |
| Script-reference word edits | 40/192 | 40/192 | 39/208 |
| Desktop median / p95 | 2,304 / 3,720 ms | 1,192 / 1,652 ms | 1,120 / 1,752 ms |

The raw engine is rejected as a direct correction replacement. It often
reconstructs canonical repetitions instead of preserving what was spoken;
its raw differences must not be presented as learner errors.

Only its independently recognized candidate words were then added to the joint
acoustic comparison, with the same eight-form bound and unchanged score policy.
No raw transcript differences, guessed confidence or forced-correct words become
user feedback. Every proposal must match the original waveform identity and
come from a complete verified full-precision report of the correct split.

The combined calibration still finds **18/18**, with no wrong classifications
or negative alerts. Frozen comparison: **13/18** detections, 16 predictions,
three incorrect positive classifications, **0/30** negative alerts. Precision:
**81.25%**; recall: **72.22%**. Omission: 6/6; repetition: 5/6; substitution:
**2/6**. This is a limited diagnostic improvement, **not 99% natural accuracy**.
It is not integrated into the app; the data and mobile-runtime gaps remain.

Authoritative new reports: calibration CPU `1791917885533` and MPS
`1791917886505`, each with its mode/UUID; comparison MPS `1791917976977`;
joint calibration `muaalem-phoneme-calibration-1791917975849.json`; joint
comparison `muaalem-phoneme-heldout-1791918096934.json`. Full files retain
runtime/provenance and source/code hashes. In the joint report both text-model
proposals are clearly marked replay; its phoneme inference is fresh.

The current app's unchanged mistake assessment, replayed on the identical
controls, remains **6/36** detections overall, **0/60** negative alerts. Its
natural-audio replay remains **0/2** reviewed wording locations, **0/126** clean
alerts and **24/126** completely followed clips. Replay is not new inference;
the new navigation cursor does not change these assessment outcomes.

The experimental joint engine is therefore **not promoted into the app**.
It uses 2.423 GB phoneme weights plus a separate RNNT model, has no qualified
mobile runtime, and has not met the requested natural accuracy or latency target.

### Failures and provenance retained

The first calibration experiment stopped on an unsupported written U+0653 madd
annotation in a hypothetical reference. Only that non-speech mark is stripped
from comparison paths; original hypothetical phones remain available. The
failed artifact was retained. No acoustic letter/vowel/length output was edited.

The first frozen comparison stopped at its final case because two spelling
variants yielded an identical event/phone path. The complete rerun de-duplicates
that exact path, reports the duplicate count, and retains ambiguous different
events/locations. **No acoustic score, threshold or decision policy was tuned on
those results.** The failed report is retained, not relabeled as a completed run.

Evidence stays in ignored `output/quran-development/`, with no audio on disk:

- Calibration progression: Muaalem reports ending `1791915742866`,
  `1791916110534`, `1791916390488`, `1791916420488`.
- Complete frozen comparison: `muaalem-phoneme-heldout-1791916967074.json`.
- Fresh RNNT comparison input: `nvidia-whole-rnnt-heldout-1791916581677.json`.
- Final real-browser wiring: `actual-browser-recitation-1791917414449.json`.
- Final repeated wiring check: `actual-browser-recitation-1791918308631-dbfb92a3-1620-41a6-ab10-6060d376fda3.json`,
  with the actual final word `ذِكْرَكَ` indicated, three acoustic observations,
  closed tracks and zero browser errors.
- Immutable controls/natural replay: `voice-follow-controls-replayed.json` and
  `voice-follow-natural-replayed.json`.

Reports retain model/revision, code hashes, original/inference waveform hashes,
raw phone/transcript observations, source split, failures and runtime. RNNT
proposals are explicitly saved actual-model replay; Muaalem inference is fresh.
The RNNT encoder is a community export with original NVIDIA classifier heads,
not an independently verified official complete export. No such claim is made.

## Independent evidence remains the qualification gap

The apparent additional MIT dataset
[`sobolev210/quran-recitation-errors-test`](https://huggingface.co/datasets/sobolev210/quran-recitation-errors-test)
at revision `a5efade58cdb5df3a40f9619907279bc76a8ee32` has **identical metadata**
to the already evaluated source revision `d196cd3132c69cd361d28cf6a8b442ae4e0bf0b4`:
SHA-256 `b64a07f2f0d39c9f356cba5918280f5a7e1d7619c5410e34f4a7197222fba37d`.
It supplies **zero new reviewed Hafs recording groups** or wording cases.
Do not treat its different repository name as independent evidence.

The public CC BY 4.0
[`MuazAhmad7/Surah_Ikhlas-Labeled_Dataset`](https://huggingface.co/datasets/MuazAhmad7/Surah_Ikhlas-Labeled_Dataset)
contains 1,506 short clips labeled correct/Tajweed-error. Its metadata does not
supply independently checked verbatim erroneous-word transcripts and lexical
operation coordinates. No audio was downloaded, and its Tajweed labels were
not repurposed as skipped/substituted/repeated-word gold.

Quran-Lab benchmark access still requires authorized manual research-access
approval. Neither access approval nor training-speaker exclusion has been
claimed. The connected Tarteel tools expose Quran content/search/audio, not
access to Tarteel's proprietary recognition engine or a comparison benchmark.

The existing 99% qualification gate stays unchanged and fails on the known
unqualified controls. Required evidence remains permissioned, independently
double-reviewed natural speech, exact audible transcripts and error locations,
fresh speaker-disjoint held-out evaluation and verified training separation.

## Verification and release boundary

**121 mobile/shared + 26 browser/shared checks pass** (146 distinct tests; one
shared playback test runs in both suites). They cover controlled
lifecycle/hidden-test fixtures, exact probability math, cursor
ambiguity/stale evidence, and asset transport/provenance. Unit/DOM fixtures are
not recognition-accuracy evidence. The real-model browser wiring check passes
separately; it is not counted as a unit fixture or a natural accuracy sample.

Mobile/public-web typechecks, strict evaluation-script typechecks, mobile lint,
Python/Node syntax checks, public-web build and iOS/Android Hermes exports pass.
The public build retains existing unrelated Academy CSS/lint warnings. Exports
are local JavaScript verification, **not signed native builds or store uploads**.
No physical microphone, device battery or notification test is claimed.

Quran content, audio playback, memorization, private recordings and test-mode
privacy regressions remain passing. Academy, Stripe, Firebase configuration,
prayers, app versions, signing and production/store settings were not changed.

## Reproduction

Serve the existing pinned public RAM controls on loopback port 3011 using
`RECITE_SERVE_ONLY=1 RECITE_SERVE=1` and a separate ignored report path.

```sh
npx tsx apps/mobile/scripts/evaluate-recitation-muaalem.mts cpu 600 --events
npx tsx apps/mobile/scripts/evaluate-recitation-muaalem.mts cpu 600 --events-rnnt
npx tsx apps/mobile/scripts/evaluate-recitation-muaalem.mts cpu 600 --events-rnnt-duration
npx tsx apps/mobile/scripts/evaluate-recitation-muaalem.mts cpu 600 --events-rnnt-duration heldout output/quran-development/sherpa-comparison/nvidia-whole-rnnt-heldout-1791916581677.json
npx tsx apps/public-web/scripts/evaluate-recitation-browser.mts
node apps/mobile/scripts/prepare-whisper-recitation.mjs
npx tsx apps/mobile/scripts/evaluate-recitation-qwen.mts whisper-turbo cpu-f32
npx tsx apps/mobile/scripts/evaluate-recitation-qwen.mts whisper-turbo mps-f32
npx tsx apps/mobile/scripts/evaluate-recitation-qwen.mts whisper-turbo mps-f32 heldout
```

The dual-proposal experiment uses `--events-rnnt-whisper-duration`, followed by
the split, explicit complete RNNT evidence path and explicit complete
full-precision Whisper evidence path. It does not guess a latest report or reuse
an incomplete or wrong-split run. Its sample hashes must match every RAM case.

All recognition inputs remain PCM-only. Reproduction is development testing,
not authorization to release an unqualified engine or upload anyone's voice.
