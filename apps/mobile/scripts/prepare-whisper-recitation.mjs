/** Explicit local comparisons with pinned upstream assets. No API/account, audio
 * upload, application dependency, release configuration or native model change. */
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { downloadQwenRanges, verifyPinnedRecitationAsset } from "./prepare-qwen-recitation.mjs";

export const whisperRecitationModel = {
  repository: "openai/whisper-large-v3-turbo", revision: "41f01f3fe87f28c78e2fbf8b568835947dd65ed9", license: "MIT",
  files: {
    "README.md": { git: "0bbe30273338d7e19f779c1343808e32617e64d1", size: 21196 },
    "config.json": { git: "ad2f44ff1ed66e12765b2392dc041469db91a462", size: 1256 },
    "generation_config.json": { git: "cbe752958dc3e4671b0e0220aa1c545423a6d5f5", size: 3772 },
    "merges.txt": { git: "6038932a2a1f09a66991b1c2adae0d14066fa29e", size: 493869 },
    "model.safetensors": { sha256: "542566a422ae4f3fd23f1ba11add198fca01bbf82e66e6a2857b3f608b1eb9d1", size: 1617824864 },
    "normalizer.json": { git: "dd6ae819ad738ac1a546e9f9282ef325c33b9ea0", size: 52666 },
    "preprocessor_config.json": { git: "931c77a740890c46365c7ae0c9d350ba3cca908f", size: 340 },
    "tokenizer.json": { git: "17456db595adc78a973f97d69d8cb50bc87c0b1c", size: 2710337 },
    "tokenizer_config.json": { git: "06ffdc8308eae6bb7bd1fdd81e94b0a881a539ab", size: 282843 },
    "vocab.json": { git: "0f3456460629e21d559c6daa23ab6ce3644e8271", size: 1036558 }
  }
};
// ASR only: no reciter classifier, identity mapping or canonical-text matching
// assets. Research use is governed by the publisher's CC BY-NC 4.0 terms.
export const tadaburRecitationModel = {
  repository: "rakansuliman/tadabur-whisper-medium", revision: "e82c2d827ad0df27e31042f7fb87c73df1da2c8b", license: "CC-BY-NC-4.0",
  files: {
    "README.md": { git: "7fdd598a58641263fe9aae0fa4e1c33839fc48e1", size: 16007 },
    "added_tokens.json": { git: "e3d256c988462aa153dcabe2aa38b8e9b436c06f", size: 34604 },
    "config.json": { git: "476e0c6199b7a18f3af9d65f9be613e5684c942d", size: 1297 },
    "generation_config.json": { git: "33f9518292f034a00beeeaa821d1d7f4b021ccb3", size: 2940 },
    "merges.txt": { git: "6038932a2a1f09a66991b1c2adae0d14066fa29e", size: 493869 },
    "model.safetensors": { sha256: "9e3e7472373fa6570350e0c67c624307b18a35b2efee62cb00d6f46b944b6f27", size: 3055544304 },
    "normalizer.json": { git: "dd6ae819ad738ac1a546e9f9282ef325c33b9ea0", size: 52666 },
    "preprocessor_config.json": { git: "91876762a536a746d268353c5cba57286e76b058", size: 339 },
    "processor_config.json": { git: "8f4a2ece16dab84436c57d685719ddd2e6a9927c", size: 409 },
    "special_tokens_map.json": { git: "bf69932dca4b3719b59fdd8f6cc1978109509f6c", size: 2194 },
    "tokenizer.json": { git: "7e30a8ca85fc59e4ce975a4e6d488771714891fb", size: 3930494 },
    "tokenizer_config.json": { git: "d13b786c04765fb1a06492b53587752cd67665ea", size: 282683 },
    "vocab.json": { git: "90e797dd4fd05d9dea443d702ca06be2463c5f2f", size: 1036584 }
  }
};
export const whisperRecitationModels = { "whisper-turbo": whisperRecitationModel, "tadabur-medium": tadaburRecitationModel };
export async function prepareWhisperRecitation(variant = "whisper-turbo") {
  if (!Object.hasOwn(whisperRecitationModels, variant)) throw Error("Explicit pinned Whisper comparison required");
  const selected = whisperRecitationModels[variant];
  const directory = resolve(`output/quran-development/${variant}-comparison/assets`);
  await mkdir(directory, { recursive: true });
  const verified = {};
  for (const [name, expected] of Object.entries(selected.files)) {
    const file = resolve(directory, name), temporary = `${file}.download`;
    try { verified[name] = await verifyPinnedRecitationAsset(file, expected); continue; } catch { /* Separate verified replacement only. */ }
    let resumeAt = (await stat(temporary).catch(() => ({ size: 0 }))).size;
    if (resumeAt >= expected.size) resumeAt = 0;
    const url = `https://huggingface.co/${selected.repository}/resolve/${selected.revision}/${name}`;
    if (!resumeAt) await writeFile(temporary, new Uint8Array());
    console.log(JSON.stringify({ downloading: name, bytes: expected.size, resumeAt }));
    if (expected.size > 8 * 1024 * 1024) await downloadQwenRanges(url, temporary, expected.size, resumeAt);
    else {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw Error(`Official comparison asset HTTP ${response.status}`);
      if (Number(response.headers.get("content-length")) > expected.size) throw Error("Asset exceeds pinned bound");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length !== expected.size) throw Error("Unexpected comparison asset length");
      await writeFile(temporary, bytes);
    }
    verified[name] = await verifyPinnedRecitationAsset(temporary, expected);
    await rename(temporary, file);
  }
  await writeFile(resolve(directory, "verified-manifest.json"), JSON.stringify({ ...selected, verifiedSha256: verified }, null, 2));
  console.log(JSON.stringify({ ready: true, modelSha256: verified["model.safetensors"] }));
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) await prepareWhisperRecitation(process.argv[2]);
