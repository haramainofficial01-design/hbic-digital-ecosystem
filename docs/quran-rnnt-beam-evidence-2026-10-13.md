# Recite Assist — reference-free RNNT beam experiment

13 October evening / 14 October UTC follow-up from `e397272`.
**Actual new local inference, but NOT 99% accuracy or a release candidate.**
No app/website recognition replacement, production/OTA change, store upload,
user microphone, new permissions, paid service or foreground-screen change.

## Fixed experimental decoder

Using the already verified original NVIDIA RNNT head and community encoder,
the new offline decoder sums retained acoustic RNNT alignments with fixed beam
width 4, top 4 nonblank tokens per node and at most 10 emissions per frame.
Blank advances time without altering predictor state. Same-token repetitions,
including two emissions in the same frame, are retained rather than incorrectly
CTC-collapsed. Identical output prefixes merge path mass; their actual best path
supplies approximate emission times, never expected-text forced alignment.

Only PCM enters the model. The decoder receives original joint log probabilities
and emitted-prefix predictor state, **no intended ayah, Quran grammar, teacher
label, expected-word restoration, language model or gold-conditioned search**.
Path mass is pruned and uncalibrated; this is not exhaustive global RNNT search
or a correctness probability. Competitive continuation truncated by the symbol
bound is explicitly an analysis failure. Per-frame predictor cache is bounded
to 512 entries, cleared between frames/recordings; inference is CPU-only in the
existing isolated runtime. No model was redownloaded or bundled into the app.

Five pure Python tests validate blank/path summation against independent tiny
exhaustive enumeration, same-frame repeats, explicit competitive truncation,
invalid distributions and bounded/reference-free inputs. These fixtures are
**math checks only**, not recognition accuracy or teacher annotation.

## Actual complete calibration evaluation

The same historical 48 calibration controls were recreated using the existing
RAM-only source adapter. **48/48 original waveform hashes, sample counts and
scripted word scopes match the frozen greedy baseline**. One fixed prior-success
source per recording group, six calibration groups, yields correct/pause/noise/
two pitch-altered-speed/omission/repetition/substitution variants. They are
approximate splices, not fresh natural errors or 48 independent speakers.

The source adapter verified the existing pinned publisher MIT card/metadata,
selected 12 historical sources across both old control splits with zero
exclusions, and served 96 variants on loopback only. Only the 48 calibration
cases were evaluated by the new decoder; the other inspected split was not
relabelled fresh or run after this candidate failed calibration. Audio stayed in
RAM/local pipes, was not intentionally written to disk, uploaded or redistributed.
Stored development reports remain ignored and are never committed.

| Actual whole-clip diagnostic | Frozen greedy baseline | New beam-4 |
| --- | ---: | ---: |
| Cases analyzed / failed | 48 / 0 | 48 / 0 |
| Scripted words | 192 | 192 |
| Word edits | 16 | 16 |
| Script-reference WER | 8.33% | 8.33% |
| Desktop inference median / p95 | 24.6 / 35.9 ms | **1,103.6 / 1,820.6 ms** |

Five raw transcript strings changed. Two cases have fewer word edits, two have
more and 44 have equal counts. **Both regressions were previously exact
normalized scripted transcripts**. Category totals (six cases each):

| Control | Reference words | Greedy → beam word edits |
| --- | ---: | ---: |
| Correct | 24 | 0 → 0 |
| Pause | 24 | 1 → 2 |
| Low noise | 24 | 0 → 0 |
| Pitch-altered speed 0.8 | 24 | 0 → 0 |
| Pitch-altered speed 1.2 | 24 | 0 → 0 |
| Approximate omission | 18 | 6 → 5 |
| Approximate repetition | 30 | 5 → 4 |
| Approximate substitution | 24 | **4 → 5** |

All planned cases completed with zero fetch, hash, inference, cache-bound or
competitive-symbol-bound failures. Partial progress reports kept WER null until
the full successful denominator was present. The evaluator now marks a run
complete only at 48 analyzed / zero failures, not after merely exhausting rows.

This whole-clip scope has only one observation per case and **cannot measure
live skipped/substituted/repeated-word precision/recall or temporal stability**.
Those metrics remain null. Neither 91.67% scripted word agreement nor a changed
raw string establishes human-verbatim natural recognition, live following,
Tajweed, native microphone latency or device thermal behavior.

Decision: **reject as an app replacement**. No word-error improvement, worse
substitution controls, two regressions and roughly 45x baseline median desktop
cost do not justify integration or another unchanged/held-out evaluation run.
No per-case choice between greedy/beam using the known answer is allowed.

## Immutable reports and assets

- New report: `nvidia-whole-rnnt-beam-4-calibration-1791952044714-159590c9-c2c8-465c-87a7-46193e9e92a0.json`;
  SHA-256 `eafc6a9074c1bddd1eb51beca984292d19386f46baf94106b32a6db6141375d0`.
- Frozen greedy `nvidia-whole-rnnt-calibration.json`:
  SHA-256 `cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310`.
- Source-only `rnnt-beam-ram-source-20261013-evening.json`:
  SHA-256 `a5bbf826f59f006094442bb8f7adb1c4cb36d0b1983e2fa434a72d6141f9ae09`.
- Beam code SHA-256:
  `455161d02d471200ae75921918957445ebee4101c615d4f537d5b40378384d47`.
- Worker SHA-256:
  `e2bbd800259633f19db33883b9915409092d94a8b7500e1f787e7ef38b3b8874`.
- Evaluator SHA-256:
  `64fd6a86b49338da0375f62ff38c9798d4cc75ac5640282054a8c0b3da8c05f7`.
- NVIDIA original checkpoint SHA-256:
  `d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31`.
- Community encoder SHA-256:
  `a74e77489a9e48d689bac080a30c5e54b35e5f54171273771dba9c72752eade3`.

Revisions/CC BY 4.0 and original-vs-export limitations are retained in
[the qualification report](quran-recitation-qualification.md). The original
code path, frontend and verified weights are unchanged for greedy/CTC modes.
The research-benchmark adapter is not switched to beam decoding.

Reproduce only when evaluating a genuinely changed candidate, not for activity:

```sh
# Existing pinned RAM control server must be available on 127.0.0.1:3011.
PYTHONDONTWRITEBYTECODE=1 npx tsx \
  apps/mobile/scripts/evaluate-recitation-nvidia.mts calibration rnnt-beam-4 whole
```

**19 relevant TypeScript tests and 5 Python math tests passed**; strict evaluator
TypeScript, Python AST syntax and diff checks passed. App/native builds were not
repeated for offline-only code. The owned worker exited; the verified loopback
server was stopped and its PCM buffers cleared. No unrelated process/files
were modified. The 99% qualification target remains unmet and release remains
blocked by lexical fidelity, independent permitted natural-error gold and
native validation; no criterion was relaxed to manufacture a pass.
