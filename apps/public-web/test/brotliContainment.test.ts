import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import zlib from "node:zlib";
import { installServerBrotliContainment } from "../lib/serverBrotliContainment";

test("already patched servers retain their native decoder and fetch", () => {
  const decode = zlib.brotliDecompressSync;
  const nativeFetch = globalThis.fetch;
  assert.deepEqual(installServerBrotliContainment(), { active: false, mode: "upstream-patched" });
  assert.equal(zlib.brotliDecompressSync, decode);
  assert.equal(globalThis.fetch, nativeFetch);
});

test("unpatched-server containment blocks decoder entry points and real HTTP clients without crashing", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--conditions=react-server", new URL("./fixtures/brotliContainmentProbe.mts", import.meta.url).pathname], {
    encoding: "utf8", timeout: 30000
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout.trim()), { directApisBlocked: 6, httpClients: 4, plainGzipDeflatePassed: 12, brotliAndRedirectBlocked: 8, requestAndAbortPreserved: true });
});

test("both server entry points install containment before route handling", async () => {
  for (const app of ["public-web", "admin-web"]) {
    const source = await readFile(new URL(`../../${app}/instrumentation.ts`, import.meta.url), "utf8");
    assert.match(source, /process\.env\.NEXT_RUNTIME === "nodejs"/);
    assert.match(source, /installServerBrotliContainment\(\)/);
  }
});
