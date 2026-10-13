/** Transport/provenance regressions only; none of these are ASR accuracy evidence. */
import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { downloadQwenRanges, qwenComparisonDirectory, qwenRecitationModels, verifyPinnedRecitationAsset } from "../scripts/prepare-qwen-recitation.mjs";
import { muaalemRecitationModel } from "../scripts/prepare-muaalem-recitation.mjs";
import { whisperRecitationModel } from "../scripts/prepare-whisper-recitation.mjs";
import { wav2vecQuranModel } from "../scripts/prepare-wav2vec-quran.mjs";
import { zipformerRecitationModel, zipformerRecitationModels } from "../scripts/verify-zipformer-recitation.mjs";

test("approved gated streaming assets retain their no-profit license and exact model pin", () => {
  assert.equal(zipformerRecitationModel.approvalRequired, true);
  assert.equal(zipformerRecitationModel.license, "Quran-Lab No-Profit License 1.2");
  assert.equal(zipformerRecitationModel.revision, "3da514fc833b22c902ee466a7710cf399896f2f0");
  assert.equal(zipformerRecitationModel.files["zipformer_p_arabic_v3.int8.onnx"].sha256, "6a5ddafa9c5e5c01260d30264031b341785bdc152e9ef1d569b41c8c278508eb");
  assert.ok(zipformerRecitationModel.files.LICENSE.git);
  assert.equal(zipformerRecitationModels["v3.1"].files["zipformer_p_arabic_v3.1.int8.onnx"].sha256, "31755836528da336a6192121cd7bc82cb41752dddb65566fd000b89c8686da6b");
});

test("the independent Quran character CTC experiment pins safe public assets", () => {
  assert.equal(wav2vecQuranModel.repository, "rabah2026/wav2vec2-large-xlsr-53-arabic-quran-v_final");
  assert.equal(wav2vecQuranModel.license, "Apache-2.0");
  assert.equal(wav2vecQuranModel.revision, "b03a268c6ba1a693752307325ab376c86c3b12da");
  assert.equal(wav2vecQuranModel.files["model.safetensors"].sha256, "bf65674a26eb4ef7042cedade96c3c8f8cbd04f3a7d1a68eadceec8ed0f99ecb");
  assert.equal(Object.keys(wav2vecQuranModel.files).length, 7);
  for (const [name, pin] of Object.entries(wav2vecQuranModel.files)) {
    assert.match(name, /^[a-z_]+\.(?:md|json|safetensors)$/i);
    assert.ok(Number.isSafeInteger(pin.size) && pin.size > 0);
    assert.match(pin.git ?? pin.sha256, /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/);
  }
});

test("only explicit official model pins and ignored comparison paths are accepted", () => {
  assert.throws(() => qwenComparisonDirectory("../../production"), /pinned/);
  assert.throws(() => qwenComparisonDirectory("constructor"), /pinned/);
  for (const [variant, model] of Object.entries(qwenRecitationModels)) {
    assert.match(qwenComparisonDirectory(variant), /\/output\/quran-development\//);
    assert.equal(model.license, "Apache-2.0");
    assert.equal(model.repository, `Qwen/Qwen3-ASR-${variant}-hf`);
    assert.match(model.revision, /^[a-f0-9]{40}$/);
    assert.match(model.files["model.safetensors"].sha256, /^[a-f0-9]{64}$/);
    assert.equal(Object.keys(model.files).length, 8);
  }
  assert.equal(muaalemRecitationModel.repository, "obadx/muaalem-model-v3_2");
  assert.equal(muaalemRecitationModel.revision, "01a1ef9fbe40d144ef845101e89ff924aed3fef5");
  assert.equal(muaalemRecitationModel.files["model.safetensors"].sha256, "6b6a2e85303d17ff0f3af5e1fc79ac83daecee409c756ddf27f0ced59393bb41");
});

test("the additional local transcription baseline pins official MIT safetensors, not remote code or an API", () => {
  assert.equal(whisperRecitationModel.repository, "openai/whisper-large-v3-turbo");
  assert.equal(whisperRecitationModel.license, "MIT");
  assert.equal(whisperRecitationModel.revision, "41f01f3fe87f28c78e2fbf8b568835947dd65ed9");
  assert.equal(whisperRecitationModel.files["model.safetensors"].sha256, "542566a422ae4f3fd23f1ba11add198fca01bbf82e66e6a2857b3f608b1eb9d1");
  assert.equal(Object.keys(whisperRecitationModel.files).length, 10);
  for (const [name, pin] of Object.entries(whisperRecitationModel.files)) {
    assert.match(name, /^[a-z_]+\.(?:md|json|txt|safetensors)$/i);
    assert.ok(Number.isSafeInteger(pin.size) && pin.size > 0);
    assert.match(pin.git ?? pin.sha256, /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/);
  }
});

test("complete assets must match both pinned byte length and digest before loading", async () => {
  await withDownloadServer((_request, response) => { response.writeHead(500); response.end(); }, async (_url, file) => {
    const bytes = Buffer.from("controlled integrity test");
    await writeFile(file, bytes);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const git = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    assert.equal(await verifyPinnedRecitationAsset(file, { size: bytes.length, sha256, git }), sha256);
    await assert.rejects(verifyPinnedRecitationAsset(file, { size: bytes.length + 1, sha256 }), /length/);
    await assert.rejects(verifyPinnedRecitationAsset(file, { size: bytes.length, sha256: "0".repeat(64) }), /integrity/);
    await assert.rejects(verifyPinnedRecitationAsset(file, { size: bytes.length, git: "0".repeat(40) }), /integrity/);
  });
});

async function withDownloadServer(responder, operation) {
  const server = createServer(responder);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const directory = await mkdtemp(join(tmpdir(), "hbic-model-transport-test-"));
  try { await operation(`http://127.0.0.1:${server.address().port}/model`, join(directory, "controlled-test.download")); }
  finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true }); // Owned temporary transport-test directory only.
  }
}

test("parallel range completion remains ordered and a verified prefix can resume", async () => {
  const source = Buffer.from("0123456789abcdefghijklmnop");
  const requests = [];
  await withDownloadServer((request, response) => {
    const match = /^bytes=(\d+)-(\d+)$/.exec(request.headers.range ?? "");
    assert.ok(match); const a = Number(match[1]), b = Number(match[2]); requests.push([a, b]);
    setTimeout(() => { response.writeHead(206, { "content-range": `bytes ${a}-${b}/${source.length}` }); response.end(source.subarray(a, b + 1)); }, a === 3 ? 30 : 0);
  }, async (url, file) => {
    await writeFile(file, source.subarray(0, 3));
    await downloadQwenRanges(url, file, source.length, 3, 4);
    assert.deepEqual(await readFile(file), source);
    assert.ok(requests.every(([a]) => a >= 3));
    const count = requests.length;
    await downloadQwenRanges(url, file, source.length, source.length, 4);
    assert.equal(requests.length, count);
  });
});

test("ignored range requests and wrong byte ranges cannot be written into model assets", async () => {
  for (const status of [200, 206]) await withDownloadServer((_request, response) => {
    response.writeHead(status, { "content-range": "bytes 1-4/9" }); response.end("wrong");
  }, async (url, file) => {
    await writeFile(file, "abc");
    await assert.rejects(downloadQwenRanges(url, file, 9, 3, 3), /range/);
    assert.equal((await readFile(file)).toString(), "abc");
  });
});

test("truncated ranges, oversized bodies and changed resume prefixes fail safely", async () => {
  for (const body of ["x", "toolong"]) await withDownloadServer((request, response) => {
    const [, a, b] = /^bytes=(\d+)-(\d+)$/.exec(request.headers.range);
    response.writeHead(206, { "content-range": `bytes ${a}-${b}/9` }); response.end(body);
  }, async (url, file) => {
    await writeFile(file, "abc");
    await assert.rejects(downloadQwenRanges(url, file, 9, 3, 3), /Truncated|exceeds/);
    assert.equal((await readFile(file)).toString(), "abc");
    await assert.rejects(downloadQwenRanges(url, file, 9, 2, 3), /prefix changed/);
  });
});
