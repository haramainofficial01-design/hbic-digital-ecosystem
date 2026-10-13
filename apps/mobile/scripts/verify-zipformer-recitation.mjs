/** Validate locally downloaded, approved gated assets. Never bypass the access
 * gate, extract browser credentials, fetch user audio or change the app engine. */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { verifyPinnedRecitationAsset } from "./prepare-qwen-recitation.mjs";

export const zipformerRecitationModel = {
  repository: "Quran-Lab/zipformer_p-arabic-v3", revision: "3da514fc833b22c902ee466a7710cf399896f2f0",
  license: "Quran-Lab No-Profit License 1.2", approvalRequired: true,
  files: {
    "LICENSE": { git: "defd34f9748fac0ea9573cc8cec26c5534f8dabf", size: 7041 },
    "README.md": { git: "663a266a2796cec889c222f179ecf703dc9ad9ef", size: 14085 },
    "tokens.txt": { git: "5b0ed53f48819bac097568c596c668aa14d21f50", size: 2346 },
    "zipformer_p_arabic_v3.int8.onnx": { sha256: "6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb", size: 72705392 }
  }
};
export const zipformerRecitationModels = {
  v3: zipformerRecitationModel,
  "v3.1": { ...zipformerRecitationModel, files: {
    LICENSE: zipformerRecitationModel.files.LICENSE,
    "README.md": zipformerRecitationModel.files["README.md"],
    "tokens.txt": zipformerRecitationModel.files["tokens.txt"],
    "zipformer_p_arabic_v3.1.int8.onnx": { sha256: "31755836528da336a6192121cd7bc82cb41752dddb65566fd000b89c8686da6b", size: 72705392 }
  } }
};
export async function verifyZipformerRecitation(variant = "v3") {
  if (!Object.hasOwn(zipformerRecitationModels, variant)) throw Error("Explicit approved model variant required");
  const selected = zipformerRecitationModels[variant];
  const directory = resolve("output/quran-development/zipformer-comparison/assets"), verifiedSha256 = {};
  for (const [name, pin] of Object.entries(selected.files)) verifiedSha256[name] = await verifyPinnedRecitationAsset(resolve(directory, name), pin);
  await writeFile(resolve(directory, variant === "v3" ? "verified-manifest.json" : "verified-manifest-v31.json"), JSON.stringify({ ...selected, variant, verifiedSha256 }, null, 2));
  console.log(JSON.stringify({ verified: true, directory, downloadPerformed: false }));
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) await verifyZipformerRecitation(process.argv[2] ?? "v3");
