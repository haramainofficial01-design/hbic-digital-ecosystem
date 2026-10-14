# Recite Assist — exact acoustic corroboration does not improve recognition

14 October 2026 follow-up from `ff5b318`. **New fixed selection experiment on
frozen actual-model outputs; do not promote.** No model/app/native/dependency,
production, OTA or store change. 99% real-world recognition remains unverified.

## Hypothesis and predeclared selection

First-complete lexical selection can replace an independently correct raw RNNT
transcript with a worse dictionary-covered candidate. The preceding grouped-
mass rule overcorrected toward raw RNNT and introduced repeated-word failures.
This tests a different fixed decision: prefer **unchanged raw RNNT** only when
its entire normalized word sequence exactly matches a complete unique lexical
proposal in the actual retained acoustic list. Otherwise preserve the previous
first-unique lexical/raw fallback. No fuzzy similarity, per-case threshold,
expected verse, canonical text, script, error category or gold enters selection.

Inputs are the same width-32/top-12 acoustic candidates, duration parser,
incomplete global lexicon and raw full-clip RNNT outputs. All proposals/ranks/
scores are validated, even those after a selected match; ambiguous, partial,
reordered and merely similar words cannot supply corroboration. Original raw
RNNT text is not reconstructed from normalized or canonical Quran words.
Matching acoustic ranks stay visible. Corroboration does not certify accuracy,
pronunciation, independent model errors or microphone word timestamps.

This is **zero new waveform inference**, not newly collected natural speech,
new speakers or a fresh held-out set. It reuses six old prior-success-selected
source groups with approximate splices and pitch-changing controls. Scripts
enter scoring only after selection. Every original waveform/sample pair and
all 192 words are retained, with zero pairing/hash/count/analysis failures.

## Complete result — unchanged edit budget, worse altered speech

| Historical scripted diagnostic | Previous width-32 first-complete | Exact corroboration |
| --- | ---: | ---: |
| Script word edits / words | 6 / 192 | **6 / 192** |
| Complete exact scripts | 42 / 48 | 42 / 48 |
| Complete exact altered scripts | 14 / 18 | **13 / 18** |
| Complete exact unaltered scripts | 28 / 30 | 29 / 30 |
| Canonical text instead of scripted alteration | 1 | 1 |
| Altered word edits / words | 4 / 72 | **5 / 72** |
| Unaltered word edits / words | 2 / 120 | 1 / 120 |

The 3.125% historical script edit rate is **not natural-verbatim WER or real-user
accuracy**. Exactly matching altered transcripts is not error-event precision/
recall. No safe following, 99% detection, Tajweed or native performance claim.

The rule selects corroborated raw RNNT in 32 cases, lexical output in 13 and
uncorroborated raw fallback in three. One case improves, one regresses and 46
have equal edit counts:

- **Index 25 (pause)** improves 1 → 0 errors. Raw RNNT agrees with retained
  acoustic proposals at ranks 3, 6 and 15 instead of the incorrect first parse.
- **Index 15 (substitution)** regresses 0 → 1 errors. Its wrong raw RNNT words
  are corroborated at ranks 4 and 28. Separate recognizers agreeing on words
  still does not establish that those words were spoken faithfully.
- The canonical-instead substitution failure at index 7 remains; no new
  canonical-instead case is introduced. Index 39 also remains wrong because
  the correct raw RNNT sequence lacks a complete matching acoustic proposal.

Thirty-one of the 32 corroborated outputs match these scripts, but that reused
selected subset is **not** a 96.875% real-world accuracy claim, independent
speaker result or a justification for releasing its one wrong substitution.

Each category has six cases:

| Category | Reference words | Previous → new edits | New exact scripts |
| --- | ---: | ---: | ---: |
| Correct | 24 | 0 → 0 | 6 / 6 |
| Pause | 24 | 2 → 1 | 5 / 6 |
| Low noise | 24 | 0 → 0 | 6 / 6 |
| Speed 0.8 (pitch altered) | 24 | 0 → 0 | 6 / 6 |
| Speed 1.2 (pitch altered) | 24 | 0 → 0 | 6 / 6 |
| Approximate omission | 18 | 1 → 1 | 5 / 6 |
| Approximate repetition | 30 | 1 → 1 | 5 / 6 |
| Approximate substitution | 24 | 2 → 3 | **3 / 6** |

Six remaining non-exact cases each have one edit: 1 (pause/raw fallback),
7 (substitution/lexical/canonical instead), 15 (substitution/corroborated raw),
21 (omission/lexical), 22 (repetition/lexical) and 39 (substitution/lexical).
Full private transcript/rank and fidelity diagnostics stay in the ignored
report, not Git. No wrong output is silently repaired, withheld from the
denominator or selected away using its reference.

**Decision: reject as a replacement.** The overall script edit budget does not
improve, altered speech regresses and canonical restoration persists. Do not
tune a rank cap against these same failures or call model agreement confidence.
The experimental search default and live app/web recognizers stay unchanged.
Representative permitted speaker-disjoint natural speech, independently reviewed
verbatim/error labels and native validation remain required, not manufactured.

## Verification and immutable provenance

**58 scoped tests pass**, including five new selector-contract tests: exact
lower-rank support keeps raw text; ambiguity/partial/fuzzy/reordered matches do
not qualify; blank fallback is unchanged; jointly restored canonical text fails
altered-speech fidelity; and every proposal/rank/score is validated. These
fictional fixtures validate policy/safety, not speech accuracy. Strict standalone
TypeScript and final staged diff checks pass. No production imports of this
prototype, extra app build or repeated unchanged speech experiment.

| Artifact/code | SHA-256 |
| --- | --- |
| Frozen actual acoustic candidates | `c7ef5272e7206c9d47ff5b2ff75a00d8f162b31e8a89121cb83078c7294b73a6` |
| Previous combined output | `9cd62bfac02d638bc8d045f72563ded4c6bd8863e493bf4acbadfaa7febd2cca` |
| Frozen independent raw RNNT output | `cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310` |
| Fixed selector | `83f6e11af4232f7173918233c0c67b49dc74500978cd42234edf0868f6a26a50` |
| Frozen-output audit | `0c380da12182beae6b7691a61ec8023768a6d3876c2070e7bcd8ce8093880688` |
| Five new fixture tests | `4cd6a5a2ff2c1f4c9351ea1dfcbb321273586ac0598a8df7be696082c646e6c8` |
| Complete private report | `098070b3ea6531d802278a1d4c336b4949aa15ed64a1d04755b3cec856b9dd5f` |

Private report under `output/quran-development/zipformer-comparison/`:
`rnnt-corroboration-1792012905089-ecc9c2b3-9edf-4875-82e4-dbc3c500c8f8.json`.
It includes unchanged scorer/fidelity-helper hashes. No source output was
overwritten. Only code, aggregate results and hashes enter Git, not recordings,
private transcripts, models, generated native projects, credentials or caches.

Original Quran-Lab NPL-1.2 was read fully and retained for the offline derivative;
no-profit/teacher-warning obligations, NVIDIA/export limitations and original
Tanzil/Quran Transcript attribution stay unchanged. No additional corpus/access,
training, voice inference/upload/storage or HBIC-user recording collection.
The approved benchmark remains evaluation-only. Release readiness is not
established and no production/store action is performed.
