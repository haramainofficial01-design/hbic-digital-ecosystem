/** Development-only, pinned Apache-2.0 Quran CTC comparison. No account,
 * private audio, network inference, remote code or application model change. */
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { downloadQwenRanges, verifyPinnedRecitationAsset } from "./prepare-qwen-recitation.mjs";

export const wav2vecQuranModel = {
  repository: "rabah2026/wav2vec2-large-xlsr-53-arabic-quran-v_final",
  revision: "b03a268c6ba1a693752307325ab376c86c3b12da", license: "Apache-2.0",
  files: {
    "README.md": { git: "15a9d297f096f8f3709d72a5b274e085e0e15683", size: 1645 },
    "config.json": { git: "0b23d8ed4a80f1fdb3fe60ddc5dc8226f24d630e", size: 2244 },
    "model.safetensors": { sha256: "bf65674a26eb4ef7042cedade96c3c8f8cbd04f3a7d1a68eadceec8ed0f99ecb", size: 1262037080 },
    "preprocessor_config.json": { git: "67dee51bf073271c3a11d2a8768d86288a0d9f83", size: 256 },
    "special_tokens_map.json": { git: "fdafe480f024ff444c7492147536765ce5d55a2d", size: 96 },
    "tokenizer_config.json": { git: "89a68a83cd6c13744918cf2f5a8dfde2519f7321", size: 1120 },
    "vocab.json": { git: "70932512afc26a2a5aeeb57dc42d7aed908f636e", size: 672 }
  }
};
export async function prepareWav2vecQuran() {
  const directory = resolve("output/quran-development/wav2vec-quran-comparison/assets");
  await mkdir(directory, { recursive: true });
  const verified = {};
  for (const [name, expected] of Object.entries(wav2vecQuranModel.files)) {
    const file = resolve(directory, name), temporary = `${file}.download`;
    try { verified[name] = await verifyPinnedRecitationAsset(file, expected); continue; } catch { /* Verify a separate replacement. */ }
    let resumeAt = (await stat(temporary).catch(() => ({ size: 0 }))).size;
    if (resumeAt >= expected.size) resumeAt = 0;
    if (!resumeAt) await writeFile(temporary, new Uint8Array());
    console.log(JSON.stringify({ downloading: name, bytes: expected.size, resumeAt }));
    const url = `https://huggingface.co/${wav2vecQuranModel.repository}/resolve/${wav2vecQuranModel.revision}/${name}`;
    if (expected.size > 8 * 1024 * 1024) await downloadQwenRanges(url, temporary, expected.size, resumeAt);
    else {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw Error(`Pinned Quran asset HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length !== expected.size) throw Error("Unexpected pinned Quran asset size");
      await writeFile(temporary, bytes);
    }
    verified[name] = await verifyPinnedRecitationAsset(temporary, expected);
    await rename(temporary, file);
  }
  await writeFile(resolve(directory, "verified-manifest.json"), JSON.stringify({ ...wav2vecQuranModel, verifiedSha256: verified }, null, 2));
  console.log(JSON.stringify({ ready: true, modelSha256: verified["model.safetensors"] }));
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) await prepareWav2vecQuran();
