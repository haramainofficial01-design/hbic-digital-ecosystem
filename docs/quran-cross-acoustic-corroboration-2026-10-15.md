# Recite Assist — predeclared cross-acoustic event corroboration

15 October 2026. One bounded **frozen-score** diagnostic, declared before its
selection results are calculated. No new inference, model, waveform, download,
training, native integration, production/OTA or store action. This is reused
historical development data, not fresh held-out or independently reviewed gold.

## Fixed rule and scope

Audit all 96 original waveform controls: the existing 48-case calibration and
other 48-case comparison reports, without exclusions. Each model contributes
its own already-measured acoustic event scores; neither sees new expected
answers. Within each model, group the existing vocalizations of the same
`(kind, word index)` by their maximum score, retaining all original scores.

Emit an event only when **both models have the same unique non-unchanged winning
kind and word index**, both favor it over their own unchanged path, and **at
least one** model passes its original fixed margins: `log(100)` over unchanged
and `log(10)` over the runner-up distinct event. A tie, unchanged winner,
different kind/location, or two below-margin winners stays uncertain. Never
average cross-model likelihoods, lower a threshold, choose by labels, sweep
rules, or call agreement calibrated correctness or independent evidence votes.

This differs from prior word-transcript corroboration and single-acoustic-model
counterfactual comparisons. It corroborates the **event winner across two
different acoustic models**; it does not union, repair or output a transcript.
The already-used Muaalem sound-run duration nuisance and whole-PCM plus 600 ms
tail remain explicit. Compact v3 retains its own longest-inventory-unit method,
quiet-compacted PCM and 600 ms tail, without the all-unit/duration variant.
Phones, frontends, candidate vocabularies and likelihood scales are not equated.

Strictly pair every original PCM hash, sample count, reference, category and
index. Preserve each report's model/frontend/proposal provenance. Recompute each
model's grouped winners, original margins and original predictions from its
saved scores; fail if they do not reproduce. Malformed/duplicate/ambiguous path
evidence fails or remains explicit uncertainty, never a dropped case.

Only after selection compare exact operation **and canonical word index** to
the scripted labels. Preserve all 36 positives, all 60 negatives, wrong positive
classifications, failures, missing cases and denominators. Report each split,
each mistake category and both baselines separately. No natural WER, live
following, Tajweed, phone timing, 99% qualification or model replacement claim.
Any schema/pairing/replay failure stops the audit and is retained explicitly.

## Immutable sources

| Existing frozen report | SHA-256 |
| --- | --- |
| Muaalem calibration `muaalem-phoneme-calibration-1791917975849.json` | `122806595810ab734f52d945f8339bb98e8ae01ea57669bdade93ce4570126df` |
| Muaalem other controls `muaalem-phoneme-heldout-1791918096934.json` | `3ad8d8ef0d17cc3f418e0dc40fac7136f7050d12e606ebeefad2703e4bf295bb` |
| Compact v3 calibration `zipformer-raw-calibration-1-1791926000854-c086bd67-c92e-4a48-8c95-81953f113355.json` | `00906711e6bc7dcba73529ca99cfeb900b80878728d5a823066f4794d654be89` |
| Compact v3 other controls `zipformer-raw-heldout-1-1791926006432-0d4d35d8-2acf-49b8-9ee6-b433d90a9e06.json` | `7fa5867c92f791eb0bd5d24c98ec289f52922003300f8347affd149d59e96531` |

The filename `heldout` is retained as an immutable historical identifier, not a
claim that these previously inspected controls are fresh qualification data.
Exact reports/code hashes and all decisions stay in ignored local research
output. Only aggregate results and hashes may enter Git, not audio, private
transcripts, model weights, credentials or personal records.

Quran-Lab NPL-1.2 was read completely and remains in
`apps/mobile/scripts/zipformer/LICENSE`; retain it with this isolated derivative.
Existing no-profit/non-authoritative-feedback conditions, Muaalem's original
MIT-tagged model/runtime provenance and Tanzil CC BY 3.0 / quran-transcript
0.6.4 MIT source attribution are unchanged. No new license, gate, voice consent,
account permission or training right is inferred. Natural-error evidence and
native lifecycle/performance qualification remain separate and missing.
