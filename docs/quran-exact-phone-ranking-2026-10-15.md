# Recite Assist — exact acoustic phone-string ranking

15 October 2026. One changed offline decoder experiment on existing inspected
calibration controls, not a new learner benchmark, native validation or release.
No target accuracy is claimed before complete results.

## Predeclared hypothesis

The existing width-32 CTC prefix search ranks retained token sequences by their
pruned path mass. Multiple authoritative inventory tokens can spell the same
phonetic output string. Summing every CTC path and token segmentation for each
original phone string may rank its acoustic evidence differently without adding
or changing any heard phones. This is not canonical verse reconstruction.

The sole changed mechanism is ranking these **existing original phone strings**
by exact, unpruned raw-string CTC likelihood. Identical phone strings count once;
every original token-prefix rank and score remains visible. Ties retain their
earliest original rank. The scorer never receives expected verse text, a Quran
word list, a script, an error label, an intended correction or a language model.
Duration-run nuisance is off for acoustic rescoring.

Then apply the unchanged global partial duration lexical parser: first complete
unique parse in the new acoustic order, or unchanged frozen raw RNNT transcript
when no parse covers a retained candidate. "Unique" is still only within an
incomplete dictionary. This step can still restore canonical words and must be
tested, not assumed safe. No per-case oracle selection or parameter sweep.

Use all 48 historical calibration controls / 192 scripted words. Reuse verified
v3 int8, scale 1, the unchanged quiet-compaction timeline and 600 ms settling
tail, original width-32/top-12 candidates, 9,980-form lexicon and raw RNNT report.
Recompute actual model posteriors only because posterior arrays intentionally
were not saved. Require original PCM, compact PCM, sample count, greedy output
and **every posterior hash** to equal the frozen prior evidence before rescoring.
No new model download, changed frontend, extra audio corpus, training, voice
upload, audio file, browser account access or screen switch.

Expected scripts enter only after selection. Preserve all denominators and
failures, paired improvements/regressions, exact altered scripts, canonical-
instead failures and raw difference detection separately. Raw transcript diffs
are not the live tracker or teacher-reviewed natural corrections; desktop
timings are not phone-native lifecycle/thermal validation. Incomplete runs fail
and retain every remaining word budget. Do not relabel this set fresh held-out.

The original Quran-Lab NPL-1.2 was read completely and remains in
`apps/mobile/scripts/zipformer/LICENSE`. Accepted local-research/no-profit and
warning obligations remain unchanged. Existing Tanzil CC BY 3.0 and
`quran-transcript` 0.6.4 MIT attributions remain; the licensed canonical text is
unchanged. Nothing in this experiment is integrated into the app or deployed.

## Pinned inputs

| Existing artifact | SHA-256 |
| --- | --- |
| Width-32 actual acoustic candidates | `c7ef5272e7206c9d47ff5b2ff75a00d8f162b31e8a89121cb83078c7294b73a6` |
| Prior combined selection | `9cd62bfac02d638bc8d045f72563ded4c6bd8863e493bf4acbadfaa7febd2cca` |
| Independent frozen raw RNNT | `cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310` |
| Existing partial global lexicon | `262736fca4c16f924fbccb1b66ec133b23a735c9ddb3d139657461f84d5057c4` |

## Complete measured result — no improvement, do not promote

All 48 cases / 192 scripted words completed, with zero inference, analysis or
missing-case failures. **All 48 original, compact and posterior hash pairs match
the frozen inputs**, as do all greedy phone strings. There are 1,536 retained
token prefixes and 1,533 distinct phone strings; three duplicate strings are
not given extra votes. Exact scoring changes rank positions in 46 cases / 435
retained strings, so this was genuinely a different ranking mechanism.

Nevertheless, the final selected transcripts are **byte-identical on all 48
cases** to the prior width-32 combined output. No case improves or regresses;
45 outputs come from phonetic lexical proposals and three from raw RNNT.

| Historical scripted diagnostic | Previous → exact-phone ranking |
| --- | ---: |
| Script word edits / words | **6 / 192 → 6 / 192** |
| Complete exact scripts | 42 / 48 → 42 / 48 |
| Complete exact altered scripts | 14 / 18 → 14 / 18 |
| Canonical instead of altered speech | **1 → 1** |
| Improved / regressed / equal edit counts | 0 / 0 / 48 |

Each of the six non-exact scopes retains one edit: pause indices 1/25, omission
21, repetition 22 and substitutions 7/39. The canonical-instead substitution at
7 remains. There is no 99% result: 6/192 is a **3.125% historical script WER**,
not human-verbatim natural WER or a deployed native word-recognition score.

For completeness only, raw transcript diffs locate/type-match 16/18 planted
operations with 21 total predictions (76.19% precision, 88.89% recall), including
differences on two of 30 negative controls. These are **unchanged transcripts**,
not an improved live mistake detector or a replacement for the prior separate
conservative event-comparison measurement. No metric is pooled into an overall
accuracy percentage. All eight six-case categories retain the prior word edits:
correct/noise/both speeds zero, pause two, omission one, repetition one,
substitution two.

Desktop model inference median/p95 is 90/129 ms. Exact rescoring and parsing
costs **58/89 ms**, versus prior width-32 search plus parsing about 10/15 ms.
These measure different decoder stages and do not establish phone speed, but
the added exact-scoring cost brings no transcript benefit on this screen.
The candidate is **not promoted** or retuned on the same failures. Native,
natural-error, real-following and 99% release qualification remain unestablished.

## Verification and provenance

Five new reranking tests pass, plus five existing full-string CTC and four
denominator tests (14 total). Twenty-seven fictional three-frame distributions
enumerate 1,728 tiny acoustic paths; these verify probability math, not speech
accuracy. Strict standalone TypeScript passes. No new native/app dependency,
build, production deployment, OTA or store upload is implied.

Private complete report:
`output/quran-development/zipformer-comparison/exact-phone-ranking-1792101619708-e2970e59-06cc-473f-a3d5-d07d810341d5.json`.
It retains every original rank/score/string, deduplication mapping, exact score,
selected proposal, raw transcript, script score/fidelity, waveform/posterior
hash, failure and runtime. No audio, weights or private transcripts enter Git.
The RAM source was stopped after completion; port 3011 is closed. OS-managed
memory/caches are outside secure-erasure guarantees.

| New artifact | SHA-256 |
| --- | --- |
| Complete report | `1ccda898a88e0aa4104922f55b763e3b867c317526df8920e88795aedab6dd4a` |
| Exact string reranker | `6bdc67afba88568e948b5a3842aa291e51490497fee0d8d1890c1bdd2492d9d3` |
| Actual evaluator | `1a2bedd058d410fdc4a8dc2f478f8a50ce3afbb2fa74a4146c8e7234c76c33c2` |
| New math tests | `10422d06afb6bc8171652486830fd17c89c83164ad8bb0ea05508b8f8d1bcbb2` |
| Source-only RAM manifest | `df9809e0cd6d2f7d7b44dbbcba2cb7d840211bac9e2006a045a266c3d397b263` |
