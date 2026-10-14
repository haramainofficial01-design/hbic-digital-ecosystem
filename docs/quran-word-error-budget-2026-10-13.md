# Recite Assist — script-reference error budget

13 October evening / 14 October UTC follow-up from `158b799`.
**Existing-output analysis only. No new inference, fresh held-out data, model
improvement, native validation, production change or store release.**

## New diagnostic and measured result

`recitationWordErrorBreakdown.ts` retains the existing word normalizer and
Levenshtein total, but calculates each operation's minimum/maximum count over
**all equally optimal paths**. A swapped two-word transcript can be equally
explained by two substitutions or deletion/insertion; selecting an arbitrary
path would incorrectly imply known error categories. The tool emits no word
locations, teacher judgements or reciter identities. Its rolling-row algorithm
does not enumerate large alignment trees or store a complete path matrix.

The fully pinned original and fixed-RMS NVIDIA RNNT reports were audited against
the unchanged approved Quran-Lab metadata. All 200 entries in each report were
validated; the duplicate WAV hash was counted once, leaving **199 recordings**.
Every stored word metric agrees with the newly recomputed result. Zero missing,
hash, count or analysis failures. No recording was fetched or played.

| Existing experimental report | Reference words | Edits / script WER | Substitutions | Deletions | Insertions | Exact normalized script strings |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original PCM | 1,512 | 149 / 9.854% | 124 | 12 | 13 | 101/199 |
| Fixed RMS | 1,512 | 149 / 9.854% | 124 | 13 | 12 | 98/199 |

There are zero recordings with **ambiguous operation counts** in these two
reports; this does not establish unique word coordinates or reliable human
word boundaries. Both substitution counts are 124/149 (83.22% of edit count).
Normalization did not reduce substitutions and shifted one aggregate edit
from insertion to deletion. Earlier paired analysis separately established
three exact-reference regressions; these counts are not proof of safer speech.

The original report's edit distribution is:

| Per-recording script edit count | Recordings | Reference words | Total edits |
| --- | ---: | ---: | ---: |
| Zero | 101 | 679 | 0 |
| One | 65 | 467 | 65 |
| Two | 23 | 239 | 46 |
| Three or more | 10 | 127 | 38 |

Thus errors are not confined to a few failing clips: **98/199 recordings** have
at least one normalized script difference. Dropping those clips, filtering
their transcripts, choosing a per-clip answer-based decoder or substituting
canonical Quran text cannot be counted as better recognition.

For this script-only point estimate to reach <=1% WER, the fixed denominator
permits at most **15 edits**, requiring at least **134 net fewer edits**. This
is a numerical diagnostic, not an achieved target or a sufficient release rule.
Publisher script text is not double-reviewed audible verbatim speech; deletions
and insertions here are not gold skipped/repeated recitations. Correctness,
mistake detection, live following, Tajweed and native performance stay separate.

Engineering direction: prioritize reference-free substitution fidelity in the
recognizer, not further promotion of unchanged fixed-level normalization. Any
future model/decoder must retain raw recognized words and be checked for
regressions; these already-inspected recordings cannot be relabelled fresh
qualification data. No replacement is promoted by this analysis.

## Immutable evidence and reproducibility

- Dataset revision: `d9fc635276a6a2b770293e6bffbe5b077bfc52b0`.
- Metadata SHA-256:
  `5d54d855872fc2f110840c80683a1ca2799efcd18d244cf18662e421e6fd9c1f`.
- Original RNNT report SHA-256:
  `7e747b3b117858bd9a29076441189c80a402eafc884458635820ae2b50ea1962`.
- Fixed-RMS RNNT report SHA-256:
  `9d52b0eb1d9ef19bcd927779fe8b772c5f3732036f4cd3122a884f1f5e4bb441`.
- Breakdown code SHA-256:
  `8e3faf5e0b887dcdc31a7aafc467ea524a9562ac607111d4895109080f41ec77`.
- Audit runner SHA-256:
  `de3c501d3740228bcb6be9dc313cb14c1a898d45a496ee1d14daadfe93ef83a2`.

Input filenames/asset hashes and upstream licensing remain in
[the approved benchmark report](quran-research-benchmark-2026-10-13.md).
Private per-recording outputs remain in ignored development reports. Only
aggregate counts/hashes enter this document and CLI output.

```sh
npx tsx apps/mobile/scripts/audit-recitation-word-errors.mts
```

Six new edit-math tests cover exact/empty strings, each operation, tied paths,
the unchanged normalizer, invalid bounds and independent exhaustive checking
of 49 tiny transcript pairs. Fixtures verify arithmetic only, not recognition.
**21 focused tests passed**, including all six new checks; strict script/test
TypeScript and diff checks passed. Both frozen real-report audits completed
without failure. App/native builds were not repeated for offline-only scripts.
No model/runtime dependency or app import changed. Release qualification remains
**FAIL**, with the previously documented natural-gold and native-validation
requirements unchanged. Production, OTA and stores remain untouched.
