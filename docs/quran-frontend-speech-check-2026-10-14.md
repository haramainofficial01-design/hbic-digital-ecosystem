# Experimental Quran recognizer — speech check after frontend correction

14 October 2026 follow-up from `24bdff4`.
**Actual new recognition with a changed frontend; no measured lexical gain.**
The correction now matches original NeMo CPU frontend operations, but that
numerical fidelity is not 99% speech accuracy. This check tests its effect on
the same historical controls, not a fresh held-out or independently reviewed
natural-error cohort. No app integration, production/OTA, store submission,
foreground application change, user recording or model download occurred.

## Fixed inputs and permitted local processing

The existing `sobolev210/quran-recitation-errors` publisher card was reread at
revision `d196cd3132c69cd361d28cf6a8b442ae4e0bf0b4`. Its MIT tag and exact prior
SHA-256 matched. The publisher does not document speaker consent/demographics;
these public research controls cannot qualify an HBIC learner cohort.
No additional dataset, access gate, browser credential or account was used.

The existing RAM-only source adapter recreated 12 historical source selections
and 96 control variants with **zero exclusions/failures**. Its source-only report
is byte-identical to the previous source report. Before recognition, every one
of the 48 calibration controls matched the frozen baseline's PCM hash, sample
count, canonical scope, edited word sequence, category and positive status.
Six source groups, each with eight variants, are not 48 independent speakers.
Original-source segmentation uses the unchanged prior model; it does not count
as another candidate speech benchmark or new participant.

Only these **48 calibration cases** were recognized with the corrected greedy
RNNT frontend. The other previously inspected split was not evaluated or renamed
fresh. Same-source approximate word splices, baseline-success selection and
pitch-changing speed resampling remain explicit limitations. Known edited
scripts are not teacher-double-reviewed natural audible transcripts.

Only independent PCM entered the local recognizer. Intended ayahs, edited scripts
and references were used after recognition for comparisons, never decoding,
answer restoration, language-model prompts or per-recording decoder selection.
Original/public audio and variants remained in RAM/private local pipes, with no
intentional audio-file storage or third-party inference upload. OS memory/cache
behavior is outside the adapter's secure-erasure guarantee. Development JSON
outputs are private, ignored and not committed.

## Complete actual result

| Whole-clip measurement | Frozen old frontend | Corrected frontend |
| --- | ---: | ---: |
| Analyzed cases / failures | 48 / 0 | 48 / 0 |
| Script-reference words | 192 | 192 |
| Word edits | 16 | 16 |
| Script-reference WER | 8.3333% | 8.3333% |
| Exact altered-script transcripts | 5 / 18 | 5 / 18 |
| Canonical text instead of the alteration | 4 / 18 | 4 / 18 |
| Neither exact altered nor canonical string | 9 / 18 | 9 / 18 |
| Exact unaltered-script transcripts | 29 / 30 | 29 / 30 |
| Desktop inference median / p95 | 24.614750 / 35.930500 ms | 24.560667 / 35.672208 ms |

**All 48 raw recognized transcript strings are unchanged.** Paired comparison:
0 improved word-edit counts, 0 regressed, 48 equal; 0 exact-to-different
transitions. Identical altered fidelity transitions: 5 exact-to-exact,
4 canonical-instead-to-canonical-instead, 9 neither-to-neither.
Small desktop timing variation is not a demonstrated performance improvement.

| Category (six cases each) | Script words | Old → corrected word edits |
| --- | ---: | ---: |
| Correct | 24 | 0 → 0 |
| Pause | 24 | 1 → 1 |
| Low noise | 24 | 0 → 0 |
| Speed 0.8 (pitch altered) | 24 | 0 → 0 |
| Speed 1.2 (pitch altered) | 24 | 0 → 0 |
| Approximate omission | 18 | 6 → 6 |
| Approximate repetition | 30 | 5 → 5 |
| Approximate substitution | 24 | 4 → 4 |

The complete report retains **null** live detection precision/recall and false
positive metrics: whole-clip scope has only one observation per case. Its lack
of stable tracker alerts cannot be reported as zero false positives or zero
live recall. No phone microphone, thermal, lifecycle, voice-following, Tajweed
or phonetic-character accuracy result is inferred. Earlier raw-phone-character,
script-reference and live-event reports remain separate and unchanged.

Decision: retain the numerical correction for research fidelity, but **do not
promote this recognizer or claim improved word/error recognition**. These
unchanged lexical failures do not justify rerunning the same candidate on the
other control split or the already-inspected phone benchmark merely for activity.
99% qualification remains **FAIL**; independent permitted natural-error gold and
necessary native checks still remain outstanding. Production/store state is
unchanged. The owned model worker exited; the verified loopback server was
terminated normally and its PCM buffers cleared. No unrelated processes/files
were changed.

## Frozen evidence and verification

All pair identities and stored word-edit counts were independently recomputed
using the existing comparison-side helper; no transcripts are printed in this
document or committed. Runtime: Torch 2.10.0, ONNX Runtime 1.24.3, NumPy 2.3.4,
SentencePiece 0.2.1, CPU. Model assets are the same previously verified original
checkpoint/community encoder, not a newly downloaded or official full export.

| Evidence/code | SHA-256 |
| --- | --- |
| Baseline `nvidia-whole-rnnt-calibration.json` | `cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310` |
| New `nvidia-whole-rnnt-calibration-1791973458329-d2dedd75-49dc-4d3e-9750-1beb42e6ccfc.json` | `0952a44a447d11d6bb5441bb40c0a828132ac43835c7f3721a9cfffea5161614` |
| Source-only `frontend-correction-ram-source-20261014.json` | `a5bbf826f59f006094442bb8f7adb1c4cb36d0b1983e2fa434a72d6141f9ae09` |
| Original source card | `86bdb068daa585fb46770873ee706788a74832b4f371173f8c53d172dd17b396` |
| Original source metadata | `b64a07f2f0d39c9f356cba5918280f5a7e1d7619c5410e34f4a7197222fba37d` |
| Prior source baseline | `ded59fb3a538d3c1f91fc5dc66058dd85a645dccad1cfa339fbb71d1c2d62a74` |
| Canonical comparison corpus | `19453574fcf89b4611d27456a9f10673e63635f7f124ec80815d3392e0ef6a67` |
| Corrected worker | `bea27bfb4c86e4af99aba423978418c9dfde3356a99c552c12b9032a8e4173d4` |
| Frontend contract | `ce3a48492be20d64a7b077bec20fa2553777c4bad3a62bac5685f5e826df66f1` |
| Actual evaluation runner | `b10ae879a5f4d7c1c5c6468bd2b258929acbef70be23ccf60e6c62a6698ed24c` |
| Comparison-side fidelity helper | `cf6fffdd308a21d9c2e7e3414fc15a88369ecc41cd8d1b22e4b829ee674cc778` |
| Original NVIDIA checkpoint | `d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31` |
| Community encoder | `a74e77489a9e48d689bac080a30c5e54b35e5f54171273771dba9c72752eade3` |

The worker/frontend and existing comparison checks were verified in `24bdff4`.
This follow-up changed no executable code: **48 new real inferences and complete
paired count/hash checks** are its verification, not another app/native build.
All **22 focused comparison regression tests pass**; these are logic checks, not
additional speech-accuracy samples. They run without voices:

```sh
node --import tsx --test apps/mobile/test/quranNvidiaEvidence.test.ts \
  apps/mobile/test/quranControlFidelity.test.ts apps/mobile/test/quranPairedAudit.test.ts \
  apps/mobile/test/quranWordErrorBreakdown.test.ts
```

The actual changed-candidate run used the existing adapter in `RECITE_SERVE_ONLY`
mode and `evaluate-recitation-nvidia.mts calibration rnnt whole`. Recreate only
for a genuinely changed candidate or independent reproduction requirement, not
to manufacture progress. Never reuse the approved Quran-Lab benchmark for
training, and never label these inspected controls fresh qualification data.
