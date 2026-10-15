# Quran recognition — bounded Tadabur comparison

15 October 2026. Offline research only; no app model substitution, production,
OTA or store change. The user's target covers ordinary voice-following,
hidden-verse tests and mistake review. None has established 99% real-user
accuracy. UI regression passes are not acoustic measurements.

## Fixed experiment, declared before inference

Evaluate the transcription-only
[Tadabur Whisper Medium](https://huggingface.co/rakansuliman/tadabur-whisper-medium)
checkpoint by Rakan Suliman, Abdulrahman Mamdoh, Hussam Aldosari and Mohammed
Khalid. Its training dataset is Faisal Alherran's
[Tadabur](https://arxiv.org/abs/2604.18932). Model revision
`e82c2d827ad0df27e31042f7fb87c73df1da2c8b`; weight SHA-256
`9e3e7472373fa6570350e0c67c624307b18a35b2efee62cb00d6f46b944b6f27`.

The publisher marks it CC BY-NC 4.0 / research and educational use only. The
[original legal terms](https://creativecommons.org/licenses/by-nc/4.0/legalcode.en)
and full pinned model card were read. This is a local, noncommercial research
comparison, not approval to distribute a new model or enable a paid feature.
The publisher's numbers are not HBIC measurements. In particular, seen-text
figures cannot demonstrate mistake-sensitive recognition of learner speech.

- Reuse all 48 historical calibration waveforms, including 18 approximate
  omission/repetition/substitution splices and 30 negatives, with all 192
  script-reference words. These are previously inspected controls selected
  using earlier recognition success, not fresh held-out learner gold.
- Use float32 MPS in the existing isolated torch/Transformers runtime; no
  dependency upgrade. Author-style deterministic greedy transcription with
  Arabic language/task selection, suppression disabled, no forced decoder IDs.
  A bounded 128-new-token output must terminate; truncation fails the run.
- Recognition receives mono 16 kHz PCM only, never the expected ayah, words,
  mistake category, comparison script or a Quran prompt. ASR weights and
  tokenizer assets are allowlisted and hashed. No reciter identity classifier,
  identity mappings or canonical-ayah matching assets are downloaded or used.
- Licensed public control waveforms remain in the existing loopback RAM source
  and pipes. No HBIC user recordings, audio files, voice uploads, new account
  permissions or paid inference. No training on any evaluation resource.
- Score raw transcript differences separately from exact script recognition
  and canonical-instead-of-altered-speech failures. No fabricated word timing,
  acoustic confidence, live following or Tajweed score. Record every failure,
  denominator and exact model/code/waveform/report hash.
- Reject a candidate that hides altered speech or introduces excessive false
  differences. Do not tune it against these cases and rename them held-out.

## Report-integrity change

The comparison runner now captures the complete manifest scope before waiting
for model startup. Every failed or unattempted case retains its reference-word
budget, and incomplete runs have no WER/precision/recall qualification result.
An unavailable scope remains null, not a perfect empty evaluation. Duplicate,
out-of-scope or changed word counts fail. Insertions may legitimately yield WER
above 100%; they are not capped away. Each report additionally counts exact
altered transcripts and canonical-restoration failures using the existing
independent fidelity scorer. Four explicit arithmetic fixtures pass; these do
not constitute speech evidence.

## Release interpretation

The current three app workflows share the existing on-device recognizer and
conservative tracker; choosing hidden text does not make it a separately
qualified speech model. The best prior experimental detector's 13/14 precision
and 13/18 recall are historical scripted-control results, not a deployed native
accuracy score. Independently reviewed natural-error/verbatim labels,
representative speaker-disjoint evaluation and physical iOS/Android lifecycle,
latency and thermal checks remain necessary before a dependable 99% claim.

## Actual complete result — reject as an app replacement

All 48 cases / 192 words were analyzed, with **zero inference, missing-case or
truncation failures**. This is new waveform inference with a different model,
but not newly collected natural speech or a fresh qualification set.

| Historical script diagnostic | Result |
| --- | ---: |
| Word edits / script-reference words | **30 / 192 (15.625% WER)** |
| Exact entire scripted transcripts | 27 / 48 |
| Exact altered transcripts | **4 / 18** |
| Canonical verse instead of altered speech | **3 / 18** |
| Located/type-matched raw difference detections | 10 / 18 (55.56% recall) |
| Raw difference precision | **10 / 36 (27.78%)** |
| Negative controls with any raw difference | **7 / 30** |
| Desktop inference median / p95 | 617 / 711 ms |

Raw transcript differences are not the conservative live tracker or a natural
learner correction score. Script-reference WER cannot be labelled real-user word
accuracy. Desktop inference is not microphone-to-feedback latency, physical
device performance, native compatibility or thermal validation.

Each category has six cases; every edit and failure remains in the report:

| Category | Word edits / words | Exact full scripts | Expected operation found |
| --- | ---: | ---: | ---: |
| Correct | 2 / 24 | 5 / 6 | — |
| Pause | 5 / 24 | 3 / 6 | — |
| Low noise | 2 / 24 | 5 / 6 | — |
| Speed 0.8 (pitch altered) | 0 / 24 | 6 / 6 | — |
| Speed 1.2 (pitch altered) | 2 / 24 | 4 / 6 | — |
| Approximate omission | 5 / 18 | 2 / 6 | 4 / 6 |
| Approximate repetition | 4 / 30 | 2 / 6 | 2 / 6 |
| Approximate substitution | **10 / 24** | **0 / 6** | 4 / 6 |

One omitted-word case and two repeated-word cases return the canonical verse
instead of the altered speech. No substitution transcript is wholly faithful,
even though the raw difference diagnostic finds the expected operation in four.
This makes the candidate unsafe to promote merely for familiar Quran text.
It is **rejected**, without tuning against these failures or rerunning a reused
split under a new label. The previous best detector remains unchanged.

Runtime: torch 2.10.0, numpy 2.3.4, isolated Transformers 5.19.0, MPS float32,
greedy beam width one. The RAM control server was stopped after completion; no
source audio files or voices were saved or uploaded. Verified model assets stay
in ignored local research output, not the application download or Git.

## Verification and immutable provenance

232 existing Quran regression checks pass, plus four new comparison-scope
fixtures and nine asset/transport checks. Mobile typecheck, strict standalone
evaluation TypeScript, Node/Python syntax and scoped diff checks pass. These
checks validate software contracts, not 99% speech accuracy. No production,
OTA, native app model or store build changed.

Private report under `output/quran-development/tadabur-medium-comparison/`:
`tadabur-medium-whole-calibration-mps-f32-1792100925732-1ae2b236-dfdb-42b5-a1ce-ce763fcadc26.json`.
It includes all 48 waveform hashes, transcripts, planned counts, actual
differences, fidelity diagnostics and scorer hashes. Only aggregate results,
source and hashes enter Git.

| Artifact | SHA-256 |
| --- | --- |
| Complete report | `a19635ab87e73dcc3994a152e52a1459c89428edd12d56766ffef9c5d242c7be` |
| Verified asset manifest | `18d36758da6c298af4f924327dcb09dbb655528b4e5eab58400aaba070f23613` |
| Waveform-only worker | `36738ce12d4294ef3c5ade937d24619e0107dc7a539c6f7f46fd19d361e55a65` |
| Evaluation runner | `14eb43e7a9354a6b5a1d520056258b18de8e50c92b46e1eabcb3b75d1d4e63aa` |
| Scope arithmetic | `88ab0225b03a6b7152a5d8e07ae82b26d09607b3fcc7c977f9439be90da2b208` |
| Altered-speech fidelity scorer | `cf6fffdd308a21d9c2e7e3414fc15a88369ecc41cd8d1b22e4b829ee674cc778` |
