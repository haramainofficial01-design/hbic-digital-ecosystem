# Recite Assist — supplementary independent substitution proposals

15 October 2026. A fixed development-only experiment, not a new natural
benchmark, automatic correction feature, native qualification or release.

## Predeclared change

Tadabur Whisper Medium failed as a replacement recognizer. Test a distinct role:
use its already measured, waveform-only transcript to propose additional
substitution words to the prior compact-v3 phonetic event comparison. A proposal
is not a recognized correction, an oracle answer or evidence that two models
agree correctly. No expected verse or script is sent to a recognizer.

Preserve every original RNNT/character-CTC proposal first. Append exact forms
of supplementary decoded words in transcript order, using only the unchanged
Tanzil global form map and the existing transparent one-clitic composition.
No fuzzy replacement, stemming, frequency ranking or expected-error selection.
Unknown word mappings remain explicit; do not discard their cases or truncate
the union to make it fit. Enumerate every interior reference position, not the
planted mistake location. Pure phonetic hypotheses belong only to the separate
comparison process, not speech decoding or proof of correct Quran recitation.

Keep the original simpler compact-v3 comparison **unchanged**: v3 int8, scale 1,
same quiet-compaction timeline and 600 ms settling tail, greedy-longest inventory
encoding, duration nuisance off, original log(100)/log(10) margins. Do not switch
to a different all-segmentation scorer, tune thresholds or sweep alternatives.

Use all 48 historical calibration controls, including 18 approximate word edits
and 30 negatives. This data was already inspected, was selected using prior
recognition success, and has approximate splices/pitch-changing controls. It is
not naturally spoken, double-reviewed word-error gold or fresh held-out speech.
Recompute v3 posteriors in RAM only because matrices were intentionally not
saved. Require all original/compact PCM, sample counts, greedy outputs and
posterior hashes to match the frozen source. Recomputed original baseline
scores and predictions must reproduce exactly before testing the new union.

All failures/misses/false warnings remain. Reject if there is no useful
improvement or any unaccounted regression; do not promote a stronger calibration
column as 99% real-user accuracy. No transcript/WER, live voice-following,
Tajweed, physical native timing, battery or thermal claim follows from this
counterfactual event comparison.

## Reference-only preflight, before acoustic comparison

The new union contributes 22 newly observed word/scope pairs (18 distinct words).
Twelve map exactly; ten have unavailable mappings and remain explicit. Twenty-six
new vocalized form/scope pairs across twelve scopes produce **42 genuinely new
encoded hypotheses**. All original paths remain: 322 → 364 unique paths,
323 → 369 raw paths before duplicate removal, with maximum eight forms per scope
(explicit bound sixteen, no truncation).

All 48 source pairs and both sets of 48 pure conversions pass. Both baseline
and union reference-word phones match the frozen v3 reference exactly. Preflight
does not read planted-error fields/spoken gold, access audio or run a model.
These counts verify new coverage, not accuracy.

Completed preflight:
`supplementary-proposal-union-1792124245216-e1696781-1af9-4a9f-aca9-1a92e2461220.json`,
SHA-256 `f4d58b6cc6ddeacf531b131b679b63f8099e8ca03a55088ebb8fa8e29a9a2c83`.
An earlier report with a different filename prefix is preserved, not a failed
speech inference or a fresh experiment. Five new union-contract tests and five
existing CTC tests pass. Strict standalone TypeScript and diff checks pass.

## Provenance, privacy and license boundaries

Frozen compact-v3 baseline:
`00906711e6bc7dcba73529ca99cfeb900b80878728d5a823066f4794d654be89`.
Original independent proposals:
`ffc65bd0796e9a0067f311c317be41f788c4ad9e168588d14dc06ed407223f60`.
New supplementary ASR output:
`a19635ab87e73dcc3994a152e52a1459c89428edd12d56766ffef9c5d242c7be`.
Exact source/model/code pins, mappings and per-case hashes remain in the private
preflight/report. No recording, private transcript, model weight, credentials,
generated native project or HBIC record enters Git.

The original Quran-Lab NPL-1.2 was read fully and remains with this isolated
experiment; local research/no-profit and warning obligations remain unchanged.
Tadabur Whisper Medium by Rakan Suliman, Abdulrahman Mamdoh, Hussam Aldosari and
Mohammed Khalid is marked CC BY-NC 4.0 / research and educational use; its source
is Faisal Alherran's Tadabur dataset. See the pinned source and original terms
in [the completed model comparison](quran-tadabur-comparison-2026-10-15.md).
Tanzil CC BY 3.0 unchanged-text and `quran-transcript` 0.6.4 MIT attribution
remain. No distribution/release approval is inferred from model access.

Public permitted control audio is processed only locally in RAM/private pipes,
not intentionally stored or uploaded. Existing verified models are reused, not
redownloaded. No evaluation-only benchmark training, HBIC voice collection,
access-gate bypass, paid inference, account permission, foreground screen change,
unrelated cleanup, production/OTA or store action.

## Completed fixed acoustic comparison

All **48/48** waveforms were actually inferred locally again for the changed
proposal experiment; zero inference/analysis failures and zero missing cases.
All 48 original/compact waveform identities, phonetic outputs and posterior
hashes match the frozen source. All 48 original baseline score lists and
selections reproduce exactly before comparing the union.

| Historical calibration measure | Original proposals | Supplementary union |
| --- | ---: | ---: |
| Correct operation **and location** | 15/18 | 15/18 |
| Predicted operations | 15 | 15 |
| Omission / repetition / substitution found | 6/6 · 4/6 · 5/6 | 6/6 · 4/6 · 5/6 |
| False alerts on negative controls | 0/30 | 0/30 |
| Wrong positive operation/location alerts | 0 | 0 |
| Controlled precision / recall | 100% / 83.33% | 100% / 83.33% |

There are **zero changed predictions**. The 42 genuinely new encoded paths in
twelve scopes do not rescue any miss. Exact remaining failures are case 7
(substitution, canonical index 2), case 14 (repetition, index 3), and case 22
(repetition, index 1); all indices are zero-based. None receives a new encoded
path from the supplementary recognizer. In cases 7 and 14 the unchanged
counterfactual still scores above the altered one. Case 22 remains ambiguous
and below the unchanged, predeclared margins; thresholds were not relaxed.

**Reject this proposal addition as an improvement.** Do not run the other
already-inspected control split merely to seek a favorable headline after no
gain here. The 100% precision column is only fifteen warnings in approximate
controls, with three misses; it is not 99% word recognition, natural mistake
qualification or a live-app result. The prior other-split experimental result
remains **13/14 precision (92.86%) / 13/18 recall (72.22%)**. The conservative
app tracker, word WER and physical-native qualification remain separate.

Completed private report:
`supplementary-proposal-events-1792124315281-ed079bbf-f405-4336-b3ef-dae3a40040ef.json`,
SHA-256 `a187393ac1ef4ea5f944e55e9350f9cbb9d1cc4ddcdfd17d8486ff9f7f315ae8`.
Its complete rows retain both score lists, all added/missing mappings, source
and posterior hashes, exact code provenance and zero-failure denominators.
The RAM control source and local inference worker were stopped after the run.

| Changed source | SHA-256 |
| --- | --- |
| Actual fixed acoustic evaluator | `59893ca1016a059122c42995264020ffdb0121b06d407af3c2ddf726c0b14f6e` |
| Reference-only preflight | `74aabc30cc4a53420a2dd97789ce0fceefec9f73ad86c1528d5d0f610cb7abc5` |
| Pure union helper | `aacee05d92b82c10fd154982bf9b11e7528f5ef899d77c5e634623ad3b3c78ff` |
| Union regression contracts | `4535182b093b48282af35a42d1f75fb2a5730897d923ae198cb5f63f86f5ae37` |

The 263-check shared mobile/browser Quran suite, both mobile/public-web
typechecks, strict standalone changed-script/test typechecking and diff checks
pass at this comparison. These are software regressions, not speech/native
accuracy evidence. No models, private case transcripts or audio enter Git;
no model/app replacement, production deployment, OTA or store submission.
