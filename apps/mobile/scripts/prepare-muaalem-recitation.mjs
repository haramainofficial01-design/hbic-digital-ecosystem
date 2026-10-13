/** Explicit offline experiment: official MIT-tagged phoneme weights, no user
 * recordings, expected-answer decoder prompt, native dependency or release flag. */
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { downloadQwenRanges, verifyPinnedRecitationAsset } from "./prepare-qwen-recitation.mjs";

export const muaalemRecitationModel = {
  repository: "obadx/muaalem-model-v3_2", revision: "01a1ef9fbe40d144ef845101e89ff924aed3fef5", license: "MIT (publisher model metadata)",
  files: {
    "README.md": { git: "55dc3c8658188bb99cc790e188bf30120465bb16", size: 5465 },
    "config.json": { git: "14f2fea5b796d638136a96d87474dfa5657fbd97", size: 2183 },
    "model.safetensors": { sha256: "6b6a2e85303d17ff0f3af5e1fc79ac83daecee409c756ddf27f0ced59393bb41", size: 2423124012 },
    "preprocessor_config.json": { git: "5db61951cdf5edab6337fd84ee619500c27aaa3d", size: 275 },
    "vocab.json": { git: "0f3243cbca95a345be319f91cf05d330827f13e3", size: 1532 }
  }
};
export async function prepareMuaalemRecitation() {
  const directory = resolve("output/quran-development/muaalem-comparison/assets");
  await mkdir(directory, { recursive: true });
  const verified = {};
  for (const [name, expected] of Object.entries(muaalemRecitationModel.files)) {
    const file = resolve(directory, name);
    try { verified[name] = await verifyPinnedRecitationAsset(file, expected); continue; } catch { /* Own generated download only. */ }
    const temporary = `${file}.download`;
    let resumeAt = (await stat(temporary).catch(() => ({ size: 0 }))).size;
    if (resumeAt >= expected.size) resumeAt = 0;
    if (!resumeAt) await writeFile(temporary, new Uint8Array());
    const url = `https://huggingface.co/${muaalemRecitationModel.repository}/resolve/${muaalemRecitationModel.revision}/${name}`;
    console.log(JSON.stringify({ downloading: name, bytes: expected.size, resumeAt }));
    await downloadQwenRanges(url, temporary, expected.size, resumeAt);
    verified[name] = await verifyPinnedRecitationAsset(temporary, expected);
    await rename(temporary, file);
  }
  await writeFile(resolve(directory, "verified-manifest.json"), JSON.stringify({ ...muaalemRecitationModel, verifiedSha256: verified }, null, 2));
  console.log(JSON.stringify({ ready: true, directory, modelSha256: verified["model.safetensors"] }));
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) await prepareMuaalemRecitation();
