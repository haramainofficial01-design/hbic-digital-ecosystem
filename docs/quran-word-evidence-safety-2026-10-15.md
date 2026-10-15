# Recite Assist — unknown emissions, overlaps and fresh completion evidence

15 October 2026. Three software-correctness safeguards in the shared tracker
used by mobile and browser recitation/test workflows. **Not a new acoustic
accuracy measurement, 99% claim, native validation or production release.**
Existing manual/audio-only workflows, Quran text, models, prayer/Academy/Stripe,
signing and private recording preferences are unchanged.

## Root causes and fixes

1. The actual native vocabulary includes a known `<unk>` token. The decoder
   previously dropped emitted special tokens while retaining their high
   acoustic score. An unknown sound between two known words could therefore
   masquerade as a missing word. Any **winning nonblank** special token now
   invalidates the entire observation, exactly like a missing emitted vocabulary
   entry. It clears recognized text/support, notifies uncertainty and cannot
   create a learner mistake. Nonwinning unknown alternatives and legitimate
   blank/SentencePiece boundaries remain valid.
2. Assessment concatenation allowed two acoustically overlapping fragments to
   become one matched written word. The voice-following helper already rejected
   this. Assessment now has the same chronological non-overlap check; genuinely
   adjacent or separated exact split-word forms remain supported. No canonical
   text is modified or fuzzy word repair added.
3. After a new uncertain result resets the component's completion guard, later
   unrelated speech could republish an old fully matched history as complete.
   A weak/clipped new token could also lend its capture clock to an older,
   stronger word. Completion now requires an **actually current strong interior
   final-word anchor**, using the existing 0.9 word-stability threshold. Joined
   final words require both fresh fragments. Historical early words remain
   available outside the six-second rolling window, preserving long ayahs and
   ordinary pauses. Old history alone cannot advance a verse or generate a
   clean-completion callback that could clear remembered word-review flags.

The last fix does not erase all history on normal silence, lower acoustic
thresholds, infer a different spoken word, or declare uncertain recitation
wrong. Strong fresh final evidence can resume completion after a pause.

## Controlled verification

**251 mobile/browser Quran checks pass**, with mobile/public-web typechecks,
strict standalone evaluation/test TypeScript and diff checks. New cases cover
winning unknown/special tokens at multiple positions, valid nonwinning specials,
overlapping versus adjacent word fragments, actual uncertain-feedback guard
reset behavior, unrelated later speech, weak/clipped final words, both fresh
joined fragments, and a 12-word passage whose early words leave the window,
with and without six seconds of quiet.

An additional actual-engine/real-decoder integration test uses **fictional native
tensor and asset adapters**, not real model inference: an unknown emission
cannot leak a canonical-looking transcript, valid output recovers on the same
lease, and the session releases once. No microphone, downloaded audio, paid API
or real-user recording is involved. These tests verify software behavior only.

## Complete frozen real-output replay

`replay-recitation-safety.mts` verifies the same two SHA-pinned historical reports,
all cases and **2,408 observations**, with zero analysis/malformed-data failures:

| Historical replay | Cases per decoder | Observations across greedy + beam | Changed feedback |
| --- | ---: | ---: | ---: |
| Natural publisher-labelled clips | 172 | 1,634 | 0 |
| Approximate waveform controls | 96 | 774 | **2** |

The two changed feedback entries are **one underlying speed-1.2 control** replayed
through greedy and beam, not two independent learners or corrected mistakes.
Only `stableComplete` changes true → false. Its fresh final token is clipped and
has confidence about 0.6725, while the older historical copy had confidence
about 0.9926. It can no longer borrow the old strong word's completion support.
Every other feedback field is unchanged. Final stable-completion cases fall
4 → 3 per decoder; retained words and mistake predictions remain unchanged.

There are still zero alerts on the 126 labelled-clean natural cases and 60
negative controls per decoder, zero detections at the two historical natural
wording locations, and 5/36 scripted detections with 5/6 precision in this
**current conservative tracker** replay. These are not the separate stronger
experimental counterfactual detector's 13/14 precision / 13/18 recall, and must
not be combined into an overall accuracy percentage.

The frozen reports contain decoded word evidence, **not the original acoustic
logits or unknown token IDs**. They validate the history/overlap regression but
cannot measure how often the new unknown-emission guard triggers in real audio.
No new inference, teacher annotation, speakers, fresh held-out set, word WER,
phone-native timing/thermal result or successful 99% qualification is invented.

## Immutable evidence and release status

| Source/artifact | SHA-256 |
| --- | --- |
| Shared tracker | `5924816122002f14c7d1a5895a46a641a7e375a3e0437de3bde5415fc8fac71a` |
| Tracker regression tests | `3dcdfe3d8f199d77f35dd546f5a39e9d41ca23b448c08c1406c9585c828dd348` |
| Engine adapter test | `c939e7cd70eeeaf9baacb5e79bf1687db16c7e1e68aadf4fdb3e1b8c17a4da96` |
| Frozen natural output | `f175c9a9b67ff864b5df19319394da858c91828278ce0d57ef4dcdd843f4b48a` |
| Frozen controls output | `ffa329a70c19ad3a40f74aebaf8f039e0d39b2d0ae6317d67c905461f479092e` |
| Read-only replay script | `bc4216193136d1f0bc738ba567168230869dbfa22b91de5adcad75500d6f7a34` |

The prior experiment's tracker hash `059da2bc…` included the unknown/overlap fixes
but preceded final-anchor freshness; its captured hash remains accurate for that
loaded code and is not rewritten. Only aggregate results/hashes/source enter
Git, not audio, private transcripts, model weights, generated native builds,
credentials or records. Release preparation is distinct from verified native
deployment; no production, OTA, store upload or review submission was performed.
