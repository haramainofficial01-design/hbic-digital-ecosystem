import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { brotliCompressSync, brotliDecompressSync } from "node:zlib";
import { runtimeSecurity } from "../lib/runtimeSecurity";
import { GET } from "../app/api/admin/diagnostics/route";

test("the executing runtime has the upstream security patch and safe Brotli decoding", () => {
  const status = runtimeSecurity();
  assert.equal(status.patched, true);
  assert.equal(status.brotliDecoderFixPresent, true);
  assert.equal(brotliDecompressSync(brotliCompressSync("HBIC safe runtime check")).toString(), "HBIC safe runtime check");
  assert.deepEqual(Object.keys(status).sort(), ["advisory", "brotliDecoderFixPresent", "minimumPatchedVersion", "nodeVersion", "patched", "policyDate", "supported"]);
});

test("unauthenticated callers cannot read diagnostics or the server runtime", async () => {
  const response = await GET(new Request("https://hbic.ca/api/admin/diagnostics"));
  assert.ok([401, 503].includes(response.status));
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.diagnostics, undefined);
  assert.equal(JSON.stringify(body).includes(process.versions.node), false);
});

test("hosting remains pinned to patched Node 24 and both app build/start paths enforce the runtime check", async () => {
  const root = new URL("../../../", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.equal(manifest.engines.node, ">=24.22.1 <25");
  assert.equal((await readFile(new URL(".nvmrc", root), "utf8")).trim(), "24.22.1");
  for (const app of ["public-web", "admin-web"]) {
    const appManifest = JSON.parse(await readFile(new URL(`apps/${app}/package.json`, root), "utf8"));
    for (const action of ["dev", "build", "start"]) assert.ok(appManifest.scripts[action].startsWith("node ../../scripts/check-node-runtime.mjs && "));
  }
});
