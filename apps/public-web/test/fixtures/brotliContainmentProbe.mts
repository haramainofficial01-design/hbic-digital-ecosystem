import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createRequire } from "node:module";
import zlib, { brotliDecompressSync as existingNamedDecoder } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { installServerBrotliContainment, serverBrotliContainmentStatus } from "../../lib/serverBrotliContainment";

const require = createRequire(import.meta.url);
const legacyFetch = require("node-fetch"); // Load before installing containment.
const undici = require("undici");
const previouslyLoadedNativeFetch = globalThis.fetch;
await previouslyLoadedNativeFetch("data:text/plain,HBIC startup fixture");
const body = Buffer.from("HBIC ordinary compressed response");
const fixtures = { br: zlib.brotliCompressSync(body), gzip: zlib.gzipSync(body), deflate: zlib.deflateSync(body) };
const gzipDecoder = zlib.createGunzip;
const compression = zlib.brotliCompressSync;
const blocked = { code: "HBIC_BROTLI_DECODING_BLOCKED" };
assert.equal(serverBrotliContainmentStatus().mode, "not-installed");
assert.deepEqual(installServerBrotliContainment({ patched: false, decoderFixPresent: false }), { active: true, mode: "decoder-blocked" });
assert.deepEqual(installServerBrotliContainment(), { active: true, mode: "decoder-blocked" });
assert.throws(() => zlib.brotliDecompressSync(fixtures.br), blocked);
assert.throws(() => existingNamedDecoder(fixtures.br), blocked);
await new Promise<void>(resolve => zlib.brotliDecompress(fixtures.br, error => {
  assert.equal((error as NodeJS.ErrnoException).code, blocked.code);
  resolve();
}));
for (const decoder of [zlib.createBrotliDecompress(), new zlib.BrotliDecompress()]) {
  await assert.rejects(pipeline(Readable.from([fixtures.br]), decoder), blocked);
}
await assert.rejects(pipeline(Readable.from([]), zlib.createBrotliDecompress()), blocked);
assert.equal(zlib.createGunzip, gzipDecoder);
assert.equal(zlib.brotliCompressSync, compression);
assert.deepEqual(zlib.gunzipSync(fixtures.gzip), body);

const server = createServer(async (request, response) => {
  if (request.url === "/redirect") { response.writeHead(302, { location: "/br" }).end(); return; }
  if (request.url === "/echo") {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk);
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ method: request.method, headers: request.headers, body: Buffer.concat(chunks).toString() }));
    return;
  }
  const encoding = request.url?.slice(1) as keyof typeof fixtures;
  const encoded = fixtures[encoding];
  if (encoded) response.setHeader("content-encoding", encoding);
  response.end(encoded ?? body);
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address === "object");
const base = `http://127.0.0.1:${address.port}`;
try {
  for (const client of [fetch, previouslyLoadedNativeFetch, legacyFetch, undici.fetch]) {
    for (const encoding of ["plain", "gzip", "deflate"]) {
      assert.equal(await (await client(`${base}/${encoding}`)).text(), body.toString());
    }
    for (const encoding of ["br", "redirect"]) {
      // These fixtures are ordinary valid Brotli, not exploit payloads.
      await assert.rejects(async () => (await client(`${base}/${encoding}`)).text(), (error: unknown) => {
        const candidate = error as { code?: string; message?: string; cause?: { code?: string } };
        return candidate.code === blocked.code || candidate.cause?.code === blocked.code || Boolean(candidate.message?.includes("Brotli decoding is disabled"));
      });
    }
  }
  const request = new Request(`${base}/echo`, { method: "POST", body: "safe fixture", headers: { authorization: "Bearer fixture", "x-fixture": "preserved" } });
  const echoed = await (await fetch(request, { cache: "no-store", signal: AbortSignal.timeout(5000) })).json();
  assert.equal(echoed.method, "POST");
  assert.equal(echoed.body, "safe fixture");
  assert.equal(echoed.headers.authorization, "Bearer fixture");
  assert.equal(echoed.headers["x-fixture"], "preserved");
  assert.equal(echoed.headers["accept-encoding"], "gzip, deflate");
  await assert.rejects(fetch(`${base}/echo`, { signal: AbortSignal.abort() }), { name: "AbortError" });
  console.log(JSON.stringify({ directApisBlocked: 6, httpClients: 4, plainGzipDeflatePassed: 12, brotliAndRedirectBlocked: 8, requestAndAbortPreserved: true }));
} finally {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await undici.getGlobalDispatcher().close();
}
