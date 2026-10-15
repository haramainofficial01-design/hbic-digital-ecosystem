# Recite Assist — missing vocabulary token safety

Development-only follow-up, 14 October 2026. **No new speech accuracy, native
device qualification, production deployment or store submission is claimed.**

The CTC evidence decoder formerly treated an emitted nonblank token absent from
`vocab.json` as an empty string. A controlled four-word acoustic fixture with
its interior token removed from the vocabulary reproduced the risk: the decoder
returned otherwise valid evidence with that word silently absent. Repeating
that observation could therefore present an apparent omission, even though the
real fault was the model/vocabulary pairing, not a learner's recitation.

The decoder now marks the entire observation invalid if the best nonblank
emission has no nonempty vocabulary entry. The tracker returns uncertainty and
cannot show a mistake or complete the ayah from that malformed evidence. This
does not change valid model tokens, blank-only silence, canonical Quran text or
the recognition model. It also does not prove that this mismatch occurs in a
verified installation: it is a fault-injection safety regression, not a natural
error sample.

The new targeted regression failed before the fix and passes afterward. All
**232 mobile Quran tests** pass, and mobile typecheck passes. A replay of frozen
historical post-decode observations reports **0 changed feedback** and **0
analysis failures** over 172 natural development cases / 817 observations and
96 approximate controlled cases / 387 observations, for each of the greedy and
experimental beam results (2,408 total decoder observations, not independent
recordings). That replay does **not** exercise raw missing-vocabulary emissions;
the fault-injection test does. Frozen input SHA-256 values remain
`f175c9a9b67ff864b5df19319394da858c91828278ce0d57ef4dcdd843f4b48a`
and `ffa329a70c19ad3a40f74aebaf8f039e0d39b2d0ae6317d67c905461f479092e`.

Measured error detection is unchanged: the safer live tracker finds **5/36**
controlled operations (83.33% precision, 13.89% recall), with **0/2** historical
natural wording locations found. These are separate from raw phonetic agreement
and script-reference WER. Representative permitted speaker-disjoint natural
error labels and native microphone/performance checks are still missing; the
99% qualification gate remains **FAIL**.

Decoder SHA-256:
`1034d0284e242940efe4070975de66f9e547af3f5761e763c726891d5184fff9`.
