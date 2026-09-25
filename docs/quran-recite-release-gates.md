# Quran + Recite release gates — 2026-09-25

This branch is isolated from the live HBIC site and the existing 1.7.0 store candidates. The source baseline is `4b38f7c1d3baf959b07e5eea9c1e78d33f86bb92`. Do not submit iOS build 16 or Android versionCode 22 as the completed Quran release. The live website rollback deployment remains `dpl_8oq6j9H5oy6CS3k8sKQKdRqhzqxs`.

## Quran Foundation access

No `QF_CLIENT_ID`, `QF_CLIENT_SECRET`, or `QF_ENV` was found in the authorized local environment, Vercel production project, or EAS production/account environment on this date. The developer console requires an authenticated Quran.Foundation session. The owner must sign in at [Quran Foundation Developer Console](https://dev-console.quran.foundation/projects), create or claim the HBIC Backend/server app, request production **Content API** (`content` scope) and **Search API** permission, and wait for any required approval. No Quran.com user-data scopes are needed for local HBIC bookmarks. Store the production client ID and secret in the existing Vercel project's production environment only; set `QF_ENV=production`. Never place the secret in Expo public variables, browser code, git, or chat.

After approval, run `npm --workspace @hbic/public-web run verify:quran-production` from the repository root with the production server environment. This gate checks all 114 chapters, the ordered 6,236 verses, translation, one audio sample, Juz/page lookups, and Search. It has not passed because production access is absent.

Quran Foundation's [developer terms](https://api-docs.quran.com/legal/developer-terms/) prohibit long-term general content caching beyond one week without an applicable exception and prohibit using their content to build machine-learning models without written consent. The current server proxy uses short cache lifetimes and does not train a model.

## Recite model and evaluation

No Recite model has been selected, shipped, or validated. Candidate notes:

- [Quran Lab Zipformer v3](https://huggingface.co/Quran-Lab/zipformer_p-arabic-v3) is Quran-specific and streaming, but model access is gated under NPL-1.2. Its published phoneme error rates are the provider's results, **not HBIC recitation-mistake accuracy**. Access and license terms require owner review before any use.
- [MostafaMaroof Arabic phoneme ASR](https://huggingface.co/MostafaMaroof/wav2vec2-arabic-phoneme-asr) is marked Apache-2.0, but its own card reports 14.42% phoneme error rate on its test set and warns of short-vowel errors. This is not sufficient evidence for production tashkeel or word-level corrections.
- [Darten int8 ONNX](https://huggingface.co/Tidzo/darten-quran-asr) is marked Apache-2.0 and on-device-capable, but does not publish an HBIC-relevant word-mistake benchmark. License and model provenance still need review.

Before enabling Recite, assemble a lawfully usable, consented evaluation corpus with correct and intentionally incorrect everyday phone recordings; run actual audio-to-phoneme inference and word alignment; report ayah/word accuracy, omission/substitution detection, false-positive/negative rates, and latency on physical iOS/Android devices. Do not claim Tajweed or tashkeel accuracy from text transcription alone. Microphone permissions and store privacy answers remain unchanged until a validated architecture and exact data flow exist.

## Release rule

The Quran reader, API expansion, and navigation in this branch are preparatory and **not deployed**. The current production feature gates remain off. No replacement iOS/Android binaries or store submissions may be made until Quran Foundation production content and Recite metrics both pass their gates.
