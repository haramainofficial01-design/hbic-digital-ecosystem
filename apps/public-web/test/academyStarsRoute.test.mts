import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { build } from "esbuild";

test("approved photos only: unknown, superseded and unobscured sister assets stay private", async () => {
  const result = await build({ bundle: true, write: false, platform: "node", format: "esm", stdin: {
    resolveDir: path.resolve(import.meta.dirname, "../../.."), contents: "export * from './apps/public-web/app/api/academy/stars/[month]/[side]/route'"
  }, plugins: [{ name: "photo-store-fixture", setup(b) {
    b.onResolve({ filter: /\/firebaseAdmin$/ }, () => ({ path: "app", namespace: "fixture" }));
    b.onResolve({ filter: /^firebase-admin\/firestore$/ }, () => ({ path: "store", namespace: "fixture" }));
    b.onResolve({ filter: /^server-only$/ }, () => ({ path: "empty", namespace: "fixture" }));
    b.onResolve({ filter: /\/contentStore$|\/prayerSync$/ }, () => { throw new Error("Photo delivery must not load or resolve prayer content"); });
    b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path === "app" ? `export const getFirebaseApp=()=>({});` : args.path === "empty" ? "" : `export const getFirestore=()=>({collection(name){return{doc(id){return{async get(){return{data(){return name==='cmsContent'?{content:{academyStars:globalThis.__stars.months}}:globalThis.__stars.photos[id]}}}}}}}});` }));
  } }] });
  const route = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
  const month = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Edmonton" }).slice(0, 7);
  const state = { months: [{ month, winners: [{ side: "sisters", name: "Test learner", photoEnabled: true }] }], photos: { [`${month}-sisters`]: { mimeType: "image/webp", bytesBase64: Buffer.from("fixture").toString("base64"), faceObscured: true } } };
  (globalThis as any).__stars = state;
  const get = (m = month, side = "sisters") => route.GET(new Request("https://fixture.invalid/api"), { params: Promise.resolve({ month: m, side }) });
  try {
    const approved = await get(); assert.equal(approved.status, 200); assert.equal(approved.headers.get("content-type"), "image/webp"); assert.equal(await approved.text(), "fixture");
    assert.match(approved.headers.get("cache-control"), /max-age=60/);
    assert.equal((await get("2020-01")).status, 404);
    assert.equal((await get(month, "unknown")).status, 404);
    assert.equal((await get("../../private")).status, 404);
    state.photos[`${month}-sisters`].faceObscured = false; assert.equal((await get()).status, 404);
    state.photos[`${month}-sisters`].faceObscured = true;
    state.months[0].winners[0].photoEnabled = false; assert.equal((await get()).status, 404);
  } finally { delete (globalThis as any).__stars; }
});
