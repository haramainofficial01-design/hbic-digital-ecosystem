# Recite Assist — reference-free word candidates from phonetic output

14 October 2026 follow-up from `a083e17`.
**New offline candidate experiment on frozen actual outputs, not new inference
or a qualified word recognizer. The candidate is not promoted.**
No audio fetched/recorded/stored/uploaded, training, model download, new service,
account permission, foreground app change, production/OTA or store submission.
The app/web recognizer and all unrelated HBIC functionality remain unchanged.

## Candidate and license boundaries

A bounded trie/dynamic program segments an independently decoded phonetic string
using the **entire existing global partial vocabulary**, not the selected ayah.
Its only inputs are the fixed word/phone lexicon and actual saved model phones.
Neither expected words, canonical scope, category, planted edit nor gold enters
segmentation. Reference scripts are compared only after proposals are returned.

It accepts a complete unique lexical parse, or explicitly abstains as uncovered
or ambiguous. No fuzzy filling, canonical reconstruction, phrase grammar, word
frequency, per-case decoder selection or restored missing word is added. Duplicate
lexical forms do not vote; homophones/competing boundaries remain ambiguous.
At most two distinct prefix word sequences per phone offset are retained, enough
to establish ambiguity without enumerating exponentially many parses. Limits:
20,000 vocabulary forms, 250,000 trie nodes, 1,000 input characters; no timestamp,
confidence probability, pronunciation grade or word-correctness claim is emitted.
"Unique" is **within this incomplete vocabulary**, not linguistic correctness.

Two explicit configurations were chosen before examining results: unchanged phone
strings and lexical duration-run collapse. The latter cannot validate madd,
gemination, vowel pronunciation or every possible word boundary. Multi-phone
word repeats remain distinct in the tested algorithm; this is not a Tajweed tool.

The experiment is isolated under `scripts/zipformer/` with the existing original
Quran-Lab NPL-1.2 license retained. The accepted model-output conditions remain
in force; no powered feature is charged for or distributed as a release. The
lexicon's upstream attribution remains Tanzil CC BY 3.0 (unchanged source text)
and `quran-transcript` 0.6.4 MIT derivation. The original license was read fully;
no new license acceptance, gate bypass or redistribution of voices was inferred.
Distribution review remains separate from access/local research permission.

## Fixed actual-output audit

`audit-lexical-segmentation.mts` verifies three frozen artifacts before analysis:
the existing 9,980-form lexicon; the completed v3 compact calibration phonetic
outputs; and the whole-clip control report supplying unchanged scripted scopes.
All **48 original waveform hashes, sample counts and categories** match. There
are six historical source groups with eight approximate variants each, not 48
new speakers or naturally spoken, double-reviewed error labels. No subset was
relabelled fresh held-out or selected based on this candidate's result.

The vocabulary derives from 3,364/6,236 verses, with 2,872 retained exclusions.
The exact *canonical comparison* word/phone forms for all **192 written word
locations / 48 scopes** happen to be in this vocabulary. This separate form-
lookup check receives no audio and is **not audible phone gold, recognition,
independent-word confidence, full-Quran coverage or a 100% accuracy result**.
It never supplies reference phones to the candidate to repair its actual input.

| Frozen-output diagnostic | Raw-phone exact segmentation | Explicit duration-run segmentation |
| --- | ---: | ---: |
| Analyzed cases / analysis failures | 48 / 0 | 48 / 0 |
| Unique complete proposals | 17 | 30 |
| Ambiguous complete proposals | 0 | 0 |
| Uncovered whole scopes (abstentions) | **31** | **18** |
| Full-script exact sequences | 16 / 48 | 28 / 48 |
| Altered full-script exact sequences | **1 / 18** | **4 / 18** |
| Unaltered full-script exact sequences | 15 / 30 | 24 / 30 |
| Scripted words, all cases retained | 192 | 192 |
| Word edits, counting abstentions as empty proposals | 124 / 192 | 74 / 192 |

The 64.5833% / 38.5417% edit diagnostics retain every scripted word, including
uncovered/ambiguous scopes as absent transcripts. They are not natural WER or
live event precision/recall. Reporting only the 16/17 or 28/30 exact *proposed*
sequences would hide the abstentions and misrepresent recognition coverage.
Zero analysis failures means complete file/hash/pairing/scoring processing,
**not** successful recognition of every scope. No ambiguity happened in this
small real-output replay; synthetic tests separately exercise ambiguity safely.

Each category has six controls:

| Category | Words | Raw → duration word edits | Raw → duration exact scripts |
| --- | ---: | ---: | ---: |
| Correct | 24 | 12 → 4 | 3 → 5 |
| Pause | 24 | 12 → 5 | 3 → 4 |
| Low noise | 24 | 12 → 4 | 3 → 5 |
| Speed 0.8 (pitch altered) | 24 | 12 → 4 | 3 → 5 |
| Speed 1.2 (pitch altered) | 24 | 12 → 4 | 3 → 5 |
| Approximate omission | 18 | 13 → 7 | 1 → 3 |
| Approximate repetition | 30 | 27 → 22 | 0 → 1 |
| Approximate substitution | 24 | 24 → 24 | **0 → 0** |

All six substitution sequences are uncovered in both settings. Duration handling
helps this exact parser's coverage, but is not evidence of improved underlying
acoustics or 99% recognition. The frozen independent RNNT comparison remains
16/192 scripted word edits and 5/18 exact altered scripts, not this candidate's
score. Raw phonetic-character error, word-script agreement and event detection
stay separate; no lexical error locations or teacher annotations are invented.

Decision: **reject as a replacement/full word recognizer**. Its strict dictionary
lookup cannot reliably reconstruct even these short historical edited sequences,
despite covering their intended canonical forms. This does not establish that
all phonetic-to-word decoding is impossible; acoustic-weighted/open-vocabulary
alternatives would need their own evidence and careful anti-restoration checks.
Do not run this unchanged candidate on more inspected splits merely for activity,
train on the approved evaluation-only Quran-Lab audio, or ship its proposals as
corrections. Natural-error gold and native qualification remain missing; **99%
is still unverified**. No app integration or deployment is warranted.

## Verification and immutable provenance

**23 relevant regressions pass**, including seven new parsing/bounds checks and
126 tiny exhaustive phone strings (lengths one through six) compared with full
dictionary enumeration. These are math/unit fixtures, not speech measurements.
Strict TypeScript and diff checks pass. Initial script inference-of-`any` typing
errors were repaired; final checks pass and are not speech-analysis failures.
No app/native rebuild was repeated for these isolated offline-only additions.

| Artifact/code | SHA-256 |
| --- | --- |
| Existing partial lexicon | `262736fca4c16f924fbccb1b66ec133b23a735c9ddb3d139657461f84d5057c4` |
| Frozen actual phonetic outputs | `00906711e6bc7dcba73529ca99cfeb900b80878728d5a823066f4794d654be89` |
| Frozen original waveform/script scopes | `cc2478eef679764a0fd5b4bf62fa4e345cbd4025c683ed07e851058da06fb310` |
| Actual v3 model used for saved phones | `6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb` |
| New candidate segmenter | `a0f10c9b7d8c532ed559108381bd7e13aaf84ad618ceb7e506e94755ec51014c` |
| New read-only audit | `5b954cf9f1d66f0ec3ba6fc90046e602512052dd8fec7bc9a6053c2a6f7e3f6c` |
| Existing script word scorer | `096fb80db36ffb88146366a6355d30742f1520d1fef50be7f6d69fdce359d2c0` |
| Parsing regression tests | `6dda8c2b289bab14ed69c42b23afd6dc5be999fbd7154caafc2f6056c1acaaea` |
| Aggregate numeric audit stdout, including trailing newline | `c836fdeee0b7b8fa745535eba5c6da605feed5caf39cb2954d6fffd239aab076` |

```sh
npx tsx apps/mobile/scripts/zipformer/audit-lexical-segmentation.mts
node --import tsx --test apps/mobile/test/quranLexicalSegmentation.test.ts \
  apps/mobile/test/quranPhoneticLexicon.test.ts apps/mobile/test/quranStringCtc.test.ts \
  apps/mobile/test/quranControlFidelity.test.ts
```

The audit emits aggregates/hashes only; private transcripts and derived vocabulary
artifacts stay in existing ignored storage. No voice, credential or model weight
is committed. Production and store releases remain unchanged.
