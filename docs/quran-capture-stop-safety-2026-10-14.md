# Recite Assist — rejected microphone shutdown stays unconfirmed

14 October 2026 follow-up from `4e67eff`. **Owned-capture lifecycle safeguard,
not word-recognition improvement or physical microphone qualification.** No
deployment, OTA, store build/upload/submission, native dependency or model change.
No foreground app, account change, voice collection or inference/audio download.

## Reproduced ownership gap

The capture helper cleared ownership in `finally`, including when the native
stop promise rejected. Another start was then allowed and a later stop became
an idle no-op, losing the ability to retry shutdown. The phone component also
swallowed that rejection and displayed idle/Session stopped, or paused with
"The microphone is off." Neither message was justified by a rejected stop.

Three new controlled-promise tests reproduce the helper gap **0/3 passing
before the fix**: failed stop then competing start, concurrent callers sharing
the failed stop, and cancellation of a late start followed by failed shutdown.
These are fault-injection cases, not evidence a specific user's microphone
remained running or a measured native failure frequency.

## Scoped correction

Ownership is released only after native stop resolves. A rejection preserves
ownership, clears only the pending stop promise, blocks competing starts, and
permits an explicit stop retry. Concurrent stop callers still share the same
attempt. Idle helpers still never stop another feature's recorder.

The actual phone component retains a busy `stop_failed` state when shutdown
cannot be confirmed. It removes capture listeners, stops scheduling inference,
clears retained tracking/audio state, waits for in-flight processing and
disposes the model lease using the existing cleanup path. It does **not** claim
the native microphone is off. The UI offers Stop Recitation to retry and tells
the user to close the app if failures persist. A successful retry returns to
idle without creating another model session or inference.

Pause failure performs one bounded normal-stop recovery attempt; it cannot
display microphone-off/Resume while shutdown remains rejected. Start, resume
and automatic-completion continuations cannot overwrite the shutdown warning
with a less important message. No unbounded retry, inference restart, capture
start, reference-text restoration or confidence-threshold change is added.
Existing private review retention and historical markers remain unchanged.

Unconfirmed bridge shutdown is not proof that the microphone is physically on
or off. This safeguard preserves uncertainty instead of claiming success.
It cannot guarantee hardware release after a native failure, process teardown
or permanently unresolved native promise; real-device lifecycle checks remain
required. No such limitation is counted as passing native qualification.

## Verification and unchanged accuracy

**79 focused tests pass**, including seven new tests: the three owned-capture
faults plus four new actual-React rendering tests (shutdown/retry, pause,
start/resume message priority, and automatic-completion message priority).
The rendering suite has seven tests total; the previous inference-failure,
old-ayah and warning-withdrawal regressions still pass.

These headless tests run the actual phone component and capture helper with
explicitly controlled native adapters. They verify failed stop remains busy,
no second start/false idle/off claim, successful explicit retry, one bounded
pause recovery, unchanged idle teardown and preserved warning priority. The
other focused suites cover tracker/voice-following, pacing, private recordings,
permission handling, existing performance contracts and qualification integrity.
They do not measure speech accuracy, actual microphone permission dialogs,
native memory/CPU, battery, thermals or physical-device lifecycle behavior.

After the three expected before-fix failures, the initial helper/component
run passes 8/8; the expanded final focused run passes **79/79, zero failures,
zero skipped/cancelled**. Mobile application and strict standalone test-harness
typechecks pass. Final staged diff checks pass. No unchanged acoustic benchmark
or app/native build was repeated merely to create activity.

Recognition outputs, their original denominators/failures and model hashes
remain unchanged. The previous experimental best 6/192 script edits is not
real-user accuracy; the latest rejected grouped selector remains 15/192. This
run adds **zero** new speech measurements and establishes neither 99% nor
release readiness. No native microphone success is inferred from mocks.

## Source provenance

| Source | SHA-256 |
| --- | --- |
| Parent owned-capture helper (`4e67eff`) | `911c1dc20bd4aca68ef07edd62d2ef13585b8e0251d3fcb632dd1d8681409c0e` |
| Corrected owned-capture helper | `355cacf6c111d13f7b7a234a4fa42b24892f781136dbd4a8f6e57f4c32c8f709` |
| Corrected phone component | `a121822c7bc87334f8ec61c78562f75ef9a061ba47f15556fb4549106deba5e4` |
| Three new helper fault tests | `4a39e25c1b45817eefe188ddb06875b614f29e8344c6a558b1be3a8e17028f98` |
| Expanded seven-test component harness | `a76e1d56ee3c1fa43743be722cee1c7e32a9af6cab5b26d3c05802daf8e2580f` |

Only code, fictional tests and aggregate evidence enter Git. No research voices,
private transcripts, weights, recordings, secrets or generated native projects.
Approved evaluation-only data/license restrictions and unrelated Academy,
Stripe, Firebase, prayer, notification, signing and completed UI remain intact.
