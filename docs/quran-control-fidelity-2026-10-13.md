# Recite Assist — altered-speech fidelity diagnostic

13 October evening / 14 October UTC follow-up from `b14000e`.
**Analysis of frozen actual-model outputs, not new inference or a 99% result.**
No audio fetched/stored/uploaded, new speech labels, training, model downloads,
foreground changes, app integration, production/OTA or store release.

## Why this check is separate

A learner assistant must recognize the words actually read, including mistakes,
not merely return the intended Quran text. Word-error totals alone can conceal
this distinction. The new comparison-side helper explicitly distinguishes:

- Exact agreement with the **scripted edited speech**.
- Exact agreement with the **canonical reference instead of that alteration**.
- Agreement with **neither** complete string.

It receives references only **after** recognition. No canonical answer, grammar
or gold is passed to a decoder. Failed/missing recognition cannot use a cached
perfect string to claim fidelity. Empty scopes, bounds and nonboolean analysis
declarations fail. Orthographic scoring is unchanged; no raw acoustic output is
corrected, restored or filtered. This is an output classification, not proof of
the recognizer's internal intent or a human's exact audible pronunciation.

Future NVIDIA control evaluations now retain the per-case diagnostic and its
raw counts in a separate summary, reject inconsistent planted-control/reference
metadata, and hash the comparator. They still report live metrics as null in
whole-clip mode. The 99% gate and application code are unchanged.

## Actual frozen-output audit

`audit-control-fidelity.mts` verified both fixed report hashes, complete 48-case /
zero-failure runs, checkpoint/encoder identities, every original waveform,
sample count and scripted scope, and recomputed the original word-error counts.
It analyzed both outputs for the **same 48 controls**, not 96 distinct people or
new voices. The underlying six calibration source groups are historically
inspected and prior-success selected; altered recordings use approximate splice
boundaries. They are not natural-error or teacher-double-reviewed gold.

| Model/category | Cases | Exact scripted speech | Canonical instead | Neither exact |
| --- | ---: | ---: | ---: | ---: |
| Greedy, all altered controls | 18 | **5** | **4** | 9 |
| Beam-4, all altered controls | 18 | **5** | **3** | 10 |
| Greedy, omission | 6 | 2 | 1 | 3 |
| Beam-4, omission | 6 | 2 | 1 | 3 |
| Greedy, repetition | 6 | 1 | 3 | 2 |
| Beam-4, repetition | 6 | 2 | 2 | 2 |
| Greedy, substitution | 6 | 2 | 0 | 4 |
| Beam-4, substitution | 6 | 1 | 0 | 5 |

Of 30 unaltered controls, greedy matches the full scripted speech in 29 and
beam in 28. The canonical-instead category is correctly zero on these negatives.
Within the 18 altered cases, one canonical output becomes faithful under beam,
but one previously faithful output becomes neither exact. Four remain faithful,
three remain canonical and nine remain neither. Thus reducing canonical outputs
by one does **not** establish better overall fidelity or justify promotion.

These counts are **not detection precision/recall**, speaker confidence, natural
word-recognition accuracy, real-time following, Tajweed or native validation.
Whole-clip scripted WER remains 16/192 for each model. The beam stays rejected.
Earlier phone word/script, raw-phone-character and live-event measurements remain
separate; no result has been renamed or improved by a change of denominator.

## Immutable evidence and verification

- Greedy report SHA-256:
  `cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310`.
- Beam report SHA-256:
  `eafc6a9074c1bddd1eb51beca984292d19386f46baf94106b32a6db6141375d0`.
- Comparator SHA-256:
  `cf6fffdd308a21d9c2e7e3414fc15a88369ecc41cd8d1b22e4b829ee674cc778`.
- Audit runner SHA-256:
  `1b7592547fd805e4acc9af1d998553b0231ddcb4e772428c95a11276063fd0b2`.
- Updated future evaluator SHA-256:
  `71e9952b2e02ce65f32dc75d6c6d1ff4ee6dc92050c9e5f444bed4ec51721d42`.

Filenames/asset/license limits are retained in
[the actual beam experiment](quran-rnnt-beam-evidence-2026-10-13.md).
Ignored source reports are not rewritten. Only aggregate counts/hashes are
printed and documented; private transcripts and research recordings are not
committed. Reproduce the new analysis without browser, microphone or model:

```sh
npx tsx apps/mobile/scripts/audit-control-fidelity.mts
```

**25 relevant tests passed**, including six new transcript-contract checks;
strict comparator/audit/evaluator/test TypeScript and diff checks passed. The
frozen real-output audit completed with zero missing/hash/count/pairing failures.
No unchanged inference or app/native build was repeated for offline-only code.
Independent permitted natural word-error gold, better lexical fidelity and
native lifecycle/performance qualification remain missing. Release remains
unqualified; no 99% result, new deployment or submission is claimed.
