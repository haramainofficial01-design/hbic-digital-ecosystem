# Recite Assist — retain partial evidence without filling uncertain sounds

14 October 2026 follow-up from `bfb3f2d`. **Offline new-decoder replay of frozen
actual acoustic outputs, not new inference, natural gold or a 99% result.**
No production/app/web integration, native dependency, OTA or store change.

## Why this change

The previous candidate discarded 13/48 duration-mode scopes wholesale because
it could not find a complete unique lexical sequence in eight independent
acoustic prefixes. A single unmatched phone may cause surrounding independently
decoded evidence to be lost. Simply replacing unmatched sounds with expected
Quran words would conceal mistakes; treating a partial string as a complete
transcript could also generate false skipped-word feedback.

This experiment instead retains mandatory lexical anchors and **explicit
unresolved phonetic spans**. Only the unchanged global partial vocabulary and
rank-one independent phonetic output enter parsing, never the selected ayah,
canonical words, planted operation, script or gold. The existing 9,980-form
vocabulary is still incomplete. Duration collapse remains an explicit lexical
nuisance experiment, not Tajweed or preservation of every word boundary.

## Bounded exact consensus

Each known word/phone span forms a zero-cost edge in a directed acyclic graph;
an unmatched phone forms a cost-one edge. Forward/backward minimum-cost totals
and exact integer path counts retain **only word/span edges present in every
minimum-uncovered-phone parse**. Duplicate normalized forms add no vote.
Competing homophones/boundaries are not resolved by frequency, shortest words,
selected scripture, arbitrary tie-breaking or post-hoc gold.

Unknown or ambiguous spans remain visible and may contain an unknown number of
words. "Mandatory" means consensus within these dictionary parses, **not
acoustic confidence or audible correctness**. Coverage can still bias toward
dictionary words. No audio timestamps, missing-word counts or correctness
probabilities are produced. Explicit flags remain `fullTranscriptQualified:
false`, `wordRecognitionQualified: false`, `safeForMistakeTracking: false` and
`missingWordCountQualified: false`, including for complete lexical parses.

Bounds: 20,000 forms, 250,000 trie nodes, 1,000 decoded characters and 200,000
parse edges. Path counts do not enumerate an exponential collection of parses.
Known anchors have non-overlapping phonetic-character offsets, not verified
word/audio coordinates. The algorithm rejects invalid graph accounting.

Two policies were fixed before script scoring:

- Parse rank one only, retaining anchors plus explicit gaps.
- Preserve the preceding first-unique complete proposal when available;
  otherwise expose rank-one partial anchors plus gaps. No gold enters this
  fallback or changes its acoustic rank.

Partial retained word strings are joined **only for a separate diagnostic
script comparison**. All 192 reference words stay in that denominator; missing
words remain edits. This is not a full speech transcript or qualified WER.
Unresolved sounds could represent other words, errors or extra speech even when
the retained string happens to agree with the written script. Partial strings
must never be passed to live omission/completion logic without their gaps.

## Frozen-output result — 48/48 processed, zero analysis failures

All waveform/hash/sample/category/script pairs match the frozen baseline. These
are the same six historical source groups with approximate spliced controls,
prior-success selection bias and pitch-changing speed variants, not fresh
speaker-disjoint natural recitations or independently reviewed error gold.
No recording was downloaded, played, recorded or inferred in this turn.

| Fixed complete-proposal fallback diagnostic | Raw phones | Duration handling |
| --- | ---: | ---: |
| Cases / scripted reference words | 48 / 192 | 48 / 192 |
| Previous all-or-nothing script edits | 67 / 192 | 52 / 192 |
| Retained-word-string diagnostic edits | 20 / 192 | 13 / 192 |
| Complete proposals retained | 31 | 35 |
| Partial scopes with explicit unresolved spans | **17** | **13** |
| Scopes with no retained words | 0 | 0 |
| Complete exact scripts, unchanged | 30 / 48 | 33 / 48 |
| Complete exact altered scripts, unchanged | **7 / 18** | **9 / 18** |
| Partial strings agreeing with script despite unresolved sounds | 3 | **5** |
| Improved / regressed / unchanged script edit budgets | 17 / 0 / 31 | 13 / 0 / 35 |

Retaining anchors avoids discarding all words in the previously uncovered
scopes, but **does not increase complete altered-sequence recognition**. In
duration mode the 13/192 partial-string diagnostic has eight unresolved altered
scopes, five unresolved unaltered scopes, and two incorrect complete proposals.
The five partial strings agreeing with the script are not complete successes.
Do not report `(192 - 13)/192` as certified recognition accuracy or infer that
these incomplete transcripts safely detect learner mistakes.

Duration fallback categories (six cases each):

| Category | Script words | Before → retained-word diagnostic edits | Complete exact scripts |
| --- | ---: | ---: | ---: |
| Correct | 24 | 4 → 0 | 5 / 6 |
| Pause | 24 | 5 → 1 | 4 / 6 |
| Low noise | 24 | 4 → 0 | 5 / 6 |
| Speed 0.8 (pitch altered) | 24 | 4 → 0 | 5 / 6 |
| Speed 1.2 (pitch altered) | 24 | 4 → 0 | 5 / 6 |
| Approximate omission | 18 | 5 → 2 | 4 / 6 |
| Approximate repetition | 30 | 11 → 3 | 3 / 6 |
| Approximate substitution | 24 | 15 → 7 | **2 / 6** |

Raw rank-one-only partial parsing retains 17 complete / 31 partial scopes with
29/192 diagnostic edits; duration rank-one-only retains 30 complete / 18 partial
scopes with 16/192 edits. Their minimum uncovered phones / unresolved phones are
247/253 and 82/82 respectively. The raw difference preserves ambiguous covered
phones rather than pretending dictionary coverage implies an agreed word.
Phone gaps are not learner word-error labels or pronunciation judgements.

**Decision:** retain as an offline partial-evidence research improvement. It is
not a recognizer replacement or a release-ready correctness/following feature.
Natural word recognition, skipped/substituted/repeated-word precision/recall,
live timing and native lifecycle/thermal checks remain separate and unqualified.
Fresh permitted, speaker-disjoint natural speech with independently reviewed
verbatim and error labels is still required to demonstrate the requested 99%.

## Verification and preserved evidence

**40 scoped tests pass**, including five new consensus/bounds tests. A complete
enumeration of all possible dictionary/gap paths for 363 tiny fictional phone
strings independently checks mandatory edges, minimum uncovered costs and path
ambiguity. Other tests cover explicit gaps, homophones/competing boundaries,
duplicate forms, repeated multi-phone words, silence and malformed bounds.
These fixtures validate math/contracts, not speech accuracy. Strict TypeScript
and diff checks pass; production app/native builds are unnecessary for isolated
offline scripts not imported by the app or website.

The first new fixture run had one mistaken expectation of the existing Arabic
normalizer (`ة` is normalized to `ه`). Only that test expectation was corrected;
the shared normalizer and actual outputs were not changed. Final tests pass.
The initial completed audit and the final audit after adding explicit per-
proposal non-qualification/tracking flags are both preserved. Their numerical
results agree; this is final contract verification, not fresh data or inference.
A trailing-space diff-check failure was fixed afterward without changing any
operation. Reports retain their original generation-time code hashes; the final
format-only adapter hash is listed separately. Final diff checks pass.

| Artifact/code | SHA-256 |
| --- | --- |
| Frozen actual candidate report | `5b1407cabae9c266b79471828569d05c23fb7295d01da094946a16c8a2d7d531` |
| Existing global partial vocabulary | `262736fca4c16f924fbccb1b66ec133b23a735c9ddb3d139657461f84d5057c4` |
| Frozen waveform/script scopes | `cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310` |
| Initial new-decoder audit | `11169cc845afcf2c8f20eae8e7c6cdb4d9651e99a1b82dc5af861813eb747244` |
| Final non-qualification-contract audit | `9f55a779a044164ce4ccf654f102a07aec895cb0a6ab794b3aafa07aba467220` |
| New partial consensus decoder | `c15c409c55db8bdf6ec78de75cadc5a2bf74157dd28e23d362321815e2496a2e` |
| Frozen-input audit adapter at report generation | `5ed30a5d6b53baf2dcd84a2c27a092cef2b5a6b0b81832e41a04113ed5bf0a48` |
| Final format-only adapter | `f93e79b154e6f86220013f52914676d04c8c3f3b7c1a227e73d68bfcdae7dbaa` |
| Existing script scorer | `096fb80db36ffb88146366a6355d30742f1520d1fef50be7f6d69fdce359d2c0` |
| New consensus tests | `e7fa5e221802953a857c632418947f83724c4ca791115479f7523bdf53ca47d7` |

Ignored reports under `output/quran-development/zipformer-comparison/`:

- `partial-consensus-1791993609902-403d29f4-fe7d-4ed4-a857-b2748a5c59c0.json`
- `partial-consensus-1791993677806-8784bfde-34c5-4659-8020-b402732bfbb5.json`

Each retains all proposals, gaps, case denominators, input/code hashes and
comparison counts. Only aggregate evidence/code enters Git. No voices, private
transcripts, credentials, student records, model weights or local caches are
committed. The original Quran-Lab NPL-1.2 was read fully and retained; the
accepted local-research/no-profit conditions and Tanzil CC BY 3.0 / Quran
Transcript MIT source attribution remain unchanged. No additional dataset,
license approval, account permission, paid service, training or audio access.
No foreground app changes, cleanup, production deployment or store submission.
