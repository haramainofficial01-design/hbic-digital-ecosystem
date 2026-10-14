# Recite Assist — withdraw stale feedback after native inference rejection

14 October 2026 follow-up from `bae11e0`. **Phone-component failure handling,
not an acoustic improvement or physical-native qualification.** No production,
OTA, signed build, store upload/submission, model or dependency change. No
foreground application, user recordings or research voices were used.

## Reproduced gap and correction

Malformed acoustic observations already fail closed in the shared tracker, but
a rejected native `recognize()` promise never reached that guard. The phone
component only changed its status message. Previously recognized speech,
highlighted words, possible-word warnings, tracker support and completion
history could survive beside a recognition-unavailable message. A late failure
from a manually replaced ayah could also change the new ayah's message.

The actual React component, loaded from parent commit `bae11e0`, reproduces the
stale speech/Following display after an injected promise rejection. This is a
code-path fault injection, not a claim that a specific user's model failed or
that a learner made a mistake.

The current-session/current-ayah catch handler now clears recognized text,
resets completion support, and passes an explicitly invalid observation with
the failed capture's **original sample bounds** into the shared tracker. This
withdraws prior history while preserving the capture clock: a failed/same scope
cannot become independent confirmation on retry. The UI becomes uncertain with
no skipped/substituted/repeated-word warning. Review counts include the failed
observation as unclear, not as a learner mistake. Earlier recorded review
markers are not rewritten. Fresh valid evidence can follow words again, but
must establish its own stability before automatic completion.

The catch ignores failures from an old session, unmounted component or replaced
ayah. Existing `finally` cleanup still zeroes the exact inference PCM buffer,
releases the processing slot and updates pacing. Pause, microphone ownership,
stop/unmount disposal, canonical Quran, reference audio and opt-in recording
behavior stay unchanged. This adds no inference, network request or download.
Browser worker errors already stop/reset their session; no browser code changes.

## Verification — controlled adapters, not microphone accuracy

**57 focused tests pass**: three new real-React/headless rendering tests plus
54 existing tracker, voice-following, utterance, recording/permission and
qualification-contract tests. The new tests use the actual phone component,
shared tracker, completion guard, owned-capture helper and pacing code, with
explicitly mocked native APIs and recognition observations. No model inference
or real microphone/voice capture occurs.

- Parent versus current component: old speech/Following remains after rejection
  before the fix, disappears afterward; all completed/rejected inference PCM
  arrays are zeroed. A fresh observation cannot immediately stop/advance the
  corrected session using pre-failure completion support.
- A delayed rejection after manual ayah selection cannot replace the new
  ayah's status. Rejection while pausing cannot restore recognition/error UI.
  Unmount disposes the model lease and stops owned capture.
- An existing possible skipped-word warning is withdrawn after failure; it is
  not presented as a current correction or replaced by a new learner error.
- Existing tests retain failed-scope clocks, reject same-sample support, require
  fresh stability, preserve valid acoustic behavior, and reject fake 99% claims.

Mobile application typecheck, strict standalone test-harness TypeScript and
final staged diff checks pass. No native/app build is repeated for this small
exception-path change. No iOS/Android physical microphone, permission-dialog,
thermal/battery, native-model lifecycle or performance qualification is claimed.

### Development failures retained

The initial two-test harness run failed 0/2: one assertion incorrectly assumed
a single fresh observation must not follow any words (following is not stable
completion), and a synthetic post-navigation feed did not advance sufficiently
past the unchanged pacing clock. A second run passed 1/2 while still executing
the older feed already bundled in its running process. The corrected two-test
run passed 2/2, then the added warning regression produced 3/3 and 57/57 focused
checks. Strict standalone typing also caught one possibly undefined mock-module
basename; the explicit nonempty path assertion fixes the adapter, and the final
3/3 rerun passes. None of these harness failures is removed from an accuracy
denominator, counted as a passing model inference or used to alter recognizer
thresholds. No audio experiment was rerun.

## Immutable source provenance

| Source | SHA-256 |
| --- | --- |
| Parent phone component (`bae11e0`) | `ff0047d63b5d11a5f32db0c9682105dc8a47db8bbd6aa181a00d0c19d215ca57` |
| Corrected phone component | `44213cb9f953840849aa8096691d2d0d4551e9ca7ea42186295d88f35949a77d` |
| Final three-test rendering harness | `6495543465b5c552adb8a9f0d3d1a575a73e28d268ca8a8381ae703e1cb4f943` |
| Unchanged shared tracker | `2897ed4567502c9a9a9cc16eba9c736ddcc5733f6fc1993ed908eedcbe87178c` |
| Unchanged native recognition engine | `d15de3c67aabd12e650d50a2fd5936439df3f1a7f4a67114a72801c4b85aa600` |

The committed rendering test pins the before-source commit and keeps all
synthetic fault cases reproducible. No private transcripts, recordings,
weights, keys, generated native projects or caches enter Git. Research licenses
and approved evaluation-only data restrictions remain unchanged; this run uses
no additional resource or permission.

**Release readiness remains unqualified.** The best prior tiny scripted result
(6/192 word edits) and the rejected latest grouped result (15/192) are unchanged;
neither supplies independently reviewed natural-word accuracy or native QA.
This safety correction must not be described as reaching 99%, dependable error
correction, a new live-following score, or an actual deployment.
