# Recite Assist — cross-acoustic event result: no comparison-split gain

15 October 2026. The [fixed rule and all four frozen source pins were declared
before selection](quran-cross-acoustic-corroboration-2026-10-15.md). This is
**zero new waveform inference**, not fresh natural learner gold, native
validation, a changed app recognizer or a release. The requested 99% remains
unverified. No threshold or selector rule was changed after viewing results.

## Complete frozen-score result

All **96 historical controls** were paired and analyzed, with zero missing,
scope/hash/schema/replay/analysis failures. All **192 model predictions and
their original margins reproduce exactly** from retained scores. Every original
PCM hash, sample count, reference, index and category matches its paired model.
No audio was fetched, played, recorded, saved or inferred. These are source-
recorded hash identities, not newly rehashed waveforms.

Both models' reference phone arrays happen to match on all 96 scopes. Their
acoustic scores are nevertheless **not equivalent**: Muaalem uses full PCM,
600 ms settling tail and sound-run duration nuisance; compact v3 uses quiet
compaction, the original longest-unit segmentation and no duration nuisance.
The rule does not average their scores or equate their posteriors, vocabularies,
frontends, model training or likelihood scales.

An event requires both models' same unique non-unchanged winning kind/index,
and at least one model's unchanged original margin pass. Labels enter scoring
only after that decision. Exact kind **and** word index are required for a hit;
every incorrect positive classification remains a false prediction.

| Historical calibration — 48 cases, 18 edits, 30 negatives | Compact v3 | Corroborated |
| --- | ---: | ---: |
| Correct located/type-matched operations | 15/18 | **16/18** |
| Predictions | 15 | 16 |
| Wrong positive classifications / negative alerts | 0 / 0 | 0 / 0 |
| Precision / recall | 100% / 83.33% | 100% / 88.89% |

Only calibration case 22 changes: an existing repeated-word winner, below v3's
fixed margins, gains corroboration from the independent Muaalem winner which
passes its own original margins. Nothing is repaired or filled into a
transcript. The other two calibration misses remain uncertain.

| Other historical controls — 48 cases, 18 edits, 30 negatives | Compact v3 | Corroborated |
| --- | ---: | ---: |
| Correct located/type-matched operations | **13/18** | **13/18** |
| Predictions | 14 | 14 |
| Wrong positive classifications / negative alerts | **1 / 0** | **1 / 0** |
| Precision / recall | **92.86% / 72.22%** | **92.86% / 72.22%** |
| Omission / repetition / substitution hits, six each | 6 / 5 / 2 | 6 / 5 / 2 |

Every decision on the other split is unchanged, including its false
classification. The historical filename `heldout` does not make those previously
inspected controls fresh qualification data. The calibration-only improvement
must not be described as improved held-out/natural accuracy.

Across all 96 reused development controls, corroboration finds 29/36 operations
with 30 predictions, one wrong positive classification and zero negative alerts:
29/30 precision (96.67%) and 29/36 recall (80.56%). Compact v3 has 28/36 hits
with 29 predictions; Muaalem has 31/36 hits with 34 predictions and three wrong
positive classifications. These pooled diagnostics are **not** a real-user
accuracy headline, new word-recognition WER, automatic recitation grade or
99% result. No benchmark denominator, miss or abstention was filtered away.

Decision reasons over all scopes: 65 unchanged-winner abstentions, 30
corroborated events and one pair of below-margin winners. No tie/disagreement
happened in this fixed real-output replay; synthetic tests cover them separately.

**Do not promote this as a qualified detector.** It supplies one calibration
recovery but no comparison-split improvement, retains a false classification and
still misses five of 18 comparison edits. Fresh permissioned speaker-disjoint
natural speech with independently reviewed verbatim/error labels and native
lifecycle/performance validation remain required. Existing model/release flags,
production, OTA and store builds are untouched.

## Evidence limitations and verification

Original per-hypothesis target phone/token IDs are not stored alongside saved
score rows. This audit therefore does not invent path identities or equate
matching numeric rows with the same phonetic path. Four duplicate numeric score
rows remain visible; grouping by **maximum**, never summing or voting, prevents
them inflating acoustic support. `pathIdentityQualified` stays false. Original
generation-time decoder/scorer hashes and duplicate-path safeguards remain
preserved in source provenance, not relabelled as new independent path checks.

Five new contract/math tests pass, including exhaustive checking of **625
fictional score combinations**, score-row duplicate invariance, different
locations/kinds, unchanged/tied/weak winners and invalid trailing data. An
initial fixture meant to represent an unchanged winner accidentally tied its
omission score; only that fixture was corrected before the passing run. No
actual source, threshold or selector was changed. The complete mobile/web/shared
Quran regression run passes **269/269 software checks**; mobile and public-web
typechecks, strict standalone policy/audit/test TypeScript and final diff checks
pass. The root's independent review reproduces aggregate arithmetic and pins.
These checks validate software, not acoustic accuracy, native microphones,
physical-device thermals or release readiness.

Private report (ignored development output):
`output/quran-development/zipformer-comparison/cross-acoustic-corroboration-1792124819823-db367485-d610-4707-883e-26f0e49ee58e.json`.

| Artifact/code | SHA-256 |
| --- | --- |
| Complete all-96 report | `7465fec0cf64f14d79dafc79538a04d7eea987bfc7e48363666e749dceff7284` |
| Unchanged predeclaration document | `c021cf61ccf9843ceaa261d0ceec54f019cb84b17a231975116a1e2abfcb8f9f` |
| Fixed pure corroboration policy | `2f15ff63b09bce0f715aa7ab0cc3d219f6302f4ded7a61e79b18832b00d17bb9` |
| Complete frozen-score audit | `1842d10b6414c9cebb1a185b6f791dd493d05756180ff65aaa117323fced1a22` |
| Contract/math tests | `41395d38e9296fd32adaf4e51240cddad785bc2011ca7f9747d62ad485fe9c48` |
| Unchanged original current comparator | `6141abba3f28e5551a2da507607c9fe46bb3ab5acad5503b58bb71d3318dbdc3` |

Only aggregate diagnostics, code and hashes enter Git. No raw voices, private
transcripts, models, user records, credentials or generated native projects.
Original Quran-Lab NPL-1.2, accepted local-research/no-profit conditions and
upstream Muaalem/Tanzil/quran-transcript attribution remain unchanged. No new
corpus, license gate, account permission, training or voice collection.
