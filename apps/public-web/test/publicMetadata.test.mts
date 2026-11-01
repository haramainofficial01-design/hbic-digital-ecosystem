import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { build } from "esbuild";

test("metadata polling reads both stored schemas without loading the prayer resolver", async () => {
  const bundle = await build({ bundle: true, write: false, platform: "node", format: "esm", stdin: {
    resolveDir: path.resolve(import.meta.dirname, "../../.."), contents: `export * from './apps/public-web/lib/publishedContentVersion'; export {getPublicationState} from './apps/public-web/lib/publicationStore';`
  }, plugins: [{ name: "isolated-public-metadata", setup(b) {
    b.onResolve({ filter: /\/contentStore$|\/prayerSync$/ }, () => { throw new Error("Metadata must not load the full content/timetable store"); });
    b.onResolve({ filter: /\/firebaseAdmin$/ }, () => ({ path: "app", namespace: "fixture" }));
    b.onResolve({ filter: /^firebase-admin\/firestore$/ }, () => ({ path: "store", namespace: "fixture" }));
    b.onResolve({ filter: /^server-only$|^next\/cache$/ }, () => ({ path: "empty", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path === "app" ? "export const getFirebaseApp=()=>globalThis.__metadata.configured?{}:null;" : args.path === "empty" ? "export function revalidateTag(){}" : `export const getFirestore=()=>({collection(name){return{doc(id){return{async get(){globalThis.__metadata.reads.push(name+'/'+id);return{data(){return name==='cmsContent'?globalThis.__metadata.content:globalThis.__metadata.publication}}}}}}}});` }));
  } }] });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
  const state = { configured: true, content: { content: { version: 26, updatedAt: "2026-11-01T12:00:00Z", publishedAt: "2026-11-01T12:00:00Z" } } as Record<string, unknown>, publication: { revision: 4, kind: "content", updatedAt: "2026-11-01T12:00:00Z" }, reads: [] as string[] };
  (globalThis as any).__metadata = state;
  try {
    assert.equal((await api.getPublishedContentVersion()).version, 26);
    state.content = { version: 27, updatedAt: "flat", publishedAt: "flat" };
    assert.deepEqual(await api.getPublishedContentVersion(), { version: 27, updatedAt: "flat", publishedAt: "flat" });
    assert.equal((await api.getPublicationState()).revision, 4);
    assert.deepEqual(state.reads, ["cmsContent/published", "cmsContent/published", "publicationState/current"]);
    state.configured = false;
    assert.equal((await api.getPublicationState()).revision, 0);
    assert.equal(state.reads.length, 3);
  } finally { delete (globalThis as any).__metadata; }
});
