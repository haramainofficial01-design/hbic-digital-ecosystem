# Experimental Quran recognizer — original frontend fidelity

14 October 2026 follow-up from `d358927`.
**A numerical preprocessing correction, not a new speech-accuracy measurement.**
No research voices, training, model download, audio files, foreground application
changes, application integration, production/OTA or store release. Existing
word/phone/error/latency evidence remains frozen under its original code hashes.

## Verified source and checkpoint contract

The original [NVIDIA NeMo v2.0.0 frontend implementation](https://github.com/NVIDIA/NeMo/blob/v2.0.0/nemo/collections/asr/parts/preprocessing/features.py)
was fetched into RAM and verified **before** parsing/executing its reviewed
`normalize_batch`, `stft`, `get_seq_len`, `log_zero_guard_value_fn` and `forward`
functions. No upstream module imports, constructors or repository code loaders
were executed. The source retains its Apache-2.0/upstream notices; it is not
copied into HBIC or redistributed by this audit.

The existing original checkpoint was hash-verified. Only its known configuration
and weights members were read in RAM, with `weights_only=True`; no archive paths
were extracted. Its saved Hann window and mel filterbank remain authoritative.
Configuration: mono 16 kHz, 400-sample window, 160-sample hop, FFT 512, 80 mel
features, centered STFT, per-feature normalization, no feature padding. Dither is
training-only upstream and is correctly absent during evaluation.

`nvidia_frontend_contract.py` now rejects unsupported explicit settings/default
overrides, incorrect types and buffer shapes instead of silently assuming they
match. Future experimental worker startup and reports disclose this contract
and its code hash. The contract explicitly does **not** qualify speech accuracy
or full encoder-export equivalence.

## Actual numerical failure and correction

The audit extracts the **actual local worker's frontend statements** by AST,
excluding its encoder call. It compares those statements with the hash-verified
upstream functions on silence, a 440 Hz sine at amplitude 0.1, and uniform noise
in [-0.1, 0.1], at four lengths. Noise uses NumPy `default_rng(20261014 + samples)`.
These signals are generated in RAM only, not played, stored, or represented as
recitations. They contain no learner-error or word-recognition gold.

The original worker used complex magnitude directly and PyTorch `mean/std`.
Those are mathematically equivalent to upstream's magnitude/power and explicit
sum/sample-standard-deviation operations, but not always float32-equivalent.
Near-constant log energies make the normalization reduction difference material.
All original frame lengths matched and outputs were finite, but **6/12 cases
failed the preselected 1e-5 maximum absolute feature-difference tolerance**.

| Samples / frames | Signal | Original maximum difference | Original RMS difference | Original pass |
| --- | --- | ---: | ---: | --- |
| 16000 / 101 | silence | 0.10571625828742981 | 0.1057162657380104 | No |
| 16000 / 101 | sine | 5.4836273193359375e-6 | 5.694982405657356e-7 | Yes |
| 16000 / 101 | noise | 1.6689300537109375e-6 | 2.084674548541443e-7 | Yes |
| 16001 / 101 | silence | 0.10571625828742981 | 0.1057162657380104 | No |
| 16001 / 101 | sine | 1.800060272216797e-5 | 3.824203531621606e-7 | No |
| 16001 / 101 | noise | 1.6689300537109375e-6 | 2.2620565687248018e-7 | Yes |
| 31999 / 200 | silence | 0.030616745352745056 | 0.030616750940680504 | No |
| 31999 / 200 | sine | 7.860362529754639e-6 | 8.872752914612647e-7 | Yes |
| 31999 / 200 | noise | 2.0563602447509766e-6 | 3.037768863123347e-7 | Yes |
| 96000 / 601 | silence | 0.030573755502700806 | 0.030573753640055656 | No |
| 96000 / 601 | sine | 1.33514404296875e-5 | 1.3845118473909679e-6 | No |
| 96000 / 601 | noise | 2.1457672119140625e-6 | 2.2857500425743638e-7 | Yes |

The worker now matches upstream magnitude/power and explicit mean/sample-std
reduction order for its single unpadded input. **Corrected: 12/12 pass, 0 failures;
every maximum and RMS difference is exactly 0.0 in this CPU runtime.** The same
signals, lengths and tolerance were retained; no failed case was omitted and no
tolerance was loosened. New temporary reduction tensors are released after each
request. These numerical checks do not prove batch/GPU equivalence, community
encoder fidelity, audible word accuracy, Tajweed, live following or phone heat.

## Verification and important silence limitation

- Eight configuration/audit-boundary tests pass: reject changed settings and
  shapes, ambiguous/changed worker boundaries and unverified upstream source;
  selected frontend execution cannot reach the encoder or stdin loop.
- Five existing RNNT beam tests and 22 relevant TypeScript evidence/fidelity/
  paired-audit/word-breakdown regressions pass: **35 unit checks total**.
- Strict TypeScript checks for both modified offline evaluation runners pass.
- Actual CTC and RNNT workers each start, verify the original assets/frontend,
  process one 16000-sample all-zero PCM request through their local private pipe,
  return 13 encoder frames, and exit 0. CTC log probabilities have the expected
  shape and are finite; RNNT has no symbol-limit truncation.

**These direct silence smoke tests return nonempty text (8 CTC / 11 RNNT Unicode
characters).** That is not a successful recognition result or an improved false
positive rate. The worker intentionally accepts independent waveforms, while
the existing control evaluator's speech gate rejects this same all-zero input
before ASR (verified separately). Real background noise and weak recitation
still need their own measurements; do not promote the raw worker into the app
or remove the speech gate based on frontend parity.

No new permitted speech benchmark was run in this bounded frontend audit.
Earlier results, including 149/1512 script-reference word edits and the altered
control fidelity failures, are historical **pre-correction** measurements, not
scores for this new implementation. The next useful speech comparison must use
fixed unchanged controls and paired hashes, preserving regressions as well as
improvements. It must not relabel the already-inspected corpus as fresh held-out.
Independent natural-error gold and native checks are still missing; **99%
qualification remains FAIL**. Application and production/store code are unchanged.

## Exact provenance and reproduction

Runtime: PyTorch 2.10.0, NumPy 2.3.4, PyYAML 6.0.3; CPU, two Torch threads.

| Asset/code | SHA-256 |
| --- | --- |
| Original frontend source, 28237 bytes | `d54718dae45bfeeeb996759128002a7767be4b8967f9a9b894c9bbb7d65697b7` |
| Original checkpoint | `d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31` |
| Original configuration, 42277 bytes | `c67180984ad0da0267e1f051794c05b407418fdadfed77826cfacc2409d2015b` |
| Initial failing worker (configuration guard, old mathematics) | `541be841e8bb907ddc7e3a77088564937c61f5dc20de7fa87049af7301924d1f` |
| Initial audit producing the 6 failures | `840b6552d894841bf19aa806626bb2b670ea7003c564aa67b7c236c930d1c534` |
| Corrected worker | `bea27bfb4c86e4af99aba423978418c9dfde3356a99c552c12b9032a8e4173d4` |
| Final audit (also preserves shape/nonfinite failures without invalid JSON) | `1b5282ef744fb6e606694747c460a91985c327ecb47e5b5fc3cd76ea0f500b0f` |
| Frontend configuration guard | `ce3a48492be20d64a7b077bec20fa2553777c4bad3a62bac5685f5e826df66f1` |

```sh
PYTHONDONTWRITEBYTECODE=1 output/quran-development/nvidia-evaluation-runtime/bin/python \
  apps/mobile/scripts/audit_nvidia_frontend.py output/quran-development/sherpa-comparison
PYTHONDONTWRITEBYTECODE=1 output/quran-development/nvidia-evaluation-runtime/bin/python \
  -m unittest discover -s apps/mobile/test -p 'test_nvidia_frontend*.py'
```

The audit needs the already verified local checkpoint and public pinned source
URL; it never downloads a model or recording. It emits numeric results/hashes to
stdout only. No private voice/transcript/credential or output cache is committed.
