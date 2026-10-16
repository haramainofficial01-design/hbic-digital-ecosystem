# Recite Assist — repetition location and uncertain extra-word safety

15 October 2026. Scoped changes to the shared mobile/browser tracker used by
ordinary recitation, Recite Assist and hidden-verse practice. This is software
correctness work, not a newly measured speech-accuracy result or release.

## Reproducible failures and fixes

1. When a canonical passage contained the same word more than once, a repeated
   later word could point its hint to the first occurrence. The detector now
   uses the **same adjacent, stable acoustic copy that establishes repetition**
   to locate the hint. Ambiguous adjacent canonical positions retain no index;
   an earlier identical word cannot supply missing adjacent acoustic evidence.
2. A canonical dagger-alef spelling could align with its already accepted plain
   written form, but the repetition check used a stricter, inconsistent match.
   Repeating that accepted final word could therefore be marked complete. The
   adjacent repetition check now uses the existing `wholeWordAnchor` rule, not
   a new fuzzy/phonetic rule. Different words remain different; the canonical
   Quran text, normalization and acoustic thresholds are unchanged.
   A follow-up also reproduces and fixes mixed accepted spellings across the
   two actual copies: both must match the **same adjacent canonical word**.
   Merely finding a compatible word earlier in the passage is insufficient.
3. An extra uncertain interior token could leave all canonical words matched
   and incorrectly permit completion. It now withholds completion without
   inventing a learner-error warning. Retraction by later clear overlapping
   evidence permits recovery and still requires the existing completion guard.

Current-observation identity remains private to assessment. It is derived from
the exact history objects matched/created by the current observation; sorting
does not change those identities. Joined-word uncertainty propagates without
adding a public field or persisting audio/text state. A no-longer-observed extra
whose support was retracted does not block completion forever; a supported
unresolved interior token still does. Valid neighboring ayahs outside the
selected span keep their existing allowance.

No model, capture loop, timing window, confidence threshold, teacher label,
automatic correction rule, prayer/Academy/payment setting or public screen is
changed. The existing warnings and optional preview status remain.

## Verification and exact limits

Four new regression groups cover later duplicate positions, accepted
dagger-alef forms versus genuinely different words, unstable adjacent copies,
uncertain interior insertions and recovery. Existing neighboring-ayah coverage
also explicitly verifies clean completion. The tracker/voice-following focused
suite has **62/62** passing checks. These fixtures are controlled text/timing
contracts, not real learner voices or a word-error qualification corpus.

The complete **269/269** shared mobile/browser Quran regression suite and both
app/site typechecks pass. Strict standalone changed-script/test typechecking
also passes.
Independent review confirmed private observation identity and recovery/join
handling. A separate in-memory 26-case matrix covered weak extras at three
interior positions, recovery and neighboring prefix/suffix allowances, without
storing or inferring audio; it is not an additional accuracy benchmark.

All **2,408/2,408** frozen observations are replayed: 172 natural clips with
817 observations per decoder (1,634 total), plus 96 controls with 387
observations per decoder (774 total), using two decoders. The clip and
observation counts are distinct;
overlapping ticks/decoder alternatives are not independent learners.
Zero analysis failures, no new feedback changes from these fixes. Compared
with the original frozen feedback, only the previously documented weak final
token loses a stale completion in both decoders (two changed observations).

Natural results remain 0/126 labelled-clean alerts and 0/2 historical wording
locations found per decoder. The conservative app tracker remains at **5/36**
controlled event detections with **5/6 precision (83.33%)**, **13.89% recall**,
one wrong positive and 0/60 negative alerts per decoder. These are not the
separate experimental detector's 13/14 precision / 13/18 recall. Do not merge
them or call either overall 99% accuracy.

The frozen outputs cannot validate prevalence of the newly covered aliases or
uncertain extra tokens: no new model inference, independently reviewed natural
errors, unseen speakers, verbatim word WER, live-following accuracy, physical
iOS/Android thermal/lifecycle tests or successful 99% gate is claimed.

## Reproducible source pins and release status

| Source/artifact | SHA-256 |
| --- | --- |
| Shared tracker including mixed accepted spellings | `6f8fe915b89a5a7e0f8b8e661a0d3a769a924f88779233935c669718053c28e7` |
| Tracker regression tests | `c005f3a90cdf4776bb99160bef395459d3d712d4d26a224b10bf5ca09e4be053` |
| Frozen natural evidence | `f175c9a9b67ff864b5df19319394da858c91828278ce0d57ef4dcdd843f4b48a` |
| Frozen controls evidence | `ffa329a70c19ad3a40f74aebaf8f039e0d39b2d0ae6317d67c905461f479092e` |
| Read-only replay script | `bc4216193136d1f0bc738ba567168230869dbfa22b91de5adcad75500d6f7a34` |

Only scoped source, fictional contract tests and aggregate documentation are
committed. No private recordings/transcripts, model weights, credentials,
generated native builds or parent/student/payment data enter Git. Code backup
is separate from release readiness: no production, OTA, build upload or store
submission is performed, and 99% remains unqualified.
