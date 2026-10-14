# Recite Assist qualification — recording identity safeguard

14 October 2026 follow-up from `e29f4a4`.
**Offline evidence validation only, not improved speech recognition.**
No audio fetched, recorded, synthesized, stored, uploaded, trained or recognized;
no browser, native device, foreground app, production/OTA or store change.
Current model metrics and the 99% release decision remain unchanged.

## Reproduced validation loophole

A deliberately fictional metadata-only unit probe supplied 2,000 cases claiming
500 speakers, but all cases used **one identical recording identity**. Each
claimed speaker had clean/omission/substitution/repetition entries, with perfect
synthetic output counts and all consent/review declarations set true solely to
exercise validation. These are not actual people, annotations, permissions,
natural recitations, qualification evidence or recognition measurements.

Before this change, the validator accepted the contradictory recording/speaker
mapping and returned **PASS with no reasons**. Counting unique speaker strings
without checking the underlying recording mapping could incorrectly support the
independent-speaker confidence gate. This does not indicate a production release
was qualified or published; all existing actual evidence was already FAIL.

## Fail-closed change

- A recording identity cannot be assigned multiple speaker identities.
- Natural qualification cases now require `pcmSha256`: SHA-256 of the exact
  evaluated mono PCM scope, computed privately by the input adapter. It is not
  a renamed file/participant identifier, assumed voice identity or a hash
  manufactured from text. Supplied malformed hashes are rejected.
- The same evaluated PCM scope cannot be counted twice, including under renamed
  recording IDs or across calibration/held-out splits. Conflicting duplicates
  are not silently removed and the easier annotation/output is never selected.
- Multiple different audible scopes from one recording remain supported, with
  the same speaker identity; they do not become independent speakers.
- When identities conflict, duplicate scopes occur, or natural scope hashes are
  missing, independent-speaker counts, success rates and confidence bounds are
  **null**, not apparently certified 99% figures. Declared group counts remain
  explicit diagnostics; the complete case/word denominators are preserved.
  The CLI exposes these identity diagnostics and separates declared group counts
  from unavailable independent-speaker counts rather than hiding the conflict.

The repeated-recording regression now fails with **1,996 conflicting-speaker
assignments / 1,999 duplicated scope entries**, and all six confidence claims
are withheld. These are fixture-validation counts, not voice measurements.
The validator also rejects renamed duplicate PCM and calibration reuse, accepts
distinct scopes without inflating speakers, and fails missing natural hashes
without rewriting legacy word counts or inventing hashes for old recordings.

Hashes are metadata integrity aids, **not proof** of consent, genuine speakers,
training separation, human verbatim review, exact audible scopes or fresh data.
Those underlying records and the adapter's actual hash calculation still require
independent audit. No user voices are collected or re-identified to perform this
check. Truthy declarations alone do not establish a genuinely qualified model.

## Exact verification and historical preservation

**31 focused unit regressions pass**, including four new identity checks (the
large contradictory probe is one of these). Strict TypeScript checks pass for
the qualifier, CLI, NVIDIA control runner and approved benchmark adapter. These
fixtures verify validation/math behavior only; they cannot establish accuracy.

The immutable existing `known-controls-unqualified-evidence.json` was reanalyzed
using both the old and new qualification code in RAM: **96 existing cases / 48
historically designated held-out cases / one declared speaker group**. Its word
counts remain **53 edits / 208 scripted words** (25.4808% script WER), all six
original core metrics are unchanged, and its status remains **FAIL**. This is an
older frozen control artifact, not the latest recognizer score, new inference,
natural learner gold or a renamed fresh held-out cohort.
The updated CLI integration check also returns FAIL with exit 1, preserves these
counts, and writes only an ignored numeric report, SHA-256
`a1aaeaeeeb5c4c3611b1db109c0091b20d282e41f4c5fcdaa25d59dae7a83a45`.

| Immutable evidence/code | SHA-256 |
| --- | --- |
| Historical control evidence | `ae311eba29f8e27524322be04ff4db46d34d954c04e27a6c4398caa4b00b3ed4` |
| Prior qualifier | `d9d8ee2a5eb099166696fbd20bda7f0fbc5bbceeeef2cf4542d70b5960ea8a81` |
| Updated qualifier | `096fb80db36ffb88146366a6355d30742f1520d1fef50be7f6d69fdce359d2c0` |
| Updated CLI | `b72b5a84c8f6a3b849ca90ec074c4cacc9ef3e8a5e18b32e809af7137d6295f9` |
| Updated qualification regressions | `d78e2d4c2d681d16f103c3328b9e17a7c09d1041d457ef33b1c957f047c84110` |

```sh
node --import tsx --test apps/mobile/test/quranQualification.test.ts \
  apps/mobile/test/quranWordErrorBreakdown.test.ts apps/mobile/test/quranPairedAudit.test.ts \
  apps/mobile/test/quranControlFidelity.test.ts
```

The latest actual changed-recognizer measurement remains the separate
[frontend speech check](quran-frontend-speech-check-2026-10-14.md): 16/192 scripted
word edits and only 5/18 altered scripts recognized exactly. Those failures were
not rerun or changed here. Representative permitted speaker-disjoint fresh
natural-error evidence, independently reviewed audible gold, stronger lexical
recognition and native validation are still required; **99% remains unverified**.
No gate criterion was relaxed and no app/native rebuild is needed for this
offline-only validator change. No private recording, transcript or permission
document enters Git.
