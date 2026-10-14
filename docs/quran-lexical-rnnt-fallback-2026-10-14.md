# Recite Assist — fixed phonetic / raw-word-recognizer fallback

14 October 2026 follow-up from `466e49b`. **New fixed selection-pipeline
experiment on frozen actual recognition outputs, not new inference or fresh
natural accuracy gold.** All live features, releases and native dependencies
remain unchanged. The requested 99% is not demonstrated.

## Fixed candidate, no reference-directed selection

The prior phonetic candidate preserves only 9/18 complete altered scripts and
abstains on 13/48 whole scopes. Keeping partial anchors avoids losing evidence
but does not turn gaps into recognized words. Separately, the independent raw
NVIDIA RNNT output is better on unaltered speech but often fails alterations.

This experiment tests one rule fixed before scoring: use the first complete
unique global-lexicon proposal from the existing duration-mode acoustic ranking;
if no such proposal exists, use the independent **raw RNNT transcript unchanged**.
The selector accepts only these two recognizer outputs. Expected verses, script,
category, gold, word agreement and error scores are not inputs. Partial anchors
are rejected as complete proposals; no unresolved gap is silently removed.
No reference prompt, canonical fill, best-per-case script choice, phrase model,
training or new waveform/frontend experiment was added.

The existing phonetic pipeline still uses width 8/top-12 acoustic tokens,
quiet compaction, scale 1, a 600 ms settling tail and the incomplete 9,980-form
global vocabulary. A complete unique dictionary parse may still be wrong or
biased toward expected Quran words. The RNNT source is the independent full-PCM
whole-clip greedy output. Their original PCM hashes/sample counts match, but
their disclosed frontends differ. These are distinct decoded architectures,
**not proven statistically independent errors or disjoint training corpora**.
Neither source provides qualified word timestamps, correctness confidence or
native performance in this experiment.

## Complete frozen-output evaluation

Both reports are pinned by SHA-256 and must be complete with all 48 cases and
zero inference failures. Original checkpoint/export hashes, scopes, waveform
identities, categories and original scripted word counts are checked. All old
script edit counts reproduce unchanged. Only then does the fixed selector run;
script/fidelity comparison occurs afterward. Every case and all 192 reference
words remain in the new diagnostic denominator.

There are six historically inspected, prior-success-selected source groups with
approximate splices and pitch-changing speed variants, not 48 fresh independent
learner speakers or double-reviewed natural word/error labels. The RNNT file
retains its original generation-time pipeline hashes; the later original-
frontend correction separately demonstrated identical transcripts on all 48
waveforms. No historical artifact is rewritten or represented as new inference.

| Historical script-only diagnostic | Raw RNNT | Complete phonetic candidate | Fixed fallback |
| --- | ---: | ---: | ---: |
| Cases / scripted reference words | 48 / 192 | 48 / 192 | 48 / 192 |
| Script word edits (all scopes retained) | 16 / 192 | 52 / 192 | **9 / 192** |
| Complete exact scripts | 34 / 48 | 33 / 48 | **40 / 48** |
| Complete exact altered scripts | 5 / 18 | 9 / 18 | **12 / 18** |
| Complete exact unaltered scripts | 29 / 30 | 24 / 30 | **28 / 30** |
| Canonical script returned instead of an alteration | 4 | 0 | 0 |

The fixed fallback selects 35 complete phonetic proposals and 13 raw RNNT
outputs. Versus RNNT alone, seven case edit budgets improve, **one regresses**,
and 40 are unchanged. The nine word edits are a 4.6875% historical **script WER**,
not human-verbatim natural recognition or a 99% result. This is separate from
the preceding 13/192 *partial-string* diagnostic: the new rule returns whole
source transcripts, not partial strings with hidden gaps.

Each category has six controls:

| Category | Reference words | RNNT → fallback edits | Complete exact fallback scripts |
| --- | ---: | ---: | ---: |
| Correct | 24 | 0 → 0 | 6 / 6 |
| Pause | 24 | **1 → 2** | **4 / 6** |
| Low noise | 24 | 0 → 0 | 6 / 6 |
| Speed 0.8 (pitch altered) | 24 | 0 → 0 | 6 / 6 |
| Speed 1.2 (pitch altered) | 24 | 0 → 0 | 6 / 6 |
| Approximate omission | 18 | 6 → 3 | 4 / 6 |
| Approximate repetition | 30 | 5 → 2 | 4 / 6 |
| Approximate substitution | 24 | 4 → 2 | 4 / 6 |

Eight non-exact complete sequences remain: indices 1 (pause, one edit), 5
(omission, one), 7 (substitution, one), 21 (omission, two), 22 (repetition, one),
25 (pause, one), 46 (repetition, one) and 47 (substitution, one). Each original
hash/sample count/source choice/script denominator is preserved in the private
report. These categories identify planted controls, **not independently labelled
natural word-error types or verified word coordinates**.

The regression is index 25: RNNT previously matched its four-word script, while
the selected rank-one complete phonetic proposal has one edit. Index 22 keeps
a wrong rank-one phonetic proposal with the same edit count as RNNT. Do not fix
these cases by consulting their scripts or silently preferring the correct
output after evaluation. Two omission, two repetition, two substitution and two
pause cases remain non-exact. Zero complete canonical-instead outputs in this
small experiment does not prove real-learner anti-restoration reliability.

## Agreement and complementarity are diagnostics only

The two normalized complete outputs agree on 26 scopes (24 unaltered, two
altered), and all those strings agree with the scripts here. This is not 100%
recognition, an independent-speaker guarantee or a safe correctness threshold;
selecting only those scopes would discard 22 cases. Agreement is never used by
the fixed selector. A synthetic regression demonstrates that a complete
canonical-looking chosen output can still erase an actual scripted alteration.

A post-selection oracle chooses a script-exact source if either is exact: it
finds 41/48 exact scopes, 12/18 altered scopes and a minimum of 8/192 word edits.
That requires unavailable gold at selection time and is **not an implemented
decoder or achieved accuracy**. Even this diagnostic does not meet <=1% script
WER. It indicates remaining recognition failures, not just a source-selection
problem. No live event precision/recall, latency or native confidence is inferred;
those fields remain null/false rather than fabricated from whole-clip strings.

**Decision:** retain as an offline combined-recognition research candidate, not
as a released detector. It improves complete altered-speech fidelity on these
old controls but has a clean-speech regression, unresolved lexical errors and
no qualified live following/native evidence. Do not run the unchanged selector
on more inspected clips just for activity or claim 99% from this calibration.
Representative permitted speaker-disjoint natural speech with independently
reviewed verbatim/error labels and native lifecycle/thermal checks remain
required; no new permission or recording collection is implied.

## Verification, exact provenance and privacy

**44 scoped tests pass**, including four new tests for fixed selection,
unchanged raw strings/empty output, canonical-instead fidelity failure and
rejection of partial/inconsistent/unbounded proposals. Tests are contract
fixtures, not speech measurements. Strict TypeScript checks pass. The completed
audit processes 48/48 pairs with zero hash/count/metric/analysis failures. Diff
checks pass. Isolated scripts are not imported by app/web production code, so
no unchanged app/native build or store artifact was created.

| Artifact/code | SHA-256 |
| --- | --- |
| Frozen phonetic candidates | `5b1407cabae9c266b79471828569d05c23fb7295d01da094946a16c8a2d7d531` |
| Frozen raw RNNT whole-clip outputs | `cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310` |
| Original approved phonetic int8 model | `6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb` |
| Original NVIDIA checkpoint | `d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31` |
| Community NVIDIA encoder export | `a74e77489a9e48d689bac080a30c5e54b35e5f54171273771dba9c72752eade3` |
| New fixed selection policy | `a16df8c3ec012a8a62ebb912a99a77eac0626c2cba4785d2bd9802edf81bc913` |
| New frozen-output audit | `a521f05a2b7bd52e95bae3464be4149684f4137b6acbb1569f36773a6df0aef1` |
| Existing word scorer | `096fb80db36ffb88146366a6355d30742f1520d1fef50be7f6d69fdce359d2c0` |
| Existing fidelity comparator | `cf6fffdd308a21d9c2e7e3414fc15a88369ecc41cd8d1b22e4b829ee674cc778` |
| New selection tests | `98f6e8f57ee0795012b3c7af273992c73e6d34c0b1bdca9fc7df7dd9f426bb37` |
| New private complete report | `d7dccf073cf569c91fc5ace9da162de88f54f3a238e233dd5ef08e35b37a1888` |

Ignored report:
`output/quran-development/zipformer-comparison/lexical-rnnt-fallback-1791994164481-07977ab0-da16-421d-bc7c-5c691afb6eaa.json`.
It retains every selected transcript, source, failure, metric and original
identity; only aggregates/hashes/code enter Git. Input reports remain untouched.

The retained Quran-Lab NPL-1.2 was read fully; accepted no-profit/local-research
conditions are unchanged. Original NVIDIA CC BY 4.0 / export limitations and
Tanzil CC BY 3.0 / Quran Transcript MIT attribution remain in the existing
source evidence; no models are redistributed. No evaluation-only training,
voice access/storage/uploads, new service/fees/account permissions, credentials,
user-recording collection, foreground changes or unrelated cleanup. No native
deployment, production/OTA or store upload/submission. Release readiness is
unqualified and separate from a pushed research improvement.
