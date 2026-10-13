/** Explicit development download of official, pinned Apache-2.0 ASR assets.
 * No credentials, gated weights, audio uploads or application configuration. */
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { appendFile, mkdir, rename, stat, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import { resolve } from "node:path";

export const qwenRecitationModel = {
  repository: "Qwen/Qwen3-ASR-0.6B-hf", revision: "7f1569a48a89f3e3f4dc3a5c9d28bddd903bc76c", license: "Apache-2.0",
  files: {
    "README.md": { git: "6bd0dfad309578014c4f1c669c23e5a3fdb4e849", size: 16538 },
    "chat_template.jinja": { git: "491fff331513a97316daf53591c7b9b9da53ef8c", size: 1434 },
    "config.json": { git: "3b4221f651b59ec21f545e5852b4d6cb23420b09", size: 2398 },
    "generation_config.json": { git: "3ed98c80087572bad932a83279c5602e58bbfc5c", size: 165 },
    "model.safetensors": { sha256: "d3f212dd20abecd315d830bc54ae3865e56ebfc3276484e57b771288ba27fd35", size: 1564928088 },
    "processor_config.json": { git: "a07dff48032bed341260501d6688036c6fd7f3ef", size: 487 },
    "tokenizer.json": { sha256: "fe1fad59be22a41ee293363fcf95fdedbc7c93f3b49270b1d2e18bd1399a7a05", size: 11429653 },
    "tokenizer_config.json": { git: "aa62b6c06ab8a704dc0895420fb1d2515954a49c", size: 998 }
  }
};
export const qwenRecitationModels = {
  "0.6B": qwenRecitationModel,
  "1.7B": {
    repository: "Qwen/Qwen3-ASR-1.7B-hf", revision: "bcd2b5b7f32b480ab5790554cfa8347f246a14f3", license: "Apache-2.0",
    files: {
      ...qwenRecitationModel.files,
      "README.md": { git: "e5bb005ab9a6445c7b1a91c6b250855f5d8e4bbd", size: 16538 },
      "config.json": { git: "331292992b1933c69fc83d77f0de560ab122a0d5", size: 2399 },
      "model.safetensors": { sha256: "2db53c7d81bd9b8cbc6a074e89be2c968a0d373fb4ee68bb1b1e14f7042dfee1", size: 4076193080 }
    }
  }
};
export function qwenComparisonDirectory(variant) {
  if (!Object.hasOwn(qwenRecitationModels, variant)) throw Error("Explicit pinned Qwen model variant required");
  return resolve(`output/quran-development/${variant === "0.6B" ? "qwen-comparison" : "qwen-1.7b-comparison"}`);
}
export async function verifyPinnedRecitationAsset(file, expected) {
  if ((await stat(file)).size !== expected.size) throw Error("Unexpected official model file length");
  const sha256 = createHash("sha256"), git = createHash("sha1").update(`blob ${expected.size}\0`);
  for await (const chunk of createReadStream(file)) { sha256.update(chunk); git.update(chunk); }
  const digest = sha256.digest("hex"), oid = git.digest("hex");
  if ((expected.sha256 && digest !== expected.sha256) || (expected.git && oid !== expected.git)) throw Error("Official asset integrity mismatch");
  return digest;
}
/** Bounded parallel ranges accelerate the large official weights without
 * creating duplicate weight files. Commit each range in order: any interrupted
 * transfer remains a contiguous prefix that can safely resume. The caller still
 * verifies the complete pinned SHA-256 before renaming or loading anything. */
export async function downloadQwenRanges(url, file, size, resumeAt = 0, chunkBytes = 8 * 1024 * 1024) {
  if (!Number.isSafeInteger(size) || size < 1 || !Number.isSafeInteger(resumeAt) || resumeAt < 0 || resumeAt > size
    || !Number.isSafeInteger(chunkBytes) || chunkBytes < 1 || chunkBytes > 8 * 1024 * 1024) throw Error("Invalid download bounds");
  if ((await stat(file).catch(() => ({ size: 0 }))).size !== resumeAt) throw Error("Resume prefix changed");
  for (let start = resumeAt; start < size;) {
    const group = [];
    for (let index = 0; index < 4 && start + index * chunkBytes < size; index++) {
      const a = start + index * chunkBytes, b = Math.min(size - 1, a + chunkBytes - 1);
      group.push({ a, b });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const chunks = await Promise.all(group.map(async ({ a, b }) => {
        const response = await fetch(url, { headers: { Range: `bytes=${a}-${b}` }, signal: controller.signal });
        if (response.status !== 206 || response.headers.get("content-range") !== `bytes ${a}-${b}/${size}` || !response.body) throw Error("Unexpected bounded asset range");
        const chunk = Buffer.alloc(b - a + 1); let received = 0;
        for await (const bytes of response.body) {
          if (received + bytes.length > chunk.length) throw Error("Range exceeds pinned byte bound");
          chunk.set(bytes, received); received += bytes.length;
        }
        if (received !== chunk.length) throw Error("Truncated asset range");
        return chunk;
      }));
      // Never write out-of-order holes or depend on a sparse file's length.
      for (const chunk of chunks) { await appendFile(file, chunk); start += chunk.length; chunk.fill(0); }
      console.log(JSON.stringify({ downloadedBytes: start, totalBytes: size }));
    } finally { clearTimeout(timeout); controller.abort(); }
  }
}
export async function prepareQwenRecitation(variant = "0.6B") {
  const selected = qwenRecitationModels[variant];
  const directory = resolve(qwenComparisonDirectory(variant), "assets");
  await mkdir(directory, { recursive: true });
  const verified = {};
  for (const [name, expected] of Object.entries(selected.files)) {
    const file = resolve(directory, name);
    try { verified[name] = await verifyPinnedRecitationAsset(file, expected); continue; } catch { /* Download a separate temporary artifact. */ }
    const temporary = `${file}.download`;
    let resumeAt = 0;
    try { resumeAt = (await stat(temporary)).size; } catch { /* First download. */ }
    if (resumeAt >= expected.size) resumeAt = 0;
    console.log(JSON.stringify({ downloading: name, bytes: expected.size, resumeAt }));
    const url = `https://huggingface.co/${selected.repository}/resolve/${selected.revision}/${name}`;
    if (expected.size > 256 * 1024 * 1024) {
      if (resumeAt === 0) await writeFile(temporary, new Uint8Array());
      await downloadQwenRanges(url, temporary, expected.size, resumeAt);
      verified[name] = await verifyPinnedRecitationAsset(temporary, expected);
      await rename(temporary, file);
      continue;
    }
    const response = await fetch(url, {
      headers: resumeAt ? { Range: `bytes=${resumeAt}-` } : {}, signal: AbortSignal.timeout(1_200_000)
    });
    if (!response.ok || !response.body) throw Error(`Official asset HTTP ${response.status}`);
    if (response.status === 206) {
      const range = response.headers.get("content-range");
      if (range !== `bytes ${resumeAt}-${expected.size - 1}/${expected.size}`) throw Error("Unexpected resumed asset range");
    } else resumeAt = 0;
    let received = resumeAt;
    const bounded = new Transform({ transform(chunk, _encoding, done) {
      received += chunk.length;
      done(received > expected.size ? Error("Asset transfer exceeds pinned bound") : null, chunk);
    } });
    await pipeline(Readable.fromWeb(response.body), bounded, createWriteStream(temporary, { flags: resumeAt ? "a" : "w" }));
    verified[name] = await verifyPinnedRecitationAsset(temporary, expected);
    await rename(temporary, file);
  }
  const manifest = { ...selected, verifiedSha256: verified };
  await writeFile(resolve(directory, "verified-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ ready: true, directory, modelSha256: verified["model.safetensors"] }));
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) await prepareQwenRecitation(process.argv[2] ?? "0.6B");
