# Masjid Bilal 1.7.7

## Requested release

The user explicitly requested building and publishing the tested app changes
after the Recite Assist research follow-ups. This authorizes the app release,
not promotion of the rejected experimental models or a 99% accuracy claim.
Use the existing Expo project, store identities, credentials and review flow.

## Included changes

- Calm Quran self-test flashcards with question progress, manual hints/reveal,
  a current-word cue and red, text-labelled **possible** differences. Glass is
  confined to small controls; the Quran remains on an opaque reading surface.
- The microphone action lives with the practice card instead of below the
  recording settings. Existing recording, reference playback, pause/stop,
  temporary retention, correction hints and self-reported review remain.
- Temporary self-tests do not save possible-word flags or clean-attempt
  progress. Optional saved audio still follows its separate explicit setting.
- A quieter local library: recent sessions/flags first, review markers disclosed
  in bounded pages, individual deletion/dismissal and existing three-separate-
  clean-attempt clearing retained. No user audio is uploaded.
- A persistent, collapsible Mac-specific app sidebar replaces the floating
  phone-style tabs. Actual content-pane sizing drives grids and Quran layouts.
  Narrow/large-text prayer tables stack; primary/warning contrast is corrected
  in both themes. Phone, iPad and compatible Vision layouts retain their flow.
- Shared recitation safeguards committed before this release: valid fresh
  word evidence, pending-target start blocking, correctly located repetitions,
  accepted/mixed written forms and uncertain-interior completion protection.
- New interface text has Urdu, Dari and Arabic translations. Quran source text
  and stored recordings/flags are not rewritten by presentation.

Research inspiration: [Tarteel testing](https://support.tarteel.ai/en/articles/16557456-getting-started-with-testing)
and [reviewing false flags](https://support.tarteel.ai/en/articles/16559266-a-mistake-was-flagged-that-i-didn-t-make),
plus the existing-system, hierarchy and restrained-motion principles from
[Impeccable](https://impeccable.style/). No copied branding/assets, plugin install,
new native dependency, paid service or account permission is introduced.

## Unchanged accuracy/privacy boundaries

Recite Assist is optional early-preview functionality, not a qualified recitation
assessment. It can miss/misidentify words and does not assess Tajweed or replace
a qualified teacher. On-device word cues are not an automatic grade. No new
audio collection, third-party inference, model substitution or research corpus
is bundled. The Quran-Lab/Muaalem/Tadabur experiments remain development-only.
The 99% qualification gate remains failed, not reset by this release.

Prayer APIs, manual iqamah overrides, Academy/Stripe, notification routing,
Watch/widgets, production feature configuration and signing remain unchanged.
Mac availability means the existing compatible Apple-silicon app, not a new
universal native Intel/Mac Catalyst or spatial visionOS target.

## Verification and delivery

The shared Quran, lifecycle/failure, playback, onboarding, rating and Android
optimization suite passes 309/309 software checks. Separate prayer geometry
and full Mac-frame layout checks pass 2/2; 16 Mac frame/theme/text-scale cases
and eight phone/Mac practice theme/width cases are explicitly adapted component
checks, not physical-device or native screenshots. The new flashcard diagnostic
also covers six widths/themes with hidden text, keyed feedback and temporary
test persistence checks. Initial adapter environment/line-height issues were
fixed without weakening runtime assertions. Both application typechecks,
mobile lint and four Apple target/identifier checks pass. iOS/Android Hermes
exports passed; final-source verification is required before uploading builds.
The final combined run passes **311/311**, with another **44/44** language,
prayer-snapshot, notification and privacy checks passing separately. Final
source Hermes exports pass on both platforms with production feature flags.

No new physical-device microphone accuracy, phone thermal test, native Mac
interactive or speaker-disjoint natural-speech qualification is claimed.
Private QA screenshots are labelled component-adapter evidence and are not
uploaded as real app-store screenshots.

### Store notes

Refined Quran practice with clear self-test cards, word hints and easier review.
Follow recited words and review possible differences in red. Find private saved
sessions and review points more easily. A dedicated Mac sidebar, responsive
layouts and improved light/dark contrast make larger screens easier to use.
Recite Assist remains an optional preview and may miss or misidentify words;
it does not assess Tajweed or replace a qualified teacher.

### Delivery status

iOS/Watch build **37** has passed signed-artifact checks and Apple processing
(`VALID`). Version **1.7.7** is **WAITING_FOR_REVIEW**, with release after
approval. This is a confirmed review submission, not public availability.
Android build **42** is still building; its artifact checks, final native smoke
test and Google submission remain pending. The existing 1.7.6 (41) production
track is not evidence that this new version has shipped.

### Started native release jobs

- Verified/pushed source: `dfaafbb0ec33cd8c5f4e455c9bff3b7fc7eedc36`.
- iOS/Watch build 37: `f206828b-0839-44c8-9adf-a9bcf42ab7f6`.
- Android build 42: `e179ff6f-901d-4043-820d-44a50967ec58`.
- Existing EAS production environment/credentials were reused; Academy remains
  enabled. No signing/capability change was requested or reported by the build
  service. Local Swift prayer-snapshot tests and 54 new-phrase translation
  presence checks also passed; presence checks are not independent linguistic
  certification.
- Apple 1.7.7 metadata is configured for release after approval, retaining 32
  existing real-app asset placements. No component fixture was uploaded as a
  store screenshot. Signed build 37 passed deep code-signature, four target
  version/identifier, privacy-purpose, keychain, Watch Quran and compiled
  runtime-feature checks before upload.
- Existing Google production track was confirmed at 1.7.6 (41), completed;
  no new Google release was committed during that read-only inspection.
- Exact build statuses, download hashes and verification/submission reports
  are retained under ignored `output/release-1.7.7/`, not committed credentials.

### Apple submission confirmation

- Verified IPA SHA-256:
  `3fc87b22d328122464d5e356872e7729cbd36925b1cb1a1cc8d128f9c83a1f0f`.
- EAS upload submission: `01a44374-33bb-4eb0-92a1-71cdeb9304ba`, completed.
- Apple processed build: `24738045-e148-4dd7-9a58-7e2315578db2` (`VALID`).
- App Store version: `438c29d8-bbec-4f66-b700-96631cabcca7`.
- Apple review submission: `d8f2822e-ef23-4347-b6d7-b3bef40d9416`,
  `WAITING_FOR_REVIEW`.
- No research-only recognizer or corpus entered the artifact. The 99% gate
  remains unmet; store submission does not alter qualification evidence.
