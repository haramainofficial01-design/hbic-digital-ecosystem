import { constants } from "node:zlib";
import { nodeRuntimeSecurity } from "../packages/config/src/nodeRuntimeSecurity.ts";

const status = {
  ...nodeRuntimeSecurity(process.versions.node),
  brotliDecoderFixPresent: typeof constants.BROTLI_DECODER_ERROR_FORMAT_BLOCK_SWITCH === "number"
};
console.info("HBIC_BUILD_RUNTIME_SECURITY", JSON.stringify(status));
if (!status.patched || !status.brotliDecoderFixPresent) {
  console.error("A patched Node.js runtime is required. Use Node.js 24.22.1 or a later patched 24.x release for HBIC hosting.");
  process.exitCode = 1;
}
