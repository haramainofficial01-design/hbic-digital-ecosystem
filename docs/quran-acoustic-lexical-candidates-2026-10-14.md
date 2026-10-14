# Recite Assist — independent acoustic alternatives and lexical coverage

14 October 2026 follow-up from `904384b`. **New changed-decoder experiment on
the same historical calibration controls, not fresh natural accuracy gold.**
The candidate improves coverage but remains unqualified and is not integrated.
No live app, website, model dependency, production, OTA or store change.

## Fixed experiment

The preceding exact lexical parser could not cover all six substituted scripts
even though their intended canonical forms were present in its partial global
vocabulary. This experiment tests whether alternative independently decoded
acoustic prefixes carry useful missing word evidence. It does not repair phones
using the selected ayah, canonical script, planted edit or gold.

Before examining results, the settings were fixed: v3 int8, input scale 1,
unchanged quiet compaction/original timeline, 600 ms silent settling tail,
CTC prefix width 8/top-12 nonblank frame candidates, and two exact global lexical
parsers (raw phones / explicit lexical duration-run collapse). The same partial
9,980-form vocabulary is retained, derived from 3,364/6,236 verses with 2,872
exclusions. No training, frequency model, phrase grammar, fuzzy filling or
per-case decoder selection was added.

The independent CTC search now exposes its ranked retained prefixes, with their
original pruned path log sums. The existing best-only function returns the same
shape and uses the same decoding choices. These scores/margins are **not
calibrated correctness probabilities**. The lexical policy picks the first
complete unique parse in that acoustic order, or abstains. Every higher-ranked
uncovered/ambiguous prefix remains visible. "Unique" means only within this
incomplete dictionary; skipping uncovered acoustic prefixes can bias toward
canonical vocabulary and hide mistakes. Duration collapse is not Tajweed or
every-boundary preservation.

All 48 source waveform/hash/sample/category/script pairs are checked before
running the candidate. Script scoring happens only **after** independent
proposals return. An additional oracle diagnostic asks whether any of the eight
prefixes has the exact edited script; it is clearly marked unselectable and is
never used by the candidate. This is a bounded coverage diagnostic, not a
deployable decoder, speech accuracy or an upper bound on other approaches.

## Actual results — every case and scripted word retained

The RAM source adapter recreated 12 historical sources / 96 variants with zero
exclusions or failures; only the fixed 48 calibration variants were inferred.
There are six historical source groups in this subset, not 48 fresh independent
speakers. These controls are approximate waveform splices and pitch-changing
speed variants, selected originally from prior recognition successes. Their
scripts are not independently reviewed natural verbatim/error gold.

**48/48 new actual model inferences, zero failures.** All compact PCM hashes,
posterior hashes and greedy phone strings match the frozen previous run. The
improvement is in changed decoding, not model training or changed acoustics.
47/48 rank-one beam phone strings equal greedy strings; the changed one does
not change the aggregate exact lexical counts.

| Historical scripted diagnostic | Raw: rank one → first unique of 8 | Duration: rank one → first unique of 8 |
| --- | ---: | ---: |
| Cases / scripted words | 48 / 192 | 48 / 192 |
| Complete unique proposals | 17 → 31 | 30 → 35 |
| Whole-scope abstentions | 31 → 17 | 18 → 13 |
| Full-script exact sequences | 16 → 30 | 28 → 33 |
| Exact altered sequences | **1/18 → 7/18** | **4/18 → 9/18** |
| Exact unaltered sequences | 15/30 → 23/30 | 24/30 → 24/30 |
| Word edits, including every abstention | 124/192 → 67/192 | 74/192 → 52/192 |
| Exact altered script present anywhere in 8 (oracle ONLY) | 7/18 | 9/18 |
| Canonical instead of altered complete selected scripts | 0 | 0 |

The duration candidate's 52/192 (27.0833%) scripted edit diagnostic counts
abstentions as missing transcripts. It is neither natural WER nor event
precision/recall, and does **not** reach 99%. Reporting only 33/35 exact selected
proposals would hide 13 abstentions. Zero complete canonical-restoration cases
here does not establish protection against restoration in real learner speech.

Each category contains six controls. First-unique policy results:

| Category | Scripted words | Raw exact / edits | Duration exact / edits |
| --- | ---: | ---: | ---: |
| Correct | 24 | 5/6 / 4 | 5/6 / 4 |
| Pause | 24 | 4/6 / 8 | 4/6 / 5 |
| Low noise | 24 | 5/6 / 4 | 5/6 / 4 |
| Speed 0.8 (pitch altered) | 24 | 4/6 / 8 | 5/6 / 4 |
| Speed 1.2 (pitch altered) | 24 | 5/6 / 4 | 5/6 / 4 |
| Approximate omission | 18 | 3/6 / 8 | 4/6 / 5 |
| Approximate repetition | 30 | 2/6 / 16 | 3/6 / 11 |
| Approximate substitution | 24 | **2/6 / 15** | **2/6 / 15** |

Four of six substitutions remain uncovered in both modes. One repetition
(index 22) produces a unique but non-exact sequence with one edit in four words.
Duration mode also keeps a non-exact rank-one pause sequence (index 25, one edit
in four words), although a rank-three sequence agrees with its script. Gold
cannot be used to pick that lower-ranked answer. Its oracle total is 34/48,
versus 33/48 from the actual fixed policy; the extra case is not a recognition
success. Duration mode retains three ambiguous alternative prefixes; none is
accepted as a unique proposal.

Selected rank counts: raw rank 1/2/3/4/5 = 17/11/1/1/1 with 17 abstentions;
duration rank 1/2/4 = 30/4/1 with 13 abstentions. Each proposal retains its
original score/rank/drop and all alternative statuses. No gap is presented as
confidence or a word-level timestamp. Desktop inference p50/p95 is
86.044209/125.493125 ms; search plus both lexical parsers is
3.451542/4.651500 ms. These are diagnostic Mac timings, not native microphone,
thermal/battery/ANE, real-time following or a production speed qualification.

**Decision:** retain as an offline research improvement, not a replacement
recognizer or automatic correction feature. Eight acoustic alternatives recover
some altered words but still lack complete coverage and reliable selection.
Do not repeat the unchanged decoder on another inspected split just for
activity. Natural speaker-disjoint, independently reviewed error evidence and
native validation remain necessary; 99% remains unverified.

## Failures, verification and privacy

The first startup stopped **before any control inference**: the RAM endpoint
expresses positive controls as `expected !== null`, not a `positive` property.
The script initially compared the absent property with the frozen flag. Its
0-analyzed/1-failure report remains preserved, with aggregate metrics null.
The adapter now verifies the explicit expected category and matching frozen
positive flag, rather than relaxing waveform/script/hash requirements. The
subsequent complete report does not erase this startup failure.

**35 scoped tests pass**, including five new checks for complete N-best path
sums/ranks, best-only API parity, ties, blanks/repeats, ranked lexical selection,
retained ambiguity/abstention and malformed inputs. Exhaustive enumeration of
27 tiny CTC paths validates math, not speech recognition. Strict TypeScript and
diff checks pass. These isolated scripts are not imported by app/web production
code; unnecessary native/store builds were not created.

Quran-Lab NPL-1.2 was read fully and remains beside the isolated prototype;
accepted no-profit/local-research conditions are unchanged. The existing lexicon
retains Tanzil CC BY 3.0 unchanged-source attribution and `quran-transcript`
0.6.4 MIT derivation. No evaluation-only benchmark training or redistribution,
new gate access, account permission, paid service or browser credential use.
Public permitted control audio was processed locally in RAM/private pipes, not
intentionally stored as audio files or uploaded to inference services. Private
derived outputs remain ignored. The owned RAM server PID 54643 was stopped,
with its signal handler clearing retained PCM; port 3011 is no longer listening.
This is not a guarantee of secure erasure from OS-managed memory/caches.

## Immutable evidence

| Artifact/code | SHA-256 |
| --- | --- |
| Existing global partial lexicon | `262736fca4c16f924fbccb1b66ec133b23a735c9ddb3d139657461f84d5057c4` |
| Frozen prior v3 phonetic/posterior identities | `00906711e6bc7dcba73529ca99cfeb900b80878728d5a823066f4794d654be89` |
| Frozen scripts and waveform identities | `cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310` |
| Original v3 int8 model | `6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb` |
| Source-only RAM report | `9c285bf6ee76f2ed1802620b8dfb3090ba044818b84f2e631193e6e1ee5f9ce0` |
| Initial failed startup report | `682b59a013a2495b4be185093714c03c5c35249d24a8d0619f44b3d6d5a00bda` |
| Completed candidate report | `5b1407cabae9c266b79471828569d05c23fb7295d01da094946a16c8a2d7d531` |
| Ranked acoustic helper | `ab04d7c15c7d70c42d48ec70e8996e7fed8d7e7f5a9a6a41dd2d5fe852702ed2` |
| Ranked lexical policy | `ec802652d2ca844ee06b8da0deb4be09583d8b4ae9f3aaa87286df9676743cf4` |
| Evaluation adapter | `bbcbc7781df047d9460e3c319fff8ddf062cad0c3455b2e01a9c34183e9f7b61` |
| Acoustic tests | `3946efa3b5895f24b3645b24d8b87f43d16e9706caa67f3f5477f6541c4da91c` |
| Lexical-policy tests | `73c7c4ef5370377259f4ef0c352648f23d82b4a52f23c95daccba6bfc74d3a6e` |

Ignored evidence paths under `output/quran-development/`:

- `qualification/lexical-nbest-ram-source-20261014.json`
- `zipformer-comparison/lexical-nbest-calibration-1791988695258-f8afb9ab-d7a3-4668-8445-6b87db53c0c6.json` (failed)
- `zipformer-comparison/lexical-nbest-calibration-1791988724075-499c571d-b894-45f9-aaa9-38844fdc9bdb.json` (complete)

Full outputs, all alternatives/failures/denominators, and exact pipeline hashes
are preserved locally. No audio, model weights, private transcript, student
record, credentials or generated native project is committed. Release readiness
remains separate from this research improvement and from actual deployment.
