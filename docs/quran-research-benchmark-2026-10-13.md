# Approved real-phone Quran benchmark — 13 October 2026

**The requested 99% / 99.99% mistake-detection accuracy is not established.**
These experiments are not shipped in the app, website, OTA or store releases.

Latest complete-transcript selection experiment:
[fixed phonetic / raw RNNT fallback](quran-lexical-rnnt-fallback-2026-10-14.md).
On the same 48 historical controls, scripted word edits drop from 16/192 for
RNNT alone to 9/192; complete altered scripts improve to 12/18. One previously
exact pause scope regresses. This is frozen-output calibration replay, not new
natural inference, 99% qualification, live following or a release.

Latest partial-evidence decoder:
[mandatory lexical anchors with explicit gaps](quran-partial-consensus-2026-10-14.md).
Replay retains anchors in all 13 previously discarded duration-mode scopes,
but complete altered-script recognition remains 9/18. Partial strings are not
full transcripts or safe input for skipped-word feedback; 99% is not established.

Latest changed-decoder experiment:
[independent acoustic lexical alternatives](quran-acoustic-lexical-candidates-2026-10-14.md).
On the same 48 historical controls, the fixed first-unique duration policy
improves exact altered scripts from 4/18 to 9/18, with 52/192 scripted word edits
including 13 whole-scope abstentions. Four of six substitutions remain uncovered.
This is useful offline progress, not fresh natural gold, 99% or release readiness.

Latest reference-free word-candidate experiment:
[phonetic lexical segmentation](quran-lexical-segmentation-2026-10-14.md).
Replay of 48 frozen actual outputs finds only 4/18 exact altered scripts with
duration handling; all six substitutions remain uncovered. The candidate is
rejected, not integrated or represented as new inference/fresh qualification.

Latest shared app/web safeguard:
[corrupt CTC output rejection](quran-ctc-output-integrity-2026-10-14.md).
An invalid inference frame cannot be silently dropped into a skipped-word flag;
197 checks and a known-valid-source regression pass. This is not new accuracy gold.

Latest qualification integrity fix:
[recording/PCM identity safeguard](quran-qualification-identity-2026-10-14.md).
Duplicated scopes or conflicting speaker labels cannot produce an independent-
speaker confidence claim. This is validation logic, not new accuracy evidence.

Latest changed-candidate speech check:
[original-frontend correction](quran-frontend-speech-check-2026-10-14.md).
All 48 fixed calibration waveforms/transcripts match the prior run; script WER
remains 16/192 (8.3333%). This closes that numerical-fidelity hypothesis without
claiming new held-out data, improved word recognition or 99% qualification.

Newest offline diagnostic: [script-reference error budget](quran-word-error-budget-2026-10-13.md).
The saved original RNNT output has 124 substitutions, 12 deletions and 13
insertions in 1,512 reference words. These are ASR/script differences, not
human-reviewed learner mistakes, improved recognition or new inference.

## Approved access and immutable inputs

Separate access to
[Quran-Lab/quranic-asr-benchmark](https://huggingface.co/datasets/Quran-Lab/quranic-asr-benchmark)
was granted after the user accepted its research-only/contact-sharing terms.
Authenticated HTTP 200 for the pinned license and metadata confirmed access.
The prior model grant alone was not treated as dataset permission.

Pinned dataset revision: `d9fc635276a6a2b770293e6bffbe5b077bfc52b0`.
Metadata: 192,388 bytes, Git blob `12ee7b88b6454687bb857c4c85ca5e5b926a9fc9`.
Every fetched WAV is checked against its immutable size and Git/LFS digest.

There are 600 metadata entries but **599 distinct recordings**: the phone set
contains one duplicated ID/audio row. All 600 entries were actually analyzed;
deduplicated phone figures are reported separately. These are not 600 distinct
speakers or a representative, independently reviewed HBIC learner cohort.
Publisher claims of training exclusion have not been independently audited.

The approved recordings are research/evaluation-only: no redistribution,
training, voice cloning or re-identification. Only authorized official browser
fetches are used; cookies/tokens are not extracted. Audio is passed through RAM
and a local private pipe, with explicit buffer cleanup and no intentional audio
file writes or voice uploads. Browser/OS-managed caches and memory are outside
the adapter's secure-erasure guarantee. No audio or private transcripts enter Git.

## Comparison-side reference handling

Only waveform enters ASR. Neither the expected ayah nor reference phonetics,
teacher labels, Quran grammar or a forced-right-answer prompt enters decoding.

- Phone references retain their unchanged Uthmani text and use a separate pure
  `quran-transcript` 0.6.4 process for full-string phonetics.
- Studio references are Imlaei. A pinned spelling-map corpus resolves complete
  ayah compositions by exact base-letter/word-order matching, not recognized
  audio, fuzzy matching or a guessed filename. Missing/ambiguous phonetics fail.
- Written vowels/annotation marks and tatweel are ignored **only for that
  spelling lookup**; every base letter, hamza, word order and repetition remains.
  Equivalent candidates must produce identical phonetics. This does not qualify
  pronunciation/vowels or manufacture spoken-word timestamps.
- The corpus is the unchanged Tanzil/Quran Transcript text distributed with
  0.6.4; SHA-256 `76513995151fc5e4a47e07eceb61d3bd87db23a6be831a1e55ca689cc24b7f7f`.
  Its retained upstream notice and terms remain in the pinned package.
- Publisher v1.1's ten repeated/multi-ayah Al-Nufais references are preserved in
  full; the adapter does not truncate repetitions to improve a score.

The first phone experiment processed 200 entries but analyzed only 143 because
57 reference strings did not have valid separate written-word coordinates. It
remains preserved as a failed/incomplete accuracy run. Full-string conversion
removed that unnecessary constraint, not the words, and a fresh 200/200 run
succeeded. Initial studio startups failed in the phonetizer's sifat layer on
Imlaei text; the exact spelling adapter then converted all 400 references and
fresh full audio runs succeeded. Failed reports are not perfect partial results.

## Actual independent streaming inference

Approved v3/v3.1 int8 ONNX hashes, runtime and licensing are documented in
[streaming-model evidence](quran-streaming-recognition-evidence-2026-10-13.md).
CPU inference uses per-clip reset states, 48-frame streaming chunks, blank 250,
actual greedy CTC outputs and a disclosed 600 ms silent settling tail. No quiet
compaction, noise filtering or reference-directed phoneme restoration is applied
to this benchmark. Input waveforms remain identical across model comparisons.

These figures count **Unicode canonical-phone characters**, not inventory-unit
PER, word WER, teacher-verified mistakes or accepted Tajweed/pronunciation.

| Source/model/decoder | Metadata entries / unique recordings | Raw character edits / reference characters | Raw canonical-phone error |
| --- | ---: | ---: | ---: |
| Real phone, v3 greedy | 200 / 199 | 907 / 12,570 | 7.216% |
| Real phone, v3 greedy, deduplicated | 199 / 199 | 904 / 12,496 | 7.234% |
| Real phone, v3 prefix-8 | 200 / 199 | 904 / 12,570 | 7.192% |
| Real phone, v3 prefix-8, deduplicated | 199 / 199 | 901 / 12,496 | 7.210% |
| Real phone, v3.1 greedy | 200 / 199 | 963 / 12,570 | 7.661% |
| Real phone, v3.1 greedy, deduplicated | 199 / 199 | 958 / 12,496 | 7.666% |
| Three held-out studio reciters, v3 greedy | 200 / 200 | 441 / 20,406 | 2.161% |
| Unseen studio Al-Nufais, v3 greedy | 200 / 200 | 1,081 / 20,021 | 5.399% |

All five full runs have zero conversion/fetch/inference failures. Prefix-8 sums
retained acoustic CTC paths, with width 8/top-12 nonblank tokens, no language
model/reference prompt. It improved only three phone-character edits; that small
observed difference is not proof of general improvement. v3.1 is worse here and
is not promoted. No decoder was tuned against the expected per-clip answer.

The v3 whole-clip CPU median/p95 timings were 131/343 ms for phones,
238/638 ms for three studio reciters, and 290/768 ms for Al-Nufais. Some later
runs overlapped normal local development/build work. These are diagnostic Mac
timings, not phone-native, battery, ANE or microphone-to-feedback qualification.

## Reproducible local evidence

Ignored reports under `output/quran-development/zipformer-comparison/`:

- Phone v3: `benchmark-tlog_holdout-v3-1791927637565-580c18d1-0d5d-42d2-96ca-1d4fe632511a.json`,
  SHA-256 `b1383745bd1198a5d9e9c600b37528a272109222bdca522d04a7c7e9b6a803b3`.
- Studio: `benchmark-everyayah_heldout-v3-1791928264234-00d6ca5d-1598-47e8-9b8e-a8a147bd3fdb.json`,
  SHA-256 `3a89ab26610a7bf81e559044a71851c3581c4ac625e18d9ae2a7e2a28491a597`.
- Al-Nufais: `benchmark-qul_alnufais-v3-greedy-1791928550136-8606a590-a976-4307-a1fd-bc2232e18684.json`,
  SHA-256 `1609caae1b5b4a324fba533887a8aa55f5eb4600577bdec9a1bb8fa71dae3a8f`.
- Phone prefix-8: `benchmark-tlog_holdout-v3-prefix-8-1791932273851-544636d1-91dd-41ae-b763-04477cfd0906.json`,
  SHA-256 `4482e4ffb248c21b3e9144f8422dcee453ace591655adbe429fc172d666030ce`.
- Phone v3.1: `benchmark-tlog_holdout-v3.1-greedy-1791932484068-7290585c-7eb0-473b-8ec6-9651e71b58c7.json`,
  SHA-256 `9d92a036b03c32ab172f33d9b6f3faa21db2c1e97ac568dd329b137339482073`.

Each report retains actual model/pipeline/audio hashes, phonetic output, runtime,
processed/failure counts and duplicate counts. Closed browser sessions caused
two later comparison attempts to have no analyzed recordings; those reports
remain failures. The adapter now checks the authorized origin before starting
and stops on lost session/authorization rather than retrying 200 missing inputs.
Reopening the official page in the background restored the existing authorized
session, after which both fresh comparisons completed. No gate was bypassed.

## Remaining qualification

This benchmark has no gold word-error categories/locations. It cannot establish
skipped/substituted/repeated-word precision/recall, a learner false-correction
rate, human-verbatim word recognition, live word-following or Tajweed accuracy.
The earlier controlled comparison still finds 13/18 exact events, with 92.86%
precision/72.22% recall; it is not a natural-error release qualification.

The strict existing 99% gate remains **FAIL** on the known evidence. Needed:
fresh representative speaker-disjoint natural-error recordings with permitted
use and double-reviewed verbatim/mistake labels, verified training separation,
and real native microphone/lifecycle/thermal checks of any replacement.

## Independent word-recognition comparison

The already pinned original NVIDIA RNNT checkpoint and community encoder were
actually run on all 200 phone entries, with zero failures. Both asset hashes
were verified at startup. The explicit research scope permits complete recordings
up to 90 seconds; normal rolling/whole-control limits remain 6/12 seconds.
Every sample enters recognition; no reference, grammar or phonetic answer does.

- All entries: **149 word edits / 1,521 publisher-reference words (9.796% WER)**.
- Deduplicated: **149 / 1,512 words (9.854% WER)** across 199 recordings.
- Whole-clip CPU inference median/p95: **39 / 105 ms**, not end-to-end phone timing.
- No word boundaries, learner-error labels or accuracy confidence were invented.

This is the project's existing comparison-side word normalizer, not a claim of
exact official leaderboard-scoring parity or double-reviewed audible WER. The
benchmark references are not a new gold error-annotation set. Dataset authors
claim training exclusion for their own models, not for every third-party model.
Thus neither `100 − WER` nor phonetic character agreement proves 99% mistake
detection, verified live word-following or dependable correctness assessment.

Checkpoint: NVIDIA `stt_ar_fastconformer_hybrid_large_pcd_v1.0`, revision
`7f32349d952f42a28dce979ba73270aa2bbdfa89`, CC BY 4.0, SHA-256
`d29d19d7c054a5fc010ac6815e9cbb0dd1b21a30e0a7f7f2982e1fecaf0c3e31`.
Encoder: previously verified community ONNX export, revision
`9137361f6f29fa5162aa7aa3d730bdda1e703bf2`, SHA-256
`a74e77489a9e48d689bac080a30c5e54b35e5f54171273771dba9c72752eade3`.
Original-versus-export equivalence limitations remain documented in the main
qualification report; no complete official-export equivalence is asserted.

Report `benchmark-tlog_holdout-nvidia-rnnt-greedy-1791932693165-c6449db8-86bd-43a9-b2e0-8b5b4e61e67c.json`,
SHA-256 `7e747b3b117858bd9a29076441189c80a402eafc884458635820ae2b50ea1962`.

## Fixed waveform-level comparison

A single constant, bounded gain (target RMS 0.1, gain 0.25–4, peak cap 0.95)
preserves all time, signs, silence and relative waveform shape; it neither
generates correct speech nor clips/removes audio. Original and adjusted waveform
hashes remain separate. Both full 200-entry comparisons finished with zero failures.

| Model | Original, deduplicated | Adjusted, deduplicated | Meaning |
| --- | ---: | ---: | --- |
| v3 greedy, raw canonical-phone character edits | 904 / 12,496 (7.234%) | 889 / 12,496 (7.114%) | 15 fewer character edits; not word/mistake accuracy |
| NVIDIA RNNT, script-reference word edits | 149 / 1,512 (9.854%) | 149 / 1,512 (9.854%) | No aggregate word-recognition improvement |

The adjusted v3 all-entry figure is 892 / 12,570 (7.096%); the adjusted RNNT
all-entry figure remains 149 / 1,521 (9.796%). Later CPU median/p95 were
132/340 ms for v3 and 36/88 ms for RNNT, diagnostic Mac times only. These data
have now been inspected for development: they cannot become fresh qualification
data in a later tuning run. Neither preprocessing nor model is shipped.

- v3 adjusted report: `benchmark-tlog_holdout-v3-greedy-rms-0.1-1791932981164-8051047d-35bd-47bf-a49b-76d047611659.json`,
  SHA-256 `33a04a76c8f8168ad708d5cd4e687c8404d66d6931e2996665cb07c3a81b6d93`.
- RNNT adjusted report: `benchmark-tlog_holdout-nvidia-rnnt-greedy-rms-0.1-1791933174388-d19c66d7-2c42-4e59-97ed-d4cdc2c88fdc.json`,
  SHA-256 `9d52b0eb1d9ef19bcd927779fe8b772c5f3732036f4cd3122a884f1f5e4bb441`.

## Additional resource audit, not new qualification

The provider-directory search returned no Tarteel recognition integration; its
only related service suggestion was not provisioned. The existing Tarteel
connector exposes Quran content/search/audio, not learner speech transcription.

The original
[Al-Ikhlas dataset](https://data.mendeley.com/datasets/sxtmmr6mvk/1)
lists CC BY 4.0 and five-expert review of 1,506 recordings. The
[Hugging Face repack](https://huggingface.co/datasets/MuazAhmad7/Surah_Ikhlas-Labeled_Dataset)
was audited at revision `973b5ef1d1532bcbe7e9a5a5b0dce125cc4d0dac`:
213,046-byte metadata, Git blob `51c1d82718807a5982c8b8070c9d10df004f609b`,
SHA-256 `ce3a98b32c4495860a5122b83a2b57d505035dca5aae2193bb0673c90a5931f2`.
The actual CSV has 851 error / 655 correct records, 384 anonymous filename
participant identifiers, no verbatim spoken transcripts, and one error record
without explanation. Its categories are Tajweed/vowel-oriented, not gold
omission/substitution/repetition coordinates. No audio was fetched or trained;
pronunciation/Tajweed evaluation remains separate. Participant identifiers do
not establish 384 independently verified speakers or full-Quran coverage.

A newer
[transcript-event annotation paper](https://arxiv.org/abs/2609.12085)
describes useful distinctions between benign repetition, repaired mistakes and
unresolved events. Its authors explicitly retain the 100-recording gold answers
privately. Public ayah-detection/transcript-splitting data are not permission to
invent those answers or evidence of microphone/acoustic accuracy.

## Verification and continuation

177 focused mobile/shared checks and 26 public-web/shared checks passed (202
distinct checks; one shared playback check is in both groups). Both application
typechecks, strict experimental-script typechecks, Python syntax checks, mobile
lint and public-web production build passed. Mac signed Release and both mobile
Hermes exports are separately documented in the Mac layout follow-up. Unit and
component fixtures validate logic/layout; they are not speech-accuracy evidence.

The finished experiments and owned worker/server buffers were closed. No model,
recording, credential, private parent/student/payment record or generated build
was committed. The app's current recognizer and all production/store settings
remain unchanged; the 99% gate is still FAIL.

The user-requested continuing research loop is scheduled hourly in this chat.
It preserves these boundaries, advances only meaningful new experiments or
engineering fixes, retains failed evidence, and reports only actionable changes
or an exact external approval requirement. It must not endlessly rerun identical
benchmarks, train on evaluation-only audio, publish unverified capabilities or
silently change the user's foreground screen.

## 13 October evening follow-up: paired regression audit

This is a **new analysis of existing outputs**, not new inference, fresh held-out
data, model improvement or a changed recognition pipeline. No audio was fetched,
stored or uploaded; no foreground application, production or store was changed.

The new `recitationPairedAudit.ts` comparison recomputes each stored metric from
the actual output; refuses incomplete runs, mismatched original WAV/PCM hashes,
reference scopes, altered denominators and conflicting duplicate recordings;
and deduplicates by **WAV SHA-256**, not merely recording names. It keeps script
WER and raw Unicode-phone character edits separate and never manufactures
learner mistake labels, spoken word locations or independent-speaker confidence.

All four paired audits succeeded over 200 entries / **199 distinct waveforms**,
with zero input/count/pairing failures. Source reports and their frozen hashes
are listed above. Results against their respective unmodified baseline:

| Candidate | Reference denominator | Baseline → candidate edits | Recordings improved / regressed / equal count | Changed output strings | Exact baseline strings becoming different |
| --- | ---: | ---: | ---: | ---: | ---: |
| v3 fixed RMS level | 12,496 phone characters | 904 → 889 | 10 / 4 / 185 | 17 | 0 |
| v3 prefix-8 | 12,496 phone characters | 904 → 901 | 4 / 3 / 192 | 7 | 0 |
| v3.1 greedy | 12,496 phone characters | 904 → 958 | 40 / 51 / 108 | 98 | 12 |
| NVIDIA RNNT fixed RMS level | 1,512 script-reference words | 149 → 149 | 3 / 3 / 193 | 15 | **3** |

The RNNT aggregate WER concealed regressions: three formerly exact normalized
script-reference transcripts acquired word differences, none of its different
transcripts became exact, and the exact-reference recording count fell from
101 to 98. This is **not** a false-correction rate or proof the reference matches
audible speech, but it does rule out claiming that the unchanged aggregate
score establishes safer word recognition.

The affected RNNT duration bucket is 5–under-10 seconds: 82 recordings, 625
reference words, 59 → 61 edits, 1 improved / 3 regressed / 78 equal; all three
exact-to-different transitions are there. Under 5 seconds: 78 recordings,
310 words, 43 → 41 edits, 2 / 0 / 76. At least 10 seconds: 39 recordings,
577 words, 47 → 47 edits, 0 / 0 / 39. These are duration groups, **not** speaker
demographics, microphone classes or confidence intervals.

Decision: do not promote the fixed gain, prefix decoder or v3.1 from this
evidence. No expected answer may choose a different decoder per recording.
Fresh, independently reviewed natural word-error gold and native validation
remain necessary; the 99% release gate is still **FAIL**.

Reproduce entirely offline:

```sh
npx tsx apps/mobile/scripts/zipformer/paired-audit.mts \
  <existing-baseline-report.json> <frozen-baseline-sha256> \
  <existing-candidate-report.json> <frozen-candidate-sha256>
```

Analysis code SHA-256:
`9a1dd638610db86ad6061d1ca449d5f5dff191c83d31e5d4533e285e24028d4c`.
Pinned metadata SHA-256:
`5d54d855872fc2f110840c80683a1ca2799efcd18d244cf18662e421e6fd9c1f`.
Private per-recording transcripts remain only in the existing ignored research
reports; the audit emits aggregate numbers and hashes, not audio or transcripts.
The synthetic evidence-contract tests validate rejection/paired-count logic,
not recognition accuracy. **28 relevant regressions passed**, including six new
paired-audit checks; strict TypeScript and diff checks passed. All four real
saved-report audits passed. No native rebuild is warranted for these
offline-only scripts.
