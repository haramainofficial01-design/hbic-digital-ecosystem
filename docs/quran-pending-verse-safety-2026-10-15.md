# Recitation — do not start against stale ayah text

15 October 2026. Scoped mobile practice/self-test correctness fix. No new model,
acoustic accuracy result, native validation or deployment.

## Reproduced cause

`QuranPractice` intentionally retains its assist component while the next ayah
loads, so automatic sequential recitation does not discard its microphone lease.
However, manual navigation and a newly selected self-test question could leave
`current` pointing to the previous ayah while `displayVerse` was null and the UI
showed Loading. Start was still enabled, allowing recognition against the old
verse. Resolving the fetch could then replace the verse during that capture.
This is a real target-selection bug, not an acoustic model score.

## Fix and preserved behavior

The parent now blocks a new assist start while the loaded verse does not match
the selection. The existing assist stays mounted. The actual assist's main
button applies `blocked` only while idle: Stop/Cancel remain operable during
preparation, listening and pending automatic navigation. Its existing
busy-first stop handler, ownership cleanup and abort controller are unchanged.

No recording/audio preferences, Quran content, study range, recognition model,
speech thresholds or manual review grade is changed. Existing unfinished theme
edits were preserved separately; only the start/stop safety hunk is included in
the release-scoped component change.

## Verification

255 mobile/browser Quran regression checks pass, including four new headless UI
tests (13 practice/actual-assist UI tests total):

- Manual Next and hidden-verse self-test selection hold the new fetch; Start
  stays disabled against the previous verse, then enables on the correct verse.
- Sequential automatic loading preserves one mounted capture path and does
  not restart the microphone when the requested text resolves.
- The actual React assist component keeps Cancel/Stop enabled when blocked
  changes while preparing/listening. Late preparation is disposed without
  starting the microphone after cancellation.
- Pending automatic advance leaves capture alive, but Stop aborts its signal;
  a late fetch cannot change the stopped session. Normal resolution advances
  without restarting capture.

These use explicit native/engine adapters and controlled promises, not real
microphone recognition or natural-word accuracy. Mobile/public-web typechecks,
strict standalone changed-test/evaluation TypeScript and diff checks pass.
No 99%/Tajweed/physical iOS/Android qualification, OTA or store release is implied.

| Scoped source/test | SHA-256 |
| --- | --- |
| QuranPractice | `c1061594619f8719a20ca7a21119d98d74afbdc0330c3860d2459a17f9434df3` |
| ReciteAssist safety-only staged source | `545014ebc841f8284b1ceed8e4a971ac5a408a5f4649d7529e7df7a3e3e5e671` |
| Practice UI tests | `0e816b251160945be50dd139c93d85de655edcb8ac91e9f629e8cb90993d583b` |
| Actual assist lifecycle UI tests | `bc5bb3eca95efdd0df31aeeda5352d6618d968ef7d5a456d42b5be395ccc15b6` |

Only scoped source/tests and documentation enter Git. No voices, private records,
credentials, model weights or generated native projects are committed. The
remaining 99% evidence requirements and experimental accuracy measurements are
unchanged; correctness safeguards must not be relabelled acoustic improvements.
