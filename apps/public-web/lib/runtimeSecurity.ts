import { constants } from "node:zlib";
import { nodeRuntimeSecurity } from "../../../packages/config/src/nodeRuntimeSecurity";

/** Non-secret runtime evidence; never returns environment values or credentials. */
export function runtimeSecurity() {
  return { ...nodeRuntimeSecurity(process.versions.node),
    brotliDecoderFixPresent: "BROTLI_DECODER_ERROR_FORMAT_BLOCK_SWITCH" in constants && typeof constants.BROTLI_DECODER_ERROR_FORMAT_BLOCK_SWITCH === "number" };
}
