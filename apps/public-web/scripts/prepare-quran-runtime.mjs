// Deploy only the exact WASM runtime matching our pinned JS package. No model
// or microphone content is bundled or routed through HBIC functions.
import {createRequire} from "node:module";
import {readFile, mkdir, copyFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
const require = createRequire(import.meta.url);
const packagePath = resolve(dirname(require.resolve("onnxruntime-web/wasm")), "../package.json");
const pkg = JSON.parse(await readFile(packagePath, "utf8"));
if (pkg.version !== "1.24.3") throw new Error("Recognition runtime version mismatch.");
const output = resolve(dirname(fileURLToPath(import.meta.url)), "../public/quran-runtime");
await mkdir(output, {recursive: true});
for (const name of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
  await copyFile(resolve(dirname(packagePath), "dist", name), resolve(output, name));
}
