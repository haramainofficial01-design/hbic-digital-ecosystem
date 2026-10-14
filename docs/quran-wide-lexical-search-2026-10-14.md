# Recite Assist — wider acoustic search: gains and restoration failure

14 October 2026 follow-up from `40effe6`. **One changed acoustic-search
experiment on the same historical calibration controls. Wider candidate not
promoted.** No application/native dependency, production, OTA or store change;
99% natural recognition/error qualification remains unverified.

## Fixed change and unchanged inputs

The previous width-eight combined recognizer has nine scripted word edits and
eight non-exact scopes. Its post-selection oracle still misses some alterations,
so this experiment tests whether early acoustic prefix pruning removes useful
independent alternatives. The sole search change is **width 8 → 32**, retaining
the same top-12 nonblank candidates per frame. No selected ayah, script, gold,
grammar, frequency, reference prompt or fuzzy phone repair enters recognition.

The v3 int8 model, scale 1, quiet compaction/original timeline, 600 ms settling
tail, incomplete global 9,980-form lexicon and raw/duration lexical parsers are
unchanged. The primary combined pipeline uses the same rule: select the first
complete unique duration-mode parse in actual acoustic rank, or use the frozen
independent raw RNNT output unchanged. Raw lexical mode remains a separately
disclosed diagnostic; it is not selected per case to improve the score.

An explicit bounded CLI accepts only one width, 8 (unchanged default) or 32.
It rejects sweeps, intermediate/unbounded values and extra arguments before
asset/model/audio startup. The combined audit accepts an explicitly SHA-pinned
local report, verifies width 8/32, and preserves its old default input. This is
development-only configuration, not a runtime flag or a release change.

The RAM adapter recreates 12 historical sources / 96 variants with zero
exclusions/failures. All 48 calibration waveform/hash/sample/category/script
pairs are checked before the changed candidate runs. **48/48 new actual v3
inferences, zero failures**; all compact PCM hashes, posterior hashes and greedy
phone strings match the frozen width-eight source. Only search changes. RNNT
is explicitly frozen-output replay, not a new 48-clip RNNT run.

These are six historical calibration source groups, prior-success selected
and approximately spliced/pitch-resampled, not fresh independent learner
speakers or double-reviewed natural error gold. No inspected split is relabelled
fresh held-out and no evaluation-only Quran-Lab audio is used for training.

## Primary combined result — all 48 cases / 192 words retained

| Historical scripted diagnostic | Width 8 | Width 32 |
| --- | ---: | ---: |
| Script word edits / reference words | 9 / 192 | **6 / 192** |
| Complete exact scripts | 40 / 48 | **42 / 48** |
| Complete exact altered scripts | 12 / 18 | **14 / 18** |
| Complete exact unaltered scripts | 28 / 30 | 28 / 30 |
| Complete canonical text instead of scripted alteration | 0 | **1** |
| Selected phonetic / raw RNNT outputs | 35 / 13 | 45 / 3 |

The six edits correspond to a 3.125% historical **script WER**, not natural
verbatim word recognition or correction accuracy. Every scripted word remains
in the denominator. The 14/18 exact altered strings are not live event
precision/recall. No dropped scope, partial string, restored reference text or
selected agreement subset is credited as successful recognition.

Each category has six controls:

| Category | Reference words | Width 8 → 32 edits | Width-32 complete exact scripts |
| --- | ---: | ---: | ---: |
| Correct | 24 | 0 → 0 | 6 / 6 |
| Pause | 24 | 2 → 2 | 4 / 6 |
| Low noise | 24 | 0 → 0 | 6 / 6 |
| Speed 0.8 (pitch altered) | 24 | 0 → 0 | 6 / 6 |
| Speed 1.2 (pitch altered) | 24 | 0 → 0 | 6 / 6 |
| Approximate omission | 18 | 3 → 1 | 5 / 6 |
| Approximate repetition | 30 | 2 → 1 | 5 / 6 |
| Approximate substitution | 24 | 2 → 2 | **4 / 6** |

The paired edit budgets improve on four scopes (indices 5, 21, 46 and 47),
regress on **one** (39), and remain equal on 43. The new regression is a
substitution previously recognized exactly by RNNT; a rank-12 lexical proposal
now has one script edit. Recovered omission proposals at indices 5/21 occur at
rank 30 (index 21 still has an edit), repetition recovery at 46 at rank 20,
and substitution recovery at 47 at rank 12. Rank is not a correctness score.

**A separate safety regression is hidden by equal scalar WER:** index 7 was
already non-exact, but its new rank-28 lexical proposal now agrees with the
intended canonical verse instead of the substituted script. Both before/after
have one edit, so the ordinary regression list would miss this change. The
paired audit now reports canonical-instead regressions explicitly. These are
post-recognition scripted diagnostics, not proof of a model's internal intent
or a teacher's natural-error judgement. No per-case gold choice is used to fix
the regression, and the failing scope is never removed.

Six scopes remain non-exact, each with one edit: indices 1 (pause), 7
(substitution/canonical instead), 21 (omission), 22 (repetition), 25 (pause)
and 39 (substitution/new edit regression). Waveform/sample identities, chosen
source/rank, script denominators and fidelity classifications remain in the
private completed report. The earlier clean pause regression at 25 remains.

## Acoustic coverage and cost stay separate from qualification

The standalone duration parser's complete unique proposals increase 35 → 45,
abstentions 13 → 3, and scripted edits including abstentions 52 → 18; complete
altered scripts increase 9/18 → 12/18. Standalone raw-phone parsing increases
31 → 40 unique proposals, with 67 → 38 edits and 7/18 → 10/18 exact altered
scripts. These are not the combined pipeline's score or pronunciation grades.

Thirty complete model-output agreements happen to match the scripts here, but
agreement is not used for selection, not an independence guarantee, and not
100% accuracy. A post-selection oracle across the two full source transcripts
can obtain 44/48 exact scripts, 15/18 exact altered scopes and 4/192 minimum
edits. That requires gold unavailable to the selector; it is **not** a real
decoder or achieved target, and even this diagnostic exceeds 1% script WER.

Desktop inference p50/p95 is 86.044209/125.493125 ms (old) versus
81.440750/123.868792 ms (new), normal diagnostic timing variation with identical
posteriors—not a claimed inference speedup. Search plus both lexical parsers
rises from **3.451542/4.651500 ms to 10.468583/15.390000 ms**. Median search cost
is about three times greater. These are Mac CPU diagnostics, not phone-native
microphone latency, thermals, battery or ANE qualification. No live timestamps,
error precision/recall or real-device lifecycle claim is made.

**Decision: do not promote the wider candidate.** More dictionary-covered
alternatives improve the edit budget but can hide an actual substituted word
and introduce a formerly absent recognition error. The old width-eight default
remains unchanged; both experimental pipelines remain unqualified. Future work
must address lexical/acoustic reliability, not simply widen the beam or accept
the first canonical-looking parse. Representative permitted speaker-disjoint
natural speech with independently reviewed verbatim/error labels and native
validation remain necessary. This run does not repeat those missing approvals
or infer permission to collect users' recordings.

## Verification and immutable provenance

**47 scoped tests pass**, including three new guards: the explicit default/
width bounds, preservation of actual rank 32, and a synthetic equal-edit-count
case which nevertheless newly restores canonical text instead of an alteration.
Fixtures validate math/contracts, not speech accuracy. An actual negative CLI
check with width 99 fails before model/audio startup as expected, not as a
failed speech inference. Strict TypeScript and final diff checks pass. Paired
audits verify all 48 compact PCM/posterior/greedy pairs and every denominator
with zero hash/count/analysis failures. No native/app build was repeated for
offline-only scripts not imported by production app/web code.

| Artifact/code | SHA-256 |
| --- | --- |
| Old width-eight acoustic outputs | `5b1407cabae9c266b79471828569d05c23fb7295d01da094946a16c8a2d7d531` |
| Old width-eight combined outputs | `d7dccf073cf569c91fc5ace9da162de88f54f3a238e233dd5ef08e35b37a1888` |
| New width-32 acoustic outputs | `c7ef5272e7206c9d47ff5b2ff75a00d8f162b31e8a89121cb83078c7294b73a6` |
| New width-32 combined outputs | `9cd62bfac02d638bc8d045f72563ded4c6bd8863e493bf4acbadfaa7febd2cca` |
| RAM source-only report | `9c285bf6ee76f2ed1802620b8dfb3090ba044818b84f2e631193e6e1ee5f9ce0` |
| Explicit search configuration / lexical policy | `4bf135c84e174c8ca66dc96d9cb2ec59d1592cb070cbe8e79f74046c1745c503` |
| Actual candidate evaluator | `27a7de7bb8231da68ffc2cfe35a13f40ad78811cb91a8dd9a0be3758c4a7d737` |
| Combined frozen-output audit | `5861d06ee320ae1adcf6db79f76669889c1de982df02445f7b636f0c5ef8402c` |
| Final paired audit with restoration regression field | `6caf4e77848e5e9e9448947b5f1b48c7c2e36be7bcb519fe5d816321e4ec18cc` |
| Final paired aggregate stdout including newline | `5aec6dcffc1c2d2f5e9010a81fcf31da60d389de56d5ab14b980ecd4cdac900c` |
| Width/rank tests | `dc21abb263661f05cfc1201188dfde9760bb2e53f305cb6287345be975e0fd34` |
| Fidelity tests with equal-edit restoration case | `65377d2e34cb3cfd5feec505d73e0c0c880726fe1dfca0ff3b48e51973971cbf` |

Ignored reports under `output/quran-development/`:

- `qualification/wide-lexical-ram-source-20261014-1712.json`
- `zipformer-comparison/lexical-nbest-calibration-1791998237198-81e00510-4582-4632-abba-ea18d3a750be.json`
- `zipformer-comparison/lexical-rnnt-fallback-1791998301452-28ce073c-9806-4349-85c3-b0d4213fc7ad.json`

All artifacts/failures/denominators stay preserved; no old report is rewritten.
Only aggregates/hashes/code enter Git, not voices, private transcripts, secrets,
records, weights or caches. The owned RAM server PID 56208 was verified and
stopped; its signal handler clears retained PCM and port 3011 is no longer
listening. OS-managed buffers/caches are outside secure-erasure guarantees.
Audio used only local RAM/private pipes, with no intentional audio-file writes
or voice uploads. The existing models were verified, not redownloaded.

Original Quran-Lab NPL-1.2 was read fully and retained; accepted local-research/
no-profit conditions, original NVIDIA/export limitations and upstream Tanzil/
Quran Transcript attribution remain unchanged. No new corpus, license gate,
account permission, paid service, training, voice collection, foreground screen
change or unrelated cleanup. Production, OTA and stores remain untouched.
