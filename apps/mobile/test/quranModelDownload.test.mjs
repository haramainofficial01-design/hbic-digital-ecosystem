/** Transport/provenance regressions only; none of these are ASR accuracy evidence. */
import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { downloadQwenRanges, qwenComparisonDirectory, qwenRecitationModels } from "../scripts/prepare-qwen-recitation.mjs";

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
