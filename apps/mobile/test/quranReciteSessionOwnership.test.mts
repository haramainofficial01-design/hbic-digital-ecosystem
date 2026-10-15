/** Controlled native setup failures. These do not measure speech accuracy. */
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createContext, runInContext } from "node:vm";

const root = path.resolve(import.meta.dirname, "../../..");
const source = path.join(root, "apps/mobile/src/quran/reciteAssistEngine.ts");
const hashes = Object.fromEntries(Object.entries({
  "fastconformer_full_mixed.onnx": "4767182cd92975869f81a7e32700b14ca2b04e8dc97a15ff220a8697f4639488",
  "vocab.json": "c55877f3bff8bc3aaefc160e8c2fb88cb349088d092513d40210ccfe535e671b",
  "quran_ctc_tokens.json": "96aa32d188d075598536fcbb936dc793466fce2a8da331e48f15932022f4dce8",
  "quran.json": "6e6f31f642c701b49a1ba090311ca4c7a97c6a5b79a302712dff815a9d7b3d03"
}));

async function controlledEngine() {
  const state = { hashes, failVocab: false, failDecoder: false, failRelease: false, opened: 0, released: 0 };
  const mocks: Record<string, string> = {
    "expo-file-system": `export const Paths={document:"/controlled"};
      export class Directory {exists=true;create(){}}
      export class File {constructor(_dir,name){this.name=name;this.uri="file:///controlled/"+name;this.exists=true}
        async text(){return globalThis.state.failVocab&&this.name==="vocab.json"?"{invalid":"{}"}}`,
    "expo-modules-core": `export const requireOptionalNativeModule=()=>({sha256File:async uri=>globalThis.state.hashes[uri.split("/").at(-1)]});`,
    "@noble/hashes/sha256": `export const sha256={create(){throw Error("Unexpected fallback hashing")}};`,
    "@noble/hashes/utils": `export const bytesToHex=()=>{throw Error("Unexpected fallback hashing")};`,
    "@tilawi/quran-asr": `export class TextCTCDecoder {constructor(){if(globalThis.state.failDecoder)throw Error("Controlled decoder failure")}}
      export const detectSpeech=()=>false;`,
    "reciteAssistFeedback": `export const compactQuietPausesWithTimeline=()=>{throw Error("Unexpected inference")};`,
    "recitationTracking": `export const decodeRecitationEvidence=()=>{throw Error("Unexpected inference")};`
  };
  const built = await build({ entryPoints: [source], bundle: true, platform: "node", format: "cjs", write: false,
    external: ["onnxruntime-react-native"], define: { __DEV__: "true" }, plugins: [{ name: "controlled-recognition-session", setup(b) {
      b.onResolve({ filter: /^(expo-file-system|expo-modules-core|@noble\/hashes\/(?:sha256|utils)|@tilawi\/quran-asr)$/ },
        args => ({ path: args.path, namespace: "controlled" }));
      b.onResolve({ filter: /\/(reciteAssistFeedback|recitationTracking)$/ },
        args => ({ path: args.path.split("/").at(-1)!, namespace: "controlled" }));
      b.onLoad({ filter: /.*/, namespace: "controlled" }, args => ({ contents: mocks[args.path], loader: "js" }));
      b.onLoad({ filter: /\/reciteAssistEngine\.ts$/ }, () => ({ contents: readFileSync(source, "utf8"), loader: "ts" }));
    } }] });
  const module = { exports: {} as Record<string, unknown> };
  const requireNative = (name: string) => {
    assert.equal(name, "onnxruntime-react-native");
    return { InferenceSession: { async create() {
      state.opened++;
      return { async release() { state.released++; if (state.failRelease) throw Error("Controlled release failure"); } };
    } } };
  };
  runInContext(built.outputFiles[0].text, createContext({ module, exports: module.exports, require: requireNative, state }));
  return { engine: module.exports as {
    acquireReciteAssist: (progress: (message: string) => void) => Promise<{ dispose: () => Promise<void> }>;
    reciteAssistDiagnostics: () => { leases: number; native: boolean };
  }, state };
}

for (const failure of ["vocab", "decoder"] as const) test(`failed ${failure} setup releases its native session before retry`, async () => {
  const { engine, state } = await controlledEngine();
  state.failVocab = failure === "vocab";
  state.failDecoder = failure === "decoder";
  await assert.rejects(engine.acquireReciteAssist(() => {}), /JSON|Unexpected|Controlled decoder failure/);
  assert.equal(state.opened, 1);
  assert.equal(state.released, 1);
  assert.deepEqual({ ...engine.reciteAssistDiagnostics() }, { leases: 0, preparing: false, closing: false, native: false });
  state.failVocab = false;
  state.failDecoder = false;
  const held = await engine.acquireReciteAssist(() => {});
  assert.equal(state.opened, 2);
  assert.equal(state.released, 1);
  await held.dispose();
  assert.equal(state.released, 2);
});

test("failed cleanup during setup blocks a second native allocation", async () => {
  const { engine, state } = await controlledEngine();
  state.failVocab = true;
  state.failRelease = true;
  await assert.rejects(engine.acquireReciteAssist(() => {}), /Restart the app/);
  state.failVocab = false;
  await assert.rejects(engine.acquireReciteAssist(() => {}), /Restart the app/);
  assert.equal(state.opened, 1);
  assert.equal(state.released, 1);
});

test("failed disposal blocks reuse of a possibly live native session", async () => {
  const { engine, state } = await controlledEngine();
  const held = await engine.acquireReciteAssist(() => {});
  state.failRelease = true;
  await assert.rejects(held.dispose(), /Restart the app/);
  await assert.rejects(engine.acquireReciteAssist(() => {}), /Restart the app/);
  assert.equal(state.opened, 1);
  assert.equal(state.released, 1);
});
