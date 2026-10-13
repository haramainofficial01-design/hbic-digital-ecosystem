# Recite Assist: real-audio safety checks and clearer recording controls

Development follow-up from `89f6e82`. **99% accuracy is NOT established.**
Production, OTA updates and store releases are unchanged. Experimental decoders,
phonetic indexes and desktop weights are not imported into the released engine
or bundled with the app. No personal recording was uploaded or committed.

## A broader check found warnings that final-only checks missed

The current 155 MB model was run again on all 172 reviewed Hafs clips from the
same pinned, publisher-MIT public dataset. This is new inference on historical
development audio, not a new qualification cohort. Every observation, including
later retracted warnings, is evaluated; a clean final screen cannot conceal an
earlier incorrect warning or a saved review flag.

Three labelled-clean clips produced warnings during the exercise. The fixes
are acoustic/history safeguards, not edits to Quran text or fuzzy substitution
of the expected verse:

- New uncertain interior evidence withdraws old correction/completion support.
  A high-confidence historical guess cannot overrule the newer uncertainty.
- A stable prefix beside an uncertain word fragment is not an extra word.
  Extras require immediate stable exact neighbors; repetitions require both
  acoustic copies to be supported.
- A bounded timing halo and overlapping emission revisions prevent a rolling
  window's shifted timing from inventing a second word. Two co-observed copies
  are still retained, and tests preserve genuine repetition detection.

The full fresh rerun completed **172/172 with no failures**:

| Same historical natural audio | Before safeguards | After safeguards |
| --- | ---: | ---: |
| Labelled-clean clips with any warning | 3/126 | 0/126 |
| Reviewed wording locations found | 0/2 | 0/2 |

Stable full-ayah following is also conservative: 6/126 labelled-clean clips
complete after the new safeguards, versus 12/126 in this same pre-fix timing
exercise. This is another limitation, not a claim of complete voice-following.

**Zero warnings on 126 clips is not 99% specificity qualification.** The source
does not establish documented voice consent, training-speaker exclusion, a
speaker-disjoint fresh cohort or two independent verbatim reviews. Only two
wording labels exist. Pronunciation/Tajweed labels are not lexical-error gold.

The same 96 controlled waveforms were also rerun. The safer current tracker
finds **5/36 exact operations**: omission 2/12, repetition 3/12, substitution
0/12. It emits six distinct operations: five exact target detections and one
incorrect extra-word classification on a repeated-word control. Operation
precision is therefore **83.33%**, recall **13.89%**, with **0/60 negative-control
alerts**. This is still inadequate. One formerly detected controlled repetition
now abstains; the safety gain must not be advertised as improved recall.

The evaluator now counts every unique kind-and-location operation within an
attempt, including warnings later retracted. Finding one planted mistake cannot
hide additional incorrect warnings. Repeated overlapping observations count
once, not as independent people or attempts. Zero predictions have undefined
precision, not perfect precision. Math fixtures test these rules explicitly.

## Reference-free wordpiece decoding: rejected

A bounded sparse CTC prefix search was compared against the original greedy
decoder using the **same actual model emissions**. It accepts no expected ayah,
word list, Quran grammar or language model. Width 8, top 12 frame tokens; blank
and surviving last-token continuations are retained separately. Normalization,
repetition, exhaustive tiny-path probability and original timeline tests pass.

Emission timing uses the maximum acoustic path of the independently decoded
tokens, never the expected verse. Original posteriors remain unchanged. These
are approximate CTC emission times, not verified human word boundaries, and
neither a beam score nor a token posterior is calibrated correctness confidence.

Whole-control script-reference word edits were **44/400 (11.00%)** for greedy
versus **45/400 (11.25%)** for beam. These are spliced/pitch-altered waveform
diagnostics, not natural verbatim WER. Both live-window trackers have the same
5/36 detections after the safety fixes. The beam adds roughly 4 ms desktop
decode time without an accuracy improvement, so it is **not integrated**.

Natural raw text/reference edit counts are retained but are not reported as
verbatim WER: recordings can contain neighboring ayahs and lack exact reviewed
audible transcripts. Neither decoder finds the two wording labels.

## Independently decoded phonetic candidates: also rejected

Another offline experiment proposes alternatives from actual reference-free
Muaalem phone output, then scores contextual counterfactual paths against its
original acoustic emissions. The reference converter is separate from ASR;
only PCM enters the recognizer. Reference coordinates select comparison-side
phone fragments, never supply an answer to recognition. Every candidate must
resemble a slice of independently decoded phones. Missing coverage is a miss.

The comparison lexicon derives **9,980 word/phone forms** from unchanged,
licensed Tanzil text using pinned `quran-transcript` 0.6.4 and explicit Hafs
settings. Exact word coordinates were available for 3,364/6,236 verses;
2,872 conversion exclusions are retained instead of guessed boundaries. It is
partial reference-side coverage, not a complete recognized-word dictionary or
human pronunciation gold. The initial inefficient build was interrupted; the
bounded batch converter explicitly reports each exclusion in the completed run.

At most eight additional phonetic proposals join the independent saved RNNT
and Whisper proposals. Their actual waveform identities and asset/code hashes
are checked. Text-model proposals are explicitly **replay**; the phoneme
inference in these runs is fresh. The log(100) unchanged-path margin and log(10)
competing-event/location margin were not lowered. Duration nuisance is lexical
only, never Tajweed/pronunciation grading.

| Historical waveform split | Exact operations | Predictions | Negative alerts | Precision | Recall |
| --- | ---: | ---: | ---: | ---: | ---: |
| Calibration | 17/18 | 22 | 5/30 | 77.27% | 94.44% |
| Other inspected split | 13/18 | 20 | 4/30 | 65.00% | 72.22% |

The other split finds omission 6/6, repetition 4/6 and substitution 3/6, but
adds false alerts and wrong classifications. It is **rejected**. The earlier
joint experiment remains preferable on these controls (81.25% precision,
72.22% recall, 0/30 negative alerts), but also remains unqualified and offline.
These inspected, biased control splits are not fresh natural held-out tests.

## Practice controls and actual browser wiring

The native practice screen now has one explicit **Word Tracking / Audio Only**
choice instead of two separate starts for the same capture. Recording in word
tracking is opt-in, changes the action to **Recite and Record**, and shares the
existing capture. Audio-only remains available without recognition/model work.
Mode and recording changes are locked while capture is busy. Hidden text,
word hints, self-review, local retention, library review, repeats and reference
listening remain available. Preview/consent and no-Tajweed warnings remain.

Real practice components were tested through explicit native/recording UI
adapters at 320, 390, 768 and 1280 px, in light/dark. Tests exercise mode changes,
recording preference, busy locks, hints/reveal, test sequencing and library
navigation without horizontal overflow. Adapters are not native screenshots,
real microphone tests or recognition-accuracy evidence.

The real production WASM worker, Web Audio and MediaRecorder were also run
headlessly with licensed public RAM audio. Three observations recognized
`ورفعنا لك ذكرك`, drove one supported current-word indicator, and used one shared
capture. Tracks stopped; local recording review/deletion worked; browser errors
were zero. The audio source replaces personal microphone input, so this is
wiring/lifecycle verification, not physical iOS/Android or battery qualification.

## Reproducibility and release decision

Authoritative ignored reports retain source, waveform, model and code hashes:

- Natural before: `acoustic-beam-natural-1791921203675-9490b531-a490-45c5-b449-a4ada2e7497c.json`.
- Natural after: `acoustic-beam-natural-1791921616295-e36543ff-3d7d-4e32-908d-d41f75723922.json`.
- Final safety controls/event metrics: `acoustic-beam-controls-1791922340454-c9c67dff-9b96-49f5-8406-c199e26aa05e.json`; the earlier schema run is separately retained.
- Phonetic lexicon: `phonetic-lexicon-1791922011429-32dabcb6-d51d-483e-bba0-03427f0aa11c.json`.
- Phonetic calibration: `muaalem-phoneme-calibration-1791922063541-5b18e66f-0cf4-4b13-a5c1-d574a6637ac1.json`.
- Phonetic comparison: `muaalem-phoneme-heldout-1791922126949-c65cbd55-909f-4a5d-84ca-9e30c54824cc.json`.
- Browser wiring: `actual-browser-recitation-1791922091950-e007b178-e804-4728-9501-eb82bc144aa4.json`.

Verification: **143 mobile/shared + 26 browser/shared tests pass** (168 distinct;
the playback test is shared). Both application typechecks, strict evaluation
script typecheck, mobile lint, Python syntax, public-web build and both iOS/
Android Hermes exports pass. Public-web build retains pre-existing Academy,
media and Quran hook/CSS warnings; it is not a warning-free build. The exports
contain no experimental desktop weights or phonetic-lexicon artifacts. These
are local build/export checks, not signed store binaries or release submissions.

Release remains blocked by missed lexical mistakes and missing qualified
natural evaluation data. The 99% gate is unchanged and fails as expected. Its
historical control-input percentage is not a new/current natural accuracy
measurement. No target, independence requirement or confidence bound was relaxed.
Need consented, teacher-double-reviewed verbatim natural errors/clean recitations,
exact audible scope and independent speaker/training separation, followed by
fresh frozen testing and phone-native latency, interruption and battery checks.
No credible Tarteel-level or 99% claim, Tajweed grading, production deploy,
OTA publication, signed release upload or store submission is made.
