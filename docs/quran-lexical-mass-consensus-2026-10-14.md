# Recite Assist — retained acoustic mass selection rejected

14 October 2026 follow-up from `3e3dbd6`. **New fixed selection rule on frozen
actual-model outputs; recognition regresses. Do not promote.** No app, website,
native, production, OTA or store change. The 99% target remains unverified.

## Hypothesis and fixed rule

The preceding width-32 first-complete lexical selector reduced script edits but
hid a substituted word behind a low-ranked canonical proposal. This experiment
keeps evidence the dictionary cannot explain instead of skipping it in search
of a complete parse. It uses the same actual width-32 CTC prefixes, duration
lexical proposals and independent raw RNNT transcripts. **Zero new waveform
inferences or voices**, no new held-out split and no model/lexicon changes.

Distinct retained token-prefix path masses are summed by complete normalized
word sequence. Every ambiguous/uncovered prefix contributes to one explicit
unknown bucket. A word group must strictly exceed that bucket and every other
word group; otherwise the raw RNNT transcript is retained unchanged. The fixed
1e-9 margin is a numerical tie tolerance, not a tuned confidence threshold.
No reference, selected ayah, script or error label enters this decision. These
are pruned path sums, not calibrated correctness or independent speaker votes.

Duplicate token prefixes, malformed/partial lexical proposals, invalid blank
IDs, nonfinite scores and excessive retained mass fail closed. The interface
is bounded to 32 prefixes, 650 IDs per prefix and 200 words per unique proposal.
An empty prefix cannot assert words. Every qualification flag remains false.
JSON null for negative-infinite bucket log mass denotes zero retained mass,
not certainty, a discarded case or an absent failure analysis.

## All 48 historical cases / 192 reference words retained

| Scripted diagnostic | Raw RNNT | Previous width-32 first-complete | Grouped mass |
| --- | ---: | ---: | ---: |
| Script word edits / words | 16 / 192 | 6 / 192 | **15 / 192** |
| Complete exact scripts | 34 / 48 | 42 / 48 | **35 / 48** |
| Complete exact altered scripts | 5 / 18 | 14 / 18 | **7 / 18** |
| Complete exact unaltered scripts | 29 / 30 | 28 / 30 | 28 / 30 |
| Canonical text instead of scripted alteration | 4 | 1 | **2** |

The new 7.8125% script edit rate is not independently reviewed natural-speech
WER or real-user accuracy. These remain six old prior-success-selected source
groups with approximately spliced/pitch-resampled controls. All 192 words are
scored: 72 altered and 120 unaltered. There are no excluded cases, hash/count/
pairing/analysis failures or fresh human labels. This is not live following,
error-event precision/recall, pronunciation/Tajweed qualification or native QA.

Thirty cases select a lexical group; 18 retain unknown mass and fall back to
RNNT. Compared with the previous width-32 selector, one case improves (39),
nine regress (5, 14, 15, 21, 23, 37, 38, 46, 47), and 38 have equal edit counts.
Case 7 no longer returns canonical text instead of a substitution, but it
still has one error and is not recovered exact speech. **Two repeated-word
controls (14 and 38) now return canonical text through raw RNNT fallback.**
Keeping unknown evidence does not certify the fallback recognizer. Chosen
lexical groups are also wrong at 22 and 25; dominance does not certify them.

Each category contains six cases:

| Category | Reference words | Previous → grouped edits | Grouped exact scripts |
| --- | ---: | ---: | ---: |
| Correct | 24 | 0 → 0 | 6 / 6 |
| Pause | 24 | 2 → 2 | 4 / 6 |
| Low noise | 24 | 0 → 0 | 6 / 6 |
| Speed 0.8 (pitch altered) | 24 | 0 → 0 | 6 / 6 |
| Speed 1.2 (pitch altered) | 24 | 0 → 0 | 6 / 6 |
| Approximate omission | 18 | 1 → 5 | 3 / 6 |
| Approximate repetition | 30 | 1 → 4 | 2 / 6 |
| Approximate substitution | 24 | 2 → 4 | 2 / 6 |

All six substitutions select raw RNNT. Thirteen cases remain non-exact:
indices 1, 5, 7, 14, 15, 21, 22, 23, 25, 37, 38, 46 and 47. Each has one
edit except 21 and 37, which have two. Full source/rank/mass, waveform hash,
sample counts and fidelity diagnostics remain in the private report.

**Reject the candidate.** Do not tune thresholds against these same controls
to conceal the regression, select transcripts using gold, or count restored
canonical text as correct recitation. The original width-eight experiment
default and production app/web code stay unchanged. Natural speaker-disjoint
qualification and native lifecycle/performance evidence are still missing;
the already-reported requirement is not satisfied by this calibration replay.

## Verification and provenance

**53 scoped tests pass**, including six new tests for unknown-mass retention,
group conservation, ties/ambiguity, duplicate/invalid inputs and unsafe raw
fallback. Exhaustive 64 tiny normalized integer-mass combinations validate
math, not actual speech accuracy. Strict TypeScript and final staged diff
checks pass. Production import checks find no new module integration. No
unchanged model inference, app build or native test is rerun for activity.

| Artifact/code | SHA-256 |
| --- | --- |
| Actual width-32 acoustic/lexical outputs | `c7ef5272e7206c9d47ff5b2ff75a00d8f162b31e8a89121cb83078c7294b73a6` |
| Previous width-32 combined outputs | `9cd62bfac02d638bc8d045f72563ded4c6bd8863e493bf4acbadfaa7febd2cca` |
| Original frozen raw RNNT outputs | `cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310` |
| Grouped selection module | `161b245cc26933a10454fc9ddb5e6e3dedc529397b2f31408c1d81cf388b1815` |
| Frozen-output audit | `3e670cbd70f459180446fa10ce1438b541b64b9a88ecc10b112ef4e8d1b68ea3` |
| New fixture tests | `6f788268c35aa119c9c12886a69c582170f09e432ccca336d8a5c11653bbd63c` |
| Complete private experiment report | `2e548e5efa9df9d33baa9a5c9b93a0d97f46e97918162f2f976ca343c3fd6bba` |

Private ignored report under `output/quran-development/zipformer-comparison/`:
`lexical-mass-consensus-1792005240517-87f89958-0ec7-4096-b49a-2ae20022352b.json`.
Every original source report stays unchanged. Scorer and fidelity comparator
hashes are recorded inside the new report. Only code, aggregates and hashes
enter Git; no audio, private transcripts, weights, credentials or caches.

Original Quran-Lab NPL-1.2 was read fully and retained. Existing no-profit,
non-authoritative-feedback/teacher-warning obligations, original NVIDIA/export
limitations and Tanzil/Quran Transcript attribution remain unchanged. No new
resource/access grant, training, voice collection, audio fetch/storage/upload
or intentional waveform handling occurred in this frozen-output run. The
approved research-only benchmark remains evaluation-only. No release readiness
or deployment is claimed.
