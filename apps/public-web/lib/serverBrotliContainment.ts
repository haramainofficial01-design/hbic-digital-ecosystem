import zlib from "node:zlib";
import { syncBuiltinESMExports } from "node:module";
import { Transform } from "node:stream";
import { nodeRuntimeSecurity } from "../../../packages/config/src/nodeRuntimeSecurity";

const stateKey = Symbol.for("hbic.server.brotli-containment.v1");
type State = { active: boolean; mode: "upstream-patched" | "decoder-blocked" };
const processState = globalThis as typeof globalThis & { [stateKey]?: State };

function blockedError() {
  return Object.assign(new Error("Brotli decoding is disabled until the server runtime security patch is present."), {
    code: "HBIC_BROTLI_DECODING_BLOCKED"
  });
}

/** Application containment only; it does not patch Node or cover native addons.
 * Install during Next's startup registration, before application routes load.
 * This never reads input into the vulnerable native Brotli decoder.
 */
export function installServerBrotliContainment(evidence = {
  patched: nodeRuntimeSecurity(process.versions.node).patched,
  decoderFixPresent: typeof Reflect.get(zlib.constants, "BROTLI_DECODER_ERROR_FORMAT_BLOCK_SWITCH") === "number"
}): State {
  if (processState[stateKey]) return { ...processState[stateKey] };
  if (evidence.patched && evidence.decoderFixPresent) {
    processState[stateKey] = { active: false, mode: "upstream-patched" };
    return { ...processState[stateKey] };
  }

  function blockedStream() {
    // An erroring stream preserves fetch/SDK error propagation: throwing from
    // an HTTP response listener could otherwise become an uncaught exception.
    return new Transform({
      transform(_chunk, _encoding, callback) { setImmediate(() => callback(blockedError())); },
      flush(callback) { setImmediate(() => callback(blockedError())); }
    });
  }
  function blockedAsync(...args: unknown[]) {
    const callback = args.at(-1);
    if (typeof callback !== "function") throw blockedError();
    queueMicrotask(() => callback(blockedError()));
  }
  function blockedSync() { throw blockedError(); }
  const replacements = {
    createBrotliDecompress: blockedStream,
    BrotliDecompress: blockedStream,
    brotliDecompress: blockedAsync,
    brotliDecompressSync: blockedSync
  };
  for (const [name, value] of Object.entries(replacements)) {
    Object.defineProperty(zlib, name, { value, enumerable: true, configurable: false, writable: false });
  }
  // Keep existing ESM named imports in sync with the CommonJS builtin object.
  syncBuiltinESMExports();

  const originalFetch = globalThis.fetch;
  if (typeof originalFetch === "function") {
    globalThis.fetch = function fetchWithoutBrotli(input, init) {
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      headers.set("accept-encoding", "gzip, deflate");
      // Preserve method, body, auth, cache/revalidation, signal and redirects.
      return originalFetch(input, { ...init, headers });
    };
  }
  for (const [name, value] of Object.entries(replacements)) {
    if (Reflect.get(zlib, name) !== value) throw new Error("Unable to install server Brotli containment.");
  }
  try {
    zlib.brotliDecompressSync(Buffer.alloc(0));
    throw new Error("Server Brotli containment self-check failed.");
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "HBIC_BROTLI_DECODING_BLOCKED")) throw error;
  }
  processState[stateKey] = { active: true, mode: "decoder-blocked" };
  return { ...processState[stateKey] };
}

export function serverBrotliContainmentStatus() {
  return processState[stateKey] ? { ...processState[stateKey] } : { active: false, mode: "not-installed" as const };
}
